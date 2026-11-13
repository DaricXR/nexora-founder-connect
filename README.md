# Nexora Founder Connect v12 — Growth Intelligence

**Live application:** https://daricxr.github.io/nexora-founder-connect/

**New in v12:** A **README · How It Works** tab inside the app, plus **Usage & Limits** for live Tavily credits and estimated Supabase database footprint. These features are additive to the existing v10 CRM, discovery, jobs and scheduled monitoring.


## Pakistan Jobs — public and private sector

The **Pakistan Jobs** tab is dedicated to local roles aligned with Nexora's developer profile:
Unity developer, XR/AR/VR/MR developer, immersive developer, interactive installations, digital twins, simulation, real-time 3D, and technical/creative leadership.

- Select **Government / Public sector**, **Private companies / Studios**, or both.
- Choose a priority employer such as PITB, NDMA, NCCIA, PAF, NASTP, PSEB, or the federal National Jobs Portal.
- Filter by specialty and city; **Search Pakistan vacancies** uses the existing signed-in \`discover-jobs\` Supabase Edge Function with \`market:"pakistan"\`.
- **Load more discoveries** changes the source/search query and deduplicates URLs. Tavily doesn't guarantee fresh results or exhaustive job-board pagination.
- Click **Verify listing** to open the source; use **Save to job tracker** to prefill the existing jobs form, confirm employer/title, and save through the same private Supabase \`jobs\` database. Your application stages and follow-ups remain in Job Openings.
- Direct official portal links remain available even if Tavily is exhausted or an API fails. The official domains are listed for research, not as proof of an open job.

### Required deployment step for Pakistan-specific search

**The GitHub Pages tab publishes automatically from main**, but the Pakistan employer/site prioritization is implemented in \`supabase/functions/discover-jobs/index.ts\` and **does not deploy automatically from GitHub Pages**. In Supabase Dashboard → Edge Functions → \`discover-jobs\` → edit function, replace its source with the latest code from the repository and redeploy. Keep the existing \`TAVILY_API_KEY\` secret and authenticated JWT verification.

Before Edge Function redeployment, the Pakistan tab can call the currently deployed function, but government/private and named-employer site filters will not yet be honored by the backend; the existing function searches a broader set of sources.

Do not interpret an indexed page as an active job. Verify posting date, closing date, role, eligibility and official employer website before applying.

### Official sources

- Government: https://www.njp.gov.pk/jobs/live, https://jobs.punjab.gov.pk/, https://www.ndma.gov.pk/careers, https://www.nccia.gov.pk/careers.php, https://joinpaf.gov.pk/, https://nastp.gov.pk/, https://techdestination.com/careers/
- Government + private: https://jobs.gov.pk/, https://jobcenter.punjab.gov.pk/
- The app also targets public private-sector indexed pages such as LinkedIn Jobs, Rozee, Mustakbil, BrightSpyre, and employer-hosted Greenhouse/Lever pages, where searchable. It does not scrape authenticated LinkedIn content.

## How the app works

| Component | Technology | Responsibility |
|---|---|---|
| Public frontend | GitHub Pages, HTML/CSS/JavaScript | Navigation, contacts, dashboards and outreach drafts |
| Authentication | Supabase Auth | Email/password sign in |
| Private data | Supabase PostgreSQL with RLS | Save each signed-in user's leads, companies, jobs, alerts |
| Founder research | Supabase Edge Function + Tavily | Public-web discovery from user-selected search filters |
| Job search | Supabase Edge Function + Tavily | Find potential publicly indexed job listings |
| Employer monitoring | GitHub Actions + Python | Scheduled scans of configured Greenhouse/Lever public boards |
| Company research signals | Tavily via GitHub Actions | Optional public-web research; results require human verification |
| Usage metrics | Supabase Edge Function + SQL RPC | Tavily API credits and estimated database size |

**Typical workflow:** Discover → verify person/company → save to CRM → choose project/partnership/career pipeline → write a personalized message → mark Contacted → set follow-up → measure outcomes. Job listings are saved and tracked separately. Alerts are monitored separately and reviewed manually.

**Data retention:** A contacted person remains contacted on subsequent refresh or import; alerts are deduplicated by identity. The service-role and Tavily API keys must never appear in public code. Supabase uses RLS for per-user data access.

## Enable the new Usage & Limits tab

The v12 frontend is committed to GitHub, but **the live backend usage metrics require one-time setup in your Supabase account**:

1. Supabase → SQL Editor: execute [supabase/usage.sql](supabase/usage.sql).
2. Supabase → Edge Functions: deploy function named **usage-status** from [supabase/functions/usage-status/index.ts](supabase/functions/usage-status/index.ts).
3. Supabase → Edge Functions → Secrets: confirm **TAVILY_API_KEY** exists and is set. Keep JWT verification enabled.
4. Sign in on your GitHub Pages website, open **Usage & Limits** and click **Refresh usage**.

See [USAGE_SETUP.md](USAGE_SETUP.md) for troubleshooting.

### What usage numbers are real?

- **Tavily** account credits consumed / remaining are fetched from its usage API through the protected Edge Function. This includes credit use elsewhere under the same Tavily account.
- **Supabase database size** is retrieved by a read-only SQL RPC and represents an approximate current database footprint, **not** an official invoice/usage statement.
- Other Supabase Free quotas (50,000 MAU, 500,000 monthly Edge Function invocations, 5 GB egress, 1 GB storage) are **reference allowances only**. Exact consumption remains available in your Supabase organization's billing/usage dashboard.
- This version does **not** connect to your private Supabase billing admin API and does not invent exact account-level monthly consumption.

## Existing v10 setup and scheduling

The documentation below covers the existing monitor, data migrations, and the original deployment.

---

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
