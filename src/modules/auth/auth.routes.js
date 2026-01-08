import { Router } from "express";
import { register, login, me } from "./auth.controller.js";
import { authMiddleware } from "./auth.middleware.js";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.get("/me", authMiddleware, me);

export default router;
