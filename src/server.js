import "dotenv/config";
import app from "./app.js";
import { initDb } from "./config/db.js";

const port = Number(process.env.PORT) || 3000;

const startServer = async () => {
  await initDb();

  app.listen(port, () => {
    console.log(`API listening on port ${port}`);
  });
};

startServer();
