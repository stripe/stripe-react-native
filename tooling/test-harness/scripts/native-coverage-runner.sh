# Shared steps for run-native-coverage.sh (sourced, not executed directly).
cleanup_ios_coverage_artifacts() {
  local derived_data="$1"
  rm -rf "$derived_data/output/coverage" "$derived_data/Build/ProfileData"
}

cleanup_android_coverage_artifacts() {
  local app_build="$1"
  rm -rf "$app_build/outputs/code_coverage" "$app_build/reports/jacoco"
}

assert_native_coverage() {
  local harness_dir="$1"
  local platform="$2"
  bash "$harness_dir/scripts/assert-coverage.sh" "$platform"
}
