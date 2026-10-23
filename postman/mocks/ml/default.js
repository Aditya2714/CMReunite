// Local failure-testing stand-in derived from ML-Service/app.py's response contract.
const http = require("node:http");
http.createServer((req, res) => {
  if (req.method !== "POST" || !/^\/recommend(?:\/(?:knn|combined))?$/.test(new URL(req.url, "http://localhost").pathname)) { res.writeHead(501); return res.end(); }
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ status: "success", data: { recommendations: [], mode: "network", modelVersion: "failure-test-only" } }));
}).listen(process.env.PORT || 4905);
