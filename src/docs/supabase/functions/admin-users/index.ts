import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type CreateUserPayload = {
  action: 'createUser';
  email: string;
  password: string;
  displayName?: string;
  role?: 'admin' | 'user';
};

type DeleteUserPayload = {
  action: 'deleteUser';
  userId: string;
};

type ActionPayload = CreateUserPayload | DeleteUserPayload;

function jsonResponse(body: unknown, status = 200) {
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
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SERVICE_ROLE_KEY');

  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
    return jsonResponse({ error: 'Missing SUPABASE_URL, SUPABASE_ANON_KEY, or SERVICE_ROLE_KEY' }, 500);
  }

  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) {
    return jsonResponse({ error: 'Missing bearer token' }, 401);
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: authHeader,
      },
    },
  });

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    return jsonResponse({ error: authError?.message ?? 'Unauthorized' }, 401);
  }

  const callerId = authData.user.id;
  const { data: callerProfile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', callerId)
    .maybeSingle();

  if (profileError) {
    return jsonResponse({ error: profileError.message }, 500);
  }

  if (!callerProfile || callerProfile.role !== 'admin') {
    return jsonResponse({ error: 'Forbidden' }, 403);
  }

  let payload: ActionPayload;
  try {
    payload = await req.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON payload' }, 400);
  }

  if (payload.action === 'createUser') {
    const email = payload.email?.trim().toLowerCase();
    const password = payload.password;
    const displayName = payload.displayName?.trim() || null;
    const role = payload.role === 'admin' ? 'admin' : 'user';

    if (!email) return jsonResponse({ error: 'Email is required' }, 400);
    if (!password) return jsonResponse({ error: 'Password is required' }, 400);
    if (password.length < 6) return jsonResponse({ error: 'Password must be at least 6 characters' }, 400);

    const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (createError || !created.user) {
      return jsonResponse({ error: createError?.message ?? 'Failed to create auth user' }, 400);
    }

    const { data: profile, error: upsertError } = await supabaseAdmin
      .from('profiles')
      .upsert(
        {
          id: created.user.id,
          email,
          display_name: displayName,
          role,
        },
        { onConflict: 'id' },
      )
      .select('id,email,display_name,role,created_at,updated_at')
      .single();

    if (upsertError) {
      await supabaseAdmin.auth.admin.deleteUser(created.user.id);
      return jsonResponse({ error: upsertError.message }, 500);
    }

    return jsonResponse({ profile }, 200);
  }

  if (payload.action === 'deleteUser') {
    const userId = payload.userId?.trim();

    if (!userId) return jsonResponse({ error: 'userId is required' }, 400);

    const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (deleteAuthError) {
      return jsonResponse({ error: deleteAuthError.message }, 400);
    }

    const { error: deleteProfileError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', userId);

    if (deleteProfileError) {
      return jsonResponse({ error: deleteProfileError.message }, 500);
    }

    return jsonResponse({ ok: true }, 200);
  }

  return jsonResponse({ error: 'Unsupported action' }, 400);
});
