-- roles
CREATE TYPE public.app_role AS ENUM ('admin');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own roles readable" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(), 'admin')
$$;

CREATE OR REPLACE FUNCTION public.touch_updated_at() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- restaurant settings (single row)
CREATE TABLE public.restaurant_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  name text NOT NULL DEFAULT 'Zaytun',
  tagline text NOT NULL DEFAULT 'Flavours Beyond Borders',
  logo_url text,
  cover_image_url text,
  about text,
  address text,
  opening_hours text,
  instagram_url text,
  phone text,
  currency_symbol text NOT NULL DEFAULT '₹',
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.restaurant_settings TO anon;
GRANT SELECT, INSERT, UPDATE ON public.restaurant_settings TO authenticated;
GRANT ALL ON public.restaurant_settings TO service_role;
ALTER TABLE public.restaurant_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "settings public read" ON public.restaurant_settings FOR SELECT USING (true);
CREATE POLICY "settings admin write" ON public.restaurant_settings FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE TRIGGER trg_settings_touch BEFORE UPDATE ON public.restaurant_settings FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- tables
CREATE TABLE public.restaurant_tables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.restaurant_tables TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.restaurant_tables TO authenticated;
GRANT ALL ON public.restaurant_tables TO service_role;
ALTER TABLE public.restaurant_tables ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tables public read" ON public.restaurant_tables FOR SELECT USING (true);
CREATE POLICY "tables admin write" ON public.restaurant_tables FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- categories
CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  subtitle text,
  image_url text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.categories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "categories public read" ON public.categories FOR SELECT USING (true);
CREATE POLICY "categories admin write" ON public.categories FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- menu items
CREATE TABLE public.menu_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  price numeric(10,2) NOT NULL DEFAULT 0 CHECK (price >= 0),
  is_available boolean NOT NULL DEFAULT true,
  tags text[] NOT NULL DEFAULT '{}',
  reel_url text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.menu_items TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.menu_items TO authenticated;
GRANT ALL ON public.menu_items TO service_role;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "items public read" ON public.menu_items FOR SELECT USING (true);
CREATE POLICY "items admin write" ON public.menu_items FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- menu media
CREATE TABLE public.menu_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_item_id uuid NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  url text NOT NULL,
  media_type text NOT NULL DEFAULT 'image' CHECK (media_type IN ('image','video')),
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.menu_media TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.menu_media TO authenticated;
GRANT ALL ON public.menu_media TO service_role;
ALTER TABLE public.menu_media ENABLE ROW LEVEL SECURITY;
CREATE POLICY "media public read" ON public.menu_media FOR SELECT USING (true);
CREATE POLICY "media admin write" ON public.menu_media FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- sessions
CREATE SEQUENCE public.session_no_seq START 1001;
CREATE TABLE public.table_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_no integer NOT NULL UNIQUE DEFAULT nextval('public.session_no_seq'),
  table_id uuid NOT NULL REFERENCES public.restaurant_tables(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','closed')),
  opened_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz,
  final_total numeric(10,2),
  payment_method text CHECK (payment_method IN ('cash','upi','card','other'))
);
CREATE UNIQUE INDEX one_active_session_per_table ON public.table_sessions (table_id) WHERE status = 'active';
GRANT SELECT, INSERT, UPDATE ON public.table_sessions TO authenticated;
GRANT ALL ON public.table_sessions TO service_role;
ALTER TABLE public.table_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sessions admin all" ON public.table_sessions FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- order batches
CREATE TABLE public.order_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.table_sessions(id) ON DELETE CASCADE,
  table_id uuid NOT NULL REFERENCES public.restaurant_tables(id) ON DELETE CASCADE,
  batch_no integer NOT NULL,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','accepted','preparing','ready','served')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, batch_no)
);
CREATE INDEX order_batches_fcfs ON public.order_batches (created_at);
GRANT SELECT, INSERT, UPDATE ON public.order_batches TO authenticated;
GRANT ALL ON public.order_batches TO service_role;
ALTER TABLE public.order_batches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "batches admin all" ON public.order_batches FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- order items (price snapshot)
CREATE TABLE public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES public.order_batches(id) ON DELETE CASCADE,
  menu_item_id uuid REFERENCES public.menu_items(id) ON DELETE SET NULL,
  name_snapshot text NOT NULL,
  price_snapshot numeric(10,2) NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  subtotal numeric(10,2) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.order_items TO authenticated;
GRANT ALL ON public.order_items TO service_role;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "order items admin all" ON public.order_items FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

ALTER PUBLICATION supabase_realtime ADD TABLE public.order_batches;
ALTER PUBLICATION supabase_realtime ADD TABLE public.table_sessions;

-- seed
INSERT INTO public.restaurant_settings (id, name, tagline, cover_image_url, about, address, opening_hours, instagram_url, phone)
VALUES (true, 'TANDO'S', 'Flavours Beyond Borders', '/images/hero.jpg',
  'TANDO'S is a candlelit dining room where Levantine warmth meets the spice roads of the subcontinent. Slow-cooked biryanis, charcoal grills and mezze made fresh every morning.',
  '14 Olive Court, Bandra West, Mumbai 400050', 'Daily · 12:00 PM – 11:30 PM', 'https://instagram.com', '+91 98200 00000');

INSERT INTO public.restaurant_tables (label, slug, sort_order)
SELECT 'Table ' || lpad(n::text, 2, '0'), 'table-' || lpad(n::text, 2, '0'), n
FROM generate_series(1, 12) AS n;

