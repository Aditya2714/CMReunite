let io;

const setRealtimeServer = (server) => {
  io = server;
};

const emitToUser = (userId, event, payload) => {
  if (io && userId) io.to(`user:${userId}`).emit(event, payload);
};

module.exports = { emitToUser, setRealtimeServer };
