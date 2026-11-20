#!/usr/bin/env bash
# Builds the coverage test harness for one platform, runs it end to end with
# Maestro, then pulls, reports, and asserts JS and native coverage.
#
#   bash scripts/run-native-coverage.sh ios       # IOS_SIMULATOR_UDID or IOS_SIMULATOR (booted)
#   bash scripts/run-native-coverage.sh android   # ANDROID_SERIAL when more than one device
#
# Artifacts (repository root):
#   coverage/js/<platform>/lcov.info          JS, remapped to src/**
#   coverage/ios/lcov.info                    iOS native (llvm-cov)
#   coverage/android/jacocoTestReport.xml     Android native (Jacoco)
set -euo pipefail

PLATFORM="${1:-}"
if [[ "$PLATFORM" != "ios" && "$PLATFORM" != "android" ]]; then
  echo "usage: $0 ios|android" >&2
  exit 1
fi

HARNESS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck source=scripts/native-coverage-runner.sh
source "$HARNESS_DIR/scripts/native-coverage-runner.sh"
REPO_ROOT="$(cd "$HARNESS_DIR/../.." && pwd)"
COVERAGE_DIR="$REPO_ROOT/coverage"
APP_ID="com.stripe.react.native.testharness"
MAESTRO="${MAESTRO:-$(command -v maestro || echo "$HOME/.maestro/bin/maestro")}"

cd "$HARNESS_DIR"
rn_coverage() { yarn rn-coverage "$@"; }

rm -rf "$COVERAGE_DIR/$PLATFORM" "$COVERAGE_DIR/js/$PLATFORM"
mkdir -p "$COVERAGE_DIR/$PLATFORM" "$COVERAGE_DIR/js/$PLATFORM"

bundle() {
  local assets_dest="$1"
  mkdir -p dist "$assets_dest"
  RN_COVERAGE_JS=1 yarn react-native bundle \
    --entry-file index.js \
    --platform "$PLATFORM" \
    --dev false \
    --minify false \
    --bundle-output "dist/main.$PLATFORM.jsbundle" \
    --assets-dest "$assets_dest"
}

js_report() {
  rn_coverage js report \
    --input "$COVERAGE_DIR/js/$PLATFORM/coverage-final.json" \
    --output "$COVERAGE_DIR/js/$PLATFORM" \
    --cwd "$REPO_ROOT" \
    --nyc-config "$HARNESS_DIR/nyc.config.js"
}

run_ios() {
  local udid="${IOS_SIMULATOR_UDID:-}"
  if [[ -z "$udid" ]]; then
    local name="${IOS_SIMULATOR:-iPhone 16 Pro Max}"
    udid="$(xcrun simctl list devices booted -j | node -e '
      const name = process.argv[1];
      const devices = Object.values(JSON.parse(require("fs").readFileSync(0, "utf8")).devices).flat();
      const match = devices.find((d) => d.name === name && d.state === "Booted");
      if (match) console.log(match.udid);
    ' "$name")"
    if [[ -z "$udid" ]]; then
      echo "No booted simulator named '$name'. Boot one, or set IOS_SIMULATOR_UDID." >&2
      exit 1
    fi
  fi
  local derived_data="${DERIVED_DATA_PATH:-$HARNESS_DIR/ios/build}"
  local app="$derived_data/Build/Products/Debug-iphonesimulator/ReactTestApp.app"

  bundle dist/assets
  pod install --project-directory=ios
  xcodebuild \
    -workspace ios/StripeTestHarness.xcworkspace \
    -scheme ReactTestApp \
    -configuration Debug \
    -sdk iphonesimulator \
    -destination "id=$udid" \
    -derivedDataPath "$derived_data" \
    CODE_SIGNING_ALLOWED=NO \
    -quiet \
    build

  # Raw profiles from an earlier run would be merged into this report.
  cleanup_ios_coverage_artifacts "$derived_data"
  xcrun simctl uninstall "$udid" "$APP_ID" || true
  xcrun simctl install "$udid" "$app"
  "$MAESTRO" test -p ios --udid "$udid" e2e/coverage-run.yaml

  rn_coverage ios pull --device "$udid" --output "$derived_data/output/coverage"
  rn_coverage js pull --platform ios --device "$udid" --output "$COVERAGE_DIR/js/ios"
  rn_coverage ios export --derived-data "$derived_data" --output "$COVERAGE_DIR/ios/lcov.info"
  js_report
}

run_android() {
  local serial="${ANDROID_SERIAL:-}"
  if [[ -z "$serial" ]]; then
    local devices
    devices="$(adb devices | awk 'NR > 1 && $2 == "device" { print $1 }')"
    if [[ "$(printf '%s\n' "$devices" | grep -c .)" != "1" ]]; then
      echo "Set ANDROID_SERIAL to one of the attached devices: ${devices:-none}" >&2
      exit 1
    fi
    serial="$devices"
  fi
  export ANDROID_SERIAL="$serial"
  local abi
  abi="$(adb -s "$serial" shell getprop ro.product.cpu.abi | tr -d '\r')"
  local app_build="$HARNESS_DIR/android/app/build"

  bundle dist/res
  # Execution data from an earlier run would be merged into this report.
  cleanup_android_coverage_artifacts "$app_build"
  (cd android && ./gradlew :app:assembleDebug -PreactNativeArchitectures="$abi")

  adb -s "$serial" uninstall "$APP_ID" >/dev/null 2>&1 || true
  adb -s "$serial" install -r "$app_build/outputs/apk/debug/app-debug.apk"
  "$MAESTRO" test -p android --udid "$serial" e2e/coverage-run.yaml

  rn_coverage android pull --device "$serial" --output "$app_build/outputs/code_coverage"
  rn_coverage js pull --platform android --device "$serial" --output "$COVERAGE_DIR/js/android"
  rn_coverage android report --android-dir android \
    --jacoco-xml "$app_build/reports/jacoco/jacocoTestReport/jacocoTestReport.xml"
  cp "$app_build/reports/jacoco/jacocoTestReport/jacocoTestReport.xml" "$COVERAGE_DIR/android/"
  js_report
}

"run_$PLATFORM"
assert_native_coverage "$HARNESS_DIR" "$PLATFORM"
