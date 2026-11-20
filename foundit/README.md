# FoundIt - Campus Lost-and-Found Portal

Next.js + MySQL + Redis. Students report lost/found items, the database suggests matches,
students claim found items, and staff verify the claim with a one-time code before handover.

## Prerequisites
- Node.js 18+ (20 or 22 recommended)
- MySQL 8.0+ (the `mysql` command-line client must work)
- Redis 6+ (`redis-server` running on port 6379)

## Setup
```bash
# 1. install packages
npm install

# 2. create the database (tables, views, triggers, procedures) and demo data
mysql -u root -p < database/schema.sql
mysql -u root -p < database/seed.sql

# 3. configure environment (never commit .env.local)
cp .env.example .env.local        # then edit DB_USER / DB_PASSWORD

# 4. give the demo users a real bcrypt password hash
npm run seed:users

# 5. start Redis in another terminal, then run the app
redis-server
npm run dev                        # open http://localhost:3000
```

## Demo logins (password for all: `Password@123`)
| Role | Email |
|---|---|
| Student | harshith@foundit.edu, ananya@foundit.edu, rahul@foundit.edu |
| Staff | staff@foundit.edu |
| Admin | admin@foundit.edu |

## Demo flow (for your viva)
1. Log in as **harshith** -> Items -> open "Black wallet found" -> see suggested matches -> your claim is already pending.
2. Log in as **staff** -> Claim queue -> **Approve** the wallet claim (stored procedure + transaction).
3. Log in as **harshith** -> My claims -> copy the OTP (stored in Redis, expires in 24 h).
4. Log in as **staff** -> enter the OTP -> **Hand over** (item becomes CLOSED, finder gains a leaderboard point).
5. Log in as **admin** -> Dashboard (cached counts, recovery-rate view, top finders).
6. Wrong-password 5 times -> Redis rate limit blocks login for 5 minutes.

## Project layout
```
database/schema.sql   tables, ALTER/DROP demo, indexes, full-text index, views, triggers, procedures
database/seed.sql     demo data      database/queries.sql   important queries for the report
app/api/...           Next.js Route Handlers (backend/API layer)
app/...               pages (items, report form, item detail, my claims, claim queue, dashboard)
lib/                  db.js (MySQL pool) redis.js auth.js client.js
docs/                 project documentation, ER diagram
```

## Where each PDF requirement is shown
| Requirement | Where |
|---|---|
| CREATE / ALTER / DROP, PK, FK, constraints, indexes | `database/schema.sql` sections 1-3 |
| Views | `v_open_items`, `v_recovery_by_category` |
| Triggers | `trg_item_before_insert`, `trg_item_after_insert`, `trg_item_after_update`, `trg_claim_before_insert` |
| Stored procedures + transaction | `approve_claim`, `suggest_matches` |
| Full-text search | `ft_item_text` index, used in `/api/reports` and `suggest_matches` |
| NoSQL (Redis) | `lib/redis.js` key map; sessions, OTP, feed list, stats hash, finders sorted set |
| Roles and auth | Student / Staff / Admin, bcrypt passwords, Redis sessions, `lib/auth.js` |
| Env variables | `.env.local` (see `.env.example`) |
