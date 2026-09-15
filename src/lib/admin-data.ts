import { supabase } from "@/integrations/supabase/client";

export interface AdminOrderItem {
  name_snapshot: string;
  price_snapshot: number;
  quantity: number;
  subtotal: number;
}

export interface AdminBatch {
  id: string;
  session_id: string;
  table_id: string;
  table_label: string;
  session_no: number;
  batch_no: number;
  code: string;
  status: string;
  created_at: string;
  items: AdminOrderItem[];
  total: number;
}

export interface AdminTableRow {
  id: string;
  label: string;
  slug: string;
  qr_token: string;
  sort_order: number;
  session: {
    id: string;
    session_no: number;
    opened_at: string;
    total: number;
    orders: number;
  } | null;
}

async function fail<T>(res: { data: T | null; error: { message: string } | null }): Promise<T> {
  if (res.error) throw new Error(res.error.message);
  return (res.data ?? []) as T;
}

async function itemsByBatch(batchIds: string[]) {
  if (!batchIds.length) return new Map<string, AdminOrderItem[]>();
  const { data, error } = await supabase
    .from("order_items")
    .select("batch_id, name_snapshot, price_snapshot, quantity, subtotal")
    .in("batch_id", batchIds);
  if (error) throw new Error(error.message);
  const map = new Map<string, AdminOrderItem[]>();
  for (const row of data ?? []) {
    const list = map.get(row.batch_id) ?? [];
    list.push({
      name_snapshot: row.name_snapshot,
      price_snapshot: Number(row.price_snapshot),
      quantity: row.quantity,
      subtotal: Number(row.subtotal),
    });
    map.set(row.batch_id, list);
  }
  return map;
}

/** All batches for open sessions, oldest first (FCFS). */
export async function fetchOrderQueue(): Promise<AdminBatch[]> {
  const { data, error } = await supabase
    .from("order_batches")
    .select(
      "id, session_id, table_id, batch_no, status, created_at, restaurant_tables(label), table_sessions(session_no, status)",
    )
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);

  const rows = (data ?? []).filter(
    (r) => (r.table_sessions as { status?: string } | null)?.status === "active",
  );
  const map = await itemsByBatch(rows.map((r) => r.id));

  return rows.map((r) => {
    const items = map.get(r.id) ?? [];
    const sessionNo = (r.table_sessions as { session_no: number } | null)?.session_no ?? 0;
    return {
      id: r.id,
      session_id: r.session_id,
      table_id: r.table_id,
      table_label: (r.restaurant_tables as { label: string } | null)?.label ?? "Table",
      session_no: sessionNo,
      batch_no: r.batch_no,
      code: `${sessionNo}-${r.batch_no}`,
      status: r.status,
      created_at: r.created_at,
      items,
      total: items.reduce((s, i) => s + i.subtotal, 0),
    };
  });
}

export async function fetchTables(): Promise<AdminTableRow[]> {
  const tables = await fail(
    await supabase
      .from("restaurant_tables")
      .select("id, label, slug, qr_token, sort_order")
      .order("sort_order"),
  );
  const sessions = await fail(
    await supabase
      .from("table_sessions")
      .select("id, table_id, session_no, opened_at")
      .eq("status", "active"),
  );
  const queue = await fetchOrderQueue();

  return tables.map((t) => {
    const session = sessions.find((s) => s.table_id === t.id) ?? null;
    if (!session) return { ...t, session: null };
    const batches = queue.filter((b) => b.session_id === session.id);
    return {
      ...t,
      session: {
        id: session.id,
        session_no: session.session_no,
        opened_at: session.opened_at,
        total: batches.reduce((s, b) => s + b.total, 0),
        orders: batches.length,
      },
    };
  });
}

export interface SessionDetail {
  id: string;
  session_no: number;
  status: string;
  opened_at: string;
  closed_at: string | null;
  payment_method: string | null;
  final_total: number | null;
  table_label: string;
  table_id: string;
  batches: AdminBatch[];
  total: number;
}

