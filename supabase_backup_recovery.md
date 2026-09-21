# Supabase PostgreSQL Backup & Disaster Recovery Runbook
**Project:** MahaPoshan Register (PM POSHAN)  
**Database URL:** `https://hfebdtipreitaspqydap.supabase.co`  
**Region:** AWS (ap-south-1 Mumbai / Singapore)  
**Architecture:** Multi-Tenant PostgreSQL with Row Level Security (RLS)

---

## 1. Automated Physical Backups (Supabase Native)

Supabase provides enterprise automated backups at the cloud storage layer:

1. **Daily Full Snapshots:**
   - Supabase automatically takes full physical snapshots of the PostgreSQL database every 24 hours.
   - Retained according to project tier (up to 7 days on Pro, 30 days on Enterprise).
2. **Point-In-Time Recovery (PITR):**
   - Write-Ahead Logging (WAL) continuously streams to secure S3/GCS buckets.
   - Enables restoring the database to any specific second in time in case of catastrophic data corruption or accidental bulk deletion.
   - **To enable in Supabase Dashboard:**
     1. Go to **Project Settings** → **Database** → **Backups**.
     2. Click **Point in time (PITR)** and enable continuous archiving.

---

## 2. Logical On-Demand Backup Runbook (`pg_dump`)

For scheduled cold storage or local offsite redundancy, generate logical dumps using `pg_dump`:

### A. Full Database Backup Command:
```bash
pg_dump \
  -h db.hfebdtipreitaspqydap.supabase.co \
  -p 5432 \
  -U postgres \
  -d postgres \
  -F c \
  -b \
  -v \
  -f "mahaposhan_backup_$(date +%Y%m%d_%H%M%S).dump"
```

### B. Business Data Only (Schools, Daily Entries, Stock, Roles, Audit Logs):
```bash
pg_dump \
  -h db.hfebdtipreitaspqydap.supabase.co \
  -p 5432 \
  -U postgres \
  -d postgres \
  -t public.schools \
  -t public.user_roles \
  -t public.daily_entries \
  -t public.stock_inward \
  -t public.audit_logs \
  -a \
  -F c \
  -f "mahaposhan_business_data_$(date +%Y%m%d).dump"
```

---

## 3. Disaster Recovery & Restoration Procedure

### Scenario A: Rollback via Supabase Dashboard PITR
1. Open the [Supabase Dashboard](https://supabase.com/dashboard/project/hfebdtipreitaspqydap).
2. Navigate to **Database** → **Backups**.
3. Under **Point in time**, choose the exact timestamp prior to the incident (e.g. `2026-09-21 14:30:00 UTC`).
4. Select **Restore**. Supabase boots a temporary replica, applies WAL segments, and swaps the connection cleanly.

### Scenario B: Restore from Logical Backup (`pg_restore`)
```bash
# 1. Clean restore into staging or production
pg_restore \
  -h db.hfebdtipreitaspqydap.supabase.co \
  -p 5432 \
  -U postgres \
  -d postgres \
  -v \
  --clean \
  --if-exists \
  "mahaposhan_backup_20260921.dump"
```

---

## 4. Tenant-Level Self-Service Export & Recovery

In compliance with requirement 11:
- Each individual school headmaster can download their complete school archive at any time via the **Data Export** function in `cloud-sync.ts`:
  - Generates `MahaPoshan_[UDISE]_[Date]_Backup.json`
  - Includes: School Profile, all historical Daily Entries, and Monthly Stock Inwards.
- Can be re-imported instantly into local storage or re-synced to a fresh cloud instance.

---

## 5. Security of Backup Artifacts
- Never store database passwords or dump files in public Git repositories.
- All backup files should be encrypted using AES-256 (`gpg -c backup.dump`) before cloud archival.
