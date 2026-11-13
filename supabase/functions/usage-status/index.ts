// Deploy as "usage-status" with JWT verification enabled (default).
// Requires private TAVILY_API_KEY in Supabase Edge Function Secrets.
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const send = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return send({ error: 'Method not allowed' }, 405);
  try {
    const authorization = req.headers.get('Authorization') || '';
    const projectUrl = Deno.env.get('SUPABASE_URL') || '';
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
    const tavilyKey = Deno.env.get('TAVILY_API_KEY') || '';
    if (!authorization.startsWith('Bearer ') || !projectUrl || !anonKey) return send({error:'Sign in is required'}, 401);
    // Check the user's JWT with Supabase Auth; never allow unauthenticated users to spend Tavily requests.
    const auth = await fetch(projectUrl + '/auth/v1/user', {
      headers: { Authorization: authorization, apikey: anonKey },
    });
    if (!auth.ok) return send({ error: 'Session expired. Please sign in again.' }, 401);
    if (!tavilyKey) return send({ error: 'TAVILY_API_KEY is missing from Supabase secrets' }, 503);
    const response = await fetch('https://api.tavily.com/usage', {
      headers: { Authorization: 'Bearer ' + tavilyKey, Accept: 'application/json' },
    });
    if (!response.ok) return send({ error: 'Tavily usage request failed (' + response.status + ')' }, 502);
    const data = await response.json();
    return send({ account: data.account || null, key: data.key || null });
  } catch (e) {
    return send({ error: e instanceof Error ? e.message : 'Unexpected usage error' }, 500);
  }
});