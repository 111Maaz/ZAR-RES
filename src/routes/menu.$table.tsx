import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  BellRing,
  ChevronRight,
  Circle,
  Loader2,
  Minus,
  Plus,
  Play,
  ShoppingBag,
  Trash2,
  Utensils,
  X,
} from "lucide-react";
import { toast } from "sonner";

import {
  getPublicMenu,
  getTableContext,
  callWaiter,
  type MenuItem,
  type TableContext,
} from "@/lib/ordering.functions";
import { placeOrder } from "@/lib/ordering.functions";
import { clockTime, money, ORDER_STATUSES, STATUS_LABEL } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/menu/$table")({
  head: ({ params }) => {
    const label = params.table.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    const title = `Order at TANDO'S — ${label}`;
    const description =
      "Browse the TANDO'S menu, view dishes and place your order straight from your table.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { name: "robots", content: "noindex" },
      ],
    };
  },
  component: CustomerMenu,
});

type CartLine = { id: string; quantity: number };

function useCart(slug: string) {
  const key = `zaytun-cart:${slug}`;
  const [lines, setLines] = useState<CartLine[]>([]);
  const loaded = useRef(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw) setLines(JSON.parse(raw) as CartLine[]);
    } catch {
      /* ignore unreadable storage */
    }
    loaded.current = true;
  }, [key]);

  useEffect(() => {
    if (!loaded.current) return;
    try {
      window.localStorage.setItem(key, JSON.stringify(lines));
    } catch {
      /* ignore full storage */
    }
  }, [key, lines]);

  return {
    lines,
    add: (id: string, quantity = 1) =>
      setLines((prev) => {
        const found = prev.find((l) => l.id === id);
        if (found)
          return prev.map((l) => (l.id === id ? { ...l, quantity: l.quantity + quantity } : l));
        return [...prev, { id, quantity }];
      }),
    setQty: (id: string, quantity: number) =>
      setLines((prev) =>
        quantity <= 0
          ? prev.filter((l) => l.id !== id)
          : prev.map((l) => (l.id === id ? { ...l, quantity } : l)),
      ),
    remove: (id: string) => setLines((prev) => prev.filter((l) => l.id !== id)),
    clear: () => setLines([]),
  };
}

function Tag({ label }: { label: string }) {
  const tone =
    label === "Veg"
      ? "border-success/50 text-success"
      : label === "Non-Veg" || label === "Spicy"
        ? "border-destructive/50 text-destructive"
        : "border-primary/50 text-primary";
  return (
    <span
      className={cn(
        "rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.14em]",
        tone,
      )}
    >
      {label}
    </span>
  );
}

