import { Router } from "express";
import * as moneyController from "../controllers/money/money.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

router.use(authMiddleware);

router.get("/summary", moneyController.getSummary);

export default router;
