"use client";

import { ImagePlus } from "lucide-react";
import { useRef, useState } from "react";
import { compressImageFile } from "@/components/compress-image";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const storedSrc = /^\/media\/[a-f0-9]{32}$/;

export function RichTextField({
  id,
  name,
  fieldName,
  hint,
  defaultValue,
}: {
  id: string;
  name: string;
  fieldName: string;
  hint: string;
  defaultValue: string;
}) {
  const [value, setValue] = useState(defaultValue);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const area = useRef<HTMLTextAreaElement>(null);
  const picker = useRef<HTMLInputElement>(null);
  const valueRef = useRef(defaultValue);

  function update(next: string) {
    valueRef.current = next;
    setValue(next);
  }

  function appendImage(url: string) {
    const current = valueRef.current;
    const pad = current.length > 0 && !current.endsWith("\n") ? "\n" : "";
    update(`${current}${pad}<img src="${url}" alt="">\n`);
  }

  async function addFiles(files: File[]) {
    setError("");
    setStatus("Сжимаем фото…");
    try {
      for (const file of files) {
        const blob = await compressImageFile(file);
        const body = new FormData();
        body.set("file", new File([blob], "photo", { type: blob.type || "image/jpeg" }));
        const response = await fetch("/api/images", { method: "POST", body });
        if (response.redirected) throw new Error("Нужно войти");
        const payload = (await response.json().catch(() => null)) as { url?: string; error?: string } | null;
        if (!response.ok || !payload?.url || !storedSrc.test(payload.url)) {
          throw new Error(payload?.error || "Не удалось сохранить фото");
        }
        appendImage(payload.url);
      }
      setStatus("");
    } catch (caught) {
      setStatus("");
      setError(caught instanceof Error ? caught.message : "Не удалось сохранить фото");
    }
  }

  const preview = [...value.matchAll(/src="(\/media\/[a-f0-9]{32}|https?:\/\/[^"\s<>]+)"/g)].map((match) => match[1]);

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>
        {fieldName}
        <span className="font-normal text-muted-foreground"> {hint}</span>
      </Label>
      <Textarea
        ref={area}
        id={id}
        name={name}
        value={value}
        onChange={(event) => update(event.target.value)}
        onPaste={(event) => {
          const files = imageFiles(event.clipboardData);
          if (files.length === 0) return;
          event.preventDefault();
          void addFiles(files);
        }}
        className="min-h-24"
      />
      <div className="flex flex-col items-start gap-1.5">
        <input
          ref={picker}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif"
          multiple
          className="sr-only"
          onChange={(event) => {
            const files = Array.from(event.target.files ?? []);
            event.target.value = "";
            if (files.length > 0) void addFiles(files);
          }}
        />
        <Button type="button" variant="outline" disabled={status !== ""} onClick={() => picker.current?.click()}>
          <ImagePlus />
          Фото
        </Button>
        <p className="text-xs text-muted-foreground">
          Снимок сожмётся, в карточке останется только ссылка. Можно и адрес https.
        </p>
      </div>
      {status ? (
        <p className="text-xs text-muted-foreground" aria-live="polite">
          {status}
        </p>
      ) : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {preview.length > 0 ? (
        <div className="flex flex-col gap-2">
          {preview.map((src) => (
            // User photos are already resized; the optimizer would only proxy them again.
            // eslint-disable-next-line @next/next/no-img-element
            <img key={src} src={src} alt="" className="max-h-48 max-w-full rounded-lg object-contain" />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function imageFiles(data: DataTransfer) {
  const files: File[] = [];
  for (const item of data.items) {
    if (item.kind !== "file" || !item.type.startsWith("image/")) continue;
    const file = item.getAsFile();
    if (file) files.push(file);
  }
  return files;
}
