'use strict';
/* Nexora Usage & Limits: exact Tavily account credits through a protected Edge Function,
   optional approximate Supabase DB footprint through a read-only RPC. */
(() => {
  const el = id => document.getElementById(id);
  const fmt = n => Number(n).toLocaleString('en-US');
  const text = (id, value) => { if (el(id)) el(id).textContent = String(value); };
  const pct = (used, limit) => limit > 0 ? Math.min(100, 100 * used / limit) : 0;
  const bar = (id, used, limit) => {
    const element = el(id);
    if (!element) return;
    element.style.width = pct(used, limit).toFixed(1) + '%';
    element.setAttribute('aria-valuenow', String(Math.round(pct(used, limit))));
  };
  let busy = false;
  async function refresh() {
    if (busy) return;
    busy = true;
    const button = el('usageRefresh');
    button.disabled = true;
    text('usageStatus', 'Refreshing usage…');
    try {
      if (!window.CLOUD || !window.api) {
        text('usageStatus', 'Sign in with Supabase to retrieve live usage. Free-plan limits below are reference values.');
        return;
      }
      const { data: sessionData, error: sessionErr } = await window.api.auth.getSession();
      if (sessionErr || !sessionData?.session) {
        text('usageStatus', 'Sign in to your Supabase account, then refresh usage.');
        return;
      }
      let success = 0;
      const problems = [];
      try {
        const { data, error } = await window.api.functions.invoke('usage-status', { body: {} });
        if (error) throw error;
        if (!data || data.error) throw new Error(data?.error || 'Unexpected usage response');
        const account = data.account || {};
        const key = data.key || {};
        const used = Number(account.plan_usage ?? key.usage);
        const limit = Number(account.plan_limit ?? key.limit ?? 1000);
        if (!Number.isFinite(used) || !Number.isFinite(limit) || limit <= 0) throw new Error('Usage API returned no numeric credit totals');
        text('tavilyUsed', fmt(used));
        text('tavilyRemaining', fmt(Math.max(0, limit - used)));
        text('tavilyLimit', fmt(limit) + ' plan credits');
        text('tavilyPlan', String(account.current_plan || 'Plan reported by Tavily'));
        text('tavilyKeyUsed', Number.isFinite(Number(key.usage)) ? fmt(key.usage) : 'Not reported');
        bar('tavilyBar', used, limit);
        success++;
      } catch (error) {
        problems.push('Tavily: ' + (error?.message || 'usage-status is not deployed / configured'));
      }
      try {
        const { data, error } = await window.api.rpc('nexora_database_size_bytes');
        if (error) throw error;
        const size = Number(data);
        if (!Number.isFinite(size) || size < 0) throw Error('Database returned invalid size');
        const mb = size / 1e6;
        text('dbUsed', mb.toFixed(2) + ' MB');
        text('dbPercent', (100 * mb / 500).toFixed(2) + '% of 500 MB');
        bar('dbBar', mb, 500);
        success++;
      } catch (error) {
        problems.push('Supabase database estimate: ' + (error?.message || 'run supabase/usage.sql'));
      }
      text('usageUpdated', new Date().toLocaleString());
      text('usageStatus', (success ? 'Updated ' + success + '/2 live usage metrics. ' : '') +
        (problems.length ? problems.join(' · ') : 'Usage loaded successfully.'));
    } finally {
      busy = false;
      button.disabled = false;
    }
  }
  el('usageRefresh')?.addEventListener('click', refresh);
  document.querySelectorAll('[data-workspace="usage"]').forEach(button =>
    button.addEventListener('click', refresh));
})();