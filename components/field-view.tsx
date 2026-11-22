import type { ShownField } from "@/lib/types";

export function FieldView({ field, prominent = false }: { field: ShownField; prominent?: boolean }) {
  const compact = prominent && isCompact(field.value);
  const valueClass = compact
    ? "text-center text-5xl leading-none font-medium"
    : prominent
      ? "text-lg leading-relaxed"
      : "text-sm leading-relaxed";

  return (
    <div className="flex flex-col gap-1">
      <div className="text-xs text-muted-foreground">{field.name}</div>
      {field.kind === "rich-text" ? (
        <div
          className={`${valueClass} [&_a]:underline [&_img]:my-2 [&_img]:h-auto [&_img]:max-h-[70vh] [&_img]:max-w-full [&_img]:rounded-lg [&_img]:object-contain`}
          dangerouslySetInnerHTML={{ __html: field.safeHtml ?? "" }}
        />
      ) : (
        <p className={`whitespace-pre-wrap ${valueClass}`}>{field.value}</p>
      )}
    </div>
  );
}

function isCompact(value: string) {
  const text = value
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .trim();
  return text.length > 0 && text.length <= 40 && !text.includes("\n") && !/<img\b/i.test(value);
}
