# N8N Cloud to Hostinger VPS Migration Guide

**Date:** 2025-12-29
**Source:** N8N Cloud (https://draggonn-b.app.n8n.cloud)
**Destination:** Hostinger VPS (Self-hosted N8N)
**Estimated Time:** 2-4 hours

---

## WHY MIGRATE TO VPS?

### Benefits:
- ✅ **Cost Savings:** Eliminate $20/month N8N Cloud fee (~R360/month)
- ✅ **Full Control:** No workflow limits, custom nodes, complete access
- ✅ **Verification:** Export workflows = confirms they exist
- ✅ **Integration:** Same server as Claude Code orchestrator
- ✅ **Performance:** Direct database access (no API calls)
- ✅ **Security:** Private network, no public cloud exposure

### Trade-offs:
- ⚠️ **Maintenance:** You manage updates, backups, uptime
- ⚠️ **Initial Setup:** 2-4 hours vs 5 minutes cloud signup
- ⚠️ **Monitoring:** Need to setup your own monitoring

---

## PHASE 1: EXPORT FROM N8N CLOUD (30-60 Minutes)

### Step 1: Login to N8N Cloud

1. Open browser: https://draggonn-b.app.n8n.cloud
2. Login with your credentials
3. **CRITICAL:** Take screenshots of the workflow list (backup proof)

---

### Step 2: Export Each Workflow as JSON

**Workflow 1: Social Content AI Generator**
1. Click on workflow: `1vvpVA3x2i7x4esw`
2. Click menu (3 dots, top right) → **Download**
3. Save as: `workflow_1_social_content_generator.json`
4. Open file, verify it's valid JSON (not empty)

**Workflow 2: Content Queue Processor**
1. Click on workflow: `Hai15bcpda5BVSWz`
2. Click menu → **Download**
3. Save as: `workflow_2_content_queue_processor.json`
4. Verify JSON is valid

**Workflow 3: Analytics Collector**
1. Click on workflow: `V3Qq4VZazcDnSD0g`
2. Click menu → **Download**
3. Save as: `workflow_3_analytics_collector.json`
4. Verify JSON is valid

---

### Step 3: Document Credentials Configuration

**IMPORTANT:** N8N Cloud credentials **will NOT export** (security feature). You need to document what was configured.

**For Each Workflow, Note:**
1. **Supabase Credentials:**
   - Name: `DraggonnB-Supabase`
   - Type: `HTTP Header Auth` or `Supabase API`
   - Connection URL: `https://psqfgzbjbgqrmjskdavs.supabase.co`
   - Service Role Key: (get from Supabase dashboard)

2. **Anthropic/Claude Credentials:**
   - Name: `Claude-API`
   - Type: `HTTP Header Auth`
   - Header Name: `x-api-key`
   - Header Value: (your Anthropic API key)

3. **Other Credentials:**
   - LinkedIn API (if configured)
   - Facebook/Instagram (if configured)
   - Email SMTP (if configured)

**Create a text file:**
```
N8N_CREDENTIALS_BACKUP.txt

Supabase:
- URL: https://psqfgzbjbgqrmjskdavs.supabase.co
- Anon Key: eyJhbGci...
- Service Role Key: eyJhbGci...

Anthropic:
- API Key: sk-ant-...

LinkedIn:
- Client ID: ...
- Client Secret: ...
```

**⚠️ SECURITY:** Do NOT commit this file to git! Store securely.

---

### Step 4: Export Workflow Execution History (Optional)

If you want to keep logs:
1. N8N Cloud → Executions (left sidebar)
2. Filter by workflow
3. Take screenshots of successful executions
4. Note: Cannot export execution data, only screenshot for reference

---

### Step 5: Copy Workflow Files to Project

```bash
# On your local machine (Windows)
cd C:\Dev\DraggonnB_CRMM
mkdir -p Templates\N8N_Configs
```

Move downloaded JSON files:
```
workflow_1_social_content_generator.json → Templates\N8N_Configs\
workflow_2_content_queue_processor.json → Templates\N8N_Configs\
workflow_3_analytics_collector.json → Templates\N8N_Configs\
```

---

## PHASE 2: SETUP N8N ON HOSTINGER VPS (1-2 Hours)

### Prerequisites Check

**What You Need:**
- ✅ Hostinger VPS access (SSH credentials)
- ✅ VPS running Ubuntu 20.04+ or Debian 10+
- ✅ Root or sudo access
- ✅ Domain or subdomain (e.g., `n8n.draggonnb.app`)
- ✅ Basic Linux command line knowledge

---

### Step 1: SSH into Hostinger VPS

```bash
# From Windows (use PowerShell or Git Bash)
ssh root@your-vps-ip-address
# Or: ssh username@your-vps-ip-address

# Example:
ssh root@123.45.67.89
```

**If you don't have SSH key setup:**
- Use password provided by Hostinger
- Recommended: Setup SSH keys for security

---

### Step 2: Install Required Software

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Node.js 18.x (N8N requires Node 16+)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version  # Should show v18.x.x
npm --version   # Should show 9.x.x or higher

# Install PM2 (process manager for N8N)
sudo npm install -g pm2

# Install Nginx (reverse proxy for HTTPS)
sudo apt install -y nginx

# Install Certbot (for SSL certificate)
sudo apt install -y certbot python3-certbot-nginx
```

---

### Step 3: Install N8N

```bash
# Install N8N globally
sudo npm install -g n8n

# Verify installation
n8n --version  # Should show version number

# Create N8N data directory
sudo mkdir -p /opt/n8n
sudo chown -R $(whoami):$(whoami) /opt/n8n
```

---

### Step 4: Configure N8N Environment

```bash
# Create environment file
sudo nano /opt/n8n/.env
```

**Paste this configuration:**
```bash
# N8N Configuration
N8N_BASIC_AUTH_ACTIVE=true
N8N_BASIC_AUTH_USER=admin
N8N_BASIC_AUTH_PASSWORD=CHANGE_THIS_PASSWORD_NOW

# Host and Port
N8N_HOST=n8n.draggonnb.app
N8N_PORT=5678
N8N_PROTOCOL=https

# Webhook URL (CRITICAL for PayFast, etc.)
WEBHOOK_URL=https://n8n.draggonnb.app/

# Database (SQLite for start, upgrade to PostgreSQL later)
DB_TYPE=sqlite
DB_SQLITE_DATABASE=/opt/n8n/database.sqlite

# Execution Data (keep for 30 days)
EXECUTIONS_DATA_PRUNE=true
EXECUTIONS_DATA_MAX_AGE=30

# Timezone
GENERIC_TIMEZONE=Africa/Johannesburg

# Security
N8N_ENCRYPTION_KEY=$(openssl rand -hex 32)
```

**Save:** Ctrl+X, then Y, then Enter

**IMPORTANT:** Replace:
- `CHANGE_THIS_PASSWORD_NOW` with a strong password
- `n8n.draggonnb.app` with your actual subdomain

---

### Step 5: Configure Domain/Subdomain (Hostinger)

**Option A: Subdomain (Recommended)**
1. Login to Hostinger control panel
2. Go to: Domains → DNS Zone Editor
3. Add A Record:
   - **Type:** A
   - **Name:** n8n
   - **Points to:** Your VPS IP address (e.g., 123.45.67.89)
   - **TTL:** 14400 (default)
4. Save
5. Wait 5-30 minutes for DNS propagation

**Option B: Use VPS IP (Testing Only)**
- Skip domain setup
- Access via: `http://your-vps-ip:5678`
- **NOT recommended for production** (no HTTPS)

---

### Step 6: Configure Nginx Reverse Proxy

```bash
# Create Nginx configuration
sudo nano /etc/nginx/sites-available/n8n
```

**Paste this configuration:**
```nginx
server {
    listen 80;
    server_name n8n.draggonnb.app;

    location / {
        proxy_pass http://localhost:5678;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;

        # Required for N8N webhooks
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Large file uploads (for media in social posts)
        client_max_body_size 50M;
    }
}
```

**Save:** Ctrl+X, Y, Enter

**Enable the site:**
```bash
# Enable N8N site
sudo ln -s /etc/nginx/sites-available/n8n /etc/nginx/sites-enabled/

# Test Nginx configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

---

### Step 7: Setup SSL Certificate (HTTPS)

```bash
# Get SSL certificate from Let's Encrypt
sudo certbot --nginx -d n8n.draggonnb.app

# Follow prompts:
# - Enter email address (for renewal notifications)
# - Agree to terms (Y)
# - Share email with EFF (optional)
# - Redirect HTTP to HTTPS? (2 - Yes)

# Test auto-renewal
sudo certbot renew --dry-run
```

**Expected Result:**
- Certificate installed
- Nginx auto-configured for HTTPS
- Auto-renewal scheduled (cron job)

---

### Step 8: Start N8N with PM2

```bash
# Start N8N
cd /opt/n8n
pm2 start n8n --name n8n -- start

# Save PM2 configuration (auto-restart on reboot)
pm2 save
pm2 startup

# Copy the command it shows and run it (sets up startup script)

# Check N8N status
pm2 status
pm2 logs n8n
```

**Expected Output:**
```
┌─────┬──────────┬─────────────┬─────────┬─────────┬──────────┐
│ id  │ name     │ mode        │ status  │ cpu     │ memory   │
├─────┼──────────┼─────────────┼─────────┼─────────┼──────────┤
│ 0   │ n8n      │ fork        │ online  │ 0%      │ 120.2mb  │
└─────┴──────────┴─────────────┴─────────┴─────────┴──────────┘
```

---

### Step 9: Access N8N

1. Open browser: `https://n8n.draggonnb.app`
2. Login with credentials from `/opt/n8n/.env`:
   - Username: `admin`
   - Password: (the one you set)
3. **FIRST TIME:** N8N will prompt for owner account setup
4. Create owner account (different from basic auth)
5. You should see empty N8N dashboard

---

## PHASE 3: IMPORT WORKFLOWS TO VPS N8N (30-60 Minutes)

### Step 1: Import Workflows

**For Each Workflow JSON:**
1. In N8N dashboard, click **"Add Workflow"** (top right)
2. Click **"Import from File"** or **"Import from URL"**
3. Select: `workflow_1_social_content_generator.json`
4. Click **"Import"**
5. Workflow should appear in editor

**Repeat for:**
- `workflow_2_content_queue_processor.json`
- `workflow_3_analytics_collector.json`

---

### Step 2: Reconfigure Credentials

**Workflows will show errors** (red nodes) because credentials are missing. This is normal.

**Add Supabase Credentials:**
1. Click Settings (top right) → **Credentials**
2. Click **"Create New"**
3. Search: "HTTP Header Auth" or "Supabase"
4. Configure:
   - **Name:** `DraggonnB-Supabase`
   - **Header Name:** `apikey`
   - **Header Value:** (Supabase Service Role Key from .env.local)
5. Save

**Add Anthropic Credentials:**
1. Credentials → **Create New**
2. Search: "HTTP Header Auth"
3. Configure:
   - **Name:** `Claude-API`
   - **Header Name:** `x-api-key`
   - **Header Value:** (Your Anthropic API key)
4. Save

**For Each Workflow:**
1. Open workflow
2. Click on red nodes (credential errors)
3. Select correct credential from dropdown
4. Click **"Save"** (top right)

---

### Step 3: Update Webhook URLs

**CRITICAL:** Webhook URLs changed from N8N Cloud to VPS.

**Old URL:** `https://draggonn-b.app.n8n.cloud/webhook/...`
**New URL:** `https://n8n.draggonnb.app/webhook/...`

**Update in Your App:**
1. Open: `C:\Dev\DraggonnB_CRMM\.env.local`
2. Update:
   ```env
   # N8N Webhooks (VPS, not Cloud)
   N8N_WEBHOOK_BASE_URL=https://n8n.draggonnb.app
   N8N_WEBHOOK_CONTENT_GENERATOR=/webhook/content-generator
   N8N_WEBHOOK_ANALYTICS=/webhook/analytics
   N8N_WEBHOOK_PROVISIONING=/webhook/provision-client
   ```
3. Save

**Update in Vercel (when deployed):**
- Vercel Dashboard → Settings → Environment Variables
- Update `N8N_WEBHOOK_BASE_URL` to VPS URL

---

### Step 4: Test Each Workflow

**Test with cURL (from local machine):**

```bash
# Test Workflow 1: Content Generator
curl -X POST https://n8n.draggonnb.app/webhook/content-generator \
  -H "Content-Type: application/json" \
  -d '{
    "organizationId": "test-org-123",
    "topic": "Test social post",
    "platforms": ["linkedin"],
    "tone": "professional"
  }'

# Expected: JSON response with generated content

# Test Workflow 3: Analytics
curl -X POST https://n8n.draggonnb.app/webhook/analytics \
  -H "Content-Type: application/json" \
  -d '{
    "organizationId": "test-org-123"
  }'

# Expected: JSON response with analytics data
```

**Check Execution History:**
1. N8N Dashboard → **Executions** (left sidebar)
2. Verify successful executions (green checkmarks)
3. Click on execution to see detailed logs

---

### Step 5: Activate Workflows

**For Each Workflow:**
1. Open workflow in editor
2. Click **"Active"** toggle (top right) to ON (blue)
3. Verify toggle stays blue (if it turns off, there's an error)

**Active Workflows:**
- ✅ Workflow 1: Social Content AI Generator
- ✅ Workflow 2: Content Queue Processor (cron-based)
- ✅ Workflow 3: Analytics Collector (cron-based)

---

## PHASE 4: DECOMMISSION N8N CLOUD (After Testing)

### Before Canceling Cloud Subscription:

**VERIFICATION CHECKLIST:**
- [ ] All 3 workflows imported successfully
- [ ] All credentials configured in VPS N8N
- [ ] All workflows activated (blue toggle)
- [ ] Tested each workflow with cURL (successful execution)
- [ ] Updated .env.local with VPS webhook URLs
- [ ] Updated Vercel environment variables (if deployed)
- [ ] Tested from your Next.js app (content generation works)
- [ ] Monitored VPS N8N for 3-5 days (stable, no crashes)

### Cancel N8N Cloud:
1. Login: https://draggonn-b.app.n8n.cloud
2. Settings → Billing → **Cancel Subscription**
3. Confirm cancellation
4. Download final backup (just in case)
5. **Savings:** $20/month (~R360/month)

---

## PHASE 5: VPS N8N MAINTENANCE

### Daily Checks
```bash
# SSH into VPS
ssh root@your-vps-ip

# Check N8N status
pm2 status

# View logs
pm2 logs n8n --lines 50
```

### Weekly Maintenance
```bash
# Update N8N
sudo npm update -g n8n

# Restart N8N
pm2 restart n8n

# Check disk space
df -h

# Backup database
cp /opt/n8n/database.sqlite /opt/n8n/backups/database-$(date +%Y%m%d).sqlite
```

### Setup Automated Backups (Recommended)

```bash
# Create backup script
sudo nano /opt/n8n/backup.sh
```

**Paste:**
```bash
#!/bin/bash
BACKUP_DIR="/opt/n8n/backups"
DATE=$(date +%Y%m%d-%H%M%S)

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup database
cp /opt/n8n/database.sqlite $BACKUP_DIR/database-$DATE.sqlite

# Backup workflows (JSON exports)
cp -r /opt/n8n/.n8n/workflows $BACKUP_DIR/workflows-$DATE

# Keep only last 7 days
find $BACKUP_DIR -name "database-*" -mtime +7 -delete
find $BACKUP_DIR -name "workflows-*" -mtime +7 -delete

echo "Backup completed: $DATE"
```

**Make executable:**
```bash
chmod +x /opt/n8n/backup.sh
```

**Setup daily cron job:**
```bash
crontab -e
```

**Add line:**
```
0 2 * * * /opt/n8n/backup.sh >> /var/log/n8n-backup.log 2>&1
```

(Runs at 2 AM daily)

---

## MONITORING & TROUBLESHOOTING

### Check N8N Logs
```bash
# Real-time logs
pm2 logs n8n

# Last 100 lines
pm2 logs n8n --lines 100

# Error logs only
pm2 logs n8n --err
```

### Common Issues

**Issue 1: N8N won't start**
```bash
# Check Node.js version (need 16+)
node --version

# Check port 5678 not in use
sudo netstat -tulpn | grep 5678

# Check permissions
ls -la /opt/n8n
```

**Issue 2: SSL certificate issues**
```bash
# Renew certificate manually
sudo certbot renew

# Check certificate expiry
sudo certbot certificates
```

**Issue 3: High memory usage**
```bash
# Check memory
free -h

# Restart N8N
pm2 restart n8n

# Upgrade VPS plan if needed (Hostinger)
```

**Issue 4: Webhook not responding**
```bash
# Check Nginx logs
sudo tail -f /var/log/nginx/error.log

# Check N8N logs
pm2 logs n8n

# Test webhook directly
curl https://n8n.draggonnb.app/webhook/test
```

---

## SECURITY BEST PRACTICES

### 1. Change Default Credentials
```bash
# Update basic auth password
sudo nano /opt/n8n/.env
# Change N8N_BASIC_AUTH_PASSWORD

# Restart N8N
pm2 restart n8n
```

### 2. Enable Firewall
```bash
# Install UFW
sudo apt install ufw

# Allow SSH (IMPORTANT: Do this FIRST)
sudo ufw allow 22/tcp

# Allow HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status
```

### 3. Setup Fail2Ban (Block brute-force attacks)
```bash
sudo apt install fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

### 4. Regular Updates
```bash
# Update system weekly
sudo apt update && sudo apt upgrade -y

# Update N8N monthly
sudo npm update -g n8n
pm2 restart n8n
```

---

## COST COMPARISON

### N8N Cloud (Old)
- **Monthly:** $20 (~R360)
- **Annual:** $240 (~R4,320)
- **3 Years:** $720 (~R12,960)

### N8N on Hostinger VPS (New)
- **Setup:** 0 (one-time, your time)
- **Monthly:** R0 (included in VPS plan)
- **Annual:** R0
- **3 Years:** R0

**Savings:** R12,960 over 3 years 🎉

---

## INTEGRATION WITH CLAUDE CODE

**Both on Same VPS = Better Integration:**

```bash
# Directory structure on VPS
/opt/
├── n8n/               # N8N installation
│   ├── database.sqlite
│   ├── .env
│   └── backups/
├── claude-code/       # Claude Code orchestrator (future)
│   ├── mcp-servers/
│   └── config/
└── monitoring/        # Uptime monitoring (future)
```

**Benefits:**
- Direct file system access (no HTTP overhead)
- Shared credentials management
- Unified monitoring
- Lower latency (local network)

---

## NEXT STEPS AFTER MIGRATION

1. ✅ **Test thoroughly** (3-5 days monitoring)
2. ✅ **Cancel N8N Cloud** (save $20/month)
3. ✅ **Setup automated backups** (cron job)
4. ✅ **Configure monitoring** (UptimeRobot for uptime)
5. ✅ **Document VPS access** (SSH keys, passwords)
6. 🎯 **Install Claude Code** (same VPS, future)

---

## SUPPORT & RESOURCES

**N8N Documentation:**
- Installation: https://docs.n8n.io/hosting/installation/
- Docker: https://docs.n8n.io/hosting/installation/docker/
- Server setup: https://docs.n8n.io/hosting/installation/server-setups/

**Hostinger VPS:**
- Control Panel: https://hpanel.hostinger.com
- Knowledge Base: https://support.hostinger.com/en/collections/2456589-vps

**Community:**
- N8N Community: https://community.n8n.io
- GitHub Issues: https://github.com/n8n-io/n8n/issues

---

## SUMMARY

**Total Migration Time:** 2-4 hours
**Difficulty:** Intermediate (requires SSH/Linux basics)
**Cost Savings:** $20/month (~R360)
**Risk:** Low (keep N8N Cloud active during testing)

**Migration Phases:**
1. ✅ Export workflows from Cloud (30-60 mins)
2. ✅ Setup N8N on VPS (1-2 hours)
3. ✅ Import & configure workflows (30-60 mins)
4. ✅ Test & verify (3-5 days monitoring)
5. ✅ Cancel Cloud subscription (save money)

**YOU CAN DO THIS!** Follow step-by-step, test thoroughly, and you'll have full control of your automation platform.

---

**Ready to start? Begin with PHASE 1: Export from N8N Cloud** 🚀
