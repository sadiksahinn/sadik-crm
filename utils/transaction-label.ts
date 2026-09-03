export function transactionTitle(title: unknown, merchant: unknown) {
  const name = String(merchant || "").trim();
  const label = String(title || "").trim();
  const generic = /^(gider|gelir|harcama|alışveriş|market alışverişi|ödeme|işlem)$/i;
  if ((!label || generic.test(label)) && name && !generic.test(name)) return name.slice(0, 160);
  return label.slice(0, 160);
}
