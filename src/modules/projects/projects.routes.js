import { Router } from "express";
import { authMiddleware } from "../auth/auth.middleware.js";
import { create, list, getById, remove } from "./projects.controller.js";

const router = Router();

router.post("/", authMiddleware, create);
router.get("/", authMiddleware, list);
router.get("/:id", authMiddleware, getById);
router.delete("/:id", authMiddleware, remove);

export default router;
