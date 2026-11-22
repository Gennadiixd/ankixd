"use client";

import { useState, type ComponentProps, type ComponentType } from "react";
import { Menu } from "@base-ui/react/menu";
import { Check, ChevronRight, EllipsisVertical } from "lucide-react";
import { DeckFields } from "@/components/deck-fields";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { deleteDeck, moveDeck, renameDeck } from "@/lib/actions";
import type { FieldItem } from "@/lib/repo";
import { cn } from "@/lib/utils";

const MoveMenu = Menu.SubmenuRoot as ComponentType<ComponentProps<typeof Menu.SubmenuRoot> & { openOnHover?: boolean }>;

const itemClass =
  "flex cursor-default items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-none select-none data-highlighted:bg-muted data-disabled:pointer-events-none data-disabled:opacity-50";

export function DeckMenu({
  deck,
  folders,
  fields,
  returnTo,
}: {
  deck: { id: number; name: string; folderId: number | null };
  folders: { id: number; name: string }[];
  fields: FieldItem[];
  returnTo: string;
}) {
  const [editOpen, setEditOpen] = useState(false);

  function moveTo(folderId: string) {
    const data = new FormData();
    data.set("deckId", String(deck.id));
    data.set("folderId", folderId);
    data.set("returnTo", returnTo);
    void moveDeck(data);
  }

  return (
    <>
      <Menu.Root>
        <Menu.Trigger
          className={cn(buttonVariants({ variant: "ghost", size: "icon" }))}
          aria-label="Меню колоды"
          title="Меню колоды"
        >
          <EllipsisVertical />
        </Menu.Trigger>
        <Menu.Portal>
          <Menu.Positioner side="bottom" align="end" sideOffset={4} className="z-50">
            <Menu.Popup className="min-w-44 rounded-lg bg-popover p-1 text-popover-foreground shadow-lg ring-1 ring-foreground/10 outline-none">
              <Menu.Item className={itemClass} onClick={() => setEditOpen(true)}>
                Изменить
              </Menu.Item>
              <MoveMenu openOnHover={false}>
                <Menu.SubmenuTrigger className={cn(itemClass, "justify-between")}>
                  Перенести в
                  <ChevronRight className="size-4 text-muted-foreground" />
                </Menu.SubmenuTrigger>
                <Menu.Portal>
                  <Menu.Positioner side="right" align="start" sideOffset={6} className="z-50">
                    <Menu.Popup className="max-h-80 min-w-44 overflow-y-auto rounded-lg bg-popover p-1 text-popover-foreground shadow-lg ring-1 ring-foreground/10 outline-none">
                      <Menu.Item className={itemClass} disabled={deck.folderId == null} onClick={() => moveTo("")}>
                        {deck.folderId == null ? <Check className="size-4" /> : <span className="size-4" />}
                        Без папки
                      </Menu.Item>
                      {folders.map((folder) => (
                        <Menu.Item
                          key={folder.id}
                          className={itemClass}
                          disabled={deck.folderId === folder.id}
                          onClick={() => moveTo(String(folder.id))}
                        >
                          {deck.folderId === folder.id ? <Check className="size-4" /> : <span className="size-4" />}
                          {folder.name}
                        </Menu.Item>
                      ))}
                    </Menu.Popup>
                  </Menu.Positioner>
                </Menu.Portal>
              </MoveMenu>
              <Menu.LinkItem className={itemClass} href={`/api/decks/${deck.id}/export`} download>
                Экспорт XML
              </Menu.LinkItem>
              <Menu.Item
                className={cn(itemClass, "text-destructive data-highlighted:bg-destructive/10")}
                onClick={() => {
                  if (!window.confirm("Удалить колоду вместе с карточками?")) return;
                  const data = new FormData();
                  data.set("deckId", String(deck.id));
                  void deleteDeck(data);
                }}
              >
                Удалить
              </Menu.Item>
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[min(40rem,calc(100dvh-2rem))] overflow-y-auto">
          <DialogTitle>Изменить колоду</DialogTitle>
          <DialogDescription>Название и поля. Карточки и расписание не сбрасываются.</DialogDescription>
          <form action={renameDeck} className="mt-4 flex flex-col gap-3">
            <input type="hidden" name="deckId" value={deck.id} />
            <input type="hidden" name="returnTo" value={returnTo} />
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`deck-name-${deck.id}`}>Название</Label>
              <Input id={`deck-name-${deck.id}`} name="name" defaultValue={deck.name} required className="h-10" />
            </div>
            <div className="flex justify-end gap-2">
              <DialogClose className={cn(buttonVariants({ variant: "outline" }), "h-10")}>Отмена</DialogClose>
              <Button type="submit" className="h-10">
                Сохранить
              </Button>
            </div>
          </form>
          <div className="mt-5 flex flex-col gap-3">
            <p className="text-sm font-medium">Поля</p>
            <DeckFields deckId={deck.id} fields={fields} />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
