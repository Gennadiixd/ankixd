import { ConfirmForm } from "@/components/confirm-form";
import { controlClass } from "@/components/shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addField, deleteField, updateField } from "@/lib/actions";
import type { FieldItem } from "@/lib/repo";

export function DeckFields({ deckId, fields }: { deckId: number; fields: FieldItem[] }) {
  return (
    <div className="flex flex-col gap-3">
      {fields.map((field) => (
        <div key={field.id} className="flex flex-col gap-2 rounded-xl p-3 ring-1 ring-foreground/10">
          <form action={updateField} className="flex flex-col gap-2">
            <input type="hidden" name="deckId" value={deckId} />
            <input type="hidden" name="fieldId" value={field.id} />
            <Input name="name" defaultValue={field.name} required className="h-10" />
            <div className="grid grid-cols-2 gap-2">
              <select name="kind" className={controlClass} defaultValue={field.kind}>
                <option value="text">Текст</option>
                <option value="rich-text">HTML</option>
              </select>
              <select name="side" className={controlClass} defaultValue={field.side}>
                <option value="front">Лицо</option>
                <option value="back">Оборот</option>
                <option value="both">Обе стороны</option>
              </select>
            </div>
            <Button type="submit" variant="secondary" className="h-10">
              Сохранить поле
            </Button>
          </form>
          <ConfirmForm
            action={deleteField}
            hidden={{ deckId: String(deckId), fieldId: String(field.id) }}
            label="Удалить поле"
            message={`Удалить поле «${field.name}» и его текст на карточках?`}
          />
        </div>
      ))}
      <form action={addField} className="flex flex-col gap-2 rounded-xl p-3 ring-1 ring-foreground/10">
        <input type="hidden" name="deckId" value={deckId} />
        <Input name="name" placeholder="Новое поле" required className="h-10" />
        <div className="grid grid-cols-2 gap-2">
          <select name="kind" className={controlClass} defaultValue="text">
            <option value="text">Текст</option>
            <option value="rich-text">HTML</option>
          </select>
          <select name="side" className={controlClass} defaultValue="back">
            <option value="front">Лицо</option>
            <option value="back">Оборот</option>
            <option value="both">Обе стороны</option>
          </select>
        </div>
        <Button type="submit" variant="outline" className="h-10">
          Добавить поле
        </Button>
      </form>
    </div>
  );
}
