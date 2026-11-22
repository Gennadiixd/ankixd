import type { ShownField } from "@/lib/types";

export function FieldView({ field }: { field: ShownField }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="text-xs text-muted-foreground">{field.name}</div>
      {field.kind === "rich-text" ? (
        <div
          className="text-base leading-relaxed [&_a]:underline [&_img]:my-2 [&_img]:h-auto [&_img]:max-h-[70vh] [&_img]:max-w-full [&_img]:rounded-lg [&_img]:object-contain"
          dangerouslySetInnerHTML={{ __html: field.safeHtml ?? "" }}
        />
      ) : (
        <p className="whitespace-pre-wrap text-base leading-relaxed">{field.value}</p>
      )}
    </div>
  );
}
