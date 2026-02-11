#!/bin/bash
# sync-gitea-state.sh -- Push current state files to Gitea VPS
# Run via: ssh hostinger-vps 'bash -s' < scripts/sync-gitea-state.sh
# Or called by Claude Code on session close
#
# Syncs: STATE.md, ROADMAP.md, PROJECT.md to draggonnb/platform-crmm
# Syncs: infrastructure.md to draggonnb/ops-hub (if changed)

GITEA_TOKEN="317b6e2731f63feb29b8fe0f0c5233ec0d97ae07"
GITEA_URL="http://localhost:3030"
GITEA_ORG="draggonnb"

sync_file() {
  local repo="$1"
  local filepath="$2"
  local content_b64="$3"
  local api_url="${GITEA_URL}/api/v1/repos/${GITEA_ORG}/${repo}/contents/${filepath}"

  # Get current file SHA (needed for update)
  local existing=$(curl -s -H "Authorization: token ${GITEA_TOKEN}" "${api_url}")
  local sha=$(echo "$existing" | python3 -c "import sys,json; print(json.load(sys.stdin).get('sha',''))" 2>/dev/null || echo "")

  if [ -n "$sha" ] && [ "$sha" != "" ]; then
    # Update existing file
    curl -s -X PUT -H "Authorization: token ${GITEA_TOKEN}" \
      -H "Content-Type: application/json" \
      -d "{\"content\":\"${content_b64}\",\"sha\":\"${sha}\",\"message\":\"auto-sync: update ${filepath}\"}" \
      "${api_url}" > /dev/null
    echo "Updated: ${repo}/${filepath}"
  else
    # Create new file
    curl -s -X POST -H "Authorization: token ${GITEA_TOKEN}" \
      -H "Content-Type: application/json" \
      -d "{\"content\":\"${content_b64}\",\"message\":\"auto-sync: create ${filepath}\"}" \
      "${api_url}" > /dev/null
    echo "Created: ${repo}/${filepath}"
  fi
}

echo "Gitea state sync starting..."
echo "Files will be provided via stdin by Claude Code"
