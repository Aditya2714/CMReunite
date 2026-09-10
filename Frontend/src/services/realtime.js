import { io } from "socket.io-client";

let socket;

export const getRealtimeSocket = () => {
  if (!socket) {
    socket = io(import.meta.env.VITE_SOCKET_URL || window.location.origin, {
      autoConnect: false,
      withCredentials: true,
      transports: ["websocket", "polling"],
    });
  }
  return socket;
};

export const connectRealtime = () => {
  const connection = getRealtimeSocket();
  if (!connection.connected) connection.connect();
  return connection;
};

export const disconnectRealtime = () => {
  if (socket) socket.disconnect();
};
