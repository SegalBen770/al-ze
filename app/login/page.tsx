"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthActions } from "@convex-dev/auth/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { BreathingOrb } from "@/components/animations/BreathingOrb";
import { Logo } from "@/components/Logo";

export default function LoginPage() {
  const { signIn } = useAuthActions();
  const router = useRouter();
  const params = useSearchParams();
  const prefillEmail = params.get("email") ?? "";

  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.currentTarget);
    form.set("flow", "signIn");
    try {
      await signIn("password", form);
      toast.success("ברוך שובך 👋");
      router.push("/");
    } catch (err) {
      toast.error("אימייל או סיסמה שגויים");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* צד מותג מרגיע */}
      <div className="hidden lg:flex flex-col items-center justify-center gap-8 bg-gradient-to-bl from-primary/10 via-accent/40 to-background p-12">
        <BreathingOrb size={180} />
        <div className="text-center max-w-sm space-y-3">
          <h1 className="text-4xl font-extrabold text-foreground">
            פתחת פנייה? <span className="text-primary">אני על זה.</span>
          </h1>
          <p className="text-muted-foreground leading-relaxed">
            מהרגע שפתחת טיקט — זה כבר אצלי. עוקב אחרי כל שלב בשקט,
            רואה את ההתקדמות, ויודע בדיוק מה קורה. אתה רגוע, ואני על זה.
          </p>
        </div>
      </div>

      {/* טופס */}
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-8 animate-fade-in">
          <div className="flex flex-col items-center text-center space-y-3">
            <Logo size={44} />
            <div className="space-y-1">
              <h2 className="text-2xl font-bold">כניסה למערכת</h2>
              <p className="text-sm text-muted-foreground">
                שמח שאתה כאן — בוא נתחיל
              </p>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">אימייל</Label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                dir="ltr"
                placeholder="you@example.com"
                defaultValue={prefillEmail}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">סיסמה</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                dir="ltr"
                placeholder="••••••••"
              />
            </div>
            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? <Spinner className="text-primary-foreground" /> : null}
              כניסה
            </Button>
          </form>

          <p className="text-center text-xs text-muted-foreground">
            הגישה למערכת בהזמנה בלבד. פרטי הכניסה נשלחים אליך במייל.
          </p>
        </div>
      </div>
    </div>
  );
}
