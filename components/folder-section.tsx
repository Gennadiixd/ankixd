"use client";

import { useEffect, useState, type ReactNode } from "react";
import { ChevronRight, Folder } from "lucide-react";
import { cn } from "@/lib/utils";

export function FolderSection({
  id,
  name,
  actions,
  children,
}: {
  id: number;
  name: string;
  actions: ReactNode;
  children: ReactNode;
}) {
  const storageKey = `ankixd-folder-${id}`;
  const [open, setOpen] = useState(true);

  useEffect(() => {
    if (localStorage.getItem(storageKey) === "0") setOpen(false);
  }, [storageKey]);

  function toggle() {
    const next = !open;
    localStorage.setItem(storageKey, next ? "1" : "0");
    setOpen(next);
  }

  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={toggle}
          className="flex min-w-0 cursor-pointer items-center gap-1.5 text-left text-base font-medium"
          aria-expanded={open}
        >
          <ChevronRight
            className={cn("size-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-90")}
            aria-hidden
          />
          <Folder className="size-5 shrink-0 text-muted-foreground" aria-hidden />
          <span className="truncate">{name}</span>
        </button>
        <div className="flex shrink-0 items-center gap-2.5">{actions}</div>
      </div>
      {open ? children : null}
    </section>
  );
}
