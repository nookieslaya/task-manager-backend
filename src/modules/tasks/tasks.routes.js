import { Router } from "express";
import { authMiddleware } from "../auth/auth.middleware.js";
import {
  create,
  list,
  updateStatus,
  updateDescription,
  addItem,
  updateItem,
  removeItem,
  addTime,
  updateTime,
  remove,
} from "./tasks.controller.js";

const router = Router();

router.post("/projects/:projectId/tasks", authMiddleware, create);
router.get("/projects/:projectId/tasks", authMiddleware, list);
router.patch("/tasks/:id/status", authMiddleware, updateStatus);
router.post("/tasks/:id/time-entries", authMiddleware, addTime);
router.patch("/tasks/time-entries/:entryId", authMiddleware, updateTime);
router.patch("/tasks/:id/description", authMiddleware, updateDescription);
router.post("/tasks/:id/items", authMiddleware, addItem);
router.patch("/tasks/items/:itemId", authMiddleware, updateItem);
router.delete("/tasks/items/:itemId", authMiddleware, removeItem);
router.delete("/tasks/:id", authMiddleware, remove);

export default router;
