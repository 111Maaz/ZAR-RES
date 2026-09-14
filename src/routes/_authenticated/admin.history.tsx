import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { fetchClosedSessions, fetchSessionById } from "@/lib/admin-data";
import { clockTime, dayStamp, duration, money } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/history")({
  component: HistoryPage,
});

function HistoryPage() {
  const [openId, setOpenId] = useState<string | null>(null);
  const sessions = useQuery({ queryKey: ["admin-history"], queryFn: fetchClosedSessions });

  const detail = useQuery({
    queryKey: ["admin-history", openId],
    queryFn: () => fetchSessionById(openId!),
    enabled: Boolean(openId),
  });

  const rows = sessions.data ?? [];

  return (
    <div className="space-y-6">
      <header>
        <p className="eyebrow">Closed sessions</p>
        <h1 className="text-3xl font-display">Audit history</h1>
      </header>

      {sessions.isLoading ? (
        <div className="h-40 animate-pulse rounded-xl border border-border bg-card" />
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center">
          <p className="font-display text-xl">No closed sessions yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Every table you check out is archived here with its full bill.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
          {rows.map((s) => (
            <li key={s.id}>
              <button
                onClick={() => setOpenId(s.id)}
                className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 p-4 text-left hover:bg-accent"
              >
                <div className="min-w-0">
                  <p className="truncate font-display text-lg">
                    Session #{s.session_no} · {s.table_label}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {dayStamp(s.closed_at)} · {clockTime(s.opened_at)} →{" "}
                    {clockTime(s.closed_at)} · {duration(s.opened_at, s.closed_at)}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-lg text-primary">{money(s.final_total)}</p>
                  {s.payment_method ? (
                    <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                      {s.payment_method}
                    </p>
                  ) : null}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      {openId ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-background/85 p-4">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-border bg-card p-6">
            {detail.isLoading || !detail.data ? (
              <p className="text-sm text-muted-foreground">Loading session…</p>
            ) : (
              <>
                <p className="eyebrow">Session #{detail.data.session_no}</p>
                <h2 className="font-display text-2xl">{detail.data.table_label}</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  {clockTime(detail.data.opened_at)} → {clockTime(detail.data.closed_at)} ·{" "}
                  {duration(detail.data.opened_at, detail.data.closed_at)}
                  {detail.data.payment_method ? ` · paid by ${detail.data.payment_method}` : ""}
                </p>

                {detail.data.batches.map((b) => (
                  <section key={b.id} className="mt-4 border-t border-border pt-3">
                    <div className="flex justify-between text-sm">
                      <span className="font-display">Order #{b.code}</span>
                      <span className="text-muted-foreground">
                        {clockTime(b.created_at)}
                      </span>
                    </div>
                    <ul className="mt-2 space-y-1 text-sm">
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
                  </section>
                ))}

                <div className="mt-4 flex items-baseline justify-between border-t border-border pt-4">
                  <span className="font-display text-xl">Final total</span>
                  <span className="text-xl text-primary">
                    {money(detail.data.final_total ?? detail.data.total)}
                  </span>
                </div>
              </>
            )}
            <button
              onClick={() => setOpenId(null)}
              className="mt-5 min-h-11 w-full rounded-lg border border-border text-sm"
            >
              Close
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
