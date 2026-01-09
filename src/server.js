import "dotenv/config";
import app from "./app.js";
import { closeDb, initDb } from "./config/db.js";
import { logError, logInfo } from "./utils/logger.js";

const port = Number(process.env.PORT) || 3000;
const host = "0.0.0.0";

const startServer = async () => {
  await initDb();

  const server = app.listen(port, host, () => {
    logInfo(`API listening on ${host}:${port}`);
  });

  const shutdown = async (signal) => {
    logInfo(`Received ${signal}, shutting down...`);

    server.close(async (error) => {
      if (error) {
        logError("HTTP server shutdown error:", error);
        process.exit(1);
      }

      try {
        await closeDb();
        logInfo("Database pool closed");
        process.exit(0);
      } catch (dbError) {
        logError("Database shutdown error:", dbError);
        process.exit(1);
      }
    });
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
};

startServer();
