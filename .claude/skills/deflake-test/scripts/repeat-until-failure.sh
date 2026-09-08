#!/usr/bin/env bash

set -uo pipefail

iterations="${DEFLAKE_ITERATIONS:-20}"
output_dir="${DEFLAKE_OUTPUT_DIR:-/tmp/deflake-test-$(date +%Y%m%d-%H%M%S)}"

usage() {
  cat <<'USAGE'
Usage: repeat-until-failure.sh [-n COUNT] [-o OUTPUT_DIR] -- COMMAND [ARG ...]

Runs COMMAND sequentially, stopping at its first non-zero exit. COUNT defaults
to DEFLAKE_ITERATIONS or 20. Each iteration is logged separately.
USAGE
}

while (($#)); do
  case "$1" in
    -n | --iterations)
      [[ $# -ge 2 ]] || { usage >&2; exit 2; }
      iterations="$2"
      shift 2
      ;;
    -o | --output-dir)
      [[ $# -ge 2 ]] || { usage >&2; exit 2; }
      output_dir="$2"
      shift 2
      ;;
    --)
      shift
      break
      ;;
    -h | --help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage >&2
      exit 2
      ;;
  esac
done

[[ "$iterations" =~ ^[1-9][0-9]*$ ]] || {
  echo "Iteration count must be a positive integer: $iterations" >&2
  exit 2
}

(($#)) || {
  echo "A command is required after --" >&2
  usage >&2
  exit 2
}

mkdir -p "$output_dir"
echo "OUTPUT_DIR=$output_dir"

for ((iteration = 1; iteration <= iterations; iteration++)); do
  log_file="$output_dir/iteration-$iteration.log"
  echo "===== iteration $iteration/$iterations ====="
  "$@" 2>&1 | tee "$log_file"
  statuses=("${PIPESTATUS[@]}")
  command_status="${statuses[0]}"
  tee_status="${statuses[1]}"

  if ((tee_status != 0)); then
    echo "Unable to write iteration log: $log_file" >&2
    exit "$tee_status"
  fi

  if ((command_status != 0)); then
    echo "FAILED_ITERATION=$iteration STATUS=$command_status"
    exit "$command_status"
  fi
done

echo "ALL_ITERATIONS_PASSED=$iterations"
