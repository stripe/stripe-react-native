#!/usr/bin/env bash
# Fails (exit 2) unless the harness artifacts for each platform exist and show
# hits in SDK code: native (LCOV or Jacoco) and JS (LCOV remapped to src/**).
#
#   bash scripts/assert-coverage.sh [ios|android|all]   # default: all
set -euo pipefail

PLATFORM="${1:-all}"
HARNESS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COVERAGE_DIR="${COVERAGE_DIR:-$(cd "$HARNESS_DIR/../.." && pwd)/coverage}"

case "$PLATFORM" in
  ios | android) platforms=("$PLATFORM") ;;
  all) platforms=(ios android) ;;
  *)
    echo "usage: $0 [ios|android|all]" >&2
    exit 1
    ;;
esac

cd "$HARNESS_DIR"
for platform in "${platforms[@]}"; do
  if [[ "$platform" == "ios" ]]; then
    yarn rn-coverage assert --platform ios --lcov "$COVERAGE_DIR/ios/lcov.info"
  else
    yarn rn-coverage assert --platform android --jacoco-xml "$COVERAGE_DIR/android/jacocoTestReport.xml"
  fi
  # The LCOV check is platform-neutral; --platform ios selects it.
  yarn rn-coverage assert --platform ios --lcov "$COVERAGE_DIR/js/$platform/lcov.info"
done
