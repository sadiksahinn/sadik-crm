export function isProvisionExpense(item: { note?: unknown }) {
  return /(?:^| · )Durum:\s*provizyon(?: · |$)/i.test(String(item?.note || ""));
}

export function confirmedExpenses<T extends { note?: unknown }>(items: T[] | null | undefined) {
  return items || [];
}

export function profitLossExpenses<T extends { note?: unknown; category?: unknown }>(items: T[] | null | undefined) {
  return confirmedExpenses(items).filter((item) => {
    const category = String(item?.category || "").toLocaleLowerCase("tr-TR");
    const note = String(item?.note || "");
    return category !== "depozito" && !/Alacak\/Varlık:\s*Geri alınacak/i.test(note);
  });
}

type FinanceExpense = {
  title?: unknown;
  category?: unknown;
  payment_method?: unknown;
};

export function isCardExpense(item: FinanceExpense) {
  return /kredi kartı|sanal kart|credit card/i.test(String(item.payment_method || ""));
}

export function isBillExpense(item: FinanceExpense) {
  const text = `${item.title || ""} ${item.category || ""}`;
  return /fatura|elektrik|enerjisa|aski|ankara su|doğalgaz|internet|telefon|abonelik|superonline|türk telekom/i.test(text);
}

export function isAccountMovement(item: FinanceExpense) {
  if (isCardExpense(item) || isBillExpense(item)) return false;
  const text = `${item.title || ""} ${item.payment_method || ""}`;
  return /havale|eft|transfer|virman|nakit|vadesiz|hesap/i.test(text);
}
