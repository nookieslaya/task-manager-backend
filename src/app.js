import express from "express";
import cors from "cors";
import authRoutes from "./modules/auth/auth.routes.js";
import projectsRoutes from "./modules/projects/projects.routes.js";
import projectUsersRoutes from "./modules/projectUsers/projectUsers.routes.js";
import tasksRoutes from "./modules/tasks/tasks.routes.js";
import usersRoutes from "./modules/users/users.routes.js";

const app = express();

const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);

app.use(express.json());

app.use("/auth", authRoutes);
app.use("/users", usersRoutes);
app.use("/projects", projectsRoutes);
app.use("/projects", projectUsersRoutes);
app.use("/", tasksRoutes);

app.use((req, res) => {
  res.status(404).json({ error: "Not Found" });
});

app.use((error, req, res, next) => {
  const status = error.status || 500;
  const message = status === 500 ? "Internal Server Error" : error.message;

  if (status >= 500) {
    console.error("Unhandled error:", error);
  }

  res.status(status).json({ error: message });
});

export default app;
