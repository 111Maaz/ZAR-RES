import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Lock } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { claimOwnerRole } from "@/lib/ordering.functions";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Staff sign in — TANDO'S" },
      {
        name: "description",
        content: "Owner and staff sign in for the TANDO'S ordering dashboard.",
      },
      { property: "og:title", content: "Staff sign in — TANDO'S" },
      {
        property: "og:description",
        content: "Owner and staff sign in for the TANDO'S ordering dashboard.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const claimOwner = useServerFn(claimOwnerRole);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/admin", replace: true });
    });
  }, [navigate]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin + "/admin" },
        });
        if (error) throw error;
        if (data.user) await claimOwner({ data: { userId: data.user.id } });
        if (!data.session) {
          toast.success("Check your email to confirm the account, then sign in.");
          setMode("signin");
          return;
        }
        navigate({ to: "/admin", replace: true });
        return;
      }

      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (data.user) await claimOwner({ data: { userId: data.user.id } });
      navigate({ to: "/admin", replace: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Sign in failed";
      toast.error(
        message.toLowerCase().includes("invalid")
          ? "That email or password isn't right."
          : message,
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center px-5">
      <div className="w-full max-w-sm">
        <div className="text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-full border border-primary text-primary">
            <Lock className="h-5 w-5" />
          </div>
          <h1 className="mt-5 text-4xl font-display">TANDO'S Staff</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {mode === "signin"
              ? "Sign in to manage orders, tables and the menu."
              : "Create the owner account for this restaurant."}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="plate mt-8 space-y-4 rounded-xl p-5">
          <div>
            <label htmlFor="email" className="eyebrow">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-2 min-h-11 w-full rounded-lg border border-input bg-background px-3 text-sm"
            />
          </div>
          <div>
            <label htmlFor="password" className="eyebrow">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={6}
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-2 min-h-11 w-full rounded-lg border border-input bg-background px-3 text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={busy}
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary font-medium text-primary-foreground disabled:opacity-70"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {mode === "signin" ? "Sign in" : "Create owner account"}
          </button>
          <button
            type="button"
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            className="w-full text-center text-xs text-muted-foreground underline-offset-4 hover:underline"
          >
            {mode === "signin"
              ? "First time here? Create the owner account"
              : "Already have an account? Sign in"}
          </button>
        </form>
      </div>
    </main>
  );
}
