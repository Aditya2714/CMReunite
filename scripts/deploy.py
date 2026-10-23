#!/usr/bin/env python3
"""Explicit local/operator tooling; no implicit migrations or cloud operations."""
import argparse, datetime, json, os, re, secrets, subprocess, sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]

def initialize(args):
    directory = Path(args.directory).resolve()
    if directory == ROOT or ROOT in directory.parents: raise SystemExit('Private deployment configuration must be outside the source repository')
    if directory.exists(): raise SystemExit('Refusing to overwrite an existing deployment directory')
    if not args.local_qa and (not args.domain or not re.fullmatch(r'[A-Za-z0-9.-]+', args.domain) or '.' not in args.domain):
        raise SystemExit('Provide the real domain (no scheme/path), or explicitly choose --local-qa')
    directory.mkdir(parents=True, mode=0o700)
    vault = directory/'secrets'; vault.mkdir(mode=0o700)
    values = {key: secrets.token_hex(32) for key in ['mongo_root_password','mongo_app_password','mongo_ml_password','jwt_secret','csrf_secret','backup_password','monitor_token']}
    values.update(app_uri=f"mongodb://cm_app:{values['mongo_app_password']}@mongodb:27017/alumniDB", ml_uri=f"mongodb://cm_ml:{values['mongo_ml_password']}@mongodb:27017/alumniDB", smtp_password='')
    values['mongo_backup_config'] = json.dumps({'uri': f"mongodb://cm_root:{values['mongo_root_password']}@mongodb:27017/alumniDB?authSource=admin"})
    for name, value in values.items():
        f=vault/name; f.write_text(value+'\n'); f.chmod(0o444) # secret mounts must be readable by non-root containers; parent is 0700
    repository=Path(args.repository).resolve() if args.repository else directory/'encrypted-backups'
    repository.mkdir(parents=True, exist_ok=True, mode=0o700)
    domain='localhost' if args.local_qa else args.domain
    origin='https://localhost:18443' if args.local_qa else f'https://{domain}'
    state=directory/'state';state.mkdir(mode=0o755)
    text=f'PUBLIC_HOST={domain}\nPUBLIC_ORIGIN={origin}\nSECRETS_DIR={vault}\nBACKUP_REPOSITORY={repository}\nLOCAL_PRODUCTION_QA={str(args.local_qa).lower()}\nAPP_VERSION=local-preparation\nDEPLOY_STATE_DIR={state}\n'
    env=directory/'runtime.private.env';env.write_text(text);env.chmod(0o600)
    print(f'Private configuration created at {env}. No services started. Store the backup key separately and configure off-host backups before launch.')

