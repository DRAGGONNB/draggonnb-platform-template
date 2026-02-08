# N8N Workflow Exports

**Date:** 2025-12-29
**Source:** N8N Cloud (https://draggonn-b.app.n8n.cloud)
**Purpose:** Backup and migration to Hostinger VPS

---

## Workflow Files

Place downloaded workflow JSON files here:

1. `workflow_1_social_content_generator.json` (ID: 1vvpVA3x2i7x4esw)
2. `workflow_2_content_queue_processor.json` (ID: Hai15bcpda5BVSWz)
3. `workflow_3_analytics_collector.json` (ID: V3Qq4VZazcDnSD0g)

---

## Export Instructions

### Step 1: Login to N8N Cloud
1. Open browser: https://draggonn-b.app.n8n.cloud
2. Enter your credentials

### Step 2: Export Each Workflow

**For Each Workflow:**
1. Click on the workflow name
2. Click the **menu icon** (3 dots, top right corner)
3. Select **"Download"** or **"Export"**
4. Save to this directory with the correct filename

### Step 3: Verify Export

After downloading each file:
- Open in text editor (VS Code, Notepad++)
- Verify it's valid JSON (starts with `{`, ends with `}`)
- Check for "nodes" and "connections" properties
- File size should be > 1 KB (not empty)

---

## What If Workflows Don't Exist?

**If you can't find the workflows in N8N Cloud:**
- They may have been deleted
- You may be logged into wrong account
- They may never have been created

**Next Steps:**
1. Take screenshots of what you see in N8N Cloud
2. Contact N8N support (if you had paid subscription)
3. Consider rebuilding workflows (16-40 hours)
4. See: `docs/N8N_CLOUD_TO_VPS_MIGRATION.md` for rebuild guide

---

## Credentials to Document

While exporting, note down what credentials are configured:

### Supabase
- Connection name: _____________
- Credential type: _____________
- Database URL: https://psqfgzbjbgqrmjskdavs.supabase.co

### Anthropic/Claude
- Connection name: _____________
- Credential type: _____________
- API key location: (stored separately)

### Social Platforms (if configured)
- LinkedIn: _____________
- Facebook: _____________
- Instagram: _____________

**SECURITY:** Do NOT store actual API keys in this file. Store in .env.local or password manager.

---

## File Checklist

After export, you should have:

- [ ] workflow_1_social_content_generator.json (valid JSON, > 1 KB)
- [ ] workflow_2_content_queue_processor.json (valid JSON, > 1 KB)
- [ ] workflow_3_analytics_collector.json (valid JSON, > 1 KB)
- [ ] Screenshot of N8N Cloud dashboard (proof workflows existed)
- [ ] List of configured credentials (names, not values)

---

## Next Steps After Export

1. ✅ Verify all 3 JSON files are valid
2. ✅ Update todo list (mark "Export workflows" as complete)
3. ✅ Proceed to Phase 2: Setup VPS N8N
4. ✅ Follow: `docs/N8N_CLOUD_TO_VPS_MIGRATION.md`

---

**Ready for VPS setup after completing export!**
