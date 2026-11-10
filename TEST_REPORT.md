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
