"use client";

import { Folder, Layers, Pencil } from "lucide-react";
import { controlClass } from "@/components/shell";
import { Button, buttonVariants } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createDeck, createFolder, renameFolder } from "@/lib/actions";
import { cn } from "@/lib/utils";

export function CreateDeckDialog({ folders }: { folders: { id: number; name: string }[] }) {
  return (
    <Dialog>
      <DialogTrigger className={cn(buttonVariants(), "h-10")}>
        <Layers />
        Создать колоду
      </DialogTrigger>
      <DialogContent>
        <DialogTitle className="flex items-center gap-2">
          <Layers className="size-4" aria-hidden />
          Новая колода
        </DialogTitle>
        <DialogDescription>После создания откроется колода, в неё можно добавить карточки.</DialogDescription>
        <form action={createDeck} className="mt-4 flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="deck-name">Название</Label>
            <Input id="deck-name" name="name" required className="h-10" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="deck-folder">Папка</Label>
            <select id="deck-folder" name="folderId" className={controlClass} defaultValue="">
              <option value="">Без папки</option>
              {folders.map((folder) => (
                <option key={folder.id} value={folder.id}>
                  {folder.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <DialogClose className={cn(buttonVariants({ variant: "outline" }), "h-10")}>Отмена</DialogClose>
            <Button type="submit" className="h-10">
              Создать
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function CreateFolderDialog() {
  return (
    <Dialog>
      <DialogTrigger className={cn(buttonVariants({ variant: "outline" }), "h-10")}>
        <Folder />
        Создать папку
      </DialogTrigger>
      <DialogContent>
        <DialogTitle className="flex items-center gap-2">
          <Folder className="size-4" aria-hidden />
          Новая папка
        </DialogTitle>
        <DialogDescription>Папка только группирует колоды. Повторять можно колоду или её теги.</DialogDescription>
        <form action={createFolder} className="mt-4 flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="folder-name">Название</Label>
            <Input id="folder-name" name="name" required className="h-10" />
          </div>
          <div className="flex justify-end gap-2">
            <DialogClose className={cn(buttonVariants({ variant: "outline" }), "h-10")}>Отмена</DialogClose>
            <Button type="submit" variant="outline" className="h-10">
              Создать
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function RenameFolderDialog({ id, name }: { id: number; name: string }) {
  return (
    <Dialog>
      <DialogTrigger
        className={cn(buttonVariants({ variant: "outline", size: "icon" }))}
        aria-label="Переименовать"
        title="Переименовать"
      >
        <Pencil />
      </DialogTrigger>
      <DialogContent>
        <DialogTitle className="flex items-center gap-2">
          <Folder className="size-4" aria-hidden />
          Переименовать папку
        </DialogTitle>
        <DialogDescription>Колоды внутри останутся на месте.</DialogDescription>
        <form action={renameFolder} className="mt-4 flex flex-col gap-3">
          <input type="hidden" name="id" value={id} />
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`folder-name-${id}`}>Название</Label>
            <Input id={`folder-name-${id}`} name="name" defaultValue={name} required className="h-10" />
          </div>
          <div className="flex justify-end gap-2">
            <DialogClose className={cn(buttonVariants({ variant: "outline" }), "h-10")}>Отмена</DialogClose>
            <Button type="submit" className="h-10">
              Сохранить
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
