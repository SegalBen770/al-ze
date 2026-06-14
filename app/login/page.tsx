"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthActions } from "@convex-dev/auth/react";
import { toast } from "sonner";
import { Mail, Lock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Spinner } from "@/components/ui/spinner";
import { BreathingOrb } from "@/components/animations/BreathingOrb";
import { Logo } from "@/components/Logo";

export default function LoginPage() {
  const { signIn } = useAuthActions();
  const router = useRouter();
  const params = useSearchParams();
  const prefillEmail = params.get("email") ?? "";

  const [mode, setMode] = useState<"signIn" | "signUp">("signIn");
  const [loading, setLoading] = useState(false);
  const [magicSent, setMagicSent] = useState(false);

  async function handlePassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.currentTarget);
    form.set("flow", mode);
    try {
      await signIn("password", form);
      toast.success(mode === "signUp" ? "נרשמת בהצלחה 🎉" : "ברוך שובך 👋");
      router.push("/");
    } catch (err) {
      toast.error(
        mode === "signUp"
          ? "ההרשמה נכשלה — ייתכן שהמשתמש כבר קיים"
          : "פרטי הכניסה שגויים",
      );
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleMagicLink(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.currentTarget);
    try {
      await signIn("resend", form);
      setMagicSent(true);
      toast.success("שלחתי לך קישור כניסה למייל ✨");
    } catch (err) {
      toast.error("שליחת הקישור נכשלה. נסה שוב.");
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

          <Tabs defaultValue="password">
            <TabsList className="w-full grid grid-cols-2">
              <TabsTrigger value="password">
                <Lock className="size-4" /> סיסמה
              </TabsTrigger>
              <TabsTrigger value="magic">
                <Sparkles className="size-4" /> קישור קסם
              </TabsTrigger>
            </TabsList>

            {/* סיסמה */}
            <TabsContent value="password">
              <form onSubmit={handlePassword} className="space-y-4">
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
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? <Spinner className="text-primary-foreground" /> : null}
                  {mode === "signUp" ? "הרשמה" : "כניסה"}
                </Button>
                <p className="text-center text-sm text-muted-foreground">
                  {mode === "signUp" ? "כבר יש לך חשבון?" : "פעם ראשונה כאן?"}{" "}
                  <button
                    type="button"
                    className="text-primary font-medium hover:underline"
                    onClick={() => setMode(mode === "signUp" ? "signIn" : "signUp")}
                  >
                    {mode === "signUp" ? "כניסה" : "צור סיסמה"}
                  </button>
                </p>
              </form>
            </TabsContent>

            {/* קישור קסם */}
            <TabsContent value="magic">
              {magicSent ? (
                <div className="text-center space-y-4 py-6">
                  <div className="flex justify-center">
                    <Mail className="size-12 text-primary" />
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    שלחתי קישור כניסה למייל שלך.
                    <br /> פתח אותו מאותו הדפדפן והכניסה תתבצע אוטומטית.
                  </p>
                  <Button variant="ghost" onClick={() => setMagicSent(false)}>
                    שליחה למייל אחר
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleMagicLink} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="magic-email">אימייל</Label>
                    <Input
                      id="magic-email"
                      name="email"
                      type="email"
                      required
                      dir="ltr"
                      placeholder="you@example.com"
                      defaultValue={prefillEmail}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? <Spinner className="text-primary-foreground" /> : null}
                    שליחת קישור כניסה
                  </Button>
                  <p className="text-center text-xs text-muted-foreground">
                    ללא סיסמה — פשוט לוחץ על הקישור שמגיע למייל.
                  </p>
                </form>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
