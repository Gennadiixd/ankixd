export function parseTagList(input: string) {
  const seen = new Set<string>();
  const tags: string[] = [];
  for (const part of input.split(",")) {
    const tag = part.trim();
    if (!tag || seen.has(tag)) continue;
    seen.add(tag);
    tags.push(tag);
  }
  return tags;
}
