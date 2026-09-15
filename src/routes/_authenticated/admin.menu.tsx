import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { ArrowDown, ArrowUp, Image as ImageIcon, Pencil, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { fetchAdminMenu } from "@/lib/admin-data";
import { KNOWN_TAGS, money } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/menu")({
  component: MenuAdmin,
});

interface ItemRow {
  id: string;
  category_id: string;
  name: string;
  description: string | null;
  price: number | string;
  is_available: boolean;
  tags: string[];
  reel_url: string | null;
  sort_order: number;
}

interface MediaRow {
  id: string;
  menu_item_id: string;
  url: string;
  media_type: string;
  sort_order: number;
}

function MenuAdmin() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<Partial<ItemRow> | null>(null);

  const menu = useQuery({ queryKey: ["admin-menu"], queryFn: fetchAdminMenu });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["admin-menu"] });

  const saveItem = useMutation({
    mutationFn: async (item: Partial<ItemRow>) => {
      const payload = {
        category_id: item.category_id!,
        name: (item.name ?? "").trim(),
        description: item.description?.trim() || null,
        price: Number(item.price ?? 0),
        is_available: item.is_available ?? true,
        tags: item.tags ?? [],
        reel_url: item.reel_url?.trim() || null,
        sort_order: item.sort_order ?? 999,
      };
      if (!payload.name) throw new Error("Please give the dish a name.");
      if (!payload.category_id) throw new Error("Please pick a category.");
      if (item.id) {
        const { error } = await supabase.from("menu_items").update(payload).eq("id", item.id);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await supabase.from("menu_items").insert(payload);
        if (error) throw new Error(error.message);
      }
    },
    onSuccess: () => {
      toast.success("Dish saved");
      setEditing(null);
      void refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const patchItem = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Record<string, unknown> }) => {
      const { error } = await supabase.from("menu_items").update(patch as never).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => void refresh(),
    onError: () => toast.error("That change couldn't be saved."),
  });

  const removeItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("menu_items").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Dish removed");
      void refresh();
    },
    onError: () => toast.error("Delete failed."),
  });

  const categories = menu.data?.categories ?? [];
  const items = (menu.data?.items ?? []) as ItemRow[];
  const media = (menu.data?.media ?? []) as MediaRow[];

  function move(list: ItemRow[], index: number, direction: -1 | 1) {
    const a = list[index];
    const b = list[index + direction];
    if (!a || !b) return;
    patchItem.mutate({ id: a.id, patch: { sort_order: b.sort_order } });
    patchItem.mutate({ id: b.id, patch: { sort_order: a.sort_order } });
  }

  return (
    <div className="space-y-6">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3">
        <div className="min-w-0">
          <p className="eyebrow">Kitchen</p>
          <h1 className="text-3xl font-display">Menu</h1>
        </div>
        <button
          onClick={() =>
            setEditing({
              ...(categories[0] ? { category_id: categories[0].id } : {}),
              is_available: true,
              tags: [],
              price: 0,
            })
          }
          className="flex min-h-11 shrink-0 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground"
        >
          <Plus className="h-4 w-4" /> New dish
        </button>
      </header>

      {menu.isLoading ? (
        <div className="h-64 animate-pulse rounded-xl border border-border bg-card" />
      ) : categories.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center">
          <p className="font-display text-xl">Add a category first</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Dishes live inside categories like Starters or Biryani.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {categories.map((c) => {
            const list = items.filter((i) => i.category_id === c.id);
            return (
              <section key={c.id}>
                <h2 className="font-display text-2xl">{c.name}</h2>
                {list.length === 0 ? (
                  <p className="mt-2 rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                    No dishes in this category yet.
                  </p>
                ) : (
                  <ul className="mt-3 space-y-2">
                    {list.map((item, index) => {
                      const images = media.filter((m) => m.menu_item_id === item.id);
                      return (
                        <li
                          key={item.id}
                          className="plate grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-xl p-3"
                        >
                          {images[0] ? (
                            <img
                              src={images[0].url}
                              alt={item.name}
                              loading="lazy"
                              className="h-14 w-14 shrink-0 rounded-lg object-cover"
                            />
                          ) : (
                            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-lg border border-border text-muted-foreground">
                              <ImageIcon className="h-4 w-4" />
                            </span>
                          )}
                          <div className="min-w-0">
                            <p className="truncate text-sm">{item.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {money(item.price)} · {images.length} photo
                              {images.length === 1 ? "" : "s"}
                              {item.reel_url ? " · reel" : ""}
                            </p>
                            {item.tags.length ? (
                              <p className="truncate text-xs text-primary">
                                {item.tags.join(" · ")}
                              </p>
                            ) : null}
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            <button
                              onClick={() =>
                                patchItem.mutate({
                                  id: item.id,
                                  patch: { is_available: !item.is_available },
                                })
                              }
                              className={cn(
                                "min-h-10 rounded-lg border px-3 text-xs",
                                item.is_available
                                  ? "border-success/60 text-success"
                                  : "border-destructive/60 text-destructive",
                              )}
                            >
                              {item.is_available ? "Available" : "Sold out"}
                            </button>
                            <button
                              onClick={() => move(list, index, -1)}
                              disabled={index === 0}
                              className="grid h-10 w-10 place-items-center rounded-lg border border-border disabled:opacity-40"
                              aria-label={`Move ${item.name} up`}
                            >
                              <ArrowUp className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => move(list, index, 1)}
                              disabled={index === list.length - 1}
                              className="grid h-10 w-10 place-items-center rounded-lg border border-border disabled:opacity-40"
                              aria-label={`Move ${item.name} down`}
                            >
                              <ArrowDown className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => setEditing(item)}
                              className="grid h-10 w-10 place-items-center rounded-lg border border-border"
                              aria-label={`Edit ${item.name}`}
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => {
                                if (window.confirm(`Delete ${item.name}?`))
                                  removeItem.mutate(item.id);
                              }}
                              className="grid h-10 w-10 place-items-center rounded-lg border border-border text-destructive"
                              aria-label={`Delete ${item.name}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      )}

      {editing ? (
        <ItemEditor
          draft={editing}
          categories={categories}
          media={media.filter((m) => m.menu_item_id === editing.id)}
          onChange={setEditing}
          onClose={() => setEditing(null)}
          onSave={() => saveItem.mutate(editing)}
          onMediaChanged={refresh}
          saving={saveItem.isPending}
        />
      ) : null}
    </div>
  );
}

function ItemEditor({
  draft,
  categories,
  media,
  onChange,
  onClose,
  onSave,
  onMediaChanged,
  saving,
}: {
  draft: Partial<ItemRow>;
  categories: { id: string; name: string }[];
  media: MediaRow[];
  onChange: (next: Partial<ItemRow>) => void;
  onClose: () => void;
  onSave: () => void;
  onMediaChanged: () => void;
  saving: boolean;
}) {
  const [pendingAdds, setPendingAdds] = useState<File[]>([]);
  const [pendingDeletes, setPendingDeletes] = useState<string[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);

  // Cleanup object URLs
  useEffect(() => {
    return () => {
      previews.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [previews]);

  const existingMedia = media.filter((m) => !pendingDeletes.includes(m.id));
  const totalImages = existingMedia.length + pendingAdds.length;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Limit to 10 images total
    if (totalImages >= 10) {
      toast.error('Maximum 10 images per item');
      return;
    }
    setPendingAdds((prev) => [...prev, file]);
    setPreviews((prev) => [...prev, URL.createObjectURL(file)]);
    // Reset input
    e.target.value = '';
  };

  const handleRemoveExisting = (id: string) => {
    setPendingDeletes((prev) => [...prev, id]);
  };

  const handleRemovePending = (index: number) => {
    setPendingAdds((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => {
      const url = prev[index];
      URL.revokeObjectURL(url);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleSave = async () => {
    // First save dish details
    await onSave();
    // After dish saved, get its id (ensure draft has id now)
    const itemId = draft.id;
    if (!itemId) {
      // Should not happen; reload to fetch id
      onMediaChanged();
      return;
    }
    // Delete marked images
    if (pendingDeletes.length) {
      const { error } = await supabase.from('menu_media').delete().in('id', pendingDeletes);
      if (error) toast.error('Failed to delete some images');
    }
    // Upload new images
    if (pendingAdds.length) {
      const uploads = pendingAdds.map(async (file, idx) => {
        const ext = file.name.split('.').pop();
        const path = `${itemId}/${Date.now()}_${Math.random().toString(36).substring(2)}.${ext}`;
        const { error: uploadError } = await supabase.storage.from('menu-images').upload(path, file);
        if (uploadError) throw uploadError;
        const { data } = supabase.storage.from('menu-images').getPublicUrl(path);
        return { url: data?.publicUrl, sort_order: existingMedia.length + idx + 1 };
      });
      try {
        const rows = await Promise.all(uploads);
        const { error: insertError } = await supabase.from('menu_media').insert(
          rows.map((r) => ({
            menu_item_id: itemId,
            url: r.url,
            media_type: 'image',
            sort_order: r.sort_order,
          })),
        );
        if (insertError) toast.error('Failed to save new images');
      } catch (e: any) {
        toast.error(e.message ?? 'Image upload failed');
      }
    }
    // Reset local state
    setPendingAdds([]);
    setPendingDeletes([]);
    setPreviews([]);
    onMediaChanged();
  };

  const tags = draft.tags ?? [];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-background/85 sm:items-center">
      <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-2xl border border-border bg-card p-5 sm:max-w-lg sm:rounded-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-2xl">{draft.id ? "Edit dish" : "New dish"}</h2>
          <button
            onClick={onClose}
            className="grid h-10 w-10 place-items-center rounded-full border border-border"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor="item-name" className="eyebrow">
              Name
            </label>
            <input
              id="item-name"
              value={draft.name ?? ""}
              onChange={(e) => onChange({ ...draft, name: e.target.value })}
              className="mt-2 min-h-11 w-full rounded-lg border border-input bg-background px-3 text-sm"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="item-price" className="eyebrow">
                Price
              </label>
              <input
                id="item-price"
                type="number"
                min={0}
                step="1"
                value={String(draft.price ?? 0)}
                onChange={(e) => onChange({ ...draft, price: e.target.value })}
                className="mt-2 min-h-11 w-full rounded-lg border border-input bg-background px-3 text-sm"
              />
            </div>
            <div>
              <label htmlFor="item-category" className="eyebrow">
                Category
              </label>
              <select
                id="item-category"
                value={draft.category_id ?? ""}
                onChange={(e) => onChange({ ...draft, category_id: e.target.value })}
                className="mt-2 min-h-11 w-full rounded-lg border border-input bg-background px-3 text-sm"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="item-description" className="eyebrow">
              Description
            </label>
            <textarea
              id="item-description"
              rows={3}
              value={draft.description ?? ""}
              onChange={(e) => onChange({ ...draft, description: e.target.value })}
              className="mt-2 w-full rounded-lg border border-input bg-background p-3 text-sm"
            />
          </div>

          <div>
            <p className="eyebrow">Tags</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {KNOWN_TAGS.map((tag) => {
                const on = tags.includes(tag);
                return (
                  <button
                    key={tag}
                    onClick={() =>
                      onChange({
                        ...draft,
                        tags: on ? tags.filter((t) => t !== tag) : [...tags, tag],
                      })
                    }
                    className={cn(
                      "min-h-9 rounded-full border px-3 text-xs",
                      on ? "border-primary bg-primary/15 text-primary" : "border-border",
                    )}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label htmlFor="item-reel" className="eyebrow">
              Instagram reel / video link (optional)
            </label>
            <input
              id="item-reel"
              value={draft.reel_url ?? ""}
              onChange={(e) => onChange({ ...draft, reel_url: e.target.value })}
              placeholder="https://instagram.com/reel/…"
              className="mt-2 min-h-11 w-full rounded-lg border border-input bg-background px-3 text-sm"
            />
          </div>

          <label className="flex min-h-11 items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={draft.is_available ?? true}
              onChange={(e) => onChange({ ...draft, is_available: e.target.checked })}
              className="h-4 w-4"
            />
            Available to order
          </label>

          <div>
            <div>
              <p className="eyebrow">Photos (first is the main image)</p>
              {existingMedia.map((m) => (
                <div key={m.id} className="flex items-center gap-3 mb-2">
                  <img src={m.url} alt="" loading="lazy" className="h-12 w-12 rounded-lg object-cover" />
                  <button onClick={() => handleRemoveExisting(m.id)} className="text-destructive" aria-label="Remove photo">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              {previews.map((url, idx) => (
                <div key={idx} className="flex items-center gap-3 mb-2">
                  <img src={url} alt="" loading="lazy" className="h-12 w-12 rounded-lg object-cover" />
                  <button onClick={() => handleRemovePending(idx)} className="text-destructive" aria-label="Remove photo">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              {totalImages < 10 && (
                <div className="mt-3 flex gap-2">
                  <input type="file" accept="image/*" onChange={handleFileChange} className="flex-1" />
                </div>
              )}
            </div>
          </div>

          <button
            onClick={onSave}
            disabled={saving}
            className="min-h-12 w-full rounded-lg bg-primary text-sm font-medium text-primary-foreground"
          >
            {saving ? "Saving…" : "Save dish"}
          </button>
        </div>
      </div>
    </div>
  );
}
