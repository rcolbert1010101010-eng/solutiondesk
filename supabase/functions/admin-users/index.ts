import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type Role = 'admin' | 'user';

type CreateUserPayload = {
  action: 'createUser';
  email: string;
  password: string;
  displayName?: string;
  role?: Role;
};

type DeleteUserPayload = {
  action: 'deleteUser';
  userId: string;
};

type ActionPayload = CreateUserPayload | DeleteUserPayload;

function response(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

function errorResponse(status: number, code: string, message: string, details?: string): Response {
  return response(
    {
      ok: false,
      error: {
        code,
        message,
        ...(details ? { details } : {}),
      },
    },
    status,
  );
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return errorResponse(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
  }

  const url = Deno.env.get('FUNCTION_SUPABASE_URL');
  const anonKey = Deno.env.get('FUNCTION_SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SERVICE_ROLE_KEY');

  if (!url || !anonKey || !serviceRoleKey) {
    return errorResponse(
      500,
      'MISSING_ENV',
      'Missing required function environment variables',
      'Expected FUNCTION_SUPABASE_URL, FUNCTION_SUPABASE_ANON_KEY, SERVICE_ROLE_KEY',
    );
  }

  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) {
    return errorResponse(401, 'MISSING_AUTHORIZATION', 'Missing Authorization header');
  }

  const userClient = createClient(url, anonKey, {
    global: {
      headers: {
        Authorization: authHeader,
      },
    },
  });

  const adminClient = createClient(url, serviceRoleKey);

  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser();

  if (userError || !user) {
    const bearerPrefixOk = authHeader.startsWith('Bearer ');
    const tokenLen = bearerPrefixOk ? authHeader.slice(7).length : 0;
    return errorResponse(
      401,
      'INVALID_JWT',
      'Invalid JWT',
      JSON.stringify({
        authHeaderPresent: !!authHeader,
        bearerPrefixOk,
        tokenLen,
      }),
    );
  }

  const { data: callerProfile, error: callerProfileError } = await adminClient
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (callerProfileError) {
    return errorResponse(500, 'PROFILE_LOOKUP_FAILED', 'Failed to look up caller profile', callerProfileError.message);
  }

  if (!callerProfile || callerProfile.role !== 'admin') {
    return errorResponse(403, 'FORBIDDEN', 'Admin access required');
  }

  let payload: ActionPayload;
  try {
    payload = await req.json();
  } catch {
    return errorResponse(400, 'INVALID_JSON', 'Invalid JSON payload');
  }

  if (payload.action === 'createUser') {
    const email = payload.email?.trim().toLowerCase();
    const password = payload.password;
    const displayName = payload.displayName?.trim() || null;
    const role: Role = payload.role === 'admin' ? 'admin' : 'user';

    if (!email) {
      return errorResponse(400, 'MISSING_EMAIL', 'Email is required');
    }

    if (!password) {
      return errorResponse(400, 'MISSING_PASSWORD', 'Password is required');
    }

    const { data: created, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (createError || !created.user) {
      return errorResponse(400, 'CREATE_USER_FAILED', 'Failed to create user', createError?.message);
    }

    const newUserId = created.user.id;

    const { data: profile, error: profileError } = await adminClient
      .from('profiles')
      .upsert(
        {
          id: newUserId,
          email,
          display_name: displayName,
          role,
        },
        { onConflict: 'id' },
      )
      .select('id, email, display_name, role, created_at, updated_at')
      .single();

    if (profileError) {
      await adminClient.auth.admin.deleteUser(newUserId);
      return errorResponse(500, 'PROFILE_UPSERT_FAILED', 'Failed to create profile', profileError.message);
    }

    return response({ ok: true, profile }, 200);
  }

  if (payload.action === 'deleteUser') {
    const userId = payload.userId?.trim();

    if (!userId) {
      return errorResponse(400, 'MISSING_USER_ID', 'userId is required');
    }

    const { error: deleteUserError } = await adminClient.auth.admin.deleteUser(userId);
    if (deleteUserError) {
      return errorResponse(400, 'DELETE_USER_FAILED', 'Failed to delete auth user', deleteUserError.message);
    }

    const { error: deleteProfileError } = await adminClient
      .from('profiles')
      .delete()
      .eq('id', userId);

    if (deleteProfileError) {
      return errorResponse(500, 'DELETE_PROFILE_FAILED', 'Failed to delete profile', deleteProfileError.message);
    }

    return response({ ok: true }, 200);
  }

  return errorResponse(400, 'INVALID_ACTION', 'Unsupported action');
});
