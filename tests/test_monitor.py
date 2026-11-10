import importlib.util
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

SPEC=importlib.util.spec_from_file_location('monitor',Path(__file__).resolve().parents[1]/'monitor'/'monitor.py')
mon=importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(mon)
CFG={'job_keywords':['unity','xr','immersive'],'excluded_job_keywords':['sales associate'],'job_boards':[],'public_web_search':{'enabled':False}}

class MonitorTests(unittest.TestCase):
    def test_relevance(self):
        self.assertGreater(mon.score('Senior Unity XR Developer',CFG),mon.score('Unity Developer',CFG))
        self.assertEqual(mon.score('sales associate unity',CFG),0)
        self.assertEqual(mon.score('Unrelated accountant',CFG),0)
    def test_greenhouse(self):
        payload={'jobs':[{'id':123,'title':'Unity XR Developer','content':'<p>Immersive experiences</p>','absolute_url':'https://example.com/123','location':{'name':'London'}},{'id':124,'title':'Payroll assistant','content':'', 'absolute_url':'https://example.com/124'}]}
        with patch.object(mon,'request_json',return_value=payload):
            rows=mon.collect_greenhouse({'company':'Example','token':'example'},CFG)
        self.assertEqual(len(rows),1)
        self.assertEqual(rows[0]['category'],'job')
        self.assertEqual(rows[0]['country'],'London')
    def test_lever(self):
        payload=[{'id':'xyz','text':'Unity XR Engineer','descriptionPlain':'building immersive experiences','hostedUrl':'https://jobs.lever.co/sample/xyz','categories':{'location':'Remote'}}]
        with patch.object(mon,'request_json',return_value=payload):
            rows=mon.collect_lever({'company':'Example','token':'sample'},CFG)
        self.assertEqual(len(rows),1)
        self.assertEqual(rows[0]['source_name'],'Lever')
    def test_dedup_scans(self):
        same={'identity_key':'abc','category':'job','title':'Unity','company':'A','source_url':'https://example.com','source_name':'Lever','summary':'Unity','score':5,'country':''}
        config={**CFG,'job_boards':[{'provider':'lever','company':'X','token':'x'},{'provider':'lever','company':'Y','token':'y'}]}
        data=mon.scan(config,fetch_lever=lambda b,c:[same],fetch_web=lambda c,k:[])
        self.assertEqual(len(data),1)
    def test_db_conflict_ignores_status(self):
        rows=[]
        def fake_request(url,method='GET',data=None,headers=None):
            rows.extend(data)
            self.assertIn('on_conflict=user_id,identity_key',url)
            self.assertEqual(headers['Prefer'],'resolution=ignore-duplicates,return=minimal')
            self.assertNotIn('status',data[0])
            return {}
        alert={'identity_key':'abc','category':'job','title':'Unity','company':'Example','country':'','source_url':'https://example.com','source_name':'Lever','summary':'Unity','score':7}
        with patch.object(mon,'request_json',side_effect=fake_request):
            mon.save_findings([alert],'https://example.supabase.co','secret','aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee')
        self.assertEqual(len(rows),1)
    def test_bad_board_token(self):
        with self.assertRaises(ValueError):
            mon.collect_greenhouse({'token':'../danger','company':'Bad'},CFG)

if __name__=='__main__':unittest.main()
