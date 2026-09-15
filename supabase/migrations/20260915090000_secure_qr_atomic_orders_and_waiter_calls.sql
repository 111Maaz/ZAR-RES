-- Secure permanent QR identity. Existing slugs remain for admin display only.
ALTER TABLE public.restaurant_tables
  ADD COLUMN IF NOT EXISTS qr_token uuid NOT NULL DEFAULT gen_random_uuid();
CREATE UNIQUE INDEX IF NOT EXISTS restaurant_tables_qr_token_key
  ON public.restaurant_tables (qr_token);

-- Operational requests are intentionally separate from orders and billing.
CREATE TABLE IF NOT EXISTS public.waiter_calls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id uuid NOT NULL REFERENCES public.restaurant_tables(id) ON DELETE CASCADE,
  session_id uuid REFERENCES public.table_sessions(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'acknowledged', 'resolved')),
  created_at timestamptz NOT NULL DEFAULT now(),
  acknowledged_at timestamptz,
  resolved_at timestamptz
);
CREATE INDEX IF NOT EXISTS waiter_calls_open_queue
  ON public.waiter_calls (status, created_at DESC);
GRANT SELECT, UPDATE ON public.waiter_calls TO authenticated;
GRANT ALL ON public.waiter_calls TO service_role;
ALTER TABLE public.waiter_calls ENABLE ROW LEVEL SECURITY;
CREATE POLICY "waiter calls admin read" ON public.waiter_calls FOR SELECT TO authenticated
  USING (public.is_admin());
CREATE POLICY "waiter calls admin update" ON public.waiter_calls FOR UPDATE TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());
ALTER PUBLICATION supabase_realtime ADD TABLE public.waiter_calls;

-- One transaction holds the table row while it resolves/creates the active
-- session and appends the next batch. This prevents duplicate sessions and
-- duplicate batch numbers during simultaneous first orders.
CREATE OR REPLACE FUNCTION public.place_table_order(
  p_qr_token uuid,
  p_items jsonb
) RETURNS TABLE(session_no integer, batch_no integer, batch_id uuid, table_label text, created_at timestamptz, total numeric)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_table public.restaurant_tables%ROWTYPE;
  v_session public.table_sessions%ROWTYPE;
  v_batch public.order_batches%ROWTYPE;
  v_line jsonb;
  v_menu public.menu_items%ROWTYPE;
  v_quantity integer;
  v_total numeric := 0;
BEGIN
  IF jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 OR jsonb_array_length(p_items) > 40 THEN
    RAISE EXCEPTION 'INVALID_CART';
  END IF;
  SELECT * INTO v_table FROM restaurant_tables WHERE qr_token = p_qr_token FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'TABLE_NOT_FOUND'; END IF;

  FOR v_line IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_quantity := NULLIF(v_line->>'quantity', '')::integer;
    IF v_quantity IS NULL OR v_quantity < 1 OR v_quantity > 50 THEN RAISE EXCEPTION 'INVALID_CART'; END IF;
    SELECT * INTO v_menu FROM menu_items WHERE id = (v_line->>'menu_item_id')::uuid;
    IF NOT FOUND THEN RAISE EXCEPTION 'ITEM_MISSING'; END IF;
    IF NOT v_menu.is_available THEN RAISE EXCEPTION 'UNAVAILABLE:%', v_menu.name; END IF;
  END LOOP;

  SELECT * INTO v_session FROM table_sessions
    WHERE table_id = v_table.id AND status = 'active';
  IF NOT FOUND THEN
    INSERT INTO table_sessions(table_id) VALUES (v_table.id) RETURNING * INTO v_session;
  END IF;

  INSERT INTO order_batches(session_id, table_id, batch_no, status)
  VALUES (v_session.id, v_table.id,
    COALESCE((SELECT max(batch_no) + 1 FROM order_batches WHERE session_id = v_session.id), 1), 'new')
  RETURNING * INTO v_batch;

  FOR v_line IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    SELECT * INTO v_menu FROM menu_items WHERE id = (v_line->>'menu_item_id')::uuid;
    v_quantity := (v_line->>'quantity')::integer;
    INSERT INTO order_items(batch_id, menu_item_id, name_snapshot, price_snapshot, quantity, subtotal)
    VALUES (v_batch.id, v_menu.id, v_menu.name, v_menu.price, v_quantity, v_menu.price * v_quantity);
    v_total := v_total + v_menu.price * v_quantity;
  END LOOP;
  RETURN QUERY SELECT v_session.session_no, v_batch.batch_no, v_batch.id, v_table.label, v_batch.created_at, v_total;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_waiter_call(p_qr_token uuid)
RETURNS TABLE(call_id uuid, table_label text, created_at timestamptz, reused boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_table public.restaurant_tables%ROWTYPE; v_session_id uuid; v_call public.waiter_calls%ROWTYPE;
BEGIN
  SELECT * INTO v_table FROM restaurant_tables WHERE qr_token = p_qr_token FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'TABLE_NOT_FOUND'; END IF;
  SELECT id INTO v_session_id FROM table_sessions WHERE table_id = v_table.id AND status = 'active';
  SELECT * INTO v_call FROM waiter_calls WHERE table_id = v_table.id AND status IN ('new','acknowledged')
    AND created_at > now() - interval '45 seconds' ORDER BY created_at DESC LIMIT 1;
  IF FOUND THEN RETURN QUERY SELECT v_call.id, v_table.label, v_call.created_at, true; RETURN; END IF;
  INSERT INTO waiter_calls(table_id, session_id) VALUES(v_table.id, v_session_id) RETURNING * INTO v_call;
  RETURN QUERY SELECT v_call.id, v_table.label, v_call.created_at, false;
END;
$$;

-- Checkout totals are calculated from immutable order snapshots, never a
-- browser supplied number. Closing twice is rejected by the active predicate.
CREATE OR REPLACE FUNCTION public.close_table_session(p_session_id uuid, p_payment_method text DEFAULT NULL)
RETURNS TABLE(final_total numeric, closed_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_total numeric;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'NOT_AUTHORIZED'; END IF;
  SELECT COALESCE(sum(oi.subtotal), 0) INTO v_total FROM order_items oi
    JOIN order_batches ob ON ob.id = oi.batch_id WHERE ob.session_id = p_session_id;
  UPDATE table_sessions SET status = 'closed', closed_at = now(), final_total = v_total,
    payment_method = NULLIF(p_payment_method, '')
    WHERE id = p_session_id AND status = 'active';
  IF NOT FOUND THEN RAISE EXCEPTION 'SESSION_NOT_ACTIVE'; END IF;
  RETURN QUERY SELECT v_total, (SELECT closed_at FROM table_sessions WHERE id = p_session_id);
END;
$$;

REVOKE ALL ON FUNCTION public.place_table_order(uuid, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_waiter_call(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.close_table_session(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.place_table_order(uuid, jsonb) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.create_waiter_call(uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.close_table_session(uuid, text) TO authenticated, service_role;
