#!/usr/bin/env python3
"""Scan exported images without giving scanners Docker daemon access."""
import argparse, json, subprocess, tempfile
from pathlib import Path
parser=argparse.ArgumentParser();parser.add_argument('--output',required=True);parser.add_argument('--include-infrastructure',action='store_true');args=parser.parse_args();output=Path(args.output).resolve();output.mkdir(parents=True,exist_ok=True)
images={'backend':'cmrunite-backend:local','frontend':'cmrunite-frontend:local','ml':'cmrunite-ml:local','monitor':'cmrunite-monitor:local'}
if args.include_infrastructure:images.update({'edge':'cmrunite-edge:local','database':'cmrunite-mongodb:local','mongo-tools':'cmrunite-mongo-tools:local','backup-tool':'cmrunite-backup:local','file-tool':'alpine:3'})
failed=False
for name,image in images.items():
 with tempfile.TemporaryDirectory(prefix='cmrunite-scan-') as directory:
  archive=Path(directory)/'image.tar';subprocess.run(['docker','save','-o',str(archive),image],check=True)
  result=subprocess.run(['docker','run','--rm','-v',f'{archive}:/scan/image.tar:ro','-v','cmrunite-prep-trivy-cache:/root/.cache','aquasec/trivy:0.76.0','image','--input','/scan/image.tar','--scanners','vuln','--severity','HIGH,CRITICAL','--format','json'],capture_output=True,text=True)
  if result.returncode:raise SystemExit('Image scan failed; no scan success may be claimed')
  (output/(name+'-image-audit.json')).write_text(result.stdout);data=json.loads(result.stdout);count=sum(len(item.get('Vulnerabilities') or []) for item in data.get('Results',[]));failed|=bool(count);print(name,count,'high/critical findings',flush=True)
raise SystemExit(1 if failed else 0)
