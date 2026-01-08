import express from "express";
// import { pool } from "./config/db.js";

const app = express();

app.use(express.json());

// app.get("/db-test", async (req, res, next) => {
//   try {
//     const result = await pool.query("SELECT NOW() AS now");
//     res.json({ now: result.rows[0].now });
//   } catch (error) {
//     next(error);
//   }
// });

app.use((req, res) => {
  res.status(404).json({ error: "Not Found" });
});

app.use((error, req, res, next) => {
  console.error("Unhandled error:", error);
  res.status(500).json({ error: "Internal Server Error" });
});

export default app;
