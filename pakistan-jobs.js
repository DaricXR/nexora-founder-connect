'use strict';
/* Pakistan-specific job discovery. Uses existing, authenticated discover-jobs function
   (with optional Pakistan market extension). Saved jobs reuse existing Jobs dialog and database. */
(() => {
  const $ = id => document.getElementById(id);
  const escapeHtml = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const safeUrl = v => {try {const u=new URL(v);return u.protocol==='https:'?u.href:'';}catch{return '';}};
  const identity = v => safeUrl(v).split('#')[0].split('?')[0].replace(/\/$/,'').toLowerCase();
  const knownSources = new Set(['njp.gov.pk','www.njp.gov.pk','jobs.punjab.gov.pk','pitb.gov.pk','www.pitb.gov.pk','ndma.gov.pk','www.ndma.gov.pk','nccia.gov.pk','www.nccia.gov.pk','joinpaf.gov.pk','www.joinpaf.gov.pk','nastp.gov.pk','www.nastp.gov.pk','techdestination.com','www.techdestination.com','jobs.gov.pk','www.jobs.gov.pk','jobcenter.punjab.gov.pk']);
  const statePk = {page:0, signature:'', seen:new Set(), items:[], searching:false, requests:0};
  const args = () => ({sector:$('pkSector').value,employer:$('pkEmployer').value,specialty:$('pkSpecialty').value,city:$('pkCity').value});
  const queryText = () => {
    const a=args();
    const roles={
      all:'Unity XR VR immersive interactive developer digital twin simulation real-time 3D',
      unity:'Unity developer real-time 3D simulation developer',
      xr:'XR AR VR mixed reality developer',
      interactive:'interactive developer experiential technology installation game developer',
      'digital-twin':'digital twin simulation visualization developer',
      'technical-lead':'XR technical director Unity lead creative technologist'
    };
    return roles[a.specialty]||roles.all;
  };
  const host = v => {try{return new URL(v).hostname.toLowerCase();}catch{return '';}};
  function render() {
    $('pkCount').textContent=String(statePk.items.length);
    $('pkScope').textContent=({all:'All sectors',private:'Private',government:'Government'})[$('pkSector').value];
    $('pkResults').innerHTML=statePk.items.length ? statePk.items.map((x,index)=>{
      const verifiedDomain=knownSources.has(host(x.url));
      const text=(x.title+' '+x.snippet).toLowerCase();
      const vacancySignal=/vacanc|hiring|job opening|apply now|apply online|career|recruit|position available|developer|engineer|specialist/.test(text);
      const badge=vacancySignal?'Potential listing':'Research page';
      return '<article class="lead"><span class="pill">'+escapeHtml(badge)+'</span>'+
      '<div><div class="lead-top"><h3>'+escapeHtml(x.title)+'</h3></div><p>'+escapeHtml(x.snippet||'No listing summary provided.').slice(0,550)+'</p>'+
      '<div class="pills"><span class="pill">'+(verifiedDomain?'Official domain':'Public web')+'</span><span class="pill">'+escapeHtml(host(x.url))+'</span></div></div>'+
      '<div class="lead-actions"><a href="'+escapeHtml(x.url)+'" target="_blank" rel="noopener noreferrer">Verify listing ↗</a>'+
      '<button class="pk-save" data-index="'+index+'">Save to job tracker</button></div></article>';
    }).join('') : '<div class="empty">No results yet. Search public job sources above, or use the official portal links.</div>';
  }
  async function search(more=false) {
    if(statePk.searching)return;
    if(!CLOUD || !state.user){
      $('pkStatus').textContent='Sign in to your Supabase account to search jobs. Official portal links remain available below.';
      return;
    }
    const a=args(), sig=JSON.stringify(a);
    if(more && statePk.page>=25){$('pkStatus').textContent='All 25 available search angles have been requested. Change a filter and search again.';return;}
    if(!more || sig!==statePk.signature){
      statePk.page=0;statePk.items=[];statePk.seen.clear();statePk.signature=sig;statePk.requests=0;
    }
    statePk.searching=true;
    $('pkSearch').disabled=$('pkMore').disabled=true;
    $('pkStatus').textContent='Searching public Pakistan job sources…';
    try {
      const {data,error}=await api.functions.invoke('discover-jobs',{body:{
        market:'pakistan',country:'Pakistan',keywords:queryText(),focus:a.specialty==='technical-lead'?'leadership':a.specialty==='interactive'?'experiential':'engineering',
        remote:a.city==='Remote'?'remote':'any',page:statePk.page,
        sector:a.sector,employer:a.employer,city:a.city,specialty:a.specialty
      }});
      if(error)throw error;
      if(data?.error)throw Error(data.error);
      let newCount=0;
      for(const result of data?.items||[]){
        const url=safeUrl(result.url);
        const id=identity(url);
        if(!id||statePk.seen.has(id))continue;
        statePk.seen.add(id);
        statePk.items.push({title:String(result.title||'Job listing').slice(0,220),url,snippet:String(result.snippet||'').slice(0,800)});
        newCount++;
      }
      statePk.page++;
      statePk.requests++;
      const backendNew=data?.market==='pakistan';
      const scope=data?.scope||'Public web';
      $('pkStatus').textContent=(backendNew?'': 'Search backend needs the latest Pakistan update deployed in Supabase. ')+statePk.items.length+' unique research links · '+newCount+' new. Search angle: '+scope+'. Verify titles, employers, deadlines and eligibility on the original site.';
      if(statePk.page>=25)$('pkMore').disabled=true;
      render();
    } catch(e) {
      $('pkStatus').textContent='Live search failed: '+(e.message||'Unknown error')+'. Confirm discover-jobs is deployed and Tavily credits are available.';
    } finally {
      statePk.searching=false;
      $('pkSearch').disabled=false;$('pkMore').disabled=statePk.page>=25;
    }
  }
  function save(index) {
    const x=statePk.items[index];if(!x)return;
    document.querySelector('[data-workspace="jobs"]')?.click();
    $('jobAddBtn').click();
    $('jobTitle').value=x.title.slice(0,180);
    $('jobCompany').value='';
    $('jobLocation').value='Pakistan'+($('pkCity').value?' · '+$('pkCity').value:'');
    $('jobLink').value=x.url;
    $('jobNotes').value='Pakistan jobs research candidate. Verify official vacancy, employer, requirements and deadline before applying.\n'+x.snippet.slice(0,450);
    $('jobCompany').focus();
    toast('Confirm the employer, title and posting before saving to your existing job database.');
  }
  function external() {
    const a=args();
    const roles=queryText();
    const selected=a.employer==='all'?'':a.employer;
    const query=(a.sector==='government'?'site:gov.pk ':a.sector==='private'?'-site:gov.pk ':'')+
      roles+' '+(selected||'')+' '+(a.city||'Pakistan')+' jobs careers apply';
    window.open('https://www.google.com/search?q='+encodeURIComponent(query),'_blank','noopener,noreferrer');
  }
  $('pkSearch')?.addEventListener('click',()=>search(false));
  $('pkMore')?.addEventListener('click',()=>search(true));
  $('pkExternal')?.addEventListener('click',external);
  $('pkSaved')?.addEventListener('click',()=>document.querySelector('[data-workspace="jobs"]')?.click());
  $('pkResults')?.addEventListener('click',e=>{
    const button=e.target.closest('.pk-save');if(button)save(Number(button.dataset.index));
  });
  for(const id of ['pkSector','pkEmployer','pkSpecialty','pkCity']){
    $(id)?.addEventListener('change',()=>{statePk.signature='';statePk.page=0;statePk.items=[];statePk.seen.clear();$('pkMore').disabled=false;$('pkCount').textContent='0';$('pkResults').innerHTML='<div class="empty">Filters changed. Click Search Pakistan vacancies to load new results.</div>';$('pkStatus').textContent='Filters updated. Search again to retrieve matching results.';$('pkScope').textContent=({all:'All sectors',private:'Private',government:'Government'})[$('pkSector').value];});
  }
  if(location.hash==='#pakistan-jobs')window.addEventListener('load',()=>document.querySelector('[data-workspace="pakistan-jobs"]')?.click());
})();