import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const save = useMutation({
    mutationFn: async (newPassword: string) => {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Password updated successfully");
      setPassword("");
      setConfirmPassword("");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Could not update password.");
    },
  });

  return (
    <div className="max-w-2xl space-y-6">
      <header>
        <p className="eyebrow">Account Settings</p>
        <h1 className="text-3xl font-display">Profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Update your account security and password.
        </p>
      </header>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (password.length < 6) {
            toast.error("Password must be at least 6 characters.");
            return;
          }
          if (password !== confirmPassword) {
            toast.error("Passwords do not match.");
            return;
          }
          save.mutate(password);
        }}
        className="plate space-y-4 rounded-xl p-5"
      >
        <div>
          <label htmlFor="new-password" className="eyebrow">
            New Password
          </label>
          <input
            id="new-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-2 min-h-11 w-full rounded-lg border border-input bg-background px-3 text-sm"
          />
        </div>
        <div>
          <label htmlFor="confirm-password" className="eyebrow">
            Confirm New Password
          </label>
          <input
            id="confirm-password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="mt-2 min-h-11 w-full rounded-lg border border-input bg-background px-3 text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={save.isPending}
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm font-medium text-primary-foreground sm:w-auto sm:px-8"
        >
          {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Change Password
        </button>
      </form>
    </div>
  );
}
