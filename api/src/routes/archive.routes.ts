import { Router } from "express";
import * as archiveController from "../controllers/archive/archive.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

router.use(authMiddleware);

router.get("/", archiveController.getArchivedObjects);
router.post("/:id", archiveController.archiveObject);
router.post("/:id/restore", archiveController.unarchiveObject);

export default router;
