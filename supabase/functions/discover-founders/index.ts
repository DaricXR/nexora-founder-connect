// Deploy with Supabase Edge Functions. Set TAVILY_API_KEY as a Function secret.
// The caller must be signed in. Searches public web results, not LinkedIn's private database.
import { createClient } from 'npm:@supabase/supabase-js@2';
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info', 'Access-Control-Allow-Methods':'POST, OPTIONS' };
const roles = ['founder OR co-founder', 'CEO OR managing director', 'CTO OR technical director', 'studio owner OR agency founder'];
const themes = ['immersive technology XR AR VR', 'experiential marketing brand activations', 'interactive installations event technology', 'Unity game development studio', 'virtual production real-time 3D'];
Deno.serve(async (req) => {
  if(req.method === 'OPTIONS') return new Response('',{headers:cors});
  const result=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{...cors,'Content-Type':'application/json'}});
  if(req.method!=='POST')return result({error:'Method not allowed'},405);
  const auth=req.headers.get('Authorization')||'';
  const jwt=auth.startsWith('Bearer ')?auth.slice(7):'';
  if(!jwt) return result({error:'Please sign in'},401);
  const client=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_ANON_KEY')!,{global:{headers:{Authorization:`Bearer ${jwt}`}}});
  const {data:{user},error:authErr}=await client.auth.getUser(jwt);
  if(authErr||!user) return result({error:'Invalid session'},401);
  const secret=Deno.env.get('TAVILY_API_KEY'); if(!secret)return result({error:'TAVILY_API_KEY is not configured'},503);
  try {
    const input=await req.json();
    const country=String(input.country||'').slice(0,80).replace(/[^\p{L}\p{N} ,.-]/gu,'').trim();
    const role=roles.includes(input.role)?input.role:roles[0];
    const focus=themes.includes(input.focus)?input.focus:themes[0];
    const page=Math.max(0,Math.min(30,Math.floor(Number(input.page)||0)));
    // Rotating terms instead of pretending Tavily supports offset-based pagination.
    const angles=['founder linkedin profile','cofounder leadership team','CEO executive LinkedIn','founder entrepreneur agency','studio founder interactive technology','managing director experience design'];
    const query=`site:linkedin.com/in/ ${role} ${focus} ${country} ${angles[page%angles.length]} ${page>=6?['studio','interactive','agency','technology','digital'][Math.floor(page/6)%5]:''}`.trim();
    const r=await fetch('https://api.tavily.com/search',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({api_key:secret,query,search_depth:'basic',max_results:20,include_answer:false,include_raw_content:false})});
    const body=await r.json(); if(!r.ok)return result({error:body.detail||body.error||`Search provider error ${r.status}`},502);
    const items=(Array.isArray(body.results)?body.results:[]).filter((x:any)=>/^https?:\/\//i.test(String(x.url||''))).map((x:any)=>({title:String(x.title||'').slice(0,250),url:String(x.url||'').slice(0,1600),snippet:String(x.content||'').slice(0,900),provider:'Tavily public web search'}));
    return result({items,query,page,notice:'Search results are public web pages, not verified identity or LinkedIn data. Review profiles before saving. Load more uses fresh query angles, not guaranteed exhaustive pagination.'});
  }catch(e){return result({error:String(e)},500);}
});
