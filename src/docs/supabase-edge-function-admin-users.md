# Admin Users Edge Function

The app calls `supabase.functions.invoke("admin-users", ...)` from the Admin Users page.

Because app edits were constrained to `/src/**`, the function source is stored here:

- [`src/docs/supabase/functions/admin-users/index.ts`](/c:/Git%20Repository/solutiondesk/src/docs/supabase/functions/admin-users/index.ts)

Copy that file to your Supabase functions directory as:

- `supabase/functions/admin-users/index.ts`

## Required Secrets

Set these for the edge function:

- `SERVICE_ROLE_KEY`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

Example:

```bash
supabase secrets set \
  SERVICE_ROLE_KEY=your_service_role_key \
  SUPABASE_URL=https://your-project-ref.supabase.co \
  SUPABASE_ANON_KEY=your_anon_key
```

## Deploy

```bash
supabase functions deploy admin-users
```

## Behavior

- Verifies `Authorization: Bearer <jwt>` caller via `supabase.auth.getUser()`.
- Verifies caller is admin via `public.profiles`.
- Supports:
- `action: "createUser"` with `email`, `password`, optional `displayName`, optional `role`.
- `action: "deleteUser"` with `userId`.
- Uses service-role only inside function; client continues using anon key.
