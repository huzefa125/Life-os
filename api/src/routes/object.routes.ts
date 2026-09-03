import { Router } from "express";
import * as objectController from "../controllers/objects/object.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

router.use(authMiddleware);

router.get("/:id/connections", objectController.getObjectConnections);

export default router;
