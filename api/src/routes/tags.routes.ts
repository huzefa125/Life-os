import { Router } from "express";
import * as tagController from "../controllers/tags/tag.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

router.use(authMiddleware);

router.get("/", tagController.getAllTags);
router.get("/:tag", tagController.getObjectsByTag);
router.patch("/:id", tagController.updateObjectTags);

export default router;
