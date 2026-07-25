# Self-Hosting Guide — MicroLearning Coach

This guide covers everything you need to deploy this app on **Railway**, **Render**, or any **VPS/Docker** host.
The app uses **Supabase** for database, auth, and file storage — no MySQL, no S3, no separate auth server needed.

---

## Prerequisites

- A **Supabase** project (free tier works): https://supabase.com
- A hosting account: Railway / Render / VPS with Docker
- Your GitHub repo: https://github.com/Smarthinkerz/microlearning

---

## 1. Supabase Setup

### 1a. Create a Supabase project
1. Go to https://supabase.com → New Project
2. Choose a region close to your users
3. Save the **database password** — you will need it

### 1b. Run the database schema
1. In Supabase → **SQL Editor** → New Query
2. Paste the entire contents of `supabase/schema.sql` from this repo
3. Click **Run** — this creates all 35 tables

### 1c. Collect your Supabase credentials
Go to **Project Settings → API** and copy:

| Variable | Where to find it |
|---|---|
| `SUPABASE_URL` | Project URL (e.g. `https://xxxx.supabase.co`) |
| `SUPABASE_ANON_KEY` | `anon` / `public` key |
| `SUPABASE_SERVICE_ROLE_KEY` | `service_role` key (keep secret!) |
| `SUPABASE_JWT_SECRET` | Project Settings → API → JWT Secret |
| `DATABASE_URL` | Project Settings → Database → Connection string → **Transaction pooler** URI (port 6543) |

> **Important:** Use the **Transaction pooler** URI (port 6543), NOT the direct connection (port 5432).

### 1d. Create the storage bucket
In Supabase → **Storage** → New bucket:
- Name: `media`
- Public: **Yes** (so uploaded lesson media is publicly accessible)

### 1e. Enable Email Auth
In Supabase → **Authentication → Providers → Email**:
- Enable email/password sign-in
- Optionally disable "Confirm email" for faster testing

---

## 2. Environment Variables

Set ALL of these in your hosting platform:

```env
# ── Database ──────────────────────────────────────────────────────────────────
DATABASE_URL=postgresql://postgres.xxxx:password@aws-0-us-east-1.pooler.supabase.com:6543/postgres

# ── Supabase (server-side) ────────────────────────────────────────────────────
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_JWT_SECRET=your-jwt-secret-from-supabase-settings

# ── Supabase (frontend - VITE_ prefix required) ───────────────────────────────
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# ── Auth ──────────────────────────────────────────────────────────────────────
JWT_SECRET=any-random-64-character-string-here

# ── LLM (AI lesson generation + recommendations) ──────────────────────────────
OPENAI_API_KEY=sk-...
LLM_MODEL=gpt-4o-mini
# To use Groq instead (free + fast):
# OPENAI_BASE_URL=https://api.groq.com/openai/v1
# LLM_MODEL=llama-3.1-8b-instant
# OPENAI_API_KEY=gsk_...

# ── Voice Narration (optional) ────────────────────────────────────────────────
ELEVENLABS_API_KEY=your-elevenlabs-key

# ── Email (optional) ──────────────────────────────────────────────────────────
RESEND_API_KEY=re_...
OWNER_EMAIL=your@email.com

# ── Payments (optional - Tap Payments for MENA) ───────────────────────────────
TAP_SECRET_KEY=sk_live_...
TAP_PUBLIC_KEY=pk_live_...
TAP_WEBHOOK_SECRET=whsec_...

# ── App ───────────────────────────────────────────────────────────────────────
NODE_ENV=production
PORT=3000
VITE_APP_TITLE=MicroLearning Coach
```

---

## 3. Deploy on Railway

### 3a. Create Railway project
1. Go to https://railway.app → **New Project**
2. Select **Deploy from GitHub repo**
3. Choose `Smarthinkerz/microlearning`
4. Railway auto-detects the `Dockerfile` and `railway.toml`

### 3b. Add environment variables
Railway → your service → **Variables** tab → paste all variables from Section 2

