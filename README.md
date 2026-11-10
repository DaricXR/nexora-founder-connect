# Nexora Founder Connect v10 — Scheduled Opportunity Intelligence

GitHub Pages + Supabase Auth/Postgres + **GitHub Actions daily checks**. No Cloudflare, no paid server required within provider free-tier quotas. This includes everything from v9, plus **Alerts & Daily Priorities**, monitored published jobs, optional public-web company signals, review workflows, and duplicate suppression.

## New in v10

- **Alerts & Daily Priorities tab:** New / Reviewed / Dismissed, Jobs / Company signals, score-based priorities, Verify Source links, Refresh, and paginated Load More.
- **Daily scheduler:** `.github/workflows/monitor.yml` runs at **03:23 UTC (08:23 PKT)**, plus a manual **Run workflow** button. GitHub may delay scheduled runs; schedules are not hard real-time.
- **Published employer job-board monitoring:** Greenhouse and Lever employer-specific public posting feeds. Filtered for Unity / XR / immersive careers. A job listed on a published employer board is still subject to the employer removing or closing it later.
- **Optional company/project discovery:** Tavily public-web research; results are explicitly labeled **unverified research candidates**, not confirmed client tenders.
- **Duplicate-safe saves:** unique `(user_id, identity_key)` and `resolution=ignore-duplicates` keep old Reviewed/Dismissed statuses intact on subsequent runs.
- **No automated invitations, cold messages, or job applications.** You review and act manually.

## Upgrade from v9

1. Backup your v9 leads, jobs and companies. Use the **same** Supabase project.
2. In Supabase SQL Editor run only **`supabase/alerts.sql`** (existing schema/companies/jobs tables remain unchanged).
3. Replace your GitHub Pages root frontend with this version (`index.html`, `style.css`, `app.js`, `growth.js`, `jobs.js`, `alerts.js`, `legacy-v6.js`, `config.js`, `seed.json`). Preserve your existing values in `config.js`. Commit `.github/workflows/monitor.yml`, `monitor/monitor.py`, and `monitor/watchlist.json` too.
4. In GitHub repository **Settings → Secrets and variables → Actions → New repository secret**, enter:
   - `SUPABASE_URL`: e.g. `https://YOUR-PROJECT.supabase.co`.
   - `SUPABASE_SERVICE_ROLE_KEY`: **secret** service role key from Supabase dashboard. NEVER commit it or put it in `config.js`. Only the server-side runner uses it.
   - `NEXORA_USER_ID`: the **UUID** of your Supabase Auth user (Supabase dashboard → Authentication → Users). Alerts will belong only to this account. Do **not** use your email here.
   - `TAVILY_API_KEY`: optional. Required only if public web search is enabled in watchlist.
5. Edit **`monitor/watchlist.json`**. Add the exact Greenhouse board token / Lever site token for employers you want to monitor. You can find these from official career URLs (`boards.greenhouse.io/BOARD_TOKEN`, `jobs.lever.co/SITE_TOKEN`), and check that the endpoints serve a public JSON list. Example:

```json
"job_boards": [
  {"provider": "greenhouse", "company": "Example Employer", "token": "exampleboard"},
  {"provider": "lever", "company": "Example Studio", "token": "examplestudio"}
]
```

Those are **placeholders**, not active companies. Supply actual verified employer tokens. An empty list means no official boards are checked.

6. To enable Tavily, change `public_web_search.enabled` to `true` and add your API key as the GitHub Secret. Each scheduled run consumes API credits; restrict `max_queries_per_run` to stay in the free allowance. The sample research queries are editable. Web matches might be outdated or irrelevant.
7. In **GitHub → Actions → Nexora opportunity monitor → Run workflow** run once and review its logs. Open your GitHub Pages website, log in and use the **Alerts & Daily Priorities** tab → Refresh. Check whether findings appear. The daily schedule then runs on its own when GitHub schedules it.

### GitHub Pages setup

Settings → Pages → Deploy from branch → `main` → `/ (root)`. Hosted static frontend works with Supabase; server secrets are kept only in GitHub Actions, not in Pages files. No backend is hosted on GitHub Pages.

## Security and operational notes

- The `monitor_alerts` table has RLS; authenticated users can read/update/delete only their own alerts. Only the trusted runner, using the service role secret, inserts findings. Do not leak that key in frontend code, CI logs or public files.
- **A GitHub repository can be public**, but do not commit any contacts, exported JSON backups, credentials, or sensitive notes. Prefer a private repository with GitHub Pages if your plan supports it; verify your repository's Pages availability.
- The scheduled runner is **single-user** and writes to `NEXORA_USER_ID`. Multi-user automated monitoring would require a per-user watchlist and authorization architecture.
- GitHub scheduled workflows may be delayed or disabled after **60 days without activity in a public repository**. Use manual workflow dispatch if needed. Not suitable for guaranteed critical alerts.
- The runner **does not update existing alerts**, so the user retains review status and no repeated notifications are generated. Source pages must be verified when you review them.
- Countries in watchlist are research priorities, **not strict job-board location filters**. Job-board listings contain their own locations and may include global/remote jobs. Set up watched employers deliberately.
- Existing local demo mode remains for UI testing; automated monitoring needs a real Supabase project, a real user, and GitHub Actions secrets.
- Web search through Tavily is optional; it may require existing deployed `discover-founders` and `discover-jobs` Supabase Edge Functions for the original in-app user-initiated searches. Monitor works independently of these.

## Tests

```bash
python -m unittest discover -s tests -v
node --check alerts.js
node --check app.js
node --check growth.js
node --check jobs.js
python -m json.tool monitor/watchlist.json > /dev/null
```

See `TEST_REPORT.md` for results. Local tests do not prove Supabase credentials, GitHub scheduling, Tavily quota, or real employer URLs function in production.

## Providers

- Greenhouse: https://docs.greenhouse.io/job-board
- Lever: https://github.com/lever/postings-api
- GitHub Actions schedule: https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows
