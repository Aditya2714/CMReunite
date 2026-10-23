// Local-only SMTP capture: exercises Nodemailer's real SMTP client without sending mail.
const net = require("node:net");
const startSmtpCapture = async () => {
  const messages = [];
  const controls = { failuresRemaining: 0, rejectAll: false, attempts: 0 };
  const sockets = new Set();
  const server = net.createServer((socket) => {
    sockets.add(socket);
    socket.on("close", () => sockets.delete(socket));
    socket.write("220 localhost ESMTP test\r\n");
    let buffer = "", data = false, body = [];
    socket.on("data", (chunk) => {
      buffer += chunk.toString();
      while (buffer.includes("\r\n")) {
        const index = buffer.indexOf("\r\n"), line = buffer.slice(0, index);
        buffer = buffer.slice(index + 2);
        if (data) {
          if (line === ".") {
            controls.attempts++;
            if (controls.rejectAll || controls.failuresRemaining > 0) {
              controls.failuresRemaining = Math.max(0, controls.failuresRemaining - 1);
              socket.write("451 Temporary test failure\r\n");
            } else {
              messages.push(body.join("\r\n"));
              socket.write("250 Message captured\r\n");
            }
            body = []; data = false;
          } else body.push(line.replace(/^\.\./, "."));
        } else if (/^EHLO|^HELO/i.test(line)) socket.write("250 localhost\r\n");
        else if (/^DATA/i.test(line)) { data = true; socket.write("354 Send message\r\n"); }
        else if (/^QUIT/i.test(line)) socket.end("221 Bye\r\n");
        else socket.write("250 OK\r\n");
      }
    });
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  return { messages, controls, port: server.address().port, close: async () => {
    sockets.forEach((socket) => socket.destroy());
    await new Promise((resolve) => server.close(resolve));
  } };
};
module.exports = { startSmtpCapture };
