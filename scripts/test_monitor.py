import importlib.util, unittest
from pathlib import Path
spec=importlib.util.spec_from_file_location("monitor",Path(__file__).resolve().parents[1]/"deploy/monitor.py");monitor=importlib.util.module_from_spec(spec);spec.loader.exec_module(monitor)
class MonitorTests(unittest.TestCase):
 def test_healthy(self):self.assertEqual(monitor.inspect({'database':'connected','mlService':'connected'},{},100,.5),[])
 def test_alert_conditions(self):self.assertEqual(set(monitor.inspect({}, {'requests':100,'errors':2,'p95Ms':4000,'notificationFailures':1,'mlFailures':1},27*3600,.1)),{'database_unavailable','ml_unavailable','elevated_http_errors','high_latency','notification_delivery_failures','ml_request_failures','backup_overdue','disk_space_low'})
if __name__=='__main__':unittest.main()
