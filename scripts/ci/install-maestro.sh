#!/usr/bin/env bash
# Install Maestro CLI with retries for transient network / corrupt-zip failures.
# Matches stripe-android's install+verify loop; uses scripts/ci/retry.sh.
#
# Env:
#   MAESTRO_VERSION   optional pin (exported to the upstream installer)
#   RETRY_*           see scripts/ci/retry.sh
#
# On success, ~/.maestro/bin/maestro exists and responds to -v.

set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=retry.sh
source "${SCRIPT_DIR}/retry.sh"

MAESTRO_BIN="${HOME}/.maestro/bin/maestro"

install_maestro_once() {
  # Drop a partial/corrupt prior install so retries start clean.
  rm -rf "${HOME}/.maestro"

  if [ -n "${MAESTRO_VERSION:-}" ]; then
    echo "Installing Maestro CLI version ${MAESTRO_VERSION}..."
    export MAESTRO_VERSION
  else
    echo "Installing Maestro CLI (latest)..."
  fi

  # Upstream installer downloads maestro.zip from GitHub releases when
  # MAESTRO_VERSION is set (cli-$MAESTRO_VERSION/maestro.zip).
  curl -fsSL "https://get.maestro.mobile.dev" | bash || return $?

  if [ ! -x "$MAESTRO_BIN" ]; then
    echo "Maestro install did not create an executable at $MAESTRO_BIN" >&2
    return 1
  fi

  echo "Verifying Maestro CLI..."
  "$MAESTRO_BIN" -v || return $?
}

# Network / zip corruption: use the slower initial delay already defined in bitrise.yml.
retry --attempts "${RETRY_MAX_ATTEMPTS:-5}" --sleep "${RETRY_SLEEP_SLOW:-${RETRY_SLEEP_FAST:-10}}" --backoff 2 -- \
  install_maestro_once

echo "Maestro CLI ready at $MAESTRO_BIN"
