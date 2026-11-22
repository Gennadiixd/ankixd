function plural(count: number, one: string, few: string, many: string) {
  const abs = Math.abs(count) % 100;
  const last = abs % 10;
  if (abs > 10 && abs < 20) return many;
  if (last === 1) return one;
  if (last >= 2 && last <= 4) return few;
  return many;
}

export function formatInterval(from: Date, to: Date | string | number) {
  const ms = new Date(to).getTime() - from.getTime();
  if (ms < 60_000) {
    const seconds = Math.max(1, Math.ceil(ms / 1000));
    return `${seconds} ${plural(seconds, "секунда", "секунды", "секунд")}`;
  }
  const minutes = Math.round(ms / 60_000);
  if (minutes < 60) {
    return `${minutes} ${plural(minutes, "минута", "минуты", "минут")}`;
  }
  const hours = Math.round(minutes / 60);
  if (hours < 24) {
    return `${hours} ${plural(hours, "час", "часа", "часов")}`;
  }
  const days = Math.round(hours / 24);
  if (days < 30) {
    return `${days} ${plural(days, "день", "дня", "дней")}`;
  }
  const months = Math.round(days / 30);
  if (months < 12) {
    return `${months} ${plural(months, "месяц", "месяца", "месяцев")}`;
  }
  const years = Math.max(1, Math.round(days / 365));
  return `${years} ${plural(years, "год", "года", "лет")}`;
}

export function plainText(value: string) {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function cardPreview(value: string) {
  const text = plainText(value);
  if (text) return text;
  if (/<img\b/i.test(value)) return "Фото";
  return "";
}
