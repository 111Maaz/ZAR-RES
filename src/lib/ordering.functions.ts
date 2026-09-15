import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export interface MenuMedia {
  id: string;
  url: string;
  media_type: string;
  sort_order: number;
}

export interface MenuItem {
  id: string;
  category_id: string;
  name: string;
  description: string | null;
  price: number;
  is_available: boolean;
  tags: string[];
  reel_url: string | null;
  sort_order: number;
  media: MenuMedia[];
}

export interface MenuCategory {
  id: string;
  name: string;
  subtitle: string | null;
  image_url: string | null;
  sort_order: number;
  items: MenuItem[];
}

export interface RestaurantSettings {
  name: string;
  tagline: string;
  logo_url: string | null;
  cover_image_url: string | null;
  about: string | null;
  address: string | null;
  opening_hours: string | null;
  instagram_url: string | null;
  phone: string | null;
}

export interface SessionOrderItem {
  name: string;
  quantity: number;
  price: number;
  subtotal: number;
}

export interface SessionBatch {
  id: string;
  code: string;
  batch_no: number;
  status: string;
  created_at: string;
  items: SessionOrderItem[];
  total: number;
}

export interface TableSessionView {
  id: string;
  session_no: number;
  opened_at: string;
  batches: SessionBatch[];
  running_total: number;
  item_count: number;
}

export interface TableContext {
  table: { id: string; label: string };
  settings: RestaurantSettings | null;
  session: TableSessionView | null;
}

const qrTokenSchema = z.string().uuid("Invalid table code");

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

/** Public menu: categories, items, item-specific media. */
export const getPublicMenu = createServerFn({ method: "GET" }).handler(async () => {
  const db = await admin();
  const [{ data: settings }, { data: categories }, { data: items }, { data: media }] =
    await Promise.all([
      db.from("restaurant_settings").select("*").eq("id", true).maybeSingle(),
      db.from("categories").select("*").eq("is_active", true).order("sort_order"),
      db.from("menu_items").select("*").order("sort_order"),
      db.from("menu_media").select("*").order("sort_order"),
    ]);

  const mediaByItem = new Map<string, MenuMedia[]>();
  for (const m of media ?? []) {
    const list = mediaByItem.get(m.menu_item_id) ?? [];
    list.push({
      id: m.id,
      url: m.url,
      media_type: m.media_type,
      sort_order: m.sort_order,
    });
    mediaByItem.set(m.menu_item_id, list);
  }

  const cats: MenuCategory[] = (categories ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    subtitle: c.subtitle,
    image_url: c.image_url,
    sort_order: c.sort_order,
    items: (items ?? [])
      .filter((i) => i.category_id === c.id)
      .map((i) => ({
        id: i.id,
        category_id: i.category_id,
        name: i.name,
        description: i.description,
        price: Number(i.price),
        is_available: i.is_available,
        tags: i.tags ?? [],
        reel_url: i.reel_url,
        sort_order: i.sort_order,
        media: mediaByItem.get(i.id) ?? [],
      })),
  }));

  return {
    settings: (settings as RestaurantSettings | null) ?? null,
    categories: cats,
  };
});

async function buildSessionView(
  db: Awaited<ReturnType<typeof admin>>,
  session: { id: string; session_no: number; opened_at: string },
): Promise<TableSessionView> {
  const { data: batches } = await db
    .from("order_batches")
    .select("id, batch_no, status, created_at")
    .eq("session_id", session.id)
    .order("created_at", { ascending: true });

  const ids = (batches ?? []).map((b) => b.id);
  const { data: items } = ids.length
    ? await db
        .from("order_items")
        .select("batch_id, name_snapshot, price_snapshot, quantity, subtotal")
        .in("batch_id", ids)
    : { data: [] as never[] };

  const view: SessionBatch[] = (batches ?? []).map((b) => {
    const rows = (items ?? []).filter((i) => i.batch_id === b.id);
    return {
      id: b.id,
      code: `${session.session_no}-${b.batch_no}`,
      batch_no: b.batch_no,
      status: b.status,
      created_at: b.created_at,
      items: rows.map((r) => ({
        name: r.name_snapshot,
        quantity: r.quantity,
        price: Number(r.price_snapshot),
        subtotal: Number(r.subtotal),
      })),
      total: rows.reduce((sum, r) => sum + Number(r.subtotal), 0),
    };
  });

  return {
    id: session.id,
    session_no: session.session_no,
    opened_at: session.opened_at,
    batches: view,
    running_total: view.reduce((s, b) => s + b.total, 0),
    item_count: view.reduce(
      (s, b) => s + b.items.reduce((q, i) => q + i.quantity, 0),
      0,
    ),
  };
}

