"use client";

import { Trash2 } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export function ConfirmForm({
  action,
  message,
  label,
  hidden,
}: {
  action: (formData: FormData) => void | Promise<void>;
  message: string;
  label: string;
  hidden?: Record<string, string>;
}) {
  return (
    <Dialog>
      <DialogTrigger
        className={cn(buttonVariants({ variant: "destructive", size: "icon" }))}
        aria-label={label}
        title={label}
      >
        <Trash2 />
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>Удалить</DialogTitle>
        <DialogDescription>{message}</DialogDescription>
        <form action={action} className="mt-4 flex justify-end gap-2">
          {hidden
            ? Object.entries(hidden).map(([name, value]) => <input key={name} type="hidden" name={name} value={value} />)
            : null}
          <DialogClose className={cn(buttonVariants({ variant: "outline" }), "h-10")}>Отмена</DialogClose>
          <Button type="submit" variant="destructive" className="h-10">
            Удалить
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
