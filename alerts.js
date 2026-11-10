'use strict';
(()=>{
const $=id=>document.getElementById(id);
const safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const isUrl=s=>{try{const u=new URL(s);return ['http:','https:'].includes(u.protocol)?u.href:'';}catch{return '';}};
const LOCAL='nexora_alerts_demo_v10';
const s={rows:[],total:0,limit:20,filter:'new',kind:'all',busy:false};
function localRows(){try{return JSON.parse(localStorage.getItem(LOCAL)||'[]');}catch{return [];}}
function putLocal(rows){localStorage.setItem(LOCAL,JSON.stringify(rows));}
function filters(){s.filter=$('alertStatus').value;s.kind=$('alertCategory').value;}
function render(){
 $('alertsCount').textContent=`${s.rows.length} of ${s.total} matching alerts`;
 $('alertList').innerHTML=s.rows.length?s.rows.map(a=>`<article class="lead"><div class="pill ${a.status==='new'?'good':''}">${safe(a.category==='job'?'Job':'Company signal')}</div><div><div class="lead-top"><h3>${safe(a.title)}</h3><span class="company">${safe(a.company)}</span></div><p>${safe(a.summary).slice(0,320)}</p><div class="pills"><span class="pill">Priority ${Math.min(10,Math.max(1,Number(a.score)||1))}/10</span><span class="pill">${safe(a.source_name)}</span><span class="pill">${safe(String(a.found_at||'').slice(0,10))}</span></div></div><div class="lead-actions"><a href="${safe(isUrl(a.source_url)||'#')}" target="_blank" rel="noopener noreferrer">Verify source ↗</a><button data-alert-status="reviewed" data-alert-id="${safe(a.id)}">Reviewed</button><button data-alert-status="dismissed" data-alert-id="${safe(a.id)}">Dismiss</button><button data-alert-status="new" data-alert-id="${safe(a.id)}">Reopen</button></div></article>`).join(''):'<div class="empty">No alerts in this view. Configure employer boards and the scheduled workflow, then check again.</div>';
 $('alertMore').disabled=s.rows.length>=s.total;
 $('alertMore').hidden=s.rows.length>=s.total;
 const newCount=s.rows.filter(x=>x.status==='new').length;
 $('alertHeaderLabel').textContent=s.filter==='new'?`${s.total} new findings`:`${s.total} matching findings`;
}
async function load(more=false){if(s.busy)return;s.busy=true;$('alertMore').disabled=true;filters();try{
 const size=more?s.limit+20:20;
 if(CLOUD){if(!state.user){s.rows=[];s.total=0;render();$('alertNotice').textContent='Sign in to see monitored opportunities';return;}
 let q=api.from('monitor_alerts').select('*',{count:'exact'}).eq('user_id',state.user.id);
 if(s.filter!=='all')q=q.eq('status',s.filter);
 if(s.kind!=='all')q=q.eq('category',s.kind);
 const {data,error,count}=await q.order('score',{ascending:false}).order('found_at',{ascending:false}).range(0,size-1);
 if(error)throw error;s.rows=data||[];s.total=count||0;
 $('alertNotice').textContent='Cloud alerts update when the GitHub Actions monitor runs. Refresh reads the latest database records.';
 }else{
 let list=localRows();if(s.filter!=='all')list=list.filter(x=>x.status===s.filter);
 if(s.kind!=='all')list=list.filter(x=>x.category===s.kind);
 list.sort((a,b)=>Number(b.score)-Number(a.score)||String(b.found_at).localeCompare(String(a.found_at)));
 s.total=list.length;s.rows=list.slice(0,size);
 $('alertNotice').textContent='Local preview only. Automated findings require Supabase and GitHub Actions setup.';
 }
 s.limit=size;render();
 }catch(e){$('alertNotice').textContent='Could not load alerts: '+e.message;}finally{s.busy=false;$('alertMore').disabled=s.rows.length>=s.total;}}
async function setStatus(id,status){if(!['new','reviewed','dismissed'].includes(status))return;
 try{
 if(CLOUD){if(!state.user)throw Error('Sign in first');
 const {error}=await api.from('monitor_alerts').update({status}).eq('user_id',state.user.id).eq('id',id);if(error)throw error;
 }else{let rows=localRows(),a=rows.find(x=>x.id===id);if(!a)throw Error('Alert not found');a.status=status;putLocal(rows);}
 await load(false);toast('Alert updated');
 }catch(e){toast('Could not update alert: '+e.message);}}
function addSample(){if(CLOUD){toast('Sample alerts only available in local preview');return;}
const items=[{id:'demo-job',identity_key:'demo-job',category:'job',title:'Sample Unity / XR Engineer role',company:'Example Studio (DEMO)',country:'Remote',source_url:'https://example.com',source_name:'Demo entry',summary:'Illustration of a new job alert. Not a live vacancy.',score:9,status:'new',found_at:new Date().toISOString()},{id:'demo-company',identity_key:'demo-company',category:'company_signal',title:'Sample interactive installation opportunity',company:'Example Agency (DEMO)',country:'UAE',source_url:'https://example.com',source_name:'Demo entry',summary:'Illustration of a company signal. Not verified.',score:7,status:'new',found_at:new Date().toISOString()}];const rows=localRows(),seen=new Set(rows.map(a=>a.identity_key));for(const item of items)if(!seen.has(item.identity_key))rows.push(item);putLocal(rows);load(false);}
function init(){
 $('alertRefresh').addEventListener('click',()=>load(false));
 $('alertMore').addEventListener('click',()=>load(true));
 $('alertStatus').addEventListener('change',()=>load(false));
 $('alertCategory').addEventListener('change',()=>load(false));
 $('alertDemo').addEventListener('click',addSample);
 $('alertList').addEventListener('click',e=>{const b=e.target.closest('[data-alert-status]');if(b)setStatus(b.dataset.alertId,b.dataset.alertStatus);});
 document.querySelectorAll('[data-workspace="alerts"]').forEach(b=>b.addEventListener('click',()=>load(false)));
 load(false);
}
init();
})();
