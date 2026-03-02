#!/usr/bin/env bash
#
# Gitea Sync Script
# Standardizes local repo -> Gitea VPS connection and pushes state files.
#
# Usage:
#   ./scripts/gitea-sync.sh              # Sync state files
#   ./scripts/gitea-sync.sh --setup      # First-time remote setup
#   ./scripts/gitea-sync.sh --verify     # Verify connectivity
#
# Requires:
#   - SSH key auth to VPS (ssh hostinger-vps)
#   - GITEA_TOKEN env var or ~/.config/draggonnb/gitea-token
#
set -euo pipefail

GITEA_HOST="git.draggonnb.online"
GITEA_PORT="3030"
GITEA_API="https://${GITEA_HOST}/api/v1"
GITEA_ORG="draggonnb"
PLATFORM_REPO="platform-crmm"
OPS_REPO="ops-hub"

# Resolve token
GITEA_TOKEN="${GITEA_TOKEN:-}"
if [ -z "$GITEA_TOKEN" ] && [ -f "$HOME/.config/draggonnb/gitea-token" ]; then
  GITEA_TOKEN=$(cat "$HOME/.config/draggonnb/gitea-token")
fi

if [ -z "$GITEA_TOKEN" ]; then
  echo "ERROR: GITEA_TOKEN not set and ~/.config/draggonnb/gitea-token not found"
  echo "Set GITEA_TOKEN=<your-token> or create the token file"
  exit 1
fi

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# --- Functions ---

setup_remotes() {
  echo "=== Setting up Gitea remotes ==="
  cd "$PROJECT_ROOT"

  # Add gitea remote for platform-crmm (state/docs repo)
  if git remote get-url gitea >/dev/null 2>&1; then
    echo "  Remote 'gitea' already exists: $(git remote get-url gitea)"
    echo "  Updating URL..."
    git remote set-url gitea "https://${GITEA_HOST}:${GITEA_PORT}/${GITEA_ORG}/${PLATFORM_REPO}.git"
  else
    echo "  Adding remote 'gitea'..."
    git remote add gitea "https://${GITEA_HOST}:${GITEA_PORT}/${GITEA_ORG}/${PLATFORM_REPO}.git"
  fi

  echo ""
  echo "Git remotes configured:"
  git remote -v
  echo ""
  echo "=== Remote setup complete ==="
}

verify_connectivity() {
  echo "=== Verifying Gitea connectivity ==="

  # Test API
  echo -n "  API ($GITEA_API): "
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "Authorization: token $GITEA_TOKEN" \
    "${GITEA_API}/repos/${GITEA_ORG}/${PLATFORM_REPO}" 2>/dev/null || echo "000")

  if [ "$HTTP_CODE" = "200" ]; then
    echo "OK (200)"
  else
    echo "FAILED (HTTP $HTTP_CODE)"
    echo "  Check: GITEA_TOKEN valid, repo exists, port ${GITEA_PORT} accessible"
  fi

  # Test ops-hub
  echo -n "  ops-hub repo: "
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "Authorization: token $GITEA_TOKEN" \
    "${GITEA_API}/repos/${GITEA_ORG}/${OPS_REPO}" 2>/dev/null || echo "000")

  if [ "$HTTP_CODE" = "200" ]; then
    echo "OK (200)"
  else
    echo "FAILED (HTTP $HTTP_CODE)"
  fi

  # Test SSH
  echo -n "  SSH (hostinger-vps): "
  if ssh -o ConnectTimeout=5 -o BatchMode=yes hostinger-vps "echo ok" 2>/dev/null; then
    echo ""
  else
    echo "FAILED (check SSH config)"
  fi

  echo "=== Verification complete ==="
}

sync_file_to_gitea() {
  local file_path="$1"
  local repo="$2"
  local remote_path="$3"

  if [ ! -f "$PROJECT_ROOT/$file_path" ]; then
    echo "  SKIP: $file_path (not found)"
    return
  fi

  local content
  content=$(base64 -w 0 "$PROJECT_ROOT/$file_path")

  # Check if file exists on Gitea
  local existing_sha
  existing_sha=$(curl -s \
    -H "Authorization: token $GITEA_TOKEN" \
    "${GITEA_API}/repos/${GITEA_ORG}/${repo}/contents/${remote_path}" 2>/dev/null \
    | python3 -c "import sys,json; print(json.load(sys.stdin).get('sha',''))" 2>/dev/null || echo "")

  if [ -n "$existing_sha" ]; then
    # Update existing file
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
      -X PUT \
      -H "Authorization: token $GITEA_TOKEN" \
      -H "Content-Type: application/json" \
      -d "{\"message\":\"sync: $(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"content\":\"${content}\",\"sha\":\"${existing_sha}\"}" \
      "${GITEA_API}/repos/${GITEA_ORG}/${repo}/contents/${remote_path}")
    echo "  UPDATE $remote_path -> HTTP $HTTP_CODE"
  else
    # Create new file
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
      -X POST \
      -H "Authorization: token $GITEA_TOKEN" \
      -H "Content-Type: application/json" \
      -d "{\"message\":\"sync: $(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"content\":\"${content}\"}" \
      "${GITEA_API}/repos/${GITEA_ORG}/${repo}/contents/${remote_path}")
    echo "  CREATE $remote_path -> HTTP $HTTP_CODE"
  fi
}

sync_state() {
  echo "=== Syncing state files to Gitea ==="
  echo "  Target: ${GITEA_ORG}/${PLATFORM_REPO}"
  echo ""

  # Always sync STATE.md
  sync_file_to_gitea ".planning/STATE.md" "$PLATFORM_REPO" "STATE.md"

  # Sync if they exist
  sync_file_to_gitea ".planning/ROADMAP.md" "$PLATFORM_REPO" "ROADMAP.md"
  sync_file_to_gitea ".planning/PROJECT.md" "$PLATFORM_REPO" "PROJECT.md"
  sync_file_to_gitea ".planning/errors/catalogue.json" "$PLATFORM_REPO" "errors/catalogue.json"

  echo ""
  echo "=== Sync complete ==="
}

# --- Main ---

case "${1:-sync}" in
  --setup)
    setup_remotes
    ;;
  --verify)
    verify_connectivity
    ;;
  sync|--sync)
    sync_state
    ;;
  *)
    echo "Usage: $0 [--setup|--verify|sync]"
    exit 1
    ;;
esac
