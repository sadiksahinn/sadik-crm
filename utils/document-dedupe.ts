type DocumentItem = {
  title?: unknown;
  merchant?: unknown;
  amount?: unknown;
  date?: unknown;
  type?: unknown;
};

type ExistingRecord = {
  title?: unknown;
  amount?: unknown;
  expense_date?: unknown;
  income_date?: unknown;
  note?: unknown;
};

function noteValue(note: unknown, label: string) {
  const part = String(note || "").split(" · ").find((value) => value.startsWith(`${label}: `));
  return part ? part.slice(label.length + 2).trim() : "";
}

export function normalizeTransactionName(value: unknown) {
  return String(value || "")
    .toLocaleUpperCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/İ/g, "I")
    .replace(/[^A-Z0-9]+/g, " ")
    .replace(/\b(?:TURKIYE|TURKEY|ANKARA|ISTANBUL|ANTALYA|IZMIR|TR)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function nameMatches(left: unknown, right: unknown) {
  const a = normalizeTransactionName(left);
  const b = normalizeTransactionName(right);
  if (!a || !b) return false;
  if (a === b) return true;
  if (Math.min(a.length, b.length) >= 6 && (a.includes(b) || b.includes(a))) return true;
  const aTokens = new Set(a.split(" ").filter((token) => token.length > 1));
  const bTokens = new Set(b.split(" ").filter((token) => token.length > 1));
  const common = [...aTokens].filter((token) => bTokens.has(token)).length;
  return common / Math.max(aTokens.size, bTokens.size, 1) >= 0.6;
}

function sameAmount(left: unknown, right: unknown) {
  return Math.round(Number(left || 0) * 100) === Math.round(Number(right || 0) * 100);
}

export function isSameDocumentTransaction(item: DocumentItem, existing: ExistingRecord) {
  if (item.type === "gelir" && existing.expense_date && !existing.income_date) return false;
  if (item.type === "gider" && existing.income_date && !existing.expense_date) return false;
  const itemDate = String(item.date || "").slice(0, 10);
  const existingDate = String(existing.expense_date || existing.income_date || "").slice(0, 10);
  if (!itemDate || itemDate !== existingDate || !sameAmount(item.amount, existing.amount)) return false;
  const itemName = item.merchant || item.title;
  const existingName = noteValue(existing.note, "İşyeri") || noteValue(existing.note, "Kaynak") || existing.title;
  return nameMatches(itemName, existingName);
}

export function onlyNewDocumentItems<T extends DocumentItem>(items: T[], existing: ExistingRecord[]) {
  const unique: T[] = [];
  let skipped = 0;
  for (const item of items) {
    const duplicate = existing.some((record) => isSameDocumentTransaction(item, record)) ||
      unique.some((record) => record.type === item.type && isSameDocumentTransaction(item, {
        title: record.title,
        amount: record.amount,
        expense_date: record.date,
        income_date: record.date,
        note: `İşyeri: ${String(record.merchant || record.title || "")}`,
      }));
    if (duplicate) skipped += 1;
    else unique.push(item);
  }
  return { items: unique, skipped };
}
