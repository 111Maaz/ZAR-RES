import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import { supabase } from "@/integrations/supabase/client";
import { fetchOrderQueue, fetchTables, fetchWaiterCalls } from "@/lib/admin-data";
import { clockTime, money } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: Dashboard,
});

function Dashboard() {
  const queryClient = useQueryClient();

  const tables = useQuery({ queryKey: ["admin-tables"], queryFn: fetchTables });
  const queue = useQuery({ queryKey: ["admin-queue"], queryFn: fetchOrderQueue });
  const calls = useQuery({ queryKey: ["waiter-calls"], queryFn: fetchWaiterCalls });

  useEffect(() => {
    const channel = supabase
      .channel("dashboard-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "order_batches" }, () => {
        void queryClient.invalidateQueries({ queryKey: ["admin-queue"] });
        void queryClient.invalidateQueries({ queryKey: ["admin-tables"] });
      })
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "table_sessions" },
        () => {
          void queryClient.invalidateQueries({ queryKey: ["admin-tables"] });
          void queryClient.invalidateQueries({ queryKey: ["admin-queue"] });
        },
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "waiter_calls" }, () => {
        void queryClient.invalidateQueries({ queryKey: ["waiter-calls"] });
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const rows = tables.data ?? [];
  const batches = queue.data ?? [];
  const waiterCalls = calls.data ?? [];
  const active = rows.filter((t) => t.session);
  const stats = [
    { label: "Active tables", value: active.length },
    { label: "New orders", value: batches.filter((b) => b.status === "new").length },
    { label: "Waiter calls", value: waiterCalls.filter((c) => c.status !== "resolved").length },
    { label: "Preparing", value: batches.filter((b) => b.status === "preparing").length },
    { label: "Ready", value: batches.filter((b) => b.status === "ready").length },
    {
      label: "Open bills",
      value: money(active.reduce((s, t) => s + (t.session?.total ?? 0), 0)),
    },
  ];

  return (
    <div className="space-y-8">
      <header>
        <p className="eyebrow">Service overview</p>
        <h1 className="text-3xl font-display">Tonight at a glance</h1>
      </header>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {stats.map((s) => (
          <div key={s.label} className="plate rounded-xl p-4">
            <p className="eyebrow">{s.label}</p>
            <p className="mt-1 text-2xl">{s.value}</p>
          </div>
        ))}
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-2xl">Tables</h2>
          <Link to="/admin/tables" className="text-xs text-primary">
            Manage tables
          </Link>
        </div>
        {tables.isLoading ? (
          <SkeletonGrid />
        ) : rows.length === 0 ? (
          <Empty
            title="No tables yet"
            body="Add your dining tables to start generating QR codes."
          />
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {rows.map((t) => (
              <li key={t.id}>
                <Link
                  to="/admin/table/$tableId"
                  params={{ tableId: t.id }}
                  className={cn(
                    "block rounded-xl border p-4 transition-colors",
                    t.session
                      ? "border-primary/60 bg-primary/10 hover:bg-primary/15"
                      : "border-border bg-card hover:bg-accent",
                  )}
                >
                  <p className="font-display text-lg">{t.label}</p>
                  {t.session ? (
                    <>
                      <p className="text-xl text-primary">{money(t.session.total)}</p>
                      <p className="text-xs text-muted-foreground">
                        {t.session.orders} {t.session.orders === 1 ? "order" : "orders"} ·
                        from {clockTime(t.session.opened_at)}
                      </p>
                    </>
                  ) : (
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                      Available
                    </p>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-2xl">Next up (first come, first served)</h2>
          <Link to="/admin/orders" className="text-xs text-primary">
            Full queue
          </Link>
        </div>
        {batches.filter((b) => b.status !== "served").length === 0 ? (
          <Empty title="Queue is clear" body="No orders are waiting on the kitchen." />
        ) : (
          <ul className="space-y-2">
            {batches
              .filter((b) => b.status !== "served")
              .slice(0, 6)
              .map((b) => (
                <li
                  key={b.id}
                  className="plate grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-xl p-4"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm">
                      #{b.code} · {b.table_label}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {b.items.map((i) => `${i.name_snapshot} ×${i.quantity}`).join(", ")}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-xs text-muted-foreground">{clockTime(b.created_at)}</p>
                    <p className="text-xs uppercase tracking-[0.14em] text-primary">
                      {b.status}
                    </p>
                  </div>
                </li>
              ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="h-24 animate-pulse rounded-xl border border-border bg-card" />
      ))}
    </div>
  );
}

function Empty({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border p-6 text-center">
      <p className="font-display text-lg">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}