function CustomerMenu() {
  const { table: token } = Route.useParams();
  // Validate token is a UUID; if not, show an error message instead of proceeding.
  const isValidToken = /^[0-9a-f-]{36}$/i.test(token);
  if (!isValidToken) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6 text-center">
        <div className="max-w-sm">
          <p className="eyebrow">TANDO'S</p>
          <h1 className="mt-3 text-4xl font-display">Invalid table code</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            The QR code you scanned does not contain a valid table identifier. Please ask a staff member for assistance.
          </p>
        </div>
      </main>
    );
  }
  const queryClient = useQueryClient();
  const fetchMenu = useServerFn(getPublicMenu);
  const fetchContext = useServerFn(getTableContext);
  const submitOrder = useServerFn(placeOrder);
  const sendWaiterCall = useServerFn(callWaiter);
  const cart = useCart(token);

  const [view, setView] = useState<"menu" | "orders">("menu");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [detail, setDetail] = useState<MenuItem | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [confirmed, setConfirmed] = useState<{ code: string; label: string } | null>(null);

  const menuQuery = useQuery({
    queryKey: ["public-menu"],
    queryFn: () => fetchMenu(),
    staleTime: 60_000,
  });

  const contextQuery = useQuery<TableContext>({
    queryKey: ["table-context", token],
    queryFn: () => fetchContext({ data: { token } }),
    refetchInterval: 10_000,
    retry: false,
  });

  const categories = menuQuery.data?.categories ?? [];
  const settings = contextQuery.data?.settings ?? menuQuery.data?.settings ?? null;
  const session = contextQuery.data?.session ?? null;

  useEffect(() => {
    if (!activeCategory && categories.length) setActiveCategory(categories[0]!.id);
  }, [activeCategory, categories]);

  const itemsById = useMemo(() => {
    const map = new Map<string, MenuItem>();
    for (const c of categories) for (const i of c.items) map.set(i.id, i);
    return map;
  }, [categories]);

  const cartDetail = cart.lines
    .map((l) => ({ line: l, item: itemsById.get(l.id) }))
    .filter((x): x is { line: CartLine; item: MenuItem } => Boolean(x.item));
  const cartTotal = cartDetail.reduce((s, x) => s + x.item.price * x.line.quantity, 0);
  const cartCount = cartDetail.reduce((s, x) => s + x.line.quantity, 0);

  const orderMutation = useMutation({
    mutationFn: () =>
      submitOrder({
        data: {
          token,
          items: cart.lines.map((l) => ({ menu_item_id: l.id, quantity: l.quantity })),
        },
      }),
    onSuccess: (result) => {
      cart.clear();
      setCartOpen(false);
      setConfirmed({ code: result.code, label: result.table_label });
      void queryClient.invalidateQueries({ queryKey: ["table-context", token] });
    },
    onError: (error: Error) => {
      const message = error.message ?? "";
      if (message.includes("UNAVAILABLE:")) {
        toast.error(
          `Just sold out: ${message.split("UNAVAILABLE:")[1]}. Please remove it and try again.`,
        );
      } else if (message.includes("TABLE_NOT_FOUND")) {
        toast.error("This table code isn't recognised. Please ask our staff for help.");
      } else {
        toast.error("We couldn't send your order. Please check your connection and retry.");
      }
    },
  });

  const waiterMutation = useMutation({
    mutationFn: () => sendWaiterCall({ data: { token } }),
    onSuccess: (result) => {
      if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate([700, 250, 700]);
      toast.success(result.reused ? "Your waiter call is already with the team." : "Waiter called — we’ll be right over.");
    },
    onError: () => toast.error("We couldn’t call a waiter. Please try again or ask a team member."),
  });

  if (contextQuery.isError) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6 text-center">
        <div className="max-w-sm">
          <p className="eyebrow">TANDO'S</p>
          <h1 className="mt-3 text-4xl font-display">Table not recognised</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            The code you scanned isn't linked to a table. Please ask a member of staff to
            help you order.
          </p>
          <Link
            to="/"
            className="mt-6 inline-flex min-h-11 items-center rounded-md border border-border px-5 text-sm"
          >
            About the restaurant
          </Link>
        </div>
      </main>
    );
  }

  const loading = menuQuery.isLoading || contextQuery.isLoading;
  const tableLabel = contextQuery.data?.table.label ?? "";
  const current = categories.find((c) => c.id === activeCategory) ?? categories[0];

  return (
    <main className="min-h-screen pb-28">
      {/* Hero */}
      <header className="relative isolate overflow-hidden">
        <img
          src={settings?.cover_image_url ?? "/images/hero.jpg"}
          alt={`${settings?.name ?? "TANDO'S"} dining room`}
          width={1600}
          height={1008}
          className="absolute inset-0 -z-10 h-full w-full object-cover opacity-45"
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-background/60 via-background/70 to-background" />
        <div className="mx-auto max-w-5xl px-5 pb-8 pt-12 text-center sm:pt-16">
          <p className="eyebrow">{tableLabel || "Your table"}</p>
          <h1 className="mt-3 text-5xl leading-none font-display tracking-wide sm:text-6xl">
            {settings?.name ?? "TANDO'S"}
          </h1>
          <p className="mt-2 text-xs uppercase tracking-[0.32em] text-primary">
            {settings?.tagline ?? "Flavours Beyond Borders"}
          </p>
          <div className="gold-rule mx-auto mt-6 w-32" />
          <div className="mt-6 inline-flex rounded-full border border-border bg-card/70 p-1 backdrop-blur">
            <button
              onClick={() => setView("menu")}
              className={cn(
                "min-h-10 rounded-full px-5 text-sm transition-colors",
                view === "menu"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground",
              )}
            >
              Menu
            </button>
            <button
              onClick={() => setView("orders")}
              className={cn(
                "min-h-10 rounded-full px-5 text-sm transition-colors",
                view === "orders"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground",
              )}
            >
              Your orders{session ? ` (${session.batches.length})` : ""}
            </button>
          </div>
        </div>
      </header>

      {loading ? (
        <div className="mx-auto max-w-5xl px-5 py-12">
          <div className="space-y-4">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-28 animate-pulse rounded-xl border border-border bg-card"
              />
            ))}
          </div>
        </div>
      ) : view === "menu" ? (
        <section className="mx-auto max-w-5xl px-5">
          {/* Category rail */}
          <div className="sticky top-0 z-20 -mx-5 mb-6 bg-background/95 px-5 py-3 backdrop-blur">
            <div className="scrollbar-none flex gap-2 overflow-x-auto">
              {categories.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setActiveCategory(c.id)}
                  className={cn(
                    "min-h-10 shrink-0 rounded-full border px-4 text-sm transition-colors",
                    c.id === current?.id
                      ? "border-primary bg-primary/15 text-primary"
                      : "border-border text-muted-foreground hover:text-foreground",
                  )}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          {current ? (
            <>
              <div className="mb-5">
                <h2 className="text-3xl font-display">{current.name}</h2>
                {current.subtitle ? (
                  <p className="text-sm text-muted-foreground">{current.subtitle}</p>
                ) : null}
              </div>

              {current.items.length === 0 ? (
                <EmptyState
                  title="Nothing here yet"
                  body="This section is being updated. Please explore our other categories."
                />
              ) : (
                <ul className="grid gap-4 sm:grid-cols-2">
                  {current.items.map((item) => (
                    <li key={item.id}>
                      <article className="plate group flex gap-4 overflow-hidden rounded-xl p-3">
                        <button
                          onClick={() => setDetail(item)}
                          className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-muted"
                          aria-label={`View ${item.name}`}
                        >
                          {item.media[0] ? (
                            <img
                              src={item.media[0].url}
                              alt={item.name}
                              loading="lazy"
                              width={1200}
                              height={912}
                              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                          ) : (
                            <span className="grid h-full place-items-center text-muted-foreground">
                              <Utensils className="h-5 w-5" />
                            </span>
                          )}
                        </button>
                        <div className="flex min-w-0 flex-1 flex-col">
                          <button
                            onClick={() => setDetail(item)}
                            className="text-left"
                          >
                            <h3 className="truncate text-lg font-display">{item.name}</h3>
                            <p className="line-clamp-2 text-xs text-muted-foreground">
                              {item.description}
                            </p>
                          </button>
                          {item.tags.length ? (
                            <div className="mt-1.5 flex flex-wrap gap-1">
                              {item.tags.map((t) => (
                                <Tag key={t} label={t} />
                              ))}
                            </div>
                          ) : null}
                          <div className="mt-auto flex items-center justify-between pt-2">
                            <span className="text-base text-primary">
                              {money(item.price)}
                            </span>
                            {item.is_available ? (
                              <button
                                onClick={() => {
                                  cart.add(item.id);
                                  toast.success(`${item.name} added`);
                                }}
                                className="inline-flex min-h-10 min-w-10 items-center justify-center gap-1 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground transition-transform active:scale-95"
                                aria-label={`Add ${item.name} to cart`}
                              >
                                <Plus className="h-4 w-4" /> Add
                              </button>
                            ) : (
                              <span className="rounded-lg border border-border px-3 py-2 text-xs text-muted-foreground">
                                Unavailable
                              </span>
                            )}
                          </div>
                        </div>
                      </article>
                    </li>
                  ))}
                </ul>
              )}
            </>
          ) : (
            <EmptyState
              title="Menu coming soon"
              body="Our kitchen is updating the menu. Please ask our staff for today's dishes."
            />
          )}

          <RestaurantFooter settings={settings} />
        </section>
      ) : (
        <section className="mx-auto max-w-3xl px-5">
          {session ? (
            <div className="space-y-5">
              <div className="plate rounded-xl p-5">
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                  <div className="min-w-0">
                    <p className="eyebrow">Session #{session.session_no}</p>
                    <h2 className="truncate text-2xl font-display">{tableLabel}</h2>
                    <p className="text-xs text-muted-foreground">
                      Opened {clockTime(session.opened_at)} · {session.item_count} items
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="eyebrow">Running bill</p>
                    <p className="text-2xl text-primary">{money(session.running_total)}</p>
                  </div>
                </div>
              </div>

              {session.batches.map((batch) => (
                <article key={batch.id} className="plate rounded-xl p-5">
                  <div className="flex items-baseline justify-between">
                    <h3 className="font-display text-lg">Order #{batch.code}</h3>
                    <span className="text-xs text-muted-foreground">
                      {clockTime(batch.created_at)}
                    </span>
                  </div>
                  <ul className="mt-3 space-y-1 text-sm">
                    {batch.items.map((i, idx) => (
                      <li key={idx} className="flex justify-between gap-3">
                        <span className="min-w-0 truncate">
                          {i.name} <span className="text-muted-foreground">×{i.quantity}</span>
                        </span>
                        <span className="shrink-0 text-muted-foreground">
                          {money(i.subtotal)}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-4 space-y-2">
                    {ORDER_STATUSES.map((status) => {
                      const currentIdx = ORDER_STATUSES.indexOf(
                        batch.status as (typeof ORDER_STATUSES)[number],
                      );
                      const idx = ORDER_STATUSES.indexOf(status);
                      const done = idx < currentIdx;
                      const active = idx === currentIdx;
                      return (
                        <div
                          key={status}
                          className={cn(
                            "flex items-center gap-2 text-sm",
                            done && "text-success",
                            active && "text-primary",
                            !done && !active && "text-muted-foreground",
                          )}
                        >
                          {done ? (
                            <Check className="h-4 w-4" />
                          ) : active ? (
                            <Circle className="h-4 w-4 fill-current" />
                          ) : (
                            <Circle className="h-4 w-4" />
                          )}
                          {status === "new" ? "Order received" : STATUS_LABEL[status]}
                        </div>
                      );
                    })}
                  </div>
                </article>
              ))}

              <button
                onClick={() => setView("menu")}
                className="min-h-12 w-full rounded-xl bg-primary text-base font-medium text-primary-foreground"
              >
                Order more
              </button>
              <p className="pb-6 text-center text-xs text-muted-foreground">
                Your bill stays open until our staff close the table.
              </p>
            </div>
          ) : (
            <div className="py-6">
              <EmptyState
                title="No orders yet"
                body="Choose your dishes from the menu — your table's bill starts with your first order."
                action={
                  <button
                    onClick={() => setView("menu")}
                    className="min-h-11 rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground"
                  >
                    Browse the menu
                  </button>
                }
              />
            </div>
          )}
        </section>
      )}

      {/* Sticky cart bar */}
      {cartCount > 0 && !confirmed ? (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 px-4 py-3 backdrop-blur">
          <button
            onClick={() => setCartOpen(true)}
            className="mx-auto flex w-full max-w-3xl min-h-12 items-center justify-between gap-3 rounded-xl bg-primary px-5 text-primary-foreground"
          >
            <span className="flex items-center gap-2 text-sm font-medium">
              <ShoppingBag className="h-4 w-4" />
              {cartCount} {cartCount === 1 ? "item" : "items"}
            </span>
            <span className="flex items-center gap-2 text-sm font-medium">
              {money(cartTotal)} <ChevronRight className="h-4 w-4" />
            </span>
          </button>
        </div>
      ) : null}

      <button
        onClick={() => waiterMutation.mutate()}
        disabled={waiterMutation.isPending || loading}
        className="fixed bottom-24 right-4 z-30 flex min-h-12 items-center gap-2 rounded-full border border-primary/70 bg-card px-4 text-xs font-medium text-primary shadow-lg disabled:opacity-70"
        aria-label="Call waiter"
      >
        {waiterMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <BellRing className="h-4 w-4" />}
        Call waiter
      </button>

      {/* Item detail */}
      {detail ? (
        <ItemDetail
          item={detail}
          onClose={() => setDetail(null)}
          onAdd={(qty) => {
            cart.add(detail.id, qty);
            setDetail(null);
            toast.success(`${detail.name} added`);
          }}
        />
      ) : null}

      {/* Cart sheet */}
      {cartOpen ? (
        <Overlay onClose={() => setCartOpen(false)} title="Your cart">
          {cartDetail.length === 0 ? (
            <EmptyState title="Your cart is empty" body="Add a dish to get started." />
          ) : (
            <>
              <p className="text-xs text-muted-foreground">{tableLabel}</p>
              <ul className="mt-4 space-y-3">
                {cartDetail.map(({ item, line }) => (
                  <li key={item.id} className="flex gap-3 rounded-lg border border-border p-3">
                    {item.media[0] ? (
                      <img
                        src={item.media[0].url}
                        alt={item.name}
                        loading="lazy"
                        className="h-16 w-16 shrink-0 rounded-md object-cover"
                      />
                    ) : null}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{money(item.price)}</p>
                      <div className="mt-2 flex items-center gap-2">
                        <button
                          onClick={() => cart.setQty(item.id, line.quantity - 1)}
                          className="grid h-9 w-9 place-items-center rounded-md border border-border"
                          aria-label={`Reduce ${item.name}`}
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="w-6 text-center text-sm">{line.quantity}</span>
                        <button
                          onClick={() => cart.setQty(item.id, line.quantity + 1)}
                          className="grid h-9 w-9 place-items-center rounded-md border border-border"
                          aria-label={`Add another ${item.name}`}
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => cart.remove(item.id)}
                          className="ml-auto grid h-9 w-9 place-items-center rounded-md border border-border text-destructive"
                          aria-label={`Remove ${item.name}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <span className="shrink-0 text-sm text-primary">
                      {money(item.price * line.quantity)}
                    </span>
                  </li>
                ))}
              </ul>
              <dl className="mt-5 space-y-1 border-t border-border pt-4 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <dt>Total items</dt>
                  <dd>{cartCount}</dd>
                </div>
                <div className="flex justify-between text-lg">
                  <dt className="font-display">Grand total</dt>
                  <dd className="text-primary">{money(cartTotal)}</dd>
                </div>
              </dl>
              <button
                onClick={() => orderMutation.mutate()}
                disabled={orderMutation.isPending}
                className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-base font-medium text-primary-foreground disabled:opacity-70"
              >
                {orderMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Sending to the kitchen…
                  </>
                ) : (
                  "Confirm order"
                )}
              </button>
              {session ? (
                <p className="mt-2 text-center text-xs text-muted-foreground">
                  This will be added to your open bill at {tableLabel}.
                </p>
              ) : null}
            </>
          )}
        </Overlay>
      ) : null}

      {/* Confirmation */}
      {confirmed ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-background/95 px-6 text-center">
          <div className="max-w-sm">
            <div className="mx-auto grid h-20 w-20 place-items-center rounded-full border border-primary text-primary">
              <Check className="h-8 w-8" />
            </div>
            <h2 className="mt-6 text-4xl font-display">Order confirmed</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {confirmed.label} · Order #{confirmed.code}
            </p>
            <p className="mt-4 text-sm text-muted-foreground">
              Your order has been received. We'll prepare it with care.
            </p>
            <div className="mt-8 space-y-3">
              <button
                onClick={() => {
                  setConfirmed(null);
                  setView("orders");
                }}
                className="min-h-12 w-full rounded-xl bg-primary text-base font-medium text-primary-foreground"
              >
                View order status
              </button>
              <button
                onClick={() => {
                  setConfirmed(null);
                  setView("menu");
                }}
                className="min-h-12 w-full rounded-xl border border-border text-base"
              >
                Order more
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed border-border p-8 text-center">
      <h3 className="font-display text-xl">{title}</h3>
      <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">{body}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

function Overlay({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-background/80 sm:items-center">
      <div
        className="absolute inset-0"
        onClick={onClose}
        role="presentation"
        aria-hidden="true"
      />
      <div className="relative max-h-[92vh] w-full overflow-y-auto rounded-t-2xl border border-border bg-card p-5 sm:max-w-lg sm:rounded-2xl">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-display text-2xl">{title}</h2>
          <button
            onClick={onClose}
            className="grid h-10 w-10 place-items-center rounded-full border border-border"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ItemDetail({
  item,
  onClose,
  onAdd,
}: {
  item: MenuItem;
  onClose: () => void;
  onAdd: (qty: number) => void;
}) {
  const images = item.media.filter((m) => m.media_type === "image");
  const [active, setActive] = useState(0);
  const [qty, setQty] = useState(1);
  const hero = images[active] ?? images[0];

  return (
    <Overlay title={item.name} onClose={onClose}>
      <div className="overflow-hidden rounded-xl bg-muted">
        {hero ? (
          <img
            src={hero.url}
            alt={item.name}
            width={1200}
            height={912}
            className="aspect-[4/3] w-full object-cover"
          />
        ) : (
          <div className="grid aspect-[4/3] place-items-center text-muted-foreground">
            <Utensils className="h-8 w-8" />
          </div>
        )}
      </div>

      {images.length > 1 ? (
        <div className="mt-3 flex gap-2 overflow-x-auto scrollbar-none">
          {images.map((m, i) => (
            <button
              key={m.id}
              onClick={() => setActive(i)}
              className={cn(
                "h-16 w-16 shrink-0 overflow-hidden rounded-lg border",
                i === active ? "border-primary" : "border-border",
              )}
              aria-label={`${item.name} photo ${i + 1}`}
            >
              <img
                src={m.url}
                alt={`${item.name} photo ${i + 1}`}
                loading="lazy"
                className="h-full w-full object-cover"
              />
            </button>
          ))}
        </div>
      ) : null}

      <div className="mt-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-2xl font-display">{item.name}</h3>
          {item.tags.length ? (
            <div className="mt-2 flex flex-wrap gap-1">
              {item.tags.map((t) => (
                <Tag key={t} label={t} />
              ))}
            </div>
          ) : null}
        </div>
        <span className="shrink-0 text-xl text-primary">{money(item.price)}</span>
      </div>

      {item.description ? (
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          {item.description}
        </p>
      ) : null}

      {item.reel_url ? (
        <a
          href={item.reel_url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 flex min-h-12 items-center justify-center gap-2 rounded-xl border border-primary/60 text-sm text-primary"
        >
          <Play className="h-4 w-4" /> Watch reel
        </a>
      ) : null}

      {item.is_available ? (
        <div className="mt-5 flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-xl border border-border p-1">
            <button
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              className="grid h-10 w-10 place-items-center rounded-lg"
              aria-label="Reduce quantity"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="w-6 text-center">{qty}</span>
            <button
              onClick={() => setQty((q) => Math.min(20, q + 1))}
              className="grid h-10 w-10 place-items-center rounded-lg"
              aria-label="Increase quantity"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <button
            onClick={() => onAdd(qty)}
            className="min-h-12 flex-1 rounded-xl bg-primary font-medium text-primary-foreground"
          >
            Add to cart
          </button>
        </div>
      ) : (
        <p className="mt-5 rounded-xl border border-border p-4 text-center text-sm text-muted-foreground">
          This dish is unavailable right now.
        </p>
      )}
    </Overlay>
  );
}

function RestaurantFooter({
  settings,
}: {
  settings: {
    name: string;
    about: string | null;
    address: string | null;
    opening_hours: string | null;
    instagram_url: string | null;
  } | null;
}) {
  if (!settings) return null;
  return (
    <footer className="mt-16 border-t border-border py-10 text-center">
      <p className="eyebrow">About</p>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
        {settings.about}
      </p>
      <div className="mt-5 space-y-1 text-xs text-muted-foreground">
        {settings.address ? <p>{settings.address}</p> : null}
        {settings.opening_hours ? <p>{settings.opening_hours}</p> : null}
      </div>
      {settings.instagram_url ? (
        <a
          href={settings.instagram_url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-block text-xs uppercase tracking-[0.2em] text-primary"
        >
          Instagram
        </a>
      ) : null}
    </footer>
  );
}
