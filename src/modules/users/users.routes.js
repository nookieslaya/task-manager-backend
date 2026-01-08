import { Router } from "express";
import { authMiddleware } from "../auth/auth.middleware.js";
import { list } from "./users.controller.js";

const router = Router();

router.get("/", authMiddleware, list);

export default router;
