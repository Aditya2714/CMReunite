#!/usr/bin/env python3
"""Disposable HTTPS/auth/storage/backup rehearsal. No production credentials."""
import argparse, json, os, shutil, ssl, subprocess, tempfile, time, urllib.request
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def main():
 parser=argparse.ArgumentParser();parser.add_argument('--skip-build',action='store_true');args=parser.parse_args()
 directory=Path(tempfile.mkdtemp(prefix='cmrunite-production-qa-'));source=directory/'source';target=directory/'restore';project='cmrunite-production-test';restore_project='cmrunite-restore-test'
 def command(argv,allowed=False):
  r=subprocess.run(argv,cwd=ROOT,capture_output=True,text=True)
  if r.returncode and not allowed:raise AssertionError(f'Command failed: {argv[0:3]} (exit {r.returncode}); '+r.stderr[-600:])
  return r
 def deploy(action,where=source,name=project,extra=[]):return command(['python3','scripts/deploy.py',action,'--env-file',str(where/'runtime.private.env'),'--project',name,'--local-qa']+extra)
 def compose(arguments,where=source,name=project,allowed=False):return command(['docker','compose','--env-file',str(where/'runtime.private.env'),'-p',name,'-f','docker-compose.production.yml','-f','deploy/compose.local-https.yml']+arguments,allowed)
 def helper(name,arguments=[],where=source,project_name=project):
  return compose(['run','--rm','--no-deps','-T','-e','QA_CONTAINER_FIXTURES=true','-v',str(ROOT/'Backend/tests/helpers')+':/app/tests/helpers:ro','backend','node','-r','./src/config/bootstrap','tests/helpers/'+name]+arguments,where,project_name).stdout
 try:
  command(['python3','scripts/deploy.py','init','--directory',str(source),'--local-qa']);deploy('config')
  if not args.skip_build:deploy('build')
  deploy('up');helper('seedContainerQA.js')
  for service in ['backend','ml-service','frontend','monitor']:
   assert compose(['exec','-T',service,'id','-u']).stdout.strip()!='0',service
  compose(['exec','-T','frontend','nginx','-t'])
  compose(['cp','fixtures','ml-service:/fixtures'])
  compose(['exec','-T','ml-service','python','-m','unittest','discover','-s','tests','-v'])
  print('Python 3.13 runtime tests: PASS',flush=True)
  # Validate the certificate using the isolated CA, without installing trust on the user's computer.
  compose(['cp','edge:/data/caddy/pki/authorities/local/root.crt',str(directory/'root.crt')]);context=ssl.create_default_context(cafile=str(directory/'root.crt'))
  for attempt in range(30):
   try:
    with urllib.request.urlopen('https://localhost:18443/health',context=context,timeout=5) as response:assert json.load(response)['database']=='connected'
    break
   except Exception:
    if attempt==29:raise
    time.sleep(1)
  print('TLS certificate, private network and non-root services: PASS',flush=True)
  # Authentication is required; the recommender cannot write.
  helper('mongoAuthQAProbe.js')
  compose(['exec','-T','ml-service','python','-c',"from app import db; from pymongo.errors import OperationFailure\ntry:\n db.qa_forbidden.insert_one({'test':True}); raise AssertionError('ML could write')\nexcept OperationFailure as error:\n assert error.code==13"])
  print('MongoDB authentication and read-only recommender: PASS',flush=True)
  env=os.environ.copy();env['PATH']='/opt/homebrew/opt/node@24/bin:'+env['PATH']
  result=subprocess.run(['npx','playwright','test','--config','playwright.production.config.js'],cwd=ROOT/'Frontend',env=env)
  assert result.returncode==0
  # ML failure must degrade recommendations without stopping the API.
  compose(['stop','ml-service'])
  with urllib.request.urlopen('https://localhost:18443/health/ready',context=context) as response:assert response.status==200
  with urllib.request.urlopen('https://localhost:18443/health',context=context) as response:assert json.load(response)['mlService']=='unavailable'
  compose(['start','ml-service']);print('ML outage leaves core API ready: PASS',flush=True)
  guarded=command(['python3','scripts/deploy.py','backup','--env-file',str(source/'runtime.private.env'),'--project',project,'--local-qa'],allowed=True);assert guarded.returncode!=0
  helper('productionStateQA.js',['--write-upload'])
  compose(['stop','backend']);assert 'shutdown.complete' in compose(['logs','backend']).stdout
  helper('containerIndexQAProbe.js')
  before=json.loads(helper('productionStateQA.js').strip().splitlines()[-1])
  deploy('init-backup');deploy('backup');deploy('verify-backup');deploy('prune-backups')
  print('Graceful shutdown, old-index migration and encrypted backup: PASS',flush=True)
  command(['python3','scripts/deploy.py','init','--directory',str(target),'--local-qa'])
  f=target/'runtime.private.env';s=f.read_text();s='\n'.join('BACKUP_REPOSITORY='+str(source/'encrypted-backups') if line.startswith('BACKUP_REPOSITORY=') else line for line in s.splitlines())+'\n';f.write_text(s)
  key=target/'secrets/backup_password';key.chmod(0o600);shutil.copyfile(source/'secrets/backup_password',key);key.chmod(0o444)
  # Start only an empty database: no second public listener and no overlapping application containers.
  # Separate network ranges avoid overlap with the still-present source project's networks.
  f.write_text(f.read_text()+'EDGE_SUBNET=172.29.10.0/24\nAPP_SUBNET=172.29.20.0/24\nDATA_SUBNET=172.29.30.0/24\n')
  compose(['up','-d','--wait','mongodb'],target,restore_project)
  deploy('restore',target,restore_project,['--confirm-restore',restore_project])
  after=json.loads(helper('productionStateQA.js',where=target,project_name=restore_project).strip().splitlines()[-1]);assert before==after,(before,after)
  refused=command(['python3','scripts/deploy.py','restore','--env-file',str(target/'runtime.private.env'),'--project',restore_project,'--local-qa','--confirm-restore',restore_project],allowed=True);assert refused.returncode!=0
  print('All restored collection hashes, notification history and upload bytes match; non-empty restore refused: PASS',flush=True)
 finally:
  for where,name in [(source,project),(target,restore_project)]:
   if (where/'runtime.private.env').exists():compose(['down','-v'],where,name,allowed=True)
  shutil.rmtree(directory)
if __name__=='__main__':main()
