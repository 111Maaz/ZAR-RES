import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { fetchOrderQueue, updateBatchStatus } from "@/lib/admin-data";
import { clockTime, money, nextStatus, STATUS_LABEL, type OrderStatus } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/orders")({
  component: OrdersQueue,
});

const FILTERS = ["active", "new", "preparing", "ready", "served"] as const;

function OrdersQueue() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("active");

  const queue = useQuery({ queryKey: ["admin-queue"], queryFn: fetchOrderQueue });

  useEffect(() => {
    const channel = supabase
      .channel("orders-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "order_batches" }, () => {
        void queryClient.invalidateQueries({ queryKey: ["admin-queue"] });
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const advance = useMutation({
    mutationFn: ({ id, status }: { id: string; status: OrderStatus }) =>
      updateBatchStatus(id, status),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-queue"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-tables"] });
    },
    onError: () => toast.error("That update didn't go through. Please try again."),
  });

  const all = queue.data ?? [];
  const rows =
    filter === "active" ? all.filter((b) => b.status !== "served") : all.filter((b) => b.status === filter);

  return (
    <div className="space-y-6">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3">
        <div className="min-w-0">
          <p className="eyebrow">First come, first served</p>
          <h1 className="text-3xl font-display">Order queue</h1>
        </div>
        <p className="shrink-0 text-xs text-muted-foreground">{rows.length} orders</p>
      </header>

      <div className="scrollbar-none flex gap-2 overflow-x-auto">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "min-h-9 shrink-0 rounded-full border px-4 text-xs uppercase tracking-[0.14em]",
              filter === f
                ? "border-primary bg-primary/15 text-primary"
                : "border-border text-muted-foreground",
            )}
          >
            {f === "active" ? "Needs attention" : f}
          </button>
        ))}
      </div>

      {queue.isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-28 animate-pulse rounded-xl border border-border bg-card"
            />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center">
          <p className="font-display text-xl">Nothing waiting</p>
          <p className="mt-1 text-sm text-muted-foreground">
            New orders appear here the moment a guest confirms them.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {rows.map((b) => {
            const next = nextStatus(b.status as OrderStatus);
            return (
              <li
                key={b.id}
                className={cn(
                  "rounded-xl border p-4",
                  b.status === "new"
                    ? "border-primary bg-primary/10"
                    : "border-border bg-card",
                )}
              >
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                  <div className="min-w-0">
                    <p className="eyebrow">{STATUS_LABEL[b.status as OrderStatus]}</p>
                    <h2 className="truncate font-display text-xl">
                      Order #{b.code} · {b.table_label}
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      Received {clockTime(b.created_at)} · session #{b.session_no}
                    </p>
                  </div>
                  <p className="shrink-0 text-lg text-primary">{money(b.total)}</p>
                </div>

                <ul className="mt-3 space-y-1 text-sm">
                  {b.items.map((i, idx) => (
                    <li key={idx} className="flex justify-between gap-3">
                      <span className="min-w-0 truncate">
                        {i.name_snapshot}{" "}
                        <span className="text-muted-foreground">×{i.quantity}</span>
                      </span>
                      <span className="shrink-0 text-muted-foreground">
                        {money(i.subtotal)}
                      </span>
                    </li>
                  ))}
                </ul>

                <div className="mt-4 flex flex-wrap gap-2">
                  {next ? (
                    <button
                      onClick={() => advance.mutate({ id: b.id, status: next })}
                      disabled={advance.isPending}
                      className="min-h-11 flex-1 rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground sm:flex-none"
                    >
                      Mark {STATUS_LABEL[next].toLowerCase()}
                    </button>
                  ) : (
                    <span className="min-h-11 rounded-lg border border-success/50 px-5 text-sm leading-[2.75rem] text-success">
                      Served
                    </span>
                  )}
                  <Link
                    to="/admin/table/$tableId"
                    params={{ tableId: b.table_id }}
                    className="min-h-11 rounded-lg border border-border px-5 text-sm leading-[2.75rem]"
                  >
                    Open table
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