INSERT INTO public.categories (id, name, subtitle, image_url, sort_order) VALUES
  ('11111111-1111-4111-8111-000000000001', 'Starters', 'Small Bites, Big Stories', '/images/mezze.jpg', 1),
  ('11111111-1111-4111-8111-000000000002', 'Biryani', 'Royal Flavours', '/images/chicken-biryani.jpg', 2),
  ('11111111-1111-4111-8111-000000000003', 'Main Course', 'A World on Your Plate', '/images/butter-chicken.jpg', 3),
  ('11111111-1111-4111-8111-000000000004', 'Grill & BBQ', 'Fire. Flavour. Perfection.', '/images/mixed-grill.jpg', 4),
  ('11111111-1111-4111-8111-000000000005', 'Desserts', 'A Sweet Ending', '/images/gulab-jamun.jpg', 5),
  ('11111111-1111-4111-8111-000000000006', 'Beverages', 'Refresh & Rejuvenate', '/images/fresh-lime.jpg', 6);

INSERT INTO public.menu_items (id, category_id, name, description, price, tags, sort_order, reel_url) VALUES
 ('22222222-2222-4222-8222-000000000001','11111111-1111-4111-8111-000000000001','TANDO'S Mezze Platter','Hummus, muhammara, labneh and warm pita baked to order.',320,'{Bestseller,Veg}',1,NULL),
 ('22222222-2222-4222-8222-000000000002','11111111-1111-4111-8111-000000000001','Chicken Malai Tikka','Cream and cardamom marinated chicken, charcoal grilled.',380,'{"Chef''s Special","Non-Veg"}',2,NULL),
 ('22222222-2222-4222-8222-000000000003','11111111-1111-4111-8111-000000000002','Chicken Biryani','Aromatic basmati rice slow cooked with tender chicken, saffron and herbs.',240,'{Bestseller,"Non-Veg",Popular}',1,'https://www.instagram.com/reel/CxYzExample/'),
 ('22222222-2222-4222-8222-000000000004','11111111-1111-4111-8111-000000000002','Mutton Biryani','Slow cooked mutton layered with rich spices and fried onion.',320,'{"Non-Veg",Spicy}',2,NULL),
 ('22222222-2222-4222-8222-000000000005','11111111-1111-4111-8111-000000000002','Veg Biryani','Fragrant rice with seasonal vegetables and mint.',220,'{Veg}',3,NULL),
 ('22222222-2222-4222-8222-000000000006','11111111-1111-4111-8111-000000000003','Butter Chicken','Tandoori chicken folded into a silky tomato and butter gravy.',320,'{Bestseller,"Non-Veg"}',1,NULL),
 ('22222222-2222-4222-8222-000000000007','11111111-1111-4111-8111-000000000003','Paneer Makhani','Hand pressed paneer in a cashew and tomato velvet.',280,'{Veg}',2,NULL),
 ('22222222-2222-4222-8222-000000000008','11111111-1111-4111-8111-000000000004','Mixed Grill Platter','Seekh kebab, malai tikka, lamb chop and grilled vegetables.',640,'{"Chef''s Special","Non-Veg"}',1,NULL),
 ('22222222-2222-4222-8222-000000000009','11111111-1111-4111-8111-000000000005','Gulab Jamun','Warm milk dumplings in rose and cardamom syrup.',120,'{Veg,Popular}',1,NULL),
 ('22222222-2222-4222-8222-00000000000a','11111111-1111-4111-8111-000000000005','Pistachio Baklava','Layered filo, clarified butter and Iranian pistachio.',180,'{New,Veg}',2,NULL),
 ('22222222-2222-4222-8222-00000000000b','11111111-1111-4111-8111-000000000006','Fresh Lime Soda','Sweet or salted, pressed to order.',80,'{Veg}',1,NULL),
 ('22222222-2222-4222-8222-00000000000c','11111111-1111-4111-8111-000000000006','Coke','Chilled 300ml bottle.',50,'{}',2,NULL),
 ('22222222-2222-4222-8222-00000000000d','11111111-1111-4111-8111-000000000006','Mineral Water','1 litre bottle.',20,'{}',3,NULL);

INSERT INTO public.menu_media (menu_item_id, url, sort_order) VALUES
 ('22222222-2222-4222-8222-000000000001','/images/mezze.jpg',1),
 ('22222222-2222-4222-8222-000000000002','/images/malai-tikka.jpg',1),
 ('22222222-2222-4222-8222-000000000003','/images/chicken-biryani.jpg',1),
 ('22222222-2222-4222-8222-000000000003','/images/chicken-biryani-2.jpg',2),
 ('22222222-2222-4222-8222-000000000003','/images/chicken-biryani-3.jpg',3),
 ('22222222-2222-4222-8222-000000000004','/images/mutton-biryani.jpg',1),
 ('22222222-2222-4222-8222-000000000005','/images/veg-biryani.jpg',1),
 ('22222222-2222-4222-8222-000000000006','/images/butter-chicken.jpg',1),
 ('22222222-2222-4222-8222-000000000007','/images/paneer-makhani.jpg',1),
 ('22222222-2222-4222-8222-000000000008','/images/mixed-grill.jpg',1),
 ('22222222-2222-4222-8222-000000000009','/images/gulab-jamun.jpg',1),
 ('22222222-2222-4222-8222-00000000000a','/images/baklava.jpg',1),
 ('22222222-2222-4222-8222-00000000000b','/images/fresh-lime.jpg',1),
 ('22222222-2222-4222-8222-00000000000c','/images/coke.jpg',1),
 ('22222222-2222-4222-8222-00000000000d','/images/water.jpg',1);