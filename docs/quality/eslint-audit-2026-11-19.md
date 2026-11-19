# ESLint audit and prioritized remediation backlog — 19 November 2026

**Status: inventory and triage only. No production runtime behavior was changed.**

## Scope, evidence and interpretation

This report classifies **all 430 diagnostics (423 errors, 7 warnings)** from
[GitHub Actions run 44609214588](https://github.com/helm5000/com.homevolt.local/actions/runs/44609214588)
on the `fix/homevolt-energy-counters` development branch. Its job
(`135861011443`) executed `npm run lint` after the missing
`tsconfig.json` was introduced. Every reported location is catalogued in
[eslint-findings-2026-11-19.csv](eslint-findings-2026-11-19.csv), including
file, line, column, exact rule, error/warning, priority and recommended action.

**Important distinction:** this scan is **not** a pure upstream/main baseline.
The scanned branch also contained the proposed energy changes; 28 diagnostics
came from its *new* energy helper and test files (9 + 19), which were
subsequently addressed on the energy branch. The battery driver is modified
on that branch and contains a mixture of inherited and introduced lint
findings. Counting everything as “423 old errors” would be misleading.
Re-run the same lint configuration on `main` to measure the exact pre-existing
baseline before making any upstream quality claims.

ESLint warnings flag **possible code issues**, not automatically proven
runtime defects. Categories and priorities below are triage assessments; a
source review, reproducible test or actual runtime trace is needed for a bug
classification. Source and timestamps should be retained when reporting changes.

## Classification: 430 of 430 diagnostics

| Category | Count | Triage | Explanation |
| --- | ---: | --- | --- |
| Async callbacks and timer lifecycle | **11** | P1 inspect | 4 `@typescript-eslint/no-misused-promises`; 7 `homey-app/global-timers` warnings. Possible overlap/rejection or missing cleanup. |
| Initialization and declaration order | **5** | P2 inspect | `no-use-before-define`, all in analytics; declaration and call order need review. |
| Behavioral comparisons / numeric guards | **4** | P2 inspect | 3 `eqeqeq`; 1 `no-restricted-globals` (`isNaN`). Test before replacement. |
| Declared Node runtime compatibility | **25** | P2 configuration | `node/no-unsupported-features/es-syntax` infers `>=8.0.0`; verify actual supported Homey runtime and `engines` rather than rewriting modern syntax. |
| Node.js test-registration lint mismatch | **9** | P3 configuration | `no-floating-promises` on test registrations in the proposed test file. Scoped test rule override already applied on energy branch. |
| Formatting, naming and style conventions | **376** | P3 cleanup | Mostly indentation, arrow syntax, spacing, object layout, quotes, naming. Group in separate formatting commits; avoid hiding behavior changes. |
| **Total** | **430** | | **423 errors + 7 warnings** |

Priority totals: **P1 = 11**, **P2 = 34**, **P3 = 385**. They count
lint *locations*, **not confirmed bugs**. The P1 items are inspection targets,
not an assertion of 11 critical defects.

### Files affected (including warnings)

| File | Findings |
| --- | ---: |
| `drivers/homevolt-battery/device.js` | 281 |
| `app.js` | 45 |
| `test/battery-energy-counters.test.js` | 19 |
| `drivers/homevolt-battery/driver.js` | 14 |
| `drivers/homevolt-sensor/device.js` | 14 |
| `drivers/homevolt-solar-panel/device.js` | 13 |
| `drivers/homevolt-sensor/driver.js` | 10 |
| `drivers/homevolt-solar-panel/driver.js` | 9 |
| `lib/analytics.js` | 9 |
| `lib/battery-energy-counters.js` | 9 |
| `lib/auth.js` | 7 |
| **Total** | **430** |

### Highest-volume ESLint rules

| Rule | Locations |
| --- | ---: |
| `indent` | 228 |
| `node/no-unsupported-features/es-syntax` | 25 |
| `arrow-parens` | 23 |
| `padded-blocks` | 20 |
| `object-curly-newline` | 18 |
| `camelcase` | 14 |
| `quotes` | 13 |
| `no-multi-spaces` | 9 |
| `@typescript-eslint/no-floating-promises` | 9 |
| Other 22 rules combined | 71 |
| **Total** | **430** |

## Initial source-informed risk review

1. **Polling and asynchronous callbacks — P1:** the three device polling
   loops use `setInterval(async () => ...)`. The loops catch many errors
   locally; this alone does not prove an unhandled rejection. They also
   call `clearInterval` during restart and in `onDeleted`, so simply
   calling the timers “never cleaned up” would be incorrect. However,
   `setInterval` does not await the previous asynchronous request before
   starting another, and `onDeleted` does not cover every possible app
   shutdown lifecycle. Test concurrency and disposal explicitly.
2. **App settings listener — P1 review:** `app.js` registers
   `homey.settings.on('set', async (...))`. An async event listener can
   reject without its emitter awaiting it; inspect actual catches and
   model the failure path before changing code.
3. **Analytics declarations — P2:** `lib/analytics.js` accesses
   `pendingProfile` and `profileTimer` in a function declared before
   the `let` bindings. JavaScript functions can safely reference later
   declarations *after* those declarations initialize. Confirm there is
   no startup path calling the function during the temporal dead zone.
4. **Timer warnings — P1 review:** timer cleanup is partly present.
   Each warning should be validated against all lifecycle paths
   instead of automatically replacing `setTimeout`/`setInterval`.
5. **Node version — P2:** the lint log reports support incorrectly
   as `>=8.0.0` when interpreting modern language features. The repo's
   `package.json` has no `engines.node` declaration. Verify Homey
   SDK runtime support before introducing an `engines` field.
6. **Equality and numeric rules — P2:** `battery_status == 'charging'`
   (and similar) receives a strict-equality warning; these fields are
   string values in normal responses. `isNaN` in app code may involve
   string coercion, so replacing it with `Number.isNaN` without first
   converting inputs can change behavior.

These are **candidate investigations**, not independently demonstrated
customer-visible failures.

## Recommended work packages

- **A. Runtime safety (first):** one small change per callback/timer issue,
  with unit tests for concurrent polling, unhandled rejection, app restart,
  and timer disposal. Validate partner-control behavior is unchanged.
- **B. Configuration:** verify supported Homey Node runtime, set an accurate
  compatibility target, then re-run lint on the intended baseline.
- **C. Semantics:** add tests around affected comparisons and numeric
  conversions before making any behavioral changes.
- **D. Style-only cleanup:** isolate automatic formatting in a different
  commit/branch; keep the diff reviewable and never mix with the energy
  counter fix.
- **E. Upstream contribution:** send focused, independently tested PRs;
  disclose the scan's mixed-branch provenance and do not advertise all
  lint locations as defects.

The `fix/homevolt-energy-counters` branch has a separate **scoped CI**
(`npm run test:energy`, syntax checking of the modified driver, and
`npm run lint:energy`) which passed on
[run 44610416926](https://github.com/helm5000/com.homevolt.local/actions/runs/44610416926).
This does not establish a clean project-wide lint baseline.

### Reproducing the original full lint check

On a branch with the same `tsconfig.json` and dependencies as the scanned
commit:

```sh
npm ci
npm run lint
```

Preserve the exact Git SHA and toolchain versions for a fair comparison.
Work on `chore/eslint-audit` independently from
`fix/homevolt-energy-counters`; do not merge cleanup into the battery fix
just to make the full-project lint check green.
