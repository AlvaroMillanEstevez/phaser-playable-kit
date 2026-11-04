/**
 * Fails when any build in dist/ is larger than its network allows.
 * Run after `npm run build`.
 */
import { DIST_DIR } from './lib/paths.ts';
import { checkBudget, findDeliverables, formatReport } from './lib/size.ts';

const deliverables = findDeliverables(DIST_DIR);
if (deliverables.length === 0) {
  console.error('No builds found in dist/. Run `npm run build` first.');
  process.exit(1);
}

const results = deliverables.map(checkBudget);
console.log(formatReport(results));

const failures = results.filter((r) => !r.ok);
if (failures.length > 0) {
  console.error(`\n${failures.length} build(s) over budget.`);
  process.exit(1);
}
console.log(`\nAll ${results.length} build(s) within budget.`);
