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
  const query=`${targets[page%targets.length]} ${keywords} ${role} ${country} ${remote==='remote'?'remote':remote==='onsite'?'onsite hybrid':''} ${expansions[Math.floor(page/targets.length)%expansions.length]} 2026`;
  const response=await fetch('https://api.tavily.com/search',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({api_key:key,query,search_depth:'basic',max_results:20,include_answer:false,include_raw_content:false})});
  const body=await response.json();if(!response.ok)return respond({error:String(body.detail||body.error||response.status)},502);
  const items=(Array.isArray(body.results)?body.results:[]).filter((x:any)=>/^https?:\/\//.test(String(x.url||''))).map((x:any)=>({title:String(x.title||'').slice(0,220),url:String(x.url||'').slice(0,1600),snippet:String(x.content||'').slice(0,800),source:'Public web search'}));
  return respond({items,page,query,notice:'Public web search can return old/closed vacancies or articles. Verify the employer posting before applying. Load more changes search queries; it is not a complete paginated job feed.'});
 }catch(e){return respond({error:String(e)},500);}
});
