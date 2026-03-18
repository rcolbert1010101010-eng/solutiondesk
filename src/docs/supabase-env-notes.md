# Supabase Env Setup

Set these Vite environment variables (do not hardcode secrets in source):

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## Local Development

Create `.env.local` in the project root:

```bash
VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-public-key>
```

Restart the Vite dev server after changing env values.

## Vercel

In Vercel Project Settings -> Environment Variables, add:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Apply them to the required environments (`Development`, `Preview`, `Production`) and redeploy.

## Edge Function Secrets

For the `admin-users` edge function, required Supabase secrets are:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SERVICE_ROLE_KEY`

## SQL Migration

Run [`supabase-auth-migration.sql`](/c:/Git%20Repository/solutiondesk/src/docs/supabase-auth-migration.sql) in the Supabase SQL editor before using the app.
