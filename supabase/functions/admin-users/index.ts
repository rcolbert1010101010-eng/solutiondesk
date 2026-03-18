import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type UserRole = 'admin' | 'user';

type CreateUserAction = {
  action: 'createUser';
  email: string;
  password: string;
  displayName?: string;
  role?: UserRole;
};

type DeleteUserAction = {
  action: 'deleteUser';
  userId: string;
};

type ActionPayload = CreateUserAction | DeleteUserAction;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return json({ ok: false, error: 'Method not allowed' }, 405);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const supabaseServiceRoleKey = Deno.env.get('SERVICE_ROLE_KEY');

  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
    return json({ ok: false, error: 'Missing required environment variables' }, 500);
  }

  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) {
    return json({ ok: false, error: 'Missing Authorization bearer token' }, 401);
  }

  const jwt = authHeader.slice('Bearer '.length).trim();
  if (!jwt) {
    return json({ ok: false, error: 'Invalid Authorization token' }, 401);
  }

  const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey);
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

  const { data: authData, error: authError } = await supabaseAuth.auth.getUser(jwt);
  if (authError || !authData.user) {
    return json({ ok: false, error: authError?.message ?? 'Unauthorized' }, 401);
  }

  const callerId = authData.user.id;

  const { data: callerProfile, error: callerProfileError } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', callerId)
    .maybeSingle();

  if (callerProfileError) {
    return json({ ok: false, error: callerProfileError.message }, 500);
  }

  if (!callerProfile || callerProfile.role !== 'admin') {
    return json({ ok: false, error: 'Forbidden' }, 403);
  }

  let payload: ActionPayload;
  try {
    payload = await req.json();
  } catch {
    return json({ ok: false, error: 'Invalid JSON payload' }, 400);
  }

  if (payload.action === 'createUser') {
    const email = payload.email?.trim().toLowerCase();
    const password = payload.password;
    const displayName = payload.displayName?.trim() || null;
    const role: UserRole = payload.role === 'admin' ? 'admin' : 'user';

    if (!email) return json({ ok: false, error: 'Email is required' }, 400);
    if (!password) return json({ ok: false, error: 'Password is required' }, 400);

    const { data: createdUserData, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (createUserError || !createdUserData.user) {
      return json({ ok: false, error: createUserError?.message ?? 'Failed to create user' }, 400);
    }

    const createdUserId = createdUserData.user.id;

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert(
        {
          id: createdUserId,
          email,
          display_name: displayName,
          role,
        },
        { onConflict: 'id' },
      )
      .select('id, email, display_name, role, created_at, updated_at')
      .single();

    if (profileError) {
      await supabaseAdmin.auth.admin.deleteUser(createdUserId);
      return json({ ok: false, error: profileError.message }, 500);
    }

    return json({ ok: true, profile }, 200);
  }

  if (payload.action === 'deleteUser') {
    const userId = payload.userId?.trim();
    if (!userId) {
      return json({ ok: false, error: 'userId is required' }, 400);
    }

    const { error: deleteUserError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (deleteUserError) {
      return json({ ok: false, error: deleteUserError.message }, 400);
    }

    const { error: deleteProfileError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', userId);

    if (deleteProfileError) {
      return json({ ok: false, error: deleteProfileError.message }, 500);
    }

    return json({ ok: true }, 200);
  }

  return json({ ok: false, error: 'Invalid action' }, 400);
});
