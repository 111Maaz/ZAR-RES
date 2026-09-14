import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { fetchSettings } from "@/lib/admin-data";

export const Route = createFileRoute("/_authenticated/admin/settings")({
  component: SettingsPage,
});

const FIELDS = [
  { key: "name", label: "Restaurant name", type: "text" },
  { key: "tagline", label: "Tagline", type: "text" },
  { key: "logo_url", label: "Logo image URL", type: "text" },
  { key: "cover_image_url", label: "Cover image URL", type: "text" },
  { key: "address", label: "Address", type: "text" },
  { key: "opening_hours", label: "Opening hours", type: "text" },
  { key: "phone", label: "Phone", type: "text" },
  { key: "instagram_url", label: "Instagram link", type: "text" },
  { key: "about", label: "About the restaurant", type: "textarea" },
] as const;

function SettingsPage() {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<Record<string, string> | null>(null);

  const settings = useQuery({ queryKey: ["admin-settings"], queryFn: fetchSettings });

  const save = useMutation({
    mutationFn: async (values: Record<string, string>) => {
      const payload = Object.fromEntries(
        Object.entries(values).map(([k, v]) => [k, v.trim() === "" ? null : v]),
      );
      const { error } = await supabase
        .from("restaurant_settings")
        .update(payload as never)
        .eq("id", true);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Branding updated");
      void queryClient.invalidateQueries({ queryKey: ["admin-settings"] });
      void queryClient.invalidateQueries({ queryKey: ["public-menu"] });
    },
    onError: () => toast.error("Those changes couldn't be saved."),
  });

  const current =
    draft ??
    Object.fromEntries(
      FIELDS.map((f) => [
        f.key,
        String((settings.data as Record<string, unknown> | null)?.[f.key] ?? ""),
      ]),
    );

  return (
    <div className="max-w-2xl space-y-6">
      <header>
        <p className="eyebrow">Branding</p>
        <h1 className="text-3xl font-display">Restaurant settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          These details appear on the guest menu that opens from your table QR codes.
        </p>
      </header>

      {settings.isLoading ? (
        <div className="h-64 animate-pulse rounded-xl border border-border bg-card" />
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate(current);
          }}
          className="plate space-y-4 rounded-xl p-5"
        >
          {FIELDS.map((f) => (
            <div key={f.key}>
              <label htmlFor={f.key} className="eyebrow">
                {f.label}
              </label>
              {f.type === "textarea" ? (
                <textarea
                  id={f.key}
                  rows={4}
                  value={current[f.key] ?? ""}
                  onChange={(e) => setDraft({ ...current, [f.key]: e.target.value })}
                  className="mt-2 w-full rounded-lg border border-input bg-background p-3 text-sm"
                />
              ) : (
                <input
                  id={f.key}
                  value={current[f.key] ?? ""}
                  onChange={(e) => setDraft({ ...current, [f.key]: e.target.value })}
                  className="mt-2 min-h-11 w-full rounded-lg border border-input bg-background px-3 text-sm"
                />
              )}
            </div>
          ))}
          <button
            type="submit"
            disabled={save.isPending}
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm font-medium text-primary-foreground sm:w-auto sm:px-8"
          >
            {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Save changes
          </button>
        </form>
      )}
    </div>
  );
}
