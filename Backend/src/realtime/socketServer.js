const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const User = require("../models/user");
const { setRealtimeServer } = require("../services/realtimeService");

const parseCookies = (header = "") =>
  Object.fromEntries(
    header
      .split(";")
      .map((part) => part.trim().split("="))
      .filter(([key, value]) => key && value)
      .map(([key, value]) => [key, decodeURIComponent(value)])
  );

const createSocketServer = (httpServer) => {
  const origins = (process.env.CORS_ORIGIN ||
    "http://localhost:5173,http://127.0.0.1:5173")
    .split(",")
    .map((origin) => origin.trim());
  const io = new Server(httpServer, {
    cors: { origin: origins, credentials: true },
  });

  io.use(async (socket, next) => {
    try {
      const cookies = parseCookies(socket.handshake.headers.cookie);
      const token = cookies.jwt || socket.handshake.auth?.token;
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select("_id role");
      if (!user) return next(new Error("Authentication required"));
      socket.user = user;
      return next();
    } catch {
      return next(new Error("Invalid or expired session"));
    }
  });

  io.on("connection", (socket) => {
    socket.join(`user:${socket.user._id}`);
    socket.emit("realtime:ready", { connected: true });
  });
  setRealtimeServer(io);
  return io;
};

module.exports = createSocketServer;
