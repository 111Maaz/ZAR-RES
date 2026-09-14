import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { QrCode, UtensilsCrossed } from "lucide-react";

import { getPublicMenu } from "@/lib/ordering.functions";

export const Route = createFileRoute("/")({
  head: () => {
    const title = "Zaytün Restaurant — Flavours Beyond Borders";
    const description =
      "Candlelit dining, slow-cooked biryanis and charcoal grills. Scan the code on your table to browse the menu and order.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
      ],
    };
  },
  component: Landing,
});

function Landing() {
  const fetchMenu = useServerFn(getPublicMenu);
  const { data } = useQuery({
    queryKey: ["public-menu"],
    queryFn: () => fetchMenu(),
    staleTime: 60_000,
  });

  const settings = data?.settings;
  const categories = data?.categories ?? [];

  return (
    <main className="min-h-screen">
      <section className="relative isolate overflow-hidden">
        <img
          src={settings?.cover_image_url ?? "/images/hero.jpg"}
          alt="Zaytün dining room at night"
          width={1600}
          height={1008}
          className="absolute inset-0 -z-10 h-full w-full object-cover opacity-50"
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-background/70 via-background/60 to-background" />
        <div className="mx-auto flex min-h-[85vh] max-w-4xl flex-col items-center justify-center px-6 text-center">
          <p className="eyebrow">Est. 2019 · Mumbai</p>
          <h1 className="mt-4 text-6xl leading-none font-display tracking-wide sm:text-7xl">
            {settings?.name ?? "Zaytün"}
          </h1>
          <p className="mt-3 text-xs uppercase tracking-[0.34em] text-primary">
            {settings?.tagline ?? "Flavours Beyond Borders"}
          </p>
          <div className="gold-rule mx-auto mt-8 w-40" />
          <p className="mt-8 max-w-xl text-sm leading-relaxed text-muted-foreground">
            {settings?.about ??
              "A candlelit dining room where Levantine warmth meets the spice roads of the subcontinent."}
          </p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Link
              to="/menu/$table"
              params={{ table: "table-07" }}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary px-7 text-sm font-medium text-primary-foreground"
            >
              <QrCode className="h-4 w-4" /> Try the table menu
            </Link>
            <Link
              to="/admin"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-border px-7 text-sm"
            >
              <UtensilsCrossed className="h-4 w-4" /> Staff dashboard
            </Link>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Guests scan the code on their table — no app, no sign-up.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-16">
        <h2 className="text-center text-4xl font-display">Our kitchen</h2>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((c) => (
            <article key={c.id} className="plate overflow-hidden rounded-xl">
              {c.image_url ? (
                <img
                  src={c.image_url}
                  alt={c.name}
                  loading="lazy"
                  width={1200}
                  height={912}
                  className="aspect-[4/3] w-full object-cover"
                />
              ) : null}
              <div className="p-4">
                <h3 className="font-display text-xl">{c.name}</h3>
                <p className="text-xs text-muted-foreground">{c.subtitle}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <footer className="border-t border-border py-10 text-center text-xs text-muted-foreground">
        <p>{settings?.address}</p>
        <p className="mt-1">{settings?.opening_hours}</p>
        <p className="mt-4 uppercase tracking-[0.24em] text-primary">
          Good food brings people together
        </p>
      </footer>
    </main>
  );
}
