#!/usr/bin/env bash

set -euo pipefail

REAL_INSTALLER_URL="${ZDU_INSTALLER_URL:-https://raw.githubusercontent.com/mjgil-zig/zdu/main/install.sh}"

if ! command -v curl >/dev/null 2>&1; then
  echo "zdu installer: required command not found: curl" >&2
  exit 1
fi

curl -fsSL "$REAL_INSTALLER_URL" | bash -s -- "$@"