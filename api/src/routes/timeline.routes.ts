import { Router } from "express";
import * as timelineController from "../controllers/timeline/timeline.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

router.use(authMiddleware);

router.get("/", timelineController.getTimeline);

export default router;
