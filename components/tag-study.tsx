"use client";

import Link from "next/link";
import { Popover } from "@base-ui/react/popover";
import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function TagStudy({
  deckId,
  tags,
}: {
  deckId: number;
  tags: { name: string; cardCount: number }[];
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const href =
    selected.length > 0
      ? `/decks/${deckId}/review?tags=${encodeURIComponent(selected.join(","))}`
      : "";

  return (
    <Popover.Root>
      <Popover.Trigger className={cn(buttonVariants({ variant: "outline" }), "h-10 w-full justify-between")}>
        <span>Повторять по тегам{selected.length > 0 ? ` · ${selected.length}` : ""}</span>
        <ChevronDown />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner side="bottom" align="start" sideOffset={6} className="z-50">
          <Popover.Popup className="flex max-h-[min(22rem,var(--available-height))] w-(--anchor-width) flex-col gap-3 rounded-xl bg-popover p-3 text-popover-foreground shadow-lg ring-1 ring-foreground/10 outline-none">
            <p className="text-sm text-muted-foreground">
              Можно выбрать несколько. Карточка попадёт в очередь, если у неё есть любой из них.
            </p>
            <div className="flex min-h-0 flex-col overflow-y-auto">
              {tags.map((tag) => (
                <label key={tag.name} className="flex items-center gap-2 py-1.5 text-sm">
                  <input
                    type="checkbox"
                    className="size-4 accent-foreground"
                    checked={selected.includes(tag.name)}
                    onChange={() =>
                      setSelected((current) =>
                        current.includes(tag.name)
                          ? current.filter((item) => item !== tag.name)
                          : [...current, tag.name],
                      )
                    }
                  />
                  <span className="flex-1">{tag.name}</span>
                  <span className="text-muted-foreground">{tag.cardCount}</span>
                </label>
              ))}
            </div>
            {href ? (
              <Link href={href} className={cn(buttonVariants(), "h-10")}>
                Повторять выбранные
              </Link>
            ) : (
              <button type="button" className={cn(buttonVariants(), "h-10")} disabled>
                Повторять выбранные
              </button>
            )}
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
