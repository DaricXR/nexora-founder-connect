## v12 integration checks — November 13, 2026

Changes were based on the latest accessible GitHub \`main\` files, rather than an older ZIP. Tests conducted on committed source:

- PASS: Navigation has unique README and Usage & Limits buttons and matching panels.
- PASS: Usage controls and all referenced DOM IDs are present.
- PASS: New \`usage.js\` and \`docs.js\` parse as JavaScript in a V8 evaluator.
- PASS: Usage code calls \`api.functions.invoke('usage-status')\` and \`api.rpc('nexora_database_size_bytes')\`, preserving the existing Supabase client.
- PASS: Server-side usage endpoint only returns account and key usage fields and requires a valid Supabase session before requesting Tavily.
- PASS: Source files and documentation were fetched back from GitHub after commits.
- NOT TESTED: Live Tavily balances, Supabase RPC execution, and browser rendering after production deployment. These require deploying the included SQL and Edge Function and signing in to the account. Exact current usage has not been retrieved.
- Unchanged: Existing founder discovery, jobs, CRM, companies, alerts, monitoring script, and \`config.js\`.

# Nexora Founder Connect v10 — Test report

Tested on 2026-11-10 in an isolated local environment.

## Passed
- Python unit tests: 6/6. Covers role matching, exclusion filters, Greenhouse parsing, Lever parsing, duplicate elimination, conflict-safe Supabase insert behavior, and token validation.
- Browser-local Chromium interaction: 2 demo alerts appear, marking one Reviewed removes it from New, Reviewed filter shows it, All filter restores both, and no JavaScript page errors occurred.
- JavaScript syntax for `app.js`, `jobs.js`, `growth.js`, `alerts.js`, `legacy-v6.js`, `config.js`.
- `watchlist.json` parse, Python compilation, and package ZIP integrity.

## Not live-tested
- Supabase Auth/REST, the SQL migration applied in a real Supabase project, GitHub scheduled runner execution, live Greenhouse/Lever employer tokens, and Tavily API calls. These need project settings, verified employer identifiers, API secrets, and live deployment. Integration correctness and free-tier quotas cannot be guaranteed from local tests.
- Browser harness used an isolated DOM with emulated browser storage because direct local-network navigation is blocked in this environment; this is not equivalent to full deployed-website acceptance testing.

## Operational risks
- GitHub cron execution can be delayed, skipped during high load, or disabled after extended inactivity in public repos.
- Source information can be stale. Verify jobs and opportunity signals before contacting a person or applying.
- Empty watched-board list + disabled Tavily search produces no new findings by design.
