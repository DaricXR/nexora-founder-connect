# Usage & Limits setup

## Deploy (only once)

1. In Supabase SQL Editor run **supabase/usage.sql**. This adds a read-only, authenticated RPC for estimating the size of the current PostgreSQL database.
2. In Supabase **Edge Functions → Deploy a new function → Via Editor**, create **usage-status**, paste all of **supabase/functions/usage-status/index.ts**, and deploy it.
3. In Supabase **Edge Functions → Secrets**, set **TAVILY_API_KEY** to your existing private Tavily API key. Do not expose it in GitHub Pages or config.js.
4. Leave **Verify JWT** enabled for the Edge Function.
5. Reload https://daricxr.github.io/nexora-founder-connect/ and open **Usage & Limits → Refresh usage** while signed in.

## What is measured?

- **Tavily:** Actual account plan credits used, monthly limit, remaining, and key usage from https://api.tavily.com/usage. These figures include usage from outside this website if the same Tavily account/key is used elsewhere.
- **Supabase database:** Approximate total current database footprint in MB using pg_database_size. It is **not** a direct billing statement and may include internal database overhead. The Free limit is 500 MB per project.
- **Supabase other quotas:** Monthly active users, Edge Function invocations, file storage, and egress are reference limits only. View exact account-wide current usage in the Supabase organization usage dashboard; this app does not possess management credentials.
- Refresh does not trigger a founder search. It requests only usage metrics.

## Troubleshooting

- **Tavily usage fails:** confirm the Edge Function is deployed as usage-status and TAVILY_API_KEY is set inside Supabase Edge Function Secrets.
- **Database size unavailable:** run supabase/usage.sql and check the RPC in Database → Functions.
- **401:** sign out, sign back in, then refresh usage.
- **No charge expected on free plans:** verify your current account plan and pay-as-you-go settings at the provider dashboards.
- No Supabase service_role key or Tavily secret belongs in config.js or browser JavaScript.
