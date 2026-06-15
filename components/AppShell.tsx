"use client";

import { ReactNode, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { useAuthActions } from "@convex-dev/auth/react";
import { LogOut, Settings, LayoutGrid, UserCircle2 } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { BreathingOrb } from "@/components/animations/BreathingOrb";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type Me = NonNullable<FunctionReturnType<typeof api.users.current>>;

export function AppShell({ children }: { children: ReactNode }) {
  const me = useQuery(api.users.current);
  const seedDefaults = useMutation(api.taxonomy.seedDefaults);
  const seeded = useRef(false);

  // זריעת ברירות מחדל פעם אחת כשאדמין נכנס.
  useEffect(() => {
    if (me?.isAdmin && !seeded.current) {
      seeded.current = true;
      seedDefaults().catch(() => {});
    }
  }, [me?.isAdmin, seedDefaults]);

  if (me === undefined) {
    return (
      <div className="min-h-screen grid place-items-center">
        <BreathingOrb size={120} />
      </div>
    );
  }

  if (me === null) {
    return <RedirectToLogin />;
  }

  if (!me.hasAccess) {
    return <NoAccess />;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header me={me} />
      <main className="flex-1 container py-6 md:py-8">{children}</main>
    </div>
  );
}

function Header({ me }: { me: Me }) {
  const pathname = usePathname();
  const { signOut } = useAuthActions();
  const router = useRouter();

  const links = [
    { href: "/", label: "הטיקטים שלי", icon: LayoutGrid, show: true },
    { href: "/admin", label: "ניהול", icon: Settings, show: me.isAdmin },
  ].filter((l) => l.show);

  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="container flex h-16 items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center">
            <Logo size={36} />
          </Link>
          <nav className="flex items-center gap-1">
            {links.map((l) => {
              const active =
                l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-secondary text-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/60",
                  )}
                >
                  <l.icon className="size-4" />
                  <span className="hidden sm:inline">{l.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {me.isAdmin ? (
            <Badge color="#0d9488">מנהל</Badge>
          ) : (
            me.customerName && (
              <span className="hidden md:inline text-sm text-muted-foreground">
                {me.customerName}
              </span>
            )
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <UserCircle2 className="size-6" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{me.displayName}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={async () => {
                  await signOut();
                  router.push("/login");
                }}
                className="text-destructive focus:text-destructive"
              >
                <LogOut className="size-4" />
                התנתקות
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}

function RedirectToLogin() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/login");
  }, [router]);
  return (
    <div className="min-h-screen grid place-items-center">
      <Spinner />
    </div>
  );
}

function NoAccess() {
  const { signOut } = useAuthActions();
  const router = useRouter();
  return (
    <div className="min-h-screen grid place-items-center p-6">
      <div className="text-center max-w-sm space-y-5">
        <BreathingOrb size={120} />
        <h1 className="text-xl font-bold">כמעט שם 🌱</h1>
        <p className="text-muted-foreground leading-relaxed">
          החשבון שלך עדיין לא משויך ללקוח. פנה למנהל המערכת כדי שיוסיף אותך,
          ואז תוכל להתחיל לפתוח טיקטים.
        </p>
        <Button
          variant="outline"
          onClick={async () => {
            await signOut();
            router.push("/login");
          }}
        >
          התנתקות
        </Button>
      </div>
    </div>
  );
}
