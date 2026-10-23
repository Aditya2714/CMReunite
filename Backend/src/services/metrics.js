const requests = [], failures = [];
const recent = (items) => { const cutoff = Date.now() - 300000; while (items.length && items[0].at < cutoff) items.shift(); };
const recordRequest = (status, duration) => { requests.push({ at: Date.now(), status, duration }); if (requests.length > 10000) requests.shift(); };
const recordFailure = (operation) => { failures.push({ at: Date.now(), operation }); if (failures.length > 10000) failures.shift(); };
const snapshot = () => {
  recent(requests); recent(failures); const times = requests.map(item => item.duration).sort((a,b) => a-b);
  return { windowSeconds: 300, requests: requests.length, errors: requests.filter(item => item.status >= 500).length,
    p95Ms: times.length ? times[Math.ceil(times.length * .95)-1] : 0,
    notificationFailures: failures.filter(item => /notification|email/.test(item.operation)).length,
    mlFailures: failures.filter(item => /upstream/.test(item.operation)).length };
};
module.exports = { recordRequest, recordFailure, snapshot };
