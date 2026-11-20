#!/usr/bin/env node
// Runs each package's Jest suite with coverage and enforces the floors in
// coverage-floors.json.
//
//   node scripts/jest-coverage.mjs                 # measure, fail below a floor
//   node scripts/jest-coverage.mjs --update        # also record or raise floors to the measured values
//   node scripts/jest-coverage.mjs --base <ref>    # also fail if this change lowers a floor without a new floorResets reason, or narrows a scope
//
// COVERAGE_FLOORS_BASE sets --base. Floors only move up: --update never
// lowers one, and --base rejects a lowered floor unless this change adds a
// "floorResets" reason that is not already at the base. A "scopeChanges"
// reason does not excuse a lower floor. --base also rejects a new exclude, a
// changed dir, or a dropped package unless this change names it in
// "scopeChanges". Every workspace with sources must have a floors entry or
// an "unmeasured" reason.
// Also fails if any workspace other than the harness depends on
// react-native-coverage.
import { runCoverageChecks } from './jest-coverage-lib.mjs';

try {
  const failures = runCoverageChecks(process.argv.slice(2));
  if (failures.length > 0) {
    console.error(`\n[coverage] FAILED:\n  - ${failures.join('\n  - ')}`);
    process.exit(1);
  }
  console.log('\n[coverage] all packages meet their floors');
} catch (error) {
  console.error(`[coverage] ${error.message}`);
  process.exit(1);
}
