import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth/provider";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { ChatWidget } from "@/components/chat/chat-widget";
import { getBranding } from "@/lib/config";

const inter = Inter({ subsets: ["latin"] });

const branding = getBranding();

export const metadata: Metadata = {
  title: branding.appName,
  description: branding.description,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      style={{ "--primary": branding.primaryColorHSL } as React.CSSProperties}
    >
      <body className={inter.className} suppressHydrationWarning>
        <AuthProvider>
          <div className="flex min-h-screen flex-col">
            <Header />
            <main className="flex-1">{children}</main>
            <Footer />
          </div>
          <ChatWidget />
        </AuthProvider>
      </body>
    </html>
  );
}
