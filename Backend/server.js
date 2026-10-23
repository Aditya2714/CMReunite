require("dotenv").config();

const mongoose = require("mongoose");
const http = require("http");
const app = require("./app");
const seedAdmin = require("./src/utils/seedAdmin");
const createSocketServer = require("./src/realtime/socketServer");
const { startPlacementNotificationWorker } = require("./src/services/placementNotificationService");

const startServer = async () => {
  try {
    const connection = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`MongoDB connected: ${connection.connection.host}`);
    await require("./src/services/notificationIndexes").ensureNotificationIndexes();
    await seedAdmin();
    await require("./src/models/user").init();
    await require("./src/models/departmentModel").init();
    if (process.env.NODE_ENV !== "production") await require("./src/services/migrateCommunityPosts").migrateCommunityPosts();
    startPlacementNotificationWorker();

    const port = Number(process.env.PORT || 4000);
    const host = process.env.HOST || "127.0.0.1";
    const httpServer = http.createServer(app);
    const io = createSocketServer(httpServer);
    const shutdown = require("./src/services/shutdown")({ server: httpServer, io, mongoose,
      placement: require("./src/services/placementNotificationService"), queue: require("./src/services/jobQueue") });
    process.once("SIGTERM", shutdown); process.once("SIGINT", shutdown);
    httpServer.listen(port, host, () => {
      console.log(`Server is running on http://${host}:${port}`);
    });
  } catch (error) {
    require("./src/utils/operationalLog").failure("startup.failed", error);
    console.error(error.message?.startsWith("Notification index migration required") ? error.message : "Server startup failed; verify database access and deployment configuration.");
    process.exit(1);
  }
};

startServer();
