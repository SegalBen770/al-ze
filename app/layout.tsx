import type { Metadata } from "next";
import { Heebo } from "next/font/google";
import { ConvexAuthNextjsServerProvider } from "@convex-dev/auth/nextjs/server";
import { Toaster } from "sonner";
import { ConvexClientProvider } from "./ConvexClientProvider";
import "./globals.css";

const heebo = Heebo({
  subsets: ["hebrew", "latin"],
  variable: "--font-heebo",
  display: "swap",
});

export const metadata: Metadata = {
  title: "על זה — אני על זה",
  description: "פותח פנייה, ואני כבר על זה. מערכת טיקטים נינוחה שמשאירה אותך רגוע.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <ConvexAuthNextjsServerProvider>
      <html lang="he" dir="rtl" className={heebo.variable}>
        <body className="min-h-screen font-sans antialiased">
          <ConvexClientProvider>{children}</ConvexClientProvider>
          <Toaster
            position="top-center"
            dir="rtl"
            toastOptions={{
              style: {
                fontFamily: "var(--font-heebo)",
                borderRadius: "0.875rem",
              },
            }}
          />
        </body>
      </html>
    </ConvexAuthNextjsServerProvider>
  );
}
