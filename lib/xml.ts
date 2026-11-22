import { XMLParser } from "fast-xml-parser";
import { AppError } from "@/lib/errors";
import type { FieldKind, FieldSide } from "@/lib/types";
import { parseTagList } from "@/lib/tags";

export type ParsedField = {
  name: string;
  kind: FieldKind;
  side: FieldSide;
};

export type ParsedCard = {
  tags: string[];
  values: Record<string, string>;
};

export type ParsedDeck = {
  name: string;
  fields: ParsedField[];
  cards: ParsedCard[];
};

type Node = Record<string, unknown>;

function asNode(value: unknown): Node | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Node;
}

function childrenOf(node: Node, key: string) {
  const value = node[key];
  if (!Array.isArray(value)) return [];
  return value.map(asNode).filter((child): child is Node => child !== null);
}

function attrs(node: Node) {
  const raw = asNode(node[":@"]);
  const out: Record<string, string> = {};
  if (!raw) return out;
  for (const [key, value] of Object.entries(raw)) {
    out[key.replace(/^@_/, "")] = String(value ?? "");
  }
  return out;
}

function elementName(node: Node) {
  return Object.keys(node).find((key) => key !== ":@" && key !== "#text") ?? null;
}

function innerText(node: Node, name: string) {
  const value = node[name];
  if (!Array.isArray(value)) return "";
  return value
    .map((child) => {
      const item = asNode(child);
      if (!item || item["#text"] == null) return "";
      return String(item["#text"]);
    })
    .join("")
    .trim();
}

function sideFromMask(sides: string): FieldSide {
  const front = sides[0] === "1";
  const back = sides[1] === "1";
  if (front && back) return "both";
  if (front) return "front";
  return "back";
}

function escapeText(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function escapeAttr(value: string) {
  return escapeText(value).replaceAll('"', "&quot;");
}

function sideMask(side: FieldSide) {
  if (side === "front") return "10";
  if (side === "both") return "11";
  return "01";
}

export function buildAlgoXml(deck: ParsedDeck) {
  const fields = deck.fields
    .map((field) => `    <${field.kind} name="${escapeAttr(field.name)}" sides="${sideMask(field.side)}" />`)
    .join("\n");
  const cards = deck.cards
    .map((card) => {
      const values = deck.fields
        .map((field) => {
          const value = escapeText(card.values[field.name] ?? "");
          return `      <${field.kind} name="${escapeAttr(field.name)}">${value}</${field.kind}>`;
        })
        .join("\n");
      return `    <card tags="${escapeAttr(card.tags.join(", "))}">\n${values}\n    </card>`;
    })
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<deck name="${escapeAttr(deck.name)}">\n  <fields>\n${fields}\n  </fields>\n  <cards>\n${cards}\n  </cards>\n</deck>\n`;
}

export function parseAlgoXml(xml: string): ParsedDeck {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    preserveOrder: true,
    textNodeName: "#text",
    trimValues: false,
  });
  let tree: unknown;
  try {
    tree = parser.parse(xml);
  } catch {
    throw new AppError("Файл не похож на XML");
  }
  if (!Array.isArray(tree)) throw new AppError("Файл не похож на колоду");

  const deckNode = tree.map(asNode).find((node) => node && elementName(node) === "deck");
  if (!deckNode) throw new AppError("В файле нет колоды");
  const deckAttrs = attrs(deckNode);
  const name = deckAttrs.name?.trim();
  if (!name) throw new AppError("У колоды нет названия");

  const deckChildren = childrenOf(deckNode, "deck");
  const fieldsNode = deckChildren.find((node) => elementName(node) === "fields");
  const cardsNode = deckChildren.find((node) => elementName(node) === "cards");
  if (!fieldsNode) throw new AppError("В колоде не описаны поля");

  const fields: ParsedField[] = [];
  const seen = new Set<string>();
  for (const node of childrenOf(fieldsNode, "fields")) {
    const kindName = elementName(node);
    if (kindName !== "text" && kindName !== "rich-text") continue;
    const fieldAttrs = attrs(node);
    const fieldName = fieldAttrs.name?.trim();
    if (!fieldName) throw new AppError("У поля нет названия");
    if (seen.has(fieldName)) throw new AppError(`Поле «${fieldName}» повторяется`);
    seen.add(fieldName);
    fields.push({
      name: fieldName,
      kind: kindName,
      side: sideFromMask(fieldAttrs.sides ?? ""),
    });
  }
  if (fields.length === 0) throw new AppError("В колоде нет полей");

  const cards: ParsedCard[] = [];
  for (const node of cardsNode ? childrenOf(cardsNode, "cards") : []) {
    if (elementName(node) !== "card") continue;
    const values: Record<string, string> = {};
    for (const field of fields) values[field.name] = "";
    for (const child of childrenOf(node, "card")) {
      const kindName = elementName(child);
      if (kindName !== "text" && kindName !== "rich-text") continue;
      const fieldName = attrs(child).name?.trim();
      if (!fieldName || !seen.has(fieldName)) continue;
      values[fieldName] = innerText(child, kindName);
    }
    cards.push({
      tags: parseTagList(attrs(node).tags ?? ""),
      values,
    });
  }

  return { name, fields, cards };
}
