require("dotenv").config();

const mongoose = require("mongoose");
const http = require("http");
const app = require("./app");
const seedAdmin = require("./src/utils/seedAdmin");
const createSocketServer = require("./src/realtime/socketServer");

const startServer = async () => {
  try {
    const connection = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`MongoDB connected: ${connection.connection.host}`);
    await seedAdmin();

    const port = Number(process.env.PORT || 4000);
    const host = process.env.HOST || "127.0.0.1";
    const httpServer = http.createServer(app);
    createSocketServer(httpServer);
    httpServer.listen(port, host, () => {
      console.log(`Server is running on http://${host}:${port}`);
    });
  } catch (error) {
    console.error("Server startup failed:", error.message);
    process.exit(1);
  }
};

startServer();
