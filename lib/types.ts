export type FieldKind = "text" | "rich-text";
export type FieldSide = "front" | "back" | "both";

export type ShownField = {
  name: string;
  kind: FieldKind;
  value: string;
  safeHtml: string | null;
};

export type SessionCard = {
  id: number;
  front: ShownField[];
  back: ShownField[];
  tags: string[];
};

export type GradePreview = {
  again: string;
  good: string;
};
