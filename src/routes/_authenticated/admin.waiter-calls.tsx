import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BellRing, Check, Loader2 } from "lucide-react";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { fetchWaiterCalls, updateWaiterCall } from "@/lib/admin-data";
import { clockTime } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/waiter-calls")({ component: WaiterCallsPage });

function WaiterCallsPage() {
  const client = useQueryClient();
  const seen = useRef(new Set<string>());
  const calls = useQuery({ queryKey: ["waiter-calls"], queryFn: fetchWaiterCalls, refetchInterval: 10_000 });
  const update = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "acknowledged" | "resolved" }) => updateWaiterCall(id, status),
    onSuccess: () => void client.invalidateQueries({ queryKey: ["waiter-calls"] }),
    onError: () => toast.error("That waiter call could not be updated."),
  });

  useEffect(() => {
    const channel = supabase.channel("waiter-call-live").on("postgres_changes", { event: "*", schema: "public", table: "waiter_calls" }, () => {
      void client.invalidateQueries({ queryKey: ["waiter-calls"] });
    }).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [client]);
  useEffect(() => {
    for (const call of calls.data ?? []) {
      if (call.status === "new" && !seen.current.has(call.id)) {
        seen.current.add(call.id);
        if (seen.current.size > 1) {
          try { new Audio("data:audio/wav;base64,UklGRjIAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQ4AAAAA////AP///wD///8A").play(); } catch { /* browser permissions vary */ }
        }
      }
    }
  }, [calls.data]);

  const rows = calls.data ?? [];
  const open = rows.filter((call) => call.status !== "resolved");
  return <div className="space-y-6">
    <header><p className="eyebrow">Service requests</p><h1 className="text-3xl font-display">Waiter calls</h1></header>
    {calls.isLoading ? <div className="h-32 animate-pulse rounded-xl border border-border bg-card" /> : open.length === 0 ? (
      <div className="rounded-xl border border-dashed border-border p-10 text-center"><Check className="mx-auto h-6 w-6 text-success" /><p className="mt-3 font-display text-xl">All clear</p><p className="mt-1 text-sm text-muted-foreground">New assistance requests will appear here immediately.</p></div>
    ) : <ul className="space-y-3">{open.map((call) => <li key={call.id} className={"plate flex flex-wrap items-center gap-4 rounded-xl p-4 " + (call.status === "new" ? "border-primary/70" : "") }>
      <BellRing className="h-5 w-5 text-primary" /><div className="min-w-32 flex-1"><p className="font-display text-xl">{call.table_label}</p><p className="text-xs text-muted-foreground">{clockTime(call.created_at)} · {call.status === "new" ? "Needs attention" : "Acknowledged"}</p></div>
      {call.status === "new" ? <button onClick={() => update.mutate({ id: call.id, status: "acknowledged" })} disabled={update.isPending} className="min-h-10 rounded-lg border border-primary/60 px-4 text-xs text-primary">Acknowledge</button> : null}
      <button onClick={() => update.mutate({ id: call.id, status: "resolved" })} disabled={update.isPending} className="flex min-h-10 items-center gap-2 rounded-lg bg-primary px-4 text-xs text-primary-foreground">{update.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : null} Resolved</button>
    </li>)}</ul>}
    {rows.some((call) => call.status === "resolved") ? <p className="text-xs text-muted-foreground">Resolved calls are retained in operational history.</p> : null}
  </div>;
}
