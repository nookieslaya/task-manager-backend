import { Router } from "express";
import { authMiddleware } from "../auth/auth.middleware.js";
import { assignUser, removeUser, listUsers } from "./projectUsers.controller.js";

const router = Router();

router.post("/:id/users", authMiddleware, assignUser);
router.get("/:id/users", authMiddleware, listUsers);
router.delete("/:id/users/:userId", authMiddleware, removeUser);

export default router;
