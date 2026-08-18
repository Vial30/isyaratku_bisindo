#!/usr/bin/env bash
# ==============================================================================
# Alias forwarder ke setup_vps.sh
# ==============================================================================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
bash "${SCRIPT_DIR}/setup_vps.sh" "$@"
