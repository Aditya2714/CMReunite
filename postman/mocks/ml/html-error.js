const http = require("node:http");
http.createServer((req, res) => { res.writeHead(500, { "Content-Type": "text/html" }); res.end("<html>Upstream unavailable</html>"); }).listen(process.env.PORT || 4905);
