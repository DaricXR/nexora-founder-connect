'use strict';
(() => {
const $ = id => document.getElementById(id);
const html = x => String(x??'').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const validUrl = s=>{try{const u=new URL(s);return ['http:','https:'].includes(u.protocol)?u.href:'';}catch{return '';}};
const LOCAL_JOBS='nexora_founder_connect_jobs_v8';
const js={jobs:[],shown:25,total:0,results:[],seen:new Set(),searchPage:0,searchKey:'',busy:false};
const currentUser=()=>state.user;
const cloud=()=>CLOUD;
const feedback=(s)=>{$('jobSearchStatus').textContent=s;};
const popup=s=>toast(s);
const keyOf=s=>validUrl(s).replace(/\?.*$/,'').replace(/\/$/,'').toLowerCase();
const normalize=x=>({id:x.id||crypto.randomUUID(),title:String(x.title||'').trim(),company:String(x.company||'').trim(),location:x.location||'',work_type:x.work_type||'Unknown',url:validUrl(x.url),stage:x.stage||'Saved',applied_date:x.applied_date||'',followup:x.followup||'',notes:x.notes||'',created_at:x.created_at||new Date().toISOString()});
let localJobs=[];
try{localJobs=JSON.parse(localStorage.getItem(LOCAL_JOBS)||'[]').map(normalize);}catch{}
function localSave(){localStorage.setItem(LOCAL_JOBS,JSON.stringify(localJobs));}
async function loadJobs(more=false){if(js.busy)return;js.busy=true;$('jobLoadMoreBtn').disabled=true;try{
const stage=$('jobStatusFilter').value,search=$('jobSavedKeyword').value.toLowerCase().trim(),batch=Number($('jobSavedPageSize').value)||25;
if(CLOUD){if(!currentUser()){js.jobs=[];js.total=0;renderSaved();return;}
let q=api.from('jobs').select('*',{count:'exact'}).eq('user_id',currentUser().id);
if(stage!=='all')q=q.eq('stage',stage);
if(search)q=q.or(`title.ilike.%${search.replace(/[,()%]/g,' ').slice(0,70)}%,company.ilike.%${search.replace(/[,()%]/g,' ').slice(0,70)}%,notes.ilike.%${search.replace(/[,()%]/g,' ').slice(0,70)}%`);
const offset=more?js.jobs.length:0;
const {data,error,count}=await q.order('created_at',{ascending:false}).range(offset,offset+batch-1);
if(error)throw error;
js.jobs=more?[...js.jobs,...(data||[])]:(data||[]);js.total=count||0;
}else{
const filtered=localJobs.filter(x=>(stage==='all'||x.stage===stage)&&(!search||[x.title,x.company,x.notes,x.location].join(' ').toLowerCase().includes(search))).sort((a,b)=>b.created_at.localeCompare(a.created_at));
js.total=filtered.length;js.shown=more?js.shown+batch:batch;js.jobs=filtered.slice(0,js.shown);
}
renderSaved();
}catch(e){popup('Job database error: '+e.message);feedback('Job database is unavailable: '+e.message);}finally{js.busy=false;$('jobLoadMoreBtn').disabled=false;}}
function card(x){const due=x.followup&&x.followup<=new Date().toLocaleDateString('en-CA')&&!['Closed','Rejected','Offer'].includes(x.stage);return `<article class="lead"><div class="pill ${due?'warn':''}">${html(x.stage)}</div><div><div class="lead-top"><h3>${html(x.title)}</h3><span class="company">${html(x.company)}</span></div><p>${html(x.location||'Location not specified')} · ${html(x.work_type||'Unknown')}</p><div class="pills">${x.applied_date?'<span class="pill">Applied '+html(x.applied_date)+'</span>':''}${x.followup?'<span class="pill '+(due?'warn':'')+'">Follow-up '+html(x.followup)+'</span>':''}</div>${x.notes?'<p>'+html(x.notes).slice(0,250)+'</p>':''}</div><div class="lead-actions"><a target="_blank" rel="noopener noreferrer" href="${html(x.url)}">View listing ↗</a><button class="job-edit" data-id="${html(x.id)}">Edit / stage</button></div></article>`;}
function renderSaved(){$('jobSavedList').innerHTML=js.jobs.length?js.jobs.map(card).join(''):'<div class="empty">No saved jobs match this view. Search or add an opportunity.</div>';$('jobSavedCount').textContent=`${js.jobs.length} of ${js.total} saved jobs`;$('jobLoadMoreBtn').hidden=js.jobs.length>=js.total;}
function openJob(x){$('jobForm').reset();$('jobDialogHeading').textContent=x?'Edit job opening':'Save job opening';$('jobId').value=x?.id||'';$('jobTitle').value=x?.title||'';$('jobCompany').value=x?.company||'';$('jobLocation').value=x?.location||'';$('jobWorkType').value=x?.work_type||'Unknown';$('jobLink').value=x?.url||'';$('jobStage').value=x?.stage||'Saved';$('jobDate').value=x?.applied_date||'';$('jobFollowup').value=x?.followup||'';$('jobNotes').value=x?.notes||'';$('jobDeleteBtn').hidden=!x;$('jobDialog').showModal();}
async function saveJob(e){e.preventDefault();if(CLOUD&&!currentUser()){popup('Please sign in first');return;}
const x=normalize({id:$('jobId').value||undefined,title:$('jobTitle').value,company:$('jobCompany').value,location:$('jobLocation').value,work_type:$('jobWorkType').value,url:$('jobLink').value,stage:$('jobStage').value,applied_date:$('jobDate').value,followup:$('jobFollowup').value,notes:$('jobNotes').value});
if(!x.title||!x.company||!x.url){popup('Enter a title, company, and valid URL');return;}
try{if(CLOUD){const row={title:x.title,company:x.company,location:x.location,work_type:x.work_type,url:x.url,stage:x.stage,applied_date:x.applied_date||null,followup:x.followup||null,notes:x.notes,identity_key:keyOf(x.url),updated_at:new Date().toISOString()};let response;
if($('jobId').value)response=await api.from('jobs').update(row).eq('id',x.id).eq('user_id',currentUser().id);
else response=await api.from('jobs').upsert({...row,user_id:currentUser().id},{onConflict:'user_id,identity_key',ignoreDuplicates:true});
if(response.error)throw response.error;
}else{const old=localJobs.find(y=>y.id===x.id),dupe=localJobs.find(y=>keyOf(y.url)===keyOf(x.url)&&y.id!==x.id);if(dupe){popup('This job is already saved');return;}if(old)Object.assign(old,x);else localJobs.unshift(x);localSave();}
$('jobDialog').close();await loadJobs();popup('Job saved');
}catch(err){popup('Could not save job: '+err.message);}}
async function deleteJob(){const id=$('jobId').value;if(!id||!confirm('Delete this saved job?'))return;try{if(CLOUD){const {error}=await api.from('jobs').delete().eq('id',id).eq('user_id',currentUser().id);if(error)throw error;}else{localJobs=localJobs.filter(x=>x.id!==id);localSave();}$('jobDialog').close();await loadJobs();popup('Job deleted');}catch(e){popup(e.message);}}
function searchArgs(){return {keywords:$('jobKeywords').value,country:$('jobCountry').value,remote:$('jobRemote').value,focus:$('jobStrategy').value};}
function resultCard(x){return `<article class="lead"><span class="pill">Unverified listing</span><div><h3>${html(x.title)}</h3><p class="job-description">${html(x.snippet).slice(0,500)}</p></div><div class="lead-actions"><a href="${html(x.url)}" target="_blank" rel="noopener noreferrer">Check opening ↗</a><button class="job-save-result" data-url="${html(x.url)}">Save job</button></div></article>`;}
async function searchJobs(more=false){if(!CLOUD||!currentUser()){feedback('Sign in with configured Supabase to use live search; manual job tracking works locally.');return;}
const args=searchArgs(),k=JSON.stringify(args);if(!more||js.searchKey!==k){js.searchKey=k;js.searchPage=0;js.results=[];js.seen=new Set();}
$('jobSearchBtn').disabled=true;$('jobMoreSearchBtn').disabled=true;feedback('Searching public sources for job listings…');try{
const {data,error}=await api.functions.invoke('discover-jobs',{body:{...args,page:js.searchPage}});if(error)throw error;if(data?.error)throw Error(data.error);
let added=0;for(const x of data.items||[]){const k=keyOf(x.url);if(!k||js.seen.has(k))continue;js.seen.add(k);js.results.push(x);added++;}
js.searchPage++;$('jobSearchResults').innerHTML=js.results.length?js.results.map(resultCard).join(''):'<div class="empty">No listings returned. Try a different role, country, or search.</div>';
feedback(`${js.results.length} unique web links found · ${added} new this search. Listings may be outdated or closed: verify with employer before applying. “Load more” uses different search angles, not guaranteed pagination.`);
}catch(e){feedback('Job discovery unavailable: '+e.message+' — check the discover-jobs function and Tavily credits.');}finally{$('jobSearchBtn').disabled=false;$('jobMoreSearchBtn').disabled=false;}}
function saveResult(link){const x=js.results.find(y=>y.url===link);if(!x)return;openJob();$('jobTitle').value=x.title.slice(0,180);$('jobCompany').value='';$('jobLink').value=x.url;$('jobLocation').value=$('jobCountry').value;$('jobNotes').value='Unverified web listing. Check employer, role and application status before submitting.\n'+x.snippet.slice(0,550);popup('Confirm company and title before saving');}
async function fetchAllJobs(){if(!CLOUD)return localJobs; if(!currentUser())throw Error('Sign in first');const results=[];for(let i=0;;i+=500){const {data,error}=await api.from('jobs').select('*').eq('user_id',currentUser().id).order('created_at',{ascending:false}).range(i,i+499);if(error)throw error;results.push(...(data||[]));if(!data||data.length<500)break;}return results;}
async function exportJobs(){try{const all=await fetchAllJobs();const blob=new Blob([JSON.stringify({app:'Nexora',version:8,type:'saved_jobs',jobs:all},null,2)],{type:'application/json'});const href=URL.createObjectURL(blob),a=document.createElement('a');a.href=href;a.download='nexora-saved-jobs-'+new Date().toLocaleDateString('en-CA')+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(href),2000);popup('Exported '+all.length+' saved jobs');}catch(e){popup(e.message);}}
async function importJobs(e){const file=e.target.files?.[0];if(!file)return;try{const parsed=JSON.parse(await file.text());const records=Array.isArray(parsed)?parsed:parsed.jobs;if(!Array.isArray(records)||records.length>10000)throw Error('Invalid jobs backup');const existing=new Set((await fetchAllJobs()).map(x=>keyOf(x.url)));let added=0;for(const raw of records){const x=normalize(raw),id=keyOf(x.url);if(!x.title||!x.company||!id||existing.has(id))continue;if(CLOUD){if(!currentUser())throw Error('Sign in first');const {error}=await api.from('jobs').insert({user_id:currentUser().id,identity_key:id,title:x.title,company:x.company,location:x.location,work_type:x.work_type,url:x.url,stage:x.stage,applied_date:x.applied_date||null,followup:x.followup||null,notes:x.notes});if(error){if(error.code==='23505')continue;throw error;}}else{localJobs.push(x);localSave();}existing.add(id);added++;}await loadJobs();popup('Imported '+added+' new jobs; existing application statuses preserved');}catch(err){popup('Import failed: '+err.message);}e.target.value='';}
function setupTabs(){const buttons=[...document.querySelectorAll('[data-workspace]')];function activate(section){buttons.forEach(b=>{b.classList.toggle('active',b.dataset.workspace===section);b.setAttribute('aria-current',b.dataset.workspace===section?'page':'false');});document.querySelectorAll('[data-section]').forEach(el=>el.hidden=el.dataset.section!==section);if(section==='jobs')loadJobs();window.scrollTo({top:0,behavior:'instant'});}buttons.forEach(b=>b.addEventListener('click',()=>activate(b.dataset.workspace)));document.querySelectorAll('[data-jump]').forEach(b=>b.addEventListener('click',()=>activate(b.dataset.jump)));activate('overview');}
function init(){for(const c of COUNTRIES){const opt=document.createElement('option');opt.value=c==='All countries'?'':c;opt.textContent=c;$('jobCountry').append(opt);}
setupTabs();$('jobSearchBtn').addEventListener('click',()=>searchJobs());$('jobMoreSearchBtn').addEventListener('click',()=>searchJobs(true));$('jobGoogleBtn').addEventListener('click',()=>{const a=searchArgs();const query=`${a.keywords} ${a.country} ${a.remote==='remote'?'remote':''} jobs careers apply`;window.open('https://www.google.com/search?q='+encodeURIComponent(query),'_blank','noopener,noreferrer');});$('jobRefreshBtn').addEventListener('click',()=>loadJobs());$('jobAddBtn').addEventListener('click',()=>openJob());$('jobExportBtn').addEventListener('click',exportJobs);$('jobImportBtn').addEventListener('click',()=>$('jobFileInput').click());$('jobFileInput').addEventListener('change',importJobs);$('jobLoadMoreBtn').addEventListener('click',()=>loadJobs(true));$('jobSavedList').addEventListener('click',e=>{const b=e.target.closest('.job-edit');if(b)openJob(js.jobs.find(x=>x.id===b.dataset.id));});$('jobSearchResults').addEventListener('click',e=>{const b=e.target.closest('.job-save-result');if(b)saveResult(b.dataset.url);});$('jobForm').addEventListener('submit',saveJob);$('jobClose').addEventListener('click',()=>$('jobDialog').close());$('jobCancel').addEventListener('click',()=>$('jobDialog').close());$('jobDeleteBtn').addEventListener('click',deleteJob);for(const id of ['jobStatusFilter','jobSavedKeyword','jobSavedPageSize'])$(id).addEventListener(id==='jobSavedKeyword'?'input':'change',()=>loadJobs());if(!CLOUD)feedback('Local demo mode. Add jobs manually; configure Supabase and deploy discover-jobs for public-web discovery.');}
init();
})();
