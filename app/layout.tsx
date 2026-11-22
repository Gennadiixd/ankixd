import { Suspense, type ReactNode } from "react";
import type { Metadata } from "next";
import { AccountBar } from "@/components/account-bar";
import "./globals.css";

export const metadata: Metadata = {
  title: "Карточки",
  description: "Сайт для повторения карточек по алгоритму FSRS",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ru" className="h-full antialiased">
      <body className="min-h-full bg-background font-sans text-foreground">
        <Suspense fallback={null}>
          <AccountBar />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
