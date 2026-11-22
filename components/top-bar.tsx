"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import { logout } from "@/lib/auth-actions";
import { cn } from "@/lib/utils";

export function TopBar({ name }: { name: string }) {
  const back = backHref(usePathname());

  return (
    <>
      <div className="h-9" />
      <div className="fixed inset-x-0 top-0 z-50">
        <div className="mx-auto flex w-full max-w-lg items-center justify-between gap-2 bg-background/90 px-2 py-1 backdrop-blur-sm">
          {back ? (
            <Link href={back} className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "px-2")}>
              Назад
            </Link>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-1">
            <span className="text-sm text-muted-foreground">{name}</span>
            <form action={logout}>
              <Button type="submit" variant="ghost" size="sm">
                Выйти
              </Button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}

function backHref(pathname: string) {
  const nested = pathname.match(/^\/decks\/(\d+)\/.+/);
  if (nested) return `/decks/${nested[1]}`;
  if (pathname !== "/") return "/";
  return null;
}
