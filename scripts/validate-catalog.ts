import { CATALOG } from '../shared/catalog/index.ts';
import { validateCatalog } from '../shared/engine/validate.ts';

const errors = validateCatalog(CATALOG);
if (errors.length) {
  console.error(`Catalog has ${errors.length} problem(s):`);
  for (const e of errors) console.error(' -', e);
  process.exit(1);
}
console.log(`Catalog OK: ${CATALOG.length} workflows (${CATALOG.filter((w) => w.kind === 'chat').length} chat, ${CATALOG.filter((w) => w.kind === 'form').length} form).`);