def main():
    parser=argparse.ArgumentParser(description=__doc__);sub=parser.add_subparsers(dest='command',required=True)
    init=sub.add_parser('init');init.add_argument('--directory',required=True);init.add_argument('--domain');init.add_argument('--repository');init.add_argument('--local-qa',action='store_true')
    for name in ['config','build','up','down','status','backup','verify-backup','restore','prune-backups','init-backup','scheduled-backup']:
        command=sub.add_parser(name);command.add_argument('--env-file',required=True);command.add_argument('--project',required=True);command.add_argument('--local-qa',action='store_true');command.add_argument('--cloudflare-tunnel',action='store_true')
        if name=='restore': command.add_argument('--confirm-restore',required=True);command.add_argument('--snapshot',default='latest')
    args=parser.parse_args()
    if args.command=='init':return initialize(args)
    if not re.fullmatch(r'cmrunite-[a-z0-9-]+',args.project):raise SystemExit('Use an explicit cmrunite- prefixed project name')
    envfile=Path(args.env_file).resolve()
    base=['docker','compose','--env-file',str(envfile),'-p',args.project,'-f',str(ROOT/'docker-compose.production.yml')]
    if args.local_qa and args.cloudflare_tunnel:raise SystemExit('Choose either --local-qa or --cloudflare-tunnel')
    if args.local_qa:base+=['-f',str(ROOT/'deploy/compose.local-https.yml')]
    if args.cloudflare_tunnel:base+=['-f',str(ROOT/'deploy/compose.cloudflare-tunnel.yml')]
    def run(arguments,capture=False):
        result=subprocess.run(base+arguments,cwd=ROOT,capture_output=True,text=True)
        if result.returncode:
            detail=''
            if 'mongo-check' in arguments:
                message=(result.stdout+'\n'+result.stderr).strip().splitlines()
                if message:detail=': '+message[-1][:300]
            raise RuntimeError(f'Operation failed ({result.returncode}){detail}; credentials are never echoed by this tool')
        if not capture: print(result.stdout.strip() or 'Compose operation completed: '+arguments[0])
        return result.stdout
    def tool(service,command,capture=False):
        try:return run(['run','--rm','--no-deps','-T',service]+command,capture)
        except RuntimeError as error:raise RuntimeError(f'{service} tool failed: {error}') from error
    def paused():
        if 'backend' in run(['ps','--status','running','--services'],True).splitlines():raise RuntimeError('Pause writes and stop backend/workers before backup or restore')
    if args.command in ['config','build','up','down','status']:
        command={'config':['config','--quiet'],'build':['build'],'up':['up','-d'],'down':['down'],'status':['ps']}[args.command];run(command);return
    if args.command=='scheduled-backup':
        was_running = 'backend' in run(['ps','--status','running','--services'],True).splitlines()
        if was_running:run(['stop','backend'],True)
        try:
            for action in ['backup','verify-backup','prune-backups']:
                argv=[sys.executable,str(ROOT/'scripts/deploy.py'),action,'--env-file',str(envfile),'--project',args.project]
                if args.local_qa:argv+=['--local-qa']
                if args.cloudflare_tunnel:argv+=['--cloudflare-tunnel']
                subprocess.run(argv,check=True)
        finally:
            if was_running:run(['start','backend'],True)
        return
    if args.command=='init-backup':tool('backup',['init']);return
    if args.command=='verify-backup':
        tool('backup',['check','--read-data'])
        status_file=envfile.parent/'state'/'status.json'
        if status_file.exists():
            status=json.loads(status_file.read_text());status['verifiedAt']=datetime.datetime.now(datetime.timezone.utc).isoformat();status_file.write_text(json.dumps(status))
        return
    if args.command=='prune-backups':tool('backup',['forget','--keep-within','30d','--prune']);return
    if args.command=='backup':
        paused()
        # Initialize only an absent repository; do not disguise an unreadable/corrupt repository as a new one.
        tool('file-tools',['sh','-c','test ! -e /snapshot/database.archive.gz || rm /snapshot/database.archive.gz'],True)
        tool('mongo-tools',['mongodump','--config=/run/secrets/mongo_backup_config','--archive=/snapshot/database.archive.gz','--gzip'],True)
        raw=tool('backup',['backup','--json','/snapshot/database.archive.gz','/snapshot/uploads'],True)
        summary=[json.loads(line) for line in raw.splitlines() if line.startswith('{') and json.loads(line).get('message_type')=='summary'][-1]
        tool('file-tools',['rm','-f','/snapshot/database.archive.gz'],True)
        status={'completedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'snapshotId':summary['snapshot_id']}
        (envfile.parent/'state'/'status.json').write_text(json.dumps(status));print(json.dumps(status));return
    if args.command=='restore':
        if args.confirm_restore!=args.project:raise RuntimeError('Restore confirmation must exactly match target project')
        if not re.fullmatch(r'latest|[a-f0-9]{8,64}',args.snapshot):raise RuntimeError('Invalid snapshot identifier')
        paused();tool('mongo-check',['node','/app/scripts/mongo-empty-node.js'],True)
        tool('file-tools',['sh','-c','test -z "$(find /uploads -type f -print -quit)"'],True)
        tool('backup',['restore',args.snapshot,'--target','/snapshot/restore'],True)
        tool('mongo-tools',['mongorestore','--config=/run/secrets/mongo_backup_config','--archive=/snapshot/restore/snapshot/database.archive.gz','--gzip'],True)
        tool('file-tools',['sh','-c','cp -a /snapshot/restore/snapshot/uploads/. /uploads/ && chown -R 1000:1000 /uploads && rm -rf /snapshot/restore'],True)
        print('Restored into the empty target. Verify data and uploads before starting compatible code.')

if __name__=='__main__':
    try:main()
    except (RuntimeError, OSError, ValueError) as error:print(str(error),file=sys.stderr);sys.exit(1)
