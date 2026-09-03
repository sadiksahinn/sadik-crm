const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
function load(file) {
  const output = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const module = { exports: {} };
  new Function('module', 'exports', output)(module, module.exports);
  return module.exports;
}
const { onlyNewDocumentItems } = load('utils/document-dedupe.ts');
const { transactionTitle } = load('utils/transaction-label.ts');
const item = { title: 'ADA GROSS', merchant: 'ADA GROSS', amount: 3154.05, date: '2026-08-29', type: 'gider' };
const existing = { title: 'ADA GROSS ANKARA TR', amount: 3154.05, expense_date: '2026-08-29' };
assert.equal(onlyNewDocumentItems([item], [existing]).skipped, 1);
assert.equal(onlyNewDocumentItems([{ ...item, type: 'gelir' }], [existing]).items.length, 1);
assert.equal(onlyNewDocumentItems([item, { ...item, type: 'gelir' }], []).items.length, 2);
assert.equal(onlyNewDocumentItems([item, item], []).skipped, 1);
assert.equal(onlyNewDocumentItems([{ ...item, amount: 3154.06 }], [existing]).items.length, 1);
assert.equal(onlyNewDocumentItems([{ ...item, date: '2026-08-30' }], [existing]).items.length, 1);
assert.equal(transactionTitle('Gider', 'ADA GROSS'), 'ADA GROSS');
assert.equal(transactionTitle('Market alışverişi', 'ADA GROSS'), 'ADA GROSS');
assert.equal(transactionTitle('Müşteri çekimi', 'Hakan'), 'Müşteri çekimi');
assert.equal(transactionTitle('Gider', ''), 'Gider');
console.log('10 finans belge kontrolü geçti.');
