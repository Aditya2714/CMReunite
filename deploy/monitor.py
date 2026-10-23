"""Private monitor. Logs alerts; optional operator-configured HTTPS webhook."""
import json, os, shutil, time, urllib.request
from pathlib import Path

def inspect(health, metrics, backup_age, free_fraction):
    issues=[]
    if health.get("database") != "connected": issues.append("database_unavailable")
    if health.get("mlService") != "connected": issues.append("ml_unavailable")
    if metrics.get("requests",0)>=20 and metrics.get("errors",0)/metrics["requests"]>.01: issues.append("elevated_http_errors")
    if metrics.get("p95Ms",0)>3000: issues.append("high_latency")
    if metrics.get("notificationFailures",0): issues.append("notification_delivery_failures")
    if metrics.get("mlFailures",0): issues.append("ml_request_failures")
    if backup_age>26*3600: issues.append("backup_overdue")
    if free_fraction<.15: issues.append("disk_space_low")
    return issues

def request(path):
    headers={"Authorization":"Bearer "+Path("/run/secrets/monitor_token").read_text().strip()}
    with urllib.request.urlopen(urllib.request.Request("http://backend:4000"+path,headers=headers),timeout=10) as response:return json.load(response)

def main():
    state_path=Path('/state/monitor.json');state={}
    try:state=json.loads(state_path.read_text())
    except (OSError, ValueError):pass
    previous=set(state.get('active',[]));streak=state.get('streak',{})
    while True:
        try:health=request('/health');metrics=request('/internal/status')
        except Exception:health={};metrics={}
        try:
            from datetime import datetime, timezone
            backup=json.loads(Path('/backup-status/status.json').read_text());age=(datetime.now(timezone.utc)-datetime.fromisoformat(backup['verifiedAt'])).total_seconds()
        except (OSError,ValueError,KeyError):age=float('inf')
        disk=shutil.disk_usage('/backups');issues=set(inspect(health,metrics,age,disk.free/disk.total))
        streak={name:streak.get(name,0)+1 for name in issues};active={name for name,count in streak.items() if count>=3}
        if active!=previous:
            payload={'event':'monitor.alert' if active else 'monitor.recovered','issues':sorted(active)}
            print(json.dumps(payload),flush=True)
            hook=os.getenv('ALERT_WEBHOOK_URL','')
            if hook:
                try:
                    if not hook.startswith('https://') and os.getenv('LOCAL_PRODUCTION_QA')!='true':raise ValueError('HTTPS required')
                    data=json.dumps({'text':'CMRunite: '+json.dumps(payload)}).encode()
                    with urllib.request.urlopen(urllib.request.Request(hook,data=data,headers={'Content-Type':'application/json'}),timeout=10):pass
                except Exception:print(json.dumps({'event':'monitor.alert_delivery_failed'}),flush=True)
        previous=active;state_path.write_text(json.dumps({'active':sorted(active),'streak':streak}));time.sleep(60)
if __name__=='__main__':main()
