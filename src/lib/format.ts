export const CURRENCY = "₹";

export function money(value: number | string | null | undefined): string {
  const n = Number(value ?? 0);
  return `${CURRENCY}${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

export function clockTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function dayStamp(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function duration(fromIso: string, toIso: string | null): string {
  const from = new Date(fromIso).getTime();
  const to = toIso ? new Date(toIso).getTime() : Date.now();
  const mins = Math.max(0, Math.round((to - from) / 60000));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export const ORDER_STATUSES = [
  "new",
  "accepted",
  "preparing",
  "ready",
  "served",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const STATUS_LABEL: Record<OrderStatus, string> = {
  new: "New",
  accepted: "Accepted",
  preparing: "Preparing",
  ready: "Ready",
  served: "Served",
};

export function nextStatus(status: OrderStatus): OrderStatus | null {
  const i = ORDER_STATUSES.indexOf(status);
  return i < 0 || i === ORDER_STATUSES.length - 1 ? null : ORDER_STATUSES[i + 1]!;
}

export const KNOWN_TAGS = [
  "Bestseller",
  "New",
  "Spicy",
  "Popular",
  "Chef's Special",
  "Veg",
  "Non-Veg",
] as const;