/** Table context for a scanned QR: the table plus its active session, if any. */
export const getTableContext = createServerFn({ method: "GET" })
  .inputValidator((data: { token: string }) => ({ token: qrTokenSchema.parse(data.token) }))
  .handler(async ({ data }): Promise<TableContext> => {
    const db = await admin();
    const { data: table } = await db
      .from("restaurant_tables")
      .select("id, label")
      .eq("qr_token", data.token)
      .maybeSingle();

    if (!table) throw new Error("TABLE_NOT_FOUND");

    const [{ data: settings }, { data: session }] = await Promise.all([
      db.from("restaurant_settings").select("*").eq("id", true).maybeSingle(),
      db
        .from("table_sessions")
        .select("id, session_no, opened_at")
        .eq("table_id", table.id)
        .eq("status", "active")
        .maybeSingle(),
    ]);

    return {
      table,
      settings: (settings as RestaurantSettings | null) ?? null,
      session: session ? await buildSessionView(db, session) : null,
    };
  });

const placeOrderSchema = z.object({
  token: qrTokenSchema,
  items: z
    .array(
      z.object({
        menu_item_id: z.string().uuid(),
        quantity: z.number().int().min(1).max(50),
      }),
    )
    .min(1)
    .max(40),
});

/**
 * Attaches an order batch to the table identified by the QR slug.
 * Creates a session only when the table has none active. Prices are snapshotted.
 */
export const placeOrder = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => placeOrderSchema.parse(data))
  .handler(async ({ data }) => {
    const db = await admin();
    const { data: rows, error } = await (db as any).rpc("place_table_order", {
      p_qr_token: data.token,
      p_items: data.items,
    });
    if (error || !rows?.[0]) throw new Error(error?.message ?? "ORDER_FAILED");
    const result = rows[0];
    return {
      table_label: result.table_label,
      session_no: Number(result.session_no), batch_no: Number(result.batch_no),
      code: `${result.session_no}-${result.batch_no}`, created_at: result.created_at,
      total: Number(result.total),
    };
  });

/** Public, rate-limited operational call; it never creates a session or bill. */
export const callWaiter = createServerFn({ method: "POST" })
  .inputValidator((data: { token: string }) => ({ token: qrTokenSchema.parse(data.token) }))
  .handler(async ({ data }) => {
    const db = await admin();
    const { data: rows, error } = await (db as any).rpc("create_waiter_call", { p_qr_token: data.token });
    if (error || !rows?.[0]) throw new Error(error?.message ?? "WAITER_CALL_FAILED");
    return rows[0] as { call_id: string; table_label: string; created_at: string; reused: boolean };
  });

/** Bootstrap: the first signed-in account becomes the restaurant owner. */
export const claimOwnerRole = createServerFn({ method: "POST" })
  .inputValidator((data: { userId: string }) => ({
    userId: z.string().uuid().parse(data.userId),
  }))
  .handler(async ({ data }) => {
    const db = await admin();
    const { count } = await db
      .from("user_roles")
      .select("id", { count: "exact", head: true });
    if ((count ?? 0) > 0) return { granted: false };
    const { error } = await db
      .from("user_roles")
      .insert({ user_id: data.userId, role: "admin" });
    return { granted: !error };
  });
