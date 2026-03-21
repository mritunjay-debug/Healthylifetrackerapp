# StreakForge API (Vercel + Supabase)

Serverless **Node.js / TypeScript** API deployed on **Vercel**, backed by **Supabase** (Postgres + Auth).

## Layout

| Path | Purpose |
|------|---------|
| `api/` | Vercel serverless routes |
| `lib/` | Supabase clients, HTTP helpers, auth guard |
| `supabase/schema.sql` | Example table + RLS for CRUD demo |

## Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/health` | No | Liveness check |
| `POST` | `/api/auth/signup` | No | `{ "email", "password" }` → user + session (if confirmations off) |
| `POST` | `/api/auth/login` | No | `{ "email", "password" }` → user + session |
| `GET` | `/api/items` | Bearer | List current user’s rows in `app_items` |
| `POST` | `/api/items` | Bearer | `{ "title", "body?" }` → create |
| `GET` | `/api/items/:id` | Bearer | Read one |
| `PATCH` | `/api/items/:id` | Bearer | `{ "title?", "body?" }` → update |
| `DELETE` | `/api/items/:id` | Bearer | Delete |

**Authorization:** `Authorization: Bearer <access_token>`  
Use `session.access_token` from signup/login (or from Supabase client `getSession()` on the frontend).

## Local setup

1. **Node 18+**

2. **Install**

   ```bash
   cd server
   npm install
   ```

3. **Environment**

   ```bash
   cp .env.example .env.local
   ```

   Fill `SUPABASE_URL` and `SUPABASE_ANON_KEY` from Supabase → Project Settings → API.  
   `lib/env.ts` loads these files automatically; if you still see **Missing required environment variable: SUPABASE_URL**, confirm `.env.local` exists under `server/` and that **Vercel** has both variables for Production (and Preview if you use it).

4. **Database**

   In Supabase → SQL → New query, paste and run `supabase/schema.sql`.

5. **Run with Vercel CLI** (optional)

   ```bash
   npm i -g vercel
   cd server
   vercel dev
   ```

   Or deploy first and call the production URL.

6. **Typecheck**

   ```bash
   npm run typecheck
   ```

## Deploy to Vercel

1. Push this repo to GitHub/GitLab/Bitbucket (or use Vercel CLI `vercel` from `server/`).

2. **New project** in [Vercel](https://vercel.com) → Import repository.

3. **Root Directory:** set to `server`  
   (Keeps Expo app at repo root separate from this API.)

4. **Environment variables** (Project → Settings → Environment Variables):

   | Name | Value | Environments |
   |------|--------|--------------|
   | `SUPABASE_URL` | Project URL | Production, Preview, Development |
   | `SUPABASE_ANON_KEY` | `anon` `public` key | All |

   Optional (only if you add admin routes):

   | `SUPABASE_SERVICE_ROLE_KEY` | `service_role` secret | Production only (recommended) |

5. Deploy. Your API base is `https://<project>.vercel.app`.

## Frontend integration (Expo / web)

- After login, store `session.access_token` (e.g. SecureStore) and send it on API calls.
- Base URL: `https://your-deployment.vercel.app` (or `http://localhost:3000` with `vercel dev`).
- Example:

  ```ts
  await fetch(`${API_URL}/api/items`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });
  ```

## Security notes

- **Anon key** on the server is normal for these routes; it does not bypass RLS. User JWT is required for `/api/items/*`.
- **Service role** bypasses RLS — do not expose it to clients; only use in trusted server code if you add such routes.
- Tighten **CORS** in `vercel.json` to your app origins when you know them (replace `*`).

## Replacing `app_items`

1. Add your real tables and RLS in Supabase.
2. Copy the pattern in `api/items/` and `lib/items.ts` (new table name + columns).
3. Optionally add Zod validation in `lib/` for production payloads.

---

After you configure Supabase + Vercel, share the values **you are comfortable pasting** (never paste `service_role` in chat) so we can double-check env names, URLs, and RLS.
