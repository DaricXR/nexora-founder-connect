"""Public-source job / opportunity monitor. Python stdlib; no third-party dependencies.
Run with private environment variables in GitHub Actions. Never commit service-role keys.
"""
import hashlib
import json
import os
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent
HEADERS = {'User-Agent':'NexoraMonitor/1.0 (public jobs discovery)', 'Accept':'application/json'}


def request_json(url, method='GET', data=None, headers=None):
    if not url.startswith('https://'):
        raise ValueError('Only HTTPS endpoints allowed')
    body = json.dumps(data).encode('utf-8') if data is not None else None
    req = urllib.request.Request(url, data=body, method=method,
                                 headers={**HEADERS, **({'Content-Type':'application/json'} if data is not None else {}), **(headers or {})})
    with urllib.request.urlopen(req, timeout=22) as response:
    raw = response.read(3_000_000)
    if not raw.strip():
        return None
    return json.loads(raw)



def clean(text):
    return re.sub(r'\s+', ' ', re.sub(r'<[^>]*>', ' ', str(text or ''))).strip()[:900]


def key_for(category, source, identifier):
    return hashlib.sha256(f'{category}|{source}|{identifier}'.encode()).hexdigest()


def score(text, config):
    text = text.casefold()
    if any(k.casefold() in text for k in config.get('excluded_job_keywords', [])):
        return 0
    matches = sum(k.casefold() in text for k in config['job_keywords'])
    return min(10, 3 + 2 * matches) if matches else 0


def collect_greenhouse(board, config):
    token = board['token'].strip()
    if not re.fullmatch(r'[a-zA-Z0-9_-]+', token):
        raise ValueError('Invalid Greenhouse board token')
    endpoint = f'https://boards-api.greenhouse.io/v1/boards/{token}/jobs?content=true'
    results = request_json(endpoint).get('jobs', [])
    out = []
    for j in results:
        text = clean(f"{j.get('title','')} {j.get('content','')}")
        relevance = score(text, config)
        if relevance == 0:
            continue
        link = j.get('absolute_url', '')
        if not link.startswith('https://'):
            continue
        out.append({'identity_key': key_for('job','greenhouse:'+token,str(j['id'])),
                    'category':'job', 'title':clean(j.get('title',''))[:250],
                    'company':board['company'][:160], 'country':clean(j.get('location',{}).get('name',''))[:120],
                    'source_url':link, 'source_name':'Greenhouse', 'summary':text[:500], 'score':relevance})
    return out


def collect_lever(board, config):
    site = board['token'].strip()
    if not re.fullmatch(r'[a-zA-Z0-9_-]+', site):
        raise ValueError('Invalid Lever site token')
    endpoint = 'https://api.lever.co/v0/postings/'+site+'?mode=json'
    jobs = request_json(endpoint)
    if not isinstance(jobs,list):
        raise ValueError('Unexpected Lever response')
    out=[]
    for j in jobs:
        text=clean(' '.join([str(j.get('text','')),str(j.get('descriptionPlain','')),str(j.get('additionalPlain',''))]))
        relevance=score(text,config)
        link=j.get('hostedUrl') or j.get('applyUrl') or ''
        if not relevance or not link.startswith('https://'):
            continue
        out.append({'identity_key':key_for('job','lever:'+site,str(j['id'])),
                    'category':'job','title':clean(j.get('text',''))[:250],
                    'company':board['company'][:160], 'country':clean(j.get('categories',{}).get('location',''))[:120],
                    'source_url':link,'source_name':'Lever','summary':text[:500],'score':relevance})
    return out


def collect_tavily(config, key):
    opts=config.get('public_web_search',{})
    if not opts.get('enabled') or not key:
        return []
    queries=opts.get('queries', [])[:min(12,max(0,int(opts.get('max_queries_per_run',4))))]
    out=[]
    for query in queries:
        response=request_json('https://api.tavily.com/search',method='POST',
                              data={'api_key':key,'query':query,'search_depth':'basic','max_results':8})
        for result in response.get('results',[]):
            link=result.get('url','')
            if not link.startswith('https://'):
                continue
            title=clean(result.get('title',''))
            body=clean(result.get('content',''))
            relevance=score(title+' '+body,config)
            if relevance == 0:
                continue
            # Public web results are research signals, NOT verified vacancies.
            out.append({'identity_key':key_for('company_signal','web',link.split('#')[0].split('?')[0].lower()),
                        'category':'company_signal','title':title[:250],
                        'company':'Research candidate','country':'', 'source_url':link,
                        'source_name':'Public web search', 'summary':body[:500], 'score':min(relevance,7)})
    return out


def save_findings(findings, supabase_url, service_key, user_id):
    if not findings:
        return 0
    if not re.fullmatch(r'[0-9a-fA-F-]{36}',user_id):
        raise ValueError('Invalid NEXORA_USER_ID')
    root=supabase_url.rstrip('/')
    if not root.startswith('https://'):
        raise ValueError('SUPABASE_URL must be HTTPS')
    # Ignore duplicates: do not reset a user's reviewed/dismissed status or alter existing records.
    endpoint=root+'/rest/v1/monitor_alerts?on_conflict=user_id,identity_key'
    auth={'apikey':service_key,'Authorization':'Bearer '+service_key,
          'Prefer':'resolution=ignore-duplicates,return=minimal'}
    count=0
    for start in range(0,len(findings),50):
        records=[{**v,'user_id':user_id} for v in findings[start:start+50]]
        request_json(endpoint,method='POST',data=records,headers=auth)
        count+=len(records)
    return count


def scan(config, fetch_greenhouse=collect_greenhouse, fetch_lever=collect_lever, fetch_web=collect_tavily):
    findings=[]
    for board in config.get('job_boards',[]):
        provider=board.get('provider','').lower()
        try:
            if provider=='greenhouse': findings+=fetch_greenhouse(board,config)
            elif provider=='lever': findings+=fetch_lever(board,config)
            else: print('Unknown provider skipped:',provider,file=sys.stderr)
        except (ValueError, KeyError, urllib.error.URLError, TimeoutError) as exc:
            print(f"Board {board.get('company','?')} failed: {exc}",file=sys.stderr)
    try:
        findings+=fetch_web(config,os.getenv('TAVILY_API_KEY',''))
    except (ValueError, urllib.error.URLError, TimeoutError) as exc:
        print(f'Public web search failed: {exc}',file=sys.stderr)
    unique={x['identity_key']:x for x in findings}
    return list(unique.values())


def main():
    config=json.loads((ROOT/'watchlist.json').read_text(encoding='utf8'))
    required=['SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY','NEXORA_USER_ID']
    missing=[name for name in required if not os.getenv(name)]
    if missing:
        raise SystemExit('Missing GitHub Actions secrets: '+', '.join(missing))
    results=scan(config)
    submitted=save_findings(results,os.environ['SUPABASE_URL'],os.environ['SUPABASE_SERVICE_ROLE_KEY'],os.environ['NEXORA_USER_ID'])
    print(f"Monitor completed at {datetime.now(timezone.utc).isoformat()}; candidates checked: {submitted}. Duplicate alerts ignored by database.")

if __name__=='__main__': main()
