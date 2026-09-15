import {
  Link,
  Outlet,
  createFileRoute,
  useNavigate,
  useRouterState,
} from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  BellRing,
  ClipboardList,
  History,
  LayoutDashboard,
  ListTree,
  LogOut,
  Settings,
  Table2,
  UserCog,
  UtensilsCrossed,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { claimOwnerRole } from "@/lib/ordering.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Restaurant dashboard — Zaytün" },
      {
        name: "description",
        content: "Live order queue, table sessions, running bills and menu management.",
      },
      { property: "og:title", content: "Restaurant dashboard — Zaytün" },
      {
        property: "og:description",
        content: "Live order queue, table sessions, running bills and menu management.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminLayout,
});

const NAV = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/admin/orders", label: "Orders", icon: ClipboardList, exact: false },
  { to: "/admin/waiter-calls", label: "Waiter Calls", icon: BellRing, exact: false },
  { to: "/admin/tables", label: "Tables", icon: Table2, exact: false },
  { to: "/admin/menu", label: "Menu", icon: UtensilsCrossed, exact: false },
  { to: "/admin/categories", label: "Categories", icon: ListTree, exact: false },
  { to: "/admin/history", label: "History", icon: History, exact: false },
  { to: "/admin/profile", label: "Profile", icon: UserCog, exact: false },
  // { to: "/admin/settings", label: "Settings", icon: Settings, exact: false },
] as const;

function AdminLayout() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const claimOwner = useServerFn(claimOwnerRole);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const access = useQuery({
    queryKey: ["admin-access"],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) return { isAdmin: false, email: null as string | null };
      await claimOwner({ data: { userId: user.id } });
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      return { isAdmin: Boolean(data), email: user.email ?? null };
    },
  });

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  if (access.isLoading) {
    return (
      <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">
        Loading dashboard…
      </div>
    );
  }

  if (!access.data?.isAdmin) {
    return (
      <main className="grid min-h-screen place-items-center px-6 text-center">
        <div className="max-w-sm">
          <h1 className="text-3xl font-display">No dashboard access</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            This account isn't set up as restaurant staff. Ask the owner to grant access.
          </p>
          <button
            onClick={signOut}
            className="mt-6 min-h-11 rounded-lg border border-border px-5 text-sm"
          >
            Sign out
          </button>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-background lg:grid lg:grid-cols-[15rem_minmax(0,1fr)]">
      <aside className="hidden border-r border-border bg-sidebar lg:flex lg:flex-col">
        <div className="border-b border-sidebar-border px-5 py-5">
          <p className="eyebrow">Zaytün</p>
          <p className="font-display text-xl">Staff console</p>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: item.exact }}
              className={cn(
                "flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground",
                (item.exact ? pathname === item.to : pathname.startsWith(item.to)) &&
                  "bg-sidebar-accent text-foreground",
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-sidebar-border p-3">
          <p className="truncate px-3 pb-2 text-xs text-muted-foreground">
            {access.data.email}
          </p>
          <button
            onClick={signOut}
            className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-sm text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur lg:hidden">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3">
            <div className="min-w-0">
              <p className="eyebrow">Zaytün</p>
              <p className="truncate font-display text-lg">Staff console</p>
            </div>
            <button
              onClick={signOut}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-border"
              aria-label="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
          <nav className="scrollbar-none flex gap-2 overflow-x-auto px-4 pb-3">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "min-h-9 shrink-0 rounded-full border px-3 text-xs leading-9",
                  (item.exact ? pathname === item.to : pathname.startsWith(item.to))
                    ? "border-primary bg-primary/15 text-primary"
                    : "border-border text-muted-foreground",
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </header>

        <main className="min-w-0 flex-1 p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
