import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Loader2, Pencil, Plus, QrCode, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { fetchTables, type AdminTableRow } from "@/lib/admin-data";
import { money } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/tables")({
  component: TablesPage,
});

function slugify(label: string) {
  return label
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function TablesPage() {
  const queryClient = useQueryClient();
  const [label, setLabel] = useState("");
  const [qrTable, setQrTable] = useState<AdminTableRow | null>(null);

  const tables = useQuery({ queryKey: ["admin-tables"], queryFn: fetchTables });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["admin-tables"] });

  const addTable = useMutation({
    mutationFn: async (name: string) => {
      const slug = slugify(name);
      if (!slug) throw new Error("Please enter a table name.");
      const { error } = await supabase.from("restaurant_tables").insert({
        label: name.trim(),
        slug,
        sort_order: (tables.data?.length ?? 0) + 1,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      setLabel("");
      toast.success("Table added");
      void refresh();
    },
    onError: (e: Error) =>
      toast.error(
        e.message.includes("duplicate")
          ? "A table with that name or code already exists."
          : e.message,
      ),
  });

  const renameTable = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await supabase
        .from("restaurant_tables")
        .update({ label: name.trim() })
        .eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Table renamed");
      void refresh();
    },
    onError: () => toast.error("Rename failed. Please try again."),
  });

  const removeTable = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("restaurant_tables").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Table removed");
      void refresh();
    },
    onError: () => toast.error("This table couldn't be removed."),
  });

  const rows = tables.data ?? [];

  return (
    <div className="space-y-6">
      <header>
        <p className="eyebrow">Floor plan</p>
        <h1 className="text-3xl font-display">Tables & QR codes</h1>
      </header>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          addTable.mutate(label);
        }}
        className="plate flex flex-col gap-3 rounded-xl p-4 sm:flex-row"
      >
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Table 13"
          aria-label="New table name"
          className="min-h-11 flex-1 rounded-lg border border-input bg-background px-3 text-sm"
        />
        <button
          type="submit"
          disabled={addTable.isPending}
          className="flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground"
        >
          {addTable.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          Add table
        </button>
      </form>

      {tables.isLoading ? (
        <div className="h-40 animate-pulse rounded-xl border border-border bg-card" />
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center">
          <p className="font-display text-xl">No tables yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Add your first table above to generate its QR code.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
          {rows.map((t) => (
            <li
              key={t.id}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 p-4"
            >
              <div className="min-w-0">
                <p className="truncate font-display text-lg">{t.label}</p>
                <p className="truncate text-xs text-muted-foreground">Permanent QR ready</p>
                {t.session ? (
                  <p className="mt-1 text-xs text-primary">
                    Active · {money(t.session.total)} · {t.session.orders} orders
                  </p>
                ) : (
                  <p className="mt-1 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                    Available
                  </p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {t.session ? (
                  <Link
                    to="/admin/table/$tableId"
                    params={{ tableId: t.id }}
                    className="min-h-10 rounded-lg border border-primary/60 px-3 text-xs leading-10 text-primary"
                  >
                    Open
                  </Link>
                ) : null}
                <button
                  onClick={() => setQrTable(t)}
                  className="grid h-10 w-10 place-items-center rounded-lg border border-border"
                  aria-label={`QR code for ${t.label}`}
                >
                  <QrCode className="h-4 w-4" />
                </button>
                <button
                  onClick={() => {
                    const name = window.prompt("Rename table", t.label);
                    if (name && name.trim()) renameTable.mutate({ id: t.id, name });
                  }}
                  className="grid h-10 w-10 place-items-center rounded-lg border border-border"
                  aria-label={`Rename ${t.label}`}
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => {
                    if (t.session) {
                      toast.error("Close this table's session before removing it.");
                      return;
                    }
                    if (window.confirm(`Remove ${t.label}? Its history is kept.`))
                      removeTable.mutate(t.id);
                  }}
                  className="grid h-10 w-10 place-items-center rounded-lg border border-border text-destructive"
                  aria-label={`Remove ${t.label}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {qrTable ? <QrDialog table={qrTable} onClose={() => setQrTable(null)} /> : null}
    </div>
  );
}

function QrDialog({ table, onClose }: { table: AdminTableRow; onClose: () => void }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [url, setUrl] = useState("");

  useEffect(() => {
    const target = `${window.location.origin}/menu/${table.qr_token}`;
    setUrl(target);
    QRCode.toDataURL(target, {
      width: 900,
      margin: 1,
      color: { dark: "#1a1512", light: "#ffffff" },
    })
      .then(setDataUrl)
      .catch(() => setDataUrl(null));
  }, [table.slug]);

  function print() {
    const win = window.open("", "_blank", "width=600,height=800");
    if (!win || !dataUrl) return;
    win.document.write(
      `<html><head><title>${table.label} QR</title></head><body style="font-family:Georgia,serif;text-align:center;padding:48px">
       <h1 style="letter-spacing:.2em;text-transform:uppercase;font-size:14px">Zaytün Restaurant</h1>
       <h2 style="font-size:34px;margin:8px 0 24px">${table.label}</h2>
       <img src="${dataUrl}" style="width:340px;height:340px" alt="QR code" />
       <p style="margin-top:24px;font-size:13px">Scan to view the menu and order</p>
       </body></html>`,
    );
    win.document.close();
    win.focus();
    win.print();
  }

  async function share() {
    if (navigator.share) {
      try {
        await navigator.share({ title: `${table.label} QR`, text: `Order at ${table.label}`, url });
        return;
      } catch {
        return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      toast.success("QR link copied");
    } catch {
      toast.error("Unable to copy the QR link on this device.");
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-background/85 p-5">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 text-center">
        <p className="eyebrow">Permanent table code</p>
        <h2 className="mt-1 font-display text-2xl">{table.label}</h2>
        <div className="mx-auto mt-5 w-48 overflow-hidden rounded-xl bg-white p-3">
          {dataUrl ? (
            <img src={dataUrl} alt={`QR code for ${table.label}`} className="w-full" />
          ) : (
            <div className="grid aspect-square place-items-center text-xs text-muted-foreground">
              Generating…
            </div>
          )}
        </div>
        <p className="mt-3 break-all text-xs text-muted-foreground">{url}</p>
        <div className="mt-5 grid gap-2 sm:grid-cols-3">
          <button
            onClick={print}
            className="min-h-11 rounded-lg bg-primary text-sm font-medium text-primary-foreground"
          >
            Print
          </button>
          <a
            href={dataUrl ?? "#"}
            download={`${table.slug}-qr.png`}
            className="min-h-11 rounded-lg border border-border text-sm leading-[2.75rem]"
          >
            Download
          </a>
          <button onClick={share} className="min-h-11 rounded-lg border border-border text-sm">
            Share
          </button>
        </div>
        <button onClick={onClose} className="mt-3 w-full text-xs text-muted-foreground">
          Close
        </button>
      </div>
    </div>
  );
}
