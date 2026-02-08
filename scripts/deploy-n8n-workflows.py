"""Deploy DraggonnB workflows to N8N on VPS via SSH"""
import paramiko
import json
import sys

VPS_HOST = "72.61.146.151"
VPS_USER = "root"
VPS_PASS = "ChrisTERBL@1985"
SUPABASE_URL = "https://psqfgzbjbgqrmjskdavs.supabase.co"
N8N_CONTAINER = "root-n8n-1"

def ssh_exec(ssh, cmd, label=""):
    stdin, stdout, stderr = ssh.exec_command(cmd)
    out = stdout.read().decode()
    err = stderr.read().decode()
    if label:
        print(f"[{label}] ", end="")
    if out.strip():
        print(out.strip()[:500])
    if err.strip() and "Permission" not in err:
        print(f"STDERR: {err.strip()[:300]}")
    return out, err

def main():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    print(f"Connecting to {VPS_HOST}...")
    ssh.connect(VPS_HOST, username=VPS_USER, password=VPS_PASS, timeout=15)
    print("Connected.\n")

    # Workflow 1: AI Content Generator
    wf1 = {
        "name": "DraggonnB - AI Content Generator",
        "nodes": [
            {
                "parameters": {
                    "httpMethod": "POST",
                    "path": "generate-content",
                    "responseMode": "responseNode",
                    "options": {}
                },
                "type": "n8n-nodes-base.webhook",
                "typeVersion": 2,
                "position": [0, 0],
                "id": "wh-gen",
                "name": "Webhook Trigger"
            },
            {
                "parameters": {
                    "method": "POST",
                    "url": "https://api.anthropic.com/v1/messages",
                    "authentication": "genericCredentialType",
                    "genericAuthType": "httpHeaderAuth",
                    "sendHeaders": True,
                    "headerParameters": {
                        "parameters": [
                            {"name": "anthropic-version", "value": "2023-06-01"},
                            {"name": "content-type", "value": "application/json"}
                        ]
                    },
                    "sendBody": True,
                    "specifyBody": "json",
                    "jsonBody": '={"model":"claude-sonnet-4-20250514","max_tokens":1500,"system":"You are a social media content expert for South African SMEs. Generate engaging, professional content. Use South African English. Include hashtags. Keep B2B tone.","messages":[{"role":"user","content":"Generate a {{ $json.body.contentType || \'post\' }} for {{ $json.body.platforms ? $json.body.platforms.join(\', \') : \'linkedin\' }}. Topic: {{ $json.body.prompt }}. Tone: {{ $json.body.tone || \'professional\' }}"}]}',
                    "options": {"timeout": 30000}
                },
                "type": "n8n-nodes-base.httpRequest",
                "typeVersion": 4.2,
                "position": [250, 0],
                "id": "claude-gen",
                "name": "Claude AI Generate"
            },
            {
                "parameters": {
                    "method": "POST",
                    "url": f"{SUPABASE_URL}/rest/v1/social_posts",
                    "authentication": "genericCredentialType",
                    "genericAuthType": "httpHeaderAuth",
                    "sendHeaders": True,
                    "headerParameters": {
                        "parameters": [
                            {"name": "Prefer", "value": "return=representation"},
                            {"name": "Content-Type", "value": "application/json"}
                        ]
                    },
                    "sendBody": True,
                    "specifyBody": "json",
                    "jsonBody": '={{ JSON.stringify({ organization_id: $input.first().json.body.organizationId, content: $json.content[0].text, platforms: $input.first().json.body.platforms || ["linkedin"], status: "draft" }) }}',
                    "options": {"timeout": 10000}
                },
                "type": "n8n-nodes-base.httpRequest",
                "typeVersion": 4.2,
                "position": [500, 0],
                "id": "save-post",
                "name": "Save to Supabase"
            },
            {
                "parameters": {
                    "options": {},
                    "respondWith": "json",
                    "responseBody": '={{ JSON.stringify({ success: true, data: { content: $json[0] ? $json[0].content : $json.content, post_id: $json[0] ? $json[0].id : "saved" } }) }}'
                },
                "type": "n8n-nodes-base.respondToWebhook",
                "typeVersion": 1.1,
                "position": [750, 0],
                "id": "resp-ok",
                "name": "Success Response"
            }
        ],
        "connections": {
            "Webhook Trigger": {"main": [[{"node": "Claude AI Generate", "type": "main", "index": 0}]]},
            "Claude AI Generate": {"main": [[{"node": "Save to Supabase", "type": "main", "index": 0}]]},
            "Save to Supabase": {"main": [[{"node": "Success Response", "type": "main", "index": 0}]]}
        },
        "settings": {"executionOrder": "v1", "timezone": "Africa/Johannesburg"}
    }

    # Workflow 2: Content Queue Processor
    wf2 = {
        "name": "DraggonnB - Content Queue Processor",
        "nodes": [
            {
                "parameters": {
                    "rule": {"interval": [{"field": "minutes", "minutesInterval": 15}]}
                },
                "type": "n8n-nodes-base.scheduleTrigger",
                "typeVersion": 1.2,
                "position": [0, 0],
                "id": "cron-queue",
                "name": "Every 15 Minutes"
            },
            {
                "parameters": {
                    "url": f"{SUPABASE_URL}/rest/v1/social_posts?status=eq.scheduled&scheduled_for=lt.now()&select=*&order=scheduled_for.asc&limit=50",
                    "authentication": "genericCredentialType",
                    "genericAuthType": "httpHeaderAuth",
                    "options": {"timeout": 10000}
                },
                "type": "n8n-nodes-base.httpRequest",
                "typeVersion": 4.2,
                "position": [250, 0],
                "id": "fetch-due",
                "name": "Fetch Due Posts"
            },
            {
                "parameters": {
                    "conditions": {
                        "options": {"caseSensitive": True, "leftValue": "", "typeValidation": "strict"},
                        "conditions": [
                            {
                                "id": "has-posts",
                                "leftValue": "={{ $json.length || 0 }}",
                                "rightValue": "0",
                                "operator": {"type": "number", "operation": "gt"}
                            }
                        ],
                        "combinator": "and"
                    },
                    "options": {}
                },
                "type": "n8n-nodes-base.if",
                "typeVersion": 2.2,
                "position": [500, 0],
                "id": "has-posts",
                "name": "Has Due Posts?"
            },
            {
                "parameters": {
                    "options": {"reset": False}
                },
                "type": "n8n-nodes-base.splitInBatches",
                "typeVersion": 3,
                "position": [750, -100],
                "id": "batch",
                "name": "Process Each Post"
            },
            {
                "parameters": {
                    "method": "PATCH",
                    "url": f"={SUPABASE_URL}/rest/v1/social_posts?id=eq.{{{{ $json.id }}}}",
                    "authentication": "genericCredentialType",
                    "genericAuthType": "httpHeaderAuth",
                    "sendHeaders": True,
                    "headerParameters": {
                        "parameters": [
                            {"name": "Prefer", "value": "return=representation"},
                            {"name": "Content-Type", "value": "application/json"}
                        ]
                    },
                    "sendBody": True,
                    "specifyBody": "json",
                    "jsonBody": '={"status": "published", "published_at": "{{ $now.toISO() }}"}',
                    "options": {"timeout": 10000}
                },
                "type": "n8n-nodes-base.httpRequest",
                "typeVersion": 4.2,
                "position": [1000, -100],
                "id": "mark-published",
                "name": "Mark as Published"
            },
            {
                "parameters": {},
                "type": "n8n-nodes-base.noOp",
                "typeVersion": 1,
                "position": [750, 100],
                "id": "no-posts",
                "name": "No Posts Due"
            }
        ],
        "connections": {
            "Every 15 Minutes": {"main": [[{"node": "Fetch Due Posts", "type": "main", "index": 0}]]},
            "Fetch Due Posts": {"main": [[{"node": "Has Due Posts?", "type": "main", "index": 0}]]},
            "Has Due Posts?": {
                "main": [
                    [{"node": "Process Each Post", "type": "main", "index": 0}],
                    [{"node": "No Posts Due", "type": "main", "index": 0}]
                ]
            },
            "Process Each Post": {
                "main": [
                    [{"node": "Mark as Published", "type": "main", "index": 0}],
                    []
                ]
            },
            "Mark as Published": {"main": [[{"node": "Process Each Post", "type": "main", "index": 0}]]}
        },
        "settings": {"executionOrder": "v1", "timezone": "Africa/Johannesburg"}
    }

    # Workflow 3: Analytics Collector
    wf3 = {
        "name": "DraggonnB - Analytics Collector",
        "nodes": [
            {
                "parameters": {
                    "rule": {"interval": [{"field": "hours", "hoursInterval": 24, "triggerAtHour": 6}]}
                },
                "type": "n8n-nodes-base.scheduleTrigger",
                "typeVersion": 1.2,
                "position": [0, 0],
                "id": "cron-analytics",
                "name": "Daily 6 AM SAST"
            },
            {
                "parameters": {
                    "url": f"{SUPABASE_URL}/rest/v1/social_posts?status=eq.published&published_at=gte.now()-interval'24 hours'&select=id,organization_id,platforms,content,published_at",
                    "authentication": "genericCredentialType",
                    "genericAuthType": "httpHeaderAuth",
                    "options": {"timeout": 10000}
                },
                "type": "n8n-nodes-base.httpRequest",
                "typeVersion": 4.2,
                "position": [250, 0],
                "id": "fetch-published",
                "name": "Fetch Recent Posts"
            },
            {
                "parameters": {
                    "method": "POST",
                    "url": f"{SUPABASE_URL}/rest/v1/analytics_snapshots",
                    "authentication": "genericCredentialType",
                    "genericAuthType": "httpHeaderAuth",
                    "sendHeaders": True,
                    "headerParameters": {
                        "parameters": [
                            {"name": "Prefer", "value": "return=representation"},
                            {"name": "Content-Type", "value": "application/json"}
                        ]
                    },
                    "sendBody": True,
                    "specifyBody": "json",
                    "jsonBody": '={{ JSON.stringify({ snapshot_date: $now.format("yyyy-MM-dd"), total_posts_24h: $input.all().length, platforms_used: [...new Set($input.all().flatMap(i => i.json.platforms || []))], collected_at: $now.toISO() }) }}',
                    "options": {"timeout": 10000}
                },
                "type": "n8n-nodes-base.httpRequest",
                "typeVersion": 4.2,
                "position": [500, 0],
                "id": "save-snapshot",
                "name": "Save Analytics Snapshot"
            }
        ],
        "connections": {
            "Daily 6 AM SAST": {"main": [[{"node": "Fetch Recent Posts", "type": "main", "index": 0}]]},
            "Fetch Recent Posts": {"main": [[{"node": "Save Analytics Snapshot", "type": "main", "index": 0}]]}
        },
        "settings": {"executionOrder": "v1", "timezone": "Africa/Johannesburg"}
    }

    # Write all workflows to VPS and import
    all_workflows = [wf1, wf2, wf3]
    wf_json = json.dumps(all_workflows, indent=2)

    # Upload via SFTP
    sftp = ssh.open_sftp()
    with sftp.file("/tmp/draggonnb-workflows.json", "w") as f:
        f.write(wf_json)
    sftp.close()
    print("Uploaded workflow JSON to VPS")

    # Import via n8n CLI
    ssh_exec(ssh,
        f"docker cp /tmp/draggonnb-workflows.json {N8N_CONTAINER}:/tmp/draggonnb-workflows.json && "
        f"docker exec {N8N_CONTAINER} n8n import:workflow --input=/tmp/draggonnb-workflows.json 2>&1",
        "Import workflows"
    )

    # Verify import
    print("\nVerifying imported workflows...")
    ssh_exec(ssh,
        f'docker exec {N8N_CONTAINER} n8n export:workflow --all 2>/dev/null | python3 -c "import sys,json; wfs=json.load(sys.stdin); [print(f\\"  - {{w[\'name\']}} (ID: {{w[\'id\']}}){{\' [ACTIVE]\' if w.get(\'active\') else \'\'}}\\" ) for w in wfs]"',
        "All workflows"
    )

    # Now add the Anthropic credential for DraggonnB
    # Create a credentials JSON for import
    cred_json = json.dumps([{
        "id": "anthropic-header",
        "name": "Anthropic API Key",
        "type": "httpHeaderAuth",
        "data": {
            "name": "x-api-key",
            "value": "PLACEHOLDER_NEEDS_REAL_KEY"
        }
    }])

    sftp = ssh.open_sftp()
    with sftp.file("/tmp/draggonnb-creds.json", "w") as f:
        f.write(cred_json)
    sftp.close()

    ssh_exec(ssh,
        f"docker cp /tmp/draggonnb-creds.json {N8N_CONTAINER}:/tmp/draggonnb-creds.json && "
        f"docker exec {N8N_CONTAINER} n8n import:credentials --input=/tmp/draggonnb-creds.json 2>&1",
        "Import credentials"
    )

    # Update N8N API key environment and enable public API
    print("\nUpdating docker-compose.yml to add DraggonnB N8N API key...")
    ssh_exec(ssh,
        "grep -q 'N8N_PUBLIC_API_DISABLED' /root/docker-compose.yml || "
        "sed -i '/N8N_API_KEY/a\\      - N8N_PUBLIC_API_DISABLED=false' /root/docker-compose.yml",
        "Enable public API"
    )

    # Restart N8N to pick up changes
    print("\nRestarting N8N...")
    ssh_exec(ssh, "cd /root && docker compose up -d n8n 2>&1", "Restart N8N")

    # Wait and verify
    import time
    time.sleep(10)
    ssh_exec(ssh, "curl -s http://127.0.0.1:5678/healthz", "Health check")

    # Final workflow list
    print("\n=== Final Workflow List ===")
    ssh_exec(ssh,
        f'docker exec {N8N_CONTAINER} n8n export:workflow --all 2>/dev/null | python3 -c "import sys,json; wfs=json.load(sys.stdin); [print(f\\"  - {{w[\'name\']}}{{\' [ACTIVE]\' if w.get(\'active\') else \' [inactive]\'}}\\" ) for w in wfs]"',
        "Workflows"
    )

    ssh.close()
    print("\nDone! DraggonnB workflows deployed to N8N.")
    print("Next: Configure Anthropic API key in N8N UI at https://n8n.srv1114684.hstgr.cloud")

if __name__ == "__main__":
    main()
