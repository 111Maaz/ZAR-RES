import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import {
  closeSession,
  fetchActiveSessionForTable,
  updateBatchStatus,
} from "@/lib/admin-data";
import {
  clockTime,
  duration,
  money,
  nextStatus,
  STATUS_LABEL,
  type OrderStatus,
} from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/table/$tableId")({
  component: TableSessionPage,
});

const PAYMENTS = [
  { value: "cash", label: "Cash" },
  { value: "upi", label: "UPI" },
  { value: "card", label: "Card" },
  { value: "other", label: "Other" },
] as const;

function TableSessionPage() {
  const { tableId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [checkout, setCheckout] = useState(false);
  const [payment, setPayment] = useState<string>("cash");

  const tableQuery = useQuery({
    queryKey: ["admin-table", tableId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("restaurant_tables")
        .select("id, label, slug")
        .eq("id", tableId)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data;
    },
  });

  const sessionQuery = useQuery({
    queryKey: ["admin-session", tableId],
    queryFn: () => fetchActiveSessionForTable(tableId),
  });

  useEffect(() => {
    const channel = supabase
      .channel(`table-${tableId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "order_batches" }, () => {
        void queryClient.invalidateQueries({ queryKey: ["admin-session", tableId] });
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient, tableId]);

  const advance = useMutation({
    mutationFn: ({ id, status }: { id: string; status: OrderStatus }) =>
      updateBatchStatus(id, status),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-session", tableId] });
      void queryClient.invalidateQueries({ queryKey: ["admin-queue"] });
    },
    onError: () => toast.error("That update didn't go through."),
  });

  const finish = useMutation({
    mutationFn: async () => {
      const session = sessionQuery.data;
      if (!session) throw new Error("No active session");
      await closeSession(session.id, session.total, payment);
    },
    onSuccess: () => {
      toast.success("Table closed and bill recorded");
      void queryClient.invalidateQueries({ queryKey: ["admin-tables"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-queue"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-history"] });
      navigate({ to: "/admin/tables" });
    },
    onError: () => toast.error("Checkout failed. Please try again."),
  });

  const table = tableQuery.data;
  const session = sessionQuery.data;

  return (
    <div className="space-y-6">
      <Link
        to="/admin/tables"
        className="inline-flex items-center gap-2 text-xs text-muted-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> All tables
      </Link>

      <header>
        <p className="eyebrow">{session ? `Session #${session.session_no}` : "No open session"}</p>
        <h1 className="text-3xl font-display">{table?.label ?? "Table"}</h1>
      </header>

      {sessionQuery.isLoading ? (
        <div className="h-40 animate-pulse rounded-xl border border-border bg-card" />
      ) : !session ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center">
          <p className="font-display text-xl">Table is available</p>
          <p className="mt-1 text-sm text-muted-foreground">
            A new session opens automatically when a guest places their first order.
          </p>
        </div>
      ) : (
        <>
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Current bill" value={money(session.total)} highlight />
            <Stat label="Orders" value={String(session.batches.length)} />
            <Stat label="Opened" value={clockTime(session.opened_at)} />
            <Stat label="Seated for" value={duration(session.opened_at, null)} />
          </section>

          <section className="space-y-3">
            {session.batches.map((b) => {
              const next = nextStatus(b.status as OrderStatus);
              return (
                <article key={b.id} className="plate rounded-xl p-4">
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                    <div className="min-w-0">
                      <h2 className="truncate font-display text-lg">Order #{b.code}</h2>
                      <p className="text-xs text-muted-foreground">
                        {clockTime(b.created_at)} · {STATUS_LABEL[b.status as OrderStatus]}
                      </p>
                    </div>
                    <p className="shrink-0 text-primary">{money(b.total)}</p>
                  </div>
                  <ul className="mt-3 space-y-1 text-sm">
                    {b.items.map((i, idx) => (
                      <li key={idx} className="flex justify-between gap-3">
                        <span className="min-w-0 truncate">
                          {i.name_snapshot}{" "}
                          <span className="text-muted-foreground">×{i.quantity}</span>
                        </span>
                        <span className="shrink-0 text-muted-foreground">
                          {i.quantity} × {money(i.price_snapshot)} = {money(i.subtotal)}
                        </span>
                      </li>
                    ))}
                  </ul>
                  {next ? (
                    <button
                      onClick={() => advance.mutate({ id: b.id, status: next })}
                      className="mt-3 min-h-11 rounded-lg border border-primary/60 px-4 text-sm text-primary"
                    >
                      Mark {STATUS_LABEL[next].toLowerCase()}
                    </button>
                  ) : null}
                </article>
              );
            })}
          </section>

          <section className="plate rounded-xl p-5">
            <div className="flex items-baseline justify-between">
              <p className="font-display text-2xl">Total</p>
              <p className="text-2xl text-primary">{money(session.total)}</p>
            </div>
            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              <button
                onClick={() => window.print()}
                className="min-h-12 rounded-lg border border-border text-sm"
              >
                View / print bill
              </button>
              <button
                onClick={() => setCheckout(true)}
                className="min-h-12 rounded-lg bg-primary text-sm font-medium text-primary-foreground"
              >
                Checkout & close
              </button>
            </div>
          </section>
        </>
      )}

      {checkout && session ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-background/85 p-4">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-border bg-card p-6">
            <p className="eyebrow">Final bill</p>
            <h2 className="font-display text-2xl">{table?.label}</h2>
            <ul className="mt-4 space-y-2 text-sm">
              {session.batches.flatMap((b) =>
                b.items.map((i, idx) => (
                  <li key={`${b.id}-${idx}`} className="flex justify-between gap-3">
                    <span className="min-w-0">
                      <span className="block truncate">{i.name_snapshot}</span>
                      <span className="text-xs text-muted-foreground">
                        {i.quantity} × {money(i.price_snapshot)}
                      </span>
                    </span>
                    <span className="shrink-0">{money(i.subtotal)}</span>
                  </li>
                )),
              )}
            </ul>
            <div className="mt-4 flex items-baseline justify-between border-t border-border pt-4">
              <span className="font-display text-xl">Total</span>
              <span className="text-xl text-primary">{money(session.total)}</span>
            </div>

            <p className="eyebrow mt-5">Payment received as</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {PAYMENTS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => setPayment(p.value)}
                  className={
                    "min-h-11 rounded-lg border text-sm " +
                    (payment === p.value
                      ? "border-primary bg-primary/15 text-primary"
                      : "border-border")
                  }
                >
                  {p.label}
                </button>
              ))}
            </div>

            <button
              onClick={() => finish.mutate()}
              disabled={finish.isPending}
              className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm font-medium text-primary-foreground"
            >
              {finish.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Confirm checkout & free the table
            </button>
            <button
              onClick={() => setCheckout(false)}
              className="mt-3 w-full text-xs text-muted-foreground"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Stat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="plate rounded-xl p-4">
      <p className="eyebrow">{label}</p>
      <p className={"mt-1 text-xl " + (highlight ? "text-primary" : "")}>{value}</p>
    </div>
  );
}
