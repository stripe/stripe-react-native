#!/usr/bin/env bash
# Retry a command with backoff, analogous to nick-fields/retry on GitHub Actions.
#
# Usage:
#   retry [--attempts N] [--sleep SECONDS] [--backoff MULTIPLIER] [--] command [args...]
#   bash scripts/ci/retry.sh [--attempts N] [--sleep SECONDS] [--backoff MULTIPLIER] [--] command [args...]
#
# Env knobs (bitrise.yml app envs):
#   RETRY_MAX_ATTEMPTS  max attempts (default: 5)
#   RETRY_SLEEP_FAST    default sleep between attempts in seconds (default: 10)
#   RETRY_BACKOFF_MULTIPLIER  sleep multiplier after each failed attempt (default: 2)
#
# Exits with the last command status after attempts are exhausted.

retry() {
  local max_attempts="${RETRY_MAX_ATTEMPTS:-5}"
  local sleep_seconds="${RETRY_SLEEP_FAST:-10}"
  local backoff_multiplier="${RETRY_BACKOFF_MULTIPLIER:-2}"
  local -a cmd=()

  while (($#)); do
    case "$1" in
      --attempts)
        max_attempts="$2"
        shift 2
        ;;
      --sleep)
        sleep_seconds="$2"
        shift 2
        ;;
      --backoff)
        backoff_multiplier="$2"
        shift 2
        ;;
      --)
        shift
        cmd=("$@")
        break
        ;;
      -*)
        echo "retry: unknown option: $1" >&2
        return 2
        ;;
      *)
        cmd=("$@")
        break
        ;;
    esac
  done

  if ((${#cmd[@]} == 0)); then
    echo "retry: a command is required" >&2
    return 2
  fi

  if ! [[ "$max_attempts" =~ ^[1-9][0-9]*$ ]]; then
    echo "retry: --attempts must be a positive integer (got: $max_attempts)" >&2
    return 2
  fi

  if ! [[ "$sleep_seconds" =~ ^[0-9]+$ ]]; then
    echo "retry: --sleep must be a non-negative integer (got: $sleep_seconds)" >&2
    return 2
  fi

  if ! [[ "$backoff_multiplier" =~ ^[1-9][0-9]*$ ]]; then
    echo "retry: --backoff must be a positive integer (got: $backoff_multiplier)" >&2
    return 2
  fi

  local attempt=1
  local status=0
  local current_sleep="$sleep_seconds"

  while ((attempt <= max_attempts)); do
    # `|| status=$?` keeps set -e from aborting across bash 3.2/5.x.
    # Do not use `if cmd; status=$?` — after a failed if, $? is 0.
    status=0
    "${cmd[@]}" || status=$?
    if ((status == 0)); then
      return 0
    fi

    if ((attempt == max_attempts)); then
      echo "retry: command failed after ${max_attempts} attempts (exit ${status}): ${cmd[*]}" >&2
      return "$status"
    fi

    echo "retry: attempt ${attempt}/${max_attempts} failed (exit ${status}); sleeping ${current_sleep}s before retry..." >&2
    sleep "$current_sleep"
    current_sleep=$((current_sleep * backoff_multiplier))
    attempt=$((attempt + 1))
  done

  return "$status"
}

# Allow `bash scripts/ci/retry.sh -- command` as well as `source` + `retry`.
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  set -euo pipefail
  retry "$@"
fi
