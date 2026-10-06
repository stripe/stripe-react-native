---
name: deflake-test
description: Reproduce, diagnose, fix, and stress-verify a suspected flaky unit, integration, or Maestro E2E test. Use when asked to repeat one focused test until it fails or establish a consecutive-pass threshold, not for ordinary one-off failures or broad suite validation.
---

# Deflake a test

Use the iteration count requested by the user. Otherwise default to **20**. When using the bundled runner, override the count with `--iterations`/`-n` or `DEFLAKE_ITERATIONS`.

## Workflow

1. Find the narrowest command that runs exactly the requested test. Read repository instructions and test documentation first. Prepare required devices, apps, services, fixtures, and dependencies without broadening into a repository-wide suite.
2. Run the test sequentially up to the configured count, stopping at the first genuine test failure. Preserve separate output and debug artifacts for every iteration. Use [`scripts/repeat-until-failure.sh`](scripts/repeat-until-failure.sh) for ordinary commands.
3. Count only valid executions of the intended test. Parser or runner incompatibilities, missing builds or services, disconnected devices, exhausted emulator storage, stale system overlays, and another process replacing the app are harness failures. Repair or isolate the environment, then restart the initial count. Do not change product code or weaken the test to accommodate a broken harness.
4. If the first clean run reaches the configured count without failure, stop immediately. Make no code changes and report that the issue could not be reproduced.
5. When a failure occurs, inspect the most specific evidence available: failed-step timing, screenshots, view hierarchy, application and native logs, process lifecycle, network/backend state, and differences between iterations. Identify the first causal event rather than only the final missing element.
6. Apply the smallest root-cause fix. Prefer lifecycle or state synchronization and stable readiness conditions over sleeps, retries, or relaxed assertions. A fixed delay is a last resort and must be justified by a bounded external transition.
7. Run focused unit, compilation, and static checks required by the affected code and repository instructions. Then start a fresh run and require the configured number of consecutive passes. Any genuine failure resets the consecutive-pass count and requires further investigation.
8. Report the failing iteration, root cause, fix, focused validation, and final consecutive-pass result. Follow the repository's existing commit and pull-request workflow; this skill grants no additional permission to mutate external systems.

## Maestro E2E guidance for this repository

- Build and install the example app first, then run one flow with `maestro test -e APP_ID=com.stripe.react.native <flow>` and an explicit device ID when multiple devices are connected.
- Confirm the installed Maestro version supports the flow syntax. Treat a parse error as a runner mismatch, not a test reproduction.
- Before counting Android iterations, verify emulator storage, network access to the configured demo backend, and that the expected APK remains installed. Concurrent worktrees use the same application ID and can replace each other's builds.
- Give each iteration its own `--debug-output` directory. On failure, inspect its screenshot, hierarchy, Maestro log, device logcat, and application process exit reason.
- Use platform-conditional flows for platform-specific selectors rather than mutually exclusive optional actions.
- Wait for a stable screen identity or readiness signal, not content that can vary with saved payment methods, account state, or layout.
- Do not hide startup crashes with an in-flow relaunch unless evidence shows the launch failure is unrelated infrastructure and existing suite-level retries are insufficient.
- If a native flow returns control to JavaScript, check whether work that immediately presents UI ran before the React host activity reattached. Waiting for a later assertion cannot recover an alert or event that was already dropped.
- Keep test hardening separate from product fixes when they address independent failure modes; remove redundant workarounds after the underlying race is fixed.
