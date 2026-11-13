// Public job search via Tavily. NOT an authoritative feed of active vacancies.
// Deploy with default authenticated JWT verification and TAVILY_API_KEY secret.
import { createClient } from 'npm:@supabase/supabase-js@2';
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Access-Control-Allow-Methods':'POST, OPTIONS'};
const respond=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{...cors,'Content-Type':'application/json'}});
Deno.serve(async(req)=>{
 if(req.method==='OPTIONS')return new Response('',{headers:cors});
 if(req.method!=='POST')return respond({error:'Method not allowed'},405);
 const bearer=req.headers.get('Authorization')||'';
 const token=bearer.startsWith('Bearer ')?bearer.slice(7):'';
 if(!token)return respond({error:'Sign in required'},401);
 const supabase=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_ANON_KEY')!);
 const {data:{user},error}=await supabase.auth.getUser(token);
 if(error||!user)return respond({error:'Invalid session'},401);
 const key=Deno.env.get('TAVILY_API_KEY');if(!key)return respond({error:'Set TAVILY_API_KEY secret'},503);
 try{
  const input=await req.json();
  const clean=(x:unknown,n:number)=>String(x||'').replace(/[^\p{L}\p{N} .,/+&-]/gu,' ').trim().slice(0,n);
  const keywords=clean(input.keywords,110)||'Unity XR immersive developer';
  const country=clean(input.country,75);
  const remote=['any','remote','onsite'].includes(input.remote)?input.remote:'any';
  const focus=['engineering','leadership','experiential'].includes(input.focus)?input.focus:'engineering';
  const page=Math.max(0,Math.min(24,Math.floor(Number(input.page)||0)));
  const targets=['site:greenhouse.io','site:jobs.lever.co','site:jobs.ashbyhq.com','site:workable.com','site:linkedin.com/jobs/view','site:indeed.com/viewjob'];
  const expansions=['hiring careers opening','apply now full time','job role position','vacancy company careers'];
  const role=focus==='leadership'?'XR technical lead director':focus==='experiential'?'interactive experiences experiential developer':'Unity VR AR XR developer';
  // Pakistan job searches: short targeted searches rather than many mandatory
  // keywords + a single site: filter. Public results require manual verification.
  const pakistanMarket=input.market==='pakistan';
  const sector=['all','government','private'].includes(input.sector)?input.sector:'all';
  const employer=clean(input.employer,30);
  const city=clean(input.city,30);
  const specialty=clean(input.specialty,30);
  const officialSites=['njp.gov.pk','jobs.punjab.gov.pk','ndma.gov.pk','nccia.gov.pk','nastp.gov.pk','techdestination.com','pitb.gov.pk','jobs.gov.pk','joinpaf.gov.pk','jobcenter.punjab.gov.pk'];
  const privateSites=['rozee.pk','mustakbil.com','linkedin.com/jobs','brightspyre.com','pk.indeed.com','jobs.lever.co','boards.greenhouse.io'];
  const employers:Record<string,{names:string[],domains:string[]}>={
    PITB:{names:['PITB','Punjab Information Technology Board'],domains:['jobs.punjab.gov.pk','pitb.gov.pk']},
    NDMA:{names:['NDMA','National Disaster Management Authority'],domains:['ndma.gov.pk']},
    NCCIA:{names:['NCCIA','National Cyber Crime Investigation Agency'],domains:['nccia.gov.pk']},
    PAF:{names:['PAF','Pakistan Air Force'],domains:['joinpaf.gov.pk']},
    NASTP:{names:['NASTP','National Aerospace Science Technology Park'],domains:['nastp.gov.pk']},
    NJP:{names:['National Jobs Portal'],domains:['njp.gov.pk']},
    PSEB:{names:['PSEB','Pakistan Software Export Board'],domains:['techdestination.com','njp.gov.pk']},
    NADRA:{names:['NADRA'],domains:['careers.nadra.gov.pk','njp.gov.pk']},
    Ignite:{names:['Ignite','Ignite National Technology Fund'],domains:['ignite.org.pk','njp.gov.pk']}
  };
  const roleGroups:Record<string,string[]>={
    all:['Unity developer','VR AR developer','simulation engineer','interactive developer','digital twin developer','3D visualization developer','software engineer'],
    unity:['Unity developer','Unity 3D developer','game developer','real-time 3D developer'],
    xr:['AR VR developer','XR developer','virtual reality developer','simulation engineer'],
    interactive:['interactive developer','game developer','interactive media developer','creative technologist'],
    'digital-twin':['digital twin developer','simulation engineer','3D visualization developer','GIS 3D developer'],
    'technical-lead':['technical lead Unity','technical director simulation','senior software engineer','XR technical lead']
  };
  const roleList=roleGroups[specialty]||roleGroups.all;
  const offset=page;
  const rolePhrase=roleList[offset%roleList.length];
  const year=String(new Date().getUTCFullYear());
  const location=city&&city!=='Remote'?city+' Pakistan':'Pakistan';
  const chosen=employers[employer];
  const govtSources=officialSites.map(d=>'site:'+d);
  const privateSources=privateSites.map(d=>'site:'+d);
  // A named employer stays targeted; for "all" we alternate direct employer
  // job board searches and broad searches to avoid nearly-empty searches.
  let query='';
  let scope='';
  if(pakistanMarket){
    const angle=Math.floor(offset/roleList.length);
    if(chosen){
      const name=chosen.names[angle%chosen.names.length];
      if(angle%3===0){
        const domain=chosen.domains[angle%chosen.domains.length];
        query='site:'+domain+' careers vacancy '+rolePhrase;
        scope='Official employer source';
      }else{
        query='"'+name+'" '+rolePhrase+' jobs Pakistan';
        scope='Named employer research';
      }
    }else if(sector==='government'){
      if(offset%3===0){
        query=govtSources[Math.floor(offset/3)%govtSources.length]+' '+rolePhrase+' jobs';
        scope='Government portal';
      }else{
        query=rolePhrase+' government public sector jobs '+location+' '+year;
        scope='Government-wide';
      }
    }else if(sector==='private'){
      if(offset%3===0){
        query=privateSources[Math.floor(offset/3)%privateSources.length]+' '+rolePhrase+' '+location;
        scope='Private job board';
      }else{
        query=rolePhrase+' hiring careers software studio '+location+' '+year;
        scope='Private companies';
      }
    }else{
      if(offset%4===0){
        query=govtSources[Math.floor(offset/4)%govtSources.length]+' '+rolePhrase+' jobs';
        scope='Government portal';
      }else if(offset%4===1){
        query=privateSources[Math.floor(offset/4)%privateSources.length]+' '+rolePhrase+' Pakistan';
        scope='Private job board';
      }else{
        query=rolePhrase+' jobs openings '+location+' '+year;
        scope='All employers';
      }
    }
    if(city==='Remote')query+=' remote';
  }else{
    query=targets[page%targets.length]+' '+keywords+' '+role+' '+country+' '+(remote==='remote'?'remote':remote==='onsite'?'onsite hybrid':'')+' '+expansions[Math.floor(page/targets.length)%expansions.length]+' '+year;
    scope='International';
  }
  const response=await fetch('https://api.tavily.com/search',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({api_key:key,query,search_depth:'basic',max_results:20,include_answer:false,include_raw_content:false})});
  const body=await response.json();if(!response.ok)return respond({error:String(body.detail||body.error||response.status)},502);
  const items=(Array.isArray(body.results)?body.results:[]).filter((x:any)=>/^https?:\/\//.test(String(x.url||''))).map((x:any)=>({title:String(x.title||'').slice(0,220),url:String(x.url||'').slice(0,1600),snippet:String(x.content||'').slice(0,800),source:'Public web search'}));
  return respond({items,page,query,scope,market:pakistanMarket?'pakistan':'international',notice:'Search results are unverified indexed pages; not guaranteed current openings. Check dates and apply on the employer portal.'});
 }catch(e){return respond({error:String(e)},500);}
});
