# CLAUDE.md

See CONTRIBUTING.md for development workflow, setup, testing, and commit conventions.

## Verification

After changes, run relevant tests before committing:
- `yarn test` (TypeScript unit tests)
- `yarn test:unit:ios` / `yarn test:unit:android` (after native changes)

Pre-commit hooks enforce lint, typecheck, and formatting automatically.

## Code Style

<!-- TODO: Add project-specific style rules that differ from defaults -->

## GitHub CLI

IMPORTANT: Always set `GH_HOST=github.com` for all `gh` commands. Without it, `gh` defaults to Stripe's GHE instance.

Example: `GH_HOST=github.com gh pr create --repo stripe/stripe-react-native --title [...]`

When searching issues, always use `--state all` to include closed/resolved issues. Check GitHub issues for similar problems before investigating user reports.

## Old Architecture Compatibility

The SDK maintains old architecture compat via `patches/old-arch-codegen-fix.patch`.
When modifying `src/specs/NativeStripeSdkModule.ts`, the patch must also be updated.
See CONTRIBUTING.md "Maintaining the Stripe old-architecture patch" for the procedure.
