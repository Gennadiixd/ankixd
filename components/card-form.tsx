import { createCard, updateCard } from "@/lib/actions";
import type { FieldItem } from "@/lib/repo";
import { RichTextField } from "@/components/rich-text-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const sideLabel = { front: "лицо", back: "оборот", both: "обе стороны" };

export function CardForm({
  deckId,
  fields,
  cardId,
  values,
  tags,
}: {
  deckId: number;
  fields: FieldItem[];
  cardId?: number;
  values?: Record<string, string>;
  tags?: string;
}) {
  return (
    <form action={cardId ? updateCard : createCard} className="flex flex-col gap-4">
      <input type="hidden" name="deckId" value={deckId} />
      {cardId ? <input type="hidden" name="cardId" value={cardId} /> : null}
      {fields.map((field) =>
        field.kind === "rich-text" ? (
          <RichTextField
            key={field.id}
            id={`field-${field.id}`}
            name={`field:${field.id}`}
            fieldName={field.name}
            hint={`· ${sideLabel[field.side]} · HTML`}
            defaultValue={values?.[String(field.id)] ?? ""}
          />
        ) : (
          <div key={field.id} className="flex flex-col gap-1.5">
            <Label htmlFor={`field-${field.id}`}>
              {field.name}
              <span className="font-normal text-muted-foreground"> · {sideLabel[field.side]}</span>
            </Label>
            <Textarea
              id={`field-${field.id}`}
              name={`field:${field.id}`}
              defaultValue={values?.[String(field.id)] ?? ""}
              className="min-h-24"
            />
          </div>
        ),
      )}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="tags">Теги</Label>
        <Input id="tags" name="tags" defaultValue={tags ?? ""} placeholder="через запятую" className="h-10" />
      </div>
      <Button type="submit" className="h-10">
        {cardId ? "Сохранить" : "Создать карточку"}
      </Button>
    </form>
  );
}