async function hydrateSession(session: {
  id: string;
  session_no: number;
  status: string;
  opened_at: string;
  closed_at: string | null;
  payment_method: string | null;
  final_total: number | string | null;
  table_id: string;
  restaurant_tables?: { label: string } | null;
}): Promise<SessionDetail> {
  const batches = await fail(
    await supabase
      .from("order_batches")
      .select("id, session_id, table_id, batch_no, status, created_at")
      .eq("session_id", session.id)
      .order("created_at", { ascending: true }),
  );
  const map = await itemsByBatch(batches.map((b) => b.id));
  const label = session.restaurant_tables?.label ?? "Table";
  const list: AdminBatch[] = batches.map((b) => {
    const items = map.get(b.id) ?? [];
    return {
      id: b.id,
      session_id: b.session_id,
      table_id: b.table_id,
      table_label: label,
      session_no: session.session_no,
      batch_no: b.batch_no,
      code: `${session.session_no}-${b.batch_no}`,
      status: b.status,
      created_at: b.created_at,
      items,
      total: items.reduce((s, i) => s + i.subtotal, 0),
    };
  });

  return {
    id: session.id,
    session_no: session.session_no,
    status: session.status,
    opened_at: session.opened_at,
    closed_at: session.closed_at,
    payment_method: session.payment_method,
    final_total: session.final_total === null ? null : Number(session.final_total),
    table_label: label,
    table_id: session.table_id,
    batches: list,
    total: list.reduce((s, b) => s + b.total, 0),
  };
}

export async function fetchActiveSessionForTable(
  tableId: string,
): Promise<SessionDetail | null> {
  const { data, error } = await supabase
    .from("table_sessions")
    .select(
      "id, session_no, status, opened_at, closed_at, payment_method, final_total, table_id, restaurant_tables(label)",
    )
    .eq("table_id", tableId)
    .eq("status", "active")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return hydrateSession(data as never);
}

export async function fetchSessionById(sessionId: string): Promise<SessionDetail | null> {
  const { data, error } = await supabase
    .from("table_sessions")
    .select(
      "id, session_no, status, opened_at, closed_at, payment_method, final_total, table_id, restaurant_tables(label)",
    )
    .eq("id", sessionId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return hydrateSession(data as never);
}

export async function fetchClosedSessions() {
  const { data, error } = await supabase
    .from("table_sessions")
    .select(
      "id, session_no, opened_at, closed_at, final_total, payment_method, restaurant_tables(label)",
    )
    .eq("status", "closed")
    .order("closed_at", { ascending: false })
    .limit(200);
  if (error) throw new Error(error.message);
  return (data ?? []).map((s) => ({
    id: s.id,
    session_no: s.session_no,
    opened_at: s.opened_at,
    closed_at: s.closed_at,
    final_total: Number(s.final_total ?? 0),
    payment_method: s.payment_method,
    table_label: (s.restaurant_tables as { label: string } | null)?.label ?? "Table",
  }));
}

export async function updateBatchStatus(batchId: string, status: string) {
  const { error } = await supabase
    .from("order_batches")
    .update({ status })
    .eq("id", batchId);
  if (error) throw new Error(error.message);
}

export async function closeSession(
  sessionId: string,
  _finalTotal: number,
  paymentMethod: string | null,
) {
  const { error } = await (supabase as any).rpc("close_table_session", {
    p_session_id: sessionId,
    p_payment_method: paymentMethod,
  });
  if (error) throw new Error(error.message);
}

export interface WaiterCall {
  id: string;
  status: "new" | "acknowledged" | "resolved";
  created_at: string;
  table_label: string;
}

export async function fetchWaiterCalls(): Promise<WaiterCall[]> {
  const { data, error } = await (supabase as any)
    .from("waiter_calls")
    .select("id, status, created_at, restaurant_tables(label)")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw new Error(error.message);
  return (data ?? []).map((call: any) => ({
    id: call.id, status: call.status, created_at: call.created_at,
    table_label: call.restaurant_tables?.label ?? "Table",
  }));
}

export async function updateWaiterCall(id: string, status: WaiterCall["status"]) {
  const timestamps = status === "acknowledged" ? { acknowledged_at: new Date().toISOString() }
    : status === "resolved" ? { resolved_at: new Date().toISOString() } : {};
  const { error } = await (supabase as any).from("waiter_calls").update({ status, ...timestamps }).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function fetchAdminMenu() {
  const categories = await fail(
    await supabase.from("categories").select("*").order("sort_order"),
  );
  const items = await fail(await supabase.from("menu_items").select("*").order("sort_order"));
  const media = await fail(await supabase.from("menu_media").select("*").order("sort_order"));
  return { categories, items, media };
}

export async function fetchSettings() {
  const { data, error } = await supabase
    .from("restaurant_settings")
    .select("*")
    .eq("id", true)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}