### 3c. Add custom domain
1. Railway → service → **Settings → Networking → Custom Domains**
2. Click **+ Add Custom Domain** → enter `smarthinkerzmicrolearning.com`
3. Railway shows a CNAME target like `xxxxxxxx.up.railway.app`
4. At your DNS provider, add:
   - `CNAME` `www` → `xxxxxxxx.up.railway.app`
   - `ALIAS` / `ANAME` `@` → `xxxxxxxx.up.railway.app`
5. Click **Verify** in Railway — SSL is automatic

### 3d. Run database migrations (first deploy only)
After first deploy, in Railway → service → **Shell**:
```bash
pnpm db:push
```

---

## 4. Deploy on Render

1. Go to https://render.com → **New → Web Service**
2. Connect `Smarthinkerz/microlearning`
3. Settings:
   - **Environment:** Docker
   - **Dockerfile path:** `Dockerfile`
   - **Instance type:** Starter ($7/mo) or Free (spins down after 15 min idle)
4. Add all environment variables from Section 2
5. Custom domain: Render → service → **Settings → Custom Domains**

---

## 5. Deploy on VPS (Ubuntu/Debian with Docker)

```bash
# 1. Clone the repo
git clone https://github.com/Smarthinkerz/microlearning.git
cd microlearning

# 2. Create your .env file
nano .env   # paste all variables from Section 2

# 3. Build and run
docker build -t microlearning-coach .
docker run -d \
  --name microlearning \
  --env-file .env \
  -p 3000:3000 \
  --restart unless-stopped \
  microlearning-coach

# 4. Check it's running
docker logs microlearning
```

### With Docker Compose
```yaml
version: "3.8"
services:
  app:
    build: .
    ports:
      - "3000:3000"
    env_file: .env
    restart: unless-stopped
```
```bash
docker compose up -d
```

### Nginx reverse proxy (for SSL on VPS)
```nginx
server {
    listen 80;
    server_name smarthinkerzmicrolearning.com www.smarthinkerzmicrolearning.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name smarthinkerzmicrolearning.com www.smarthinkerzmicrolearning.com;

    ssl_certificate /etc/letsencrypt/live/smarthinkerzmicrolearning.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/smarthinkerzmicrolearning.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```
Get free SSL: `sudo certbot --nginx -d smarthinkerzmicrolearning.com`

---

## 6. First-Time Setup After Deployment

1. **Visit your app URL** — you should see the landing page
2. **Sign up** at `/login` — create your admin account
3. **Promote yourself to admin** — run this in Supabase SQL Editor:
   ```sql
   UPDATE users SET role = 'admin', app_role = 'admin'
   WHERE email = 'your@email.com';
   ```
4. **Seed the lesson library** — Admin panel → Lesson Library → **Seed Demo Lessons**
5. **Seed subscription plans** — Admin panel → Subscriptions → **Seed Plans**

---

## 7. Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite, Tailwind CSS 4, shadcn/ui |
| Backend | Node.js, Express, tRPC 11 |
| Database | PostgreSQL via Supabase (Drizzle ORM) |
| Auth | Supabase Auth (email/password) |
| File Storage | Supabase Storage (`media` bucket) |
| AI / LLM | OpenAI-compatible API (OpenAI, Groq, Together AI) |
| Voice | ElevenLabs |
| Email | Resend |
| Payments | Tap Payments |
| Container | Docker multi-stage (node:20-alpine) |

---

## 8. Troubleshooting

**`SSL connection error` on startup**
Your `DATABASE_URL` is wrong. Use the **Transaction pooler** URI from Supabase (port **6543**), not the direct connection (port 5432).

**App loads but login fails**
Make sure `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set. The `VITE_` prefix is required for Vite to expose them to the frontend.

**`SUPABASE_JWT_SECRET` error**
Find it in Supabase → Project Settings → API → scroll to **JWT Settings**.

**AI lesson generation fails**
Set `OPENAI_API_KEY` and `LLM_MODEL`. For free usage, use Groq (console.groq.com).

**Voice narration not working**
Set `ELEVENLABS_API_KEY`. Without it the feature is silently disabled.

**Docker build fails on pnpm**
The Dockerfile uses `npm install -g pnpm@10.4.1 --force`. If this fails on your host, change the base image from `node:20-alpine` to `node:20` (Debian-based) in the Dockerfile.
