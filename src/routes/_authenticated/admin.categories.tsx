import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { fetchAdminMenu } from "@/lib/admin-data";

export const Route = createFileRoute("/_authenticated/admin/categories")({
  component: CategoriesPage,
});

function CategoriesPage() {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [subtitle, setSubtitle] = useState("");

  const menu = useQuery({ queryKey: ["admin-menu"], queryFn: fetchAdminMenu });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["admin-menu"] });

  const save = useMutation({
    mutationFn: async (payload: {
      id?: string;
      name?: string;
      subtitle?: string | null;
      image_url?: string | null;
      is_active?: boolean;
      sort_order?: number;
    }) => {
      if (payload.id) {
        const { id, ...rest } = payload;
        const { error } = await supabase.from("categories").update(rest).eq("id", id);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await supabase.from("categories").insert({
          name: payload.name!,
          subtitle: payload.subtitle ?? null,
          sort_order: (menu.data?.categories.length ?? 0) + 1,
        });
        if (error) throw new Error(error.message);
      }
    },
    onSuccess: () => {
      setName("");
      setSubtitle("");
      void refresh();
    },
    onError: () => toast.error("That change couldn't be saved."),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("categories").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Category deleted");
      void refresh();
    },
    onError: () => toast.error("Delete failed."),
  });

  const categories = menu.data?.categories ?? [];
  const items = menu.data?.items ?? [];

  function move(index: number, direction: -1 | 1) {
    const a = categories[index];
    const b = categories[index + direction];
    if (!a || !b) return;
    save.mutate({ id: a.id, sort_order: b.sort_order });
    save.mutate({ id: b.id, sort_order: a.sort_order });
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="eyebrow">Menu structure</p>
        <h1 className="text-3xl font-display">Categories</h1>
      </header>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim()) return;
          save.mutate({ name: name.trim(), subtitle: subtitle.trim() || null });
        }}
        className="plate grid gap-3 rounded-xl p-4 sm:grid-cols-[1fr_1fr_auto]"
      >
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Category name"
          aria-label="Category name"
          className="min-h-11 rounded-lg border border-input bg-background px-3 text-sm"
        />
        <input
          value={subtitle}
          onChange={(e) => setSubtitle(e.target.value)}
          placeholder="Short line (optional)"
          aria-label="Category subtitle"
          className="min-h-11 rounded-lg border border-input bg-background px-3 text-sm"
        />
        <button className="flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground">
          <Plus className="h-4 w-4" /> Add
        </button>
      </form>

      {menu.isLoading ? (
        <div className="h-40 animate-pulse rounded-xl border border-border bg-card" />
      ) : categories.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center">
          <p className="font-display text-xl">No categories yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Add sections like Starters, Biryani or Desserts.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {categories.map((c, index) => (
            <li
              key={c.id}
              className="plate grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-xl p-4"
            >
              <div className="min-w-0">
                <input
                  defaultValue={c.name}
                  onBlur={(e) =>
                    e.target.value.trim() && e.target.value !== c.name
                      ? save.mutate({ id: c.id, name: e.target.value.trim() })
                      : null
                  }
                  aria-label={`Name of ${c.name}`}
                  className="w-full bg-transparent font-display text-lg outline-none"
                />
                <input
                  defaultValue={c.subtitle ?? ""}
                  placeholder="Short line"
                  onBlur={(e) => save.mutate({ id: c.id, subtitle: e.target.value || null })}
                  aria-label={`Subtitle of ${c.name}`}
                  className="w-full bg-transparent text-xs text-muted-foreground outline-none"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  {items.filter((i) => i.category_id === c.id).length} dishes
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  onClick={() => save.mutate({ id: c.id, is_active: !c.is_active })}
                  className={
                    "min-h-10 rounded-lg border px-3 text-xs " +
                    (c.is_active
                      ? "border-success/60 text-success"
                      : "border-border text-muted-foreground")
                  }
                >
                  {c.is_active ? "Visible" : "Hidden"}
                </button>
                <button
                  onClick={() => move(index, -1)}
                  disabled={index === 0}
                  className="grid h-10 w-10 place-items-center rounded-lg border border-border disabled:opacity-40"
                  aria-label={`Move ${c.name} up`}
                >
                  <ArrowUp className="h-4 w-4" />
                </button>
                <button
                  onClick={() => move(index, 1)}
                  disabled={index === categories.length - 1}
                  className="grid h-10 w-10 place-items-center rounded-lg border border-border disabled:opacity-40"
                  aria-label={`Move ${c.name} down`}
                >
                  <ArrowDown className="h-4 w-4" />
                </button>
                <button
                  onClick={() => {
                    if (
                      window.confirm(
                        `Delete ${c.name}? Its dishes will be removed from the menu too.`,
                      )
                    )
                      remove.mutate(c.id);
                  }}
                  className="grid h-10 w-10 place-items-center rounded-lg border border-border text-destructive"
                  aria-label={`Delete ${c.name}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
