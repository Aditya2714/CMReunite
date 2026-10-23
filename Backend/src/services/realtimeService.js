let io;

const setRealtimeServer = (server) => {
  io = server;
};

const emitToUser = (userId, event, payload) => {
  if (io && userId) io.to(`user:${userId}`).emit(event, payload);
};

const disconnectUser = (id) => { if (io) io.in(`user:${id}`).disconnectSockets(true); };

module.exports = { disconnectUser, emitToUser, setRealtimeServer };
