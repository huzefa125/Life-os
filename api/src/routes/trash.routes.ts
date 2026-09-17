import { Router } from "express";
import * as trashController from "../controllers/trash/trash.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

router.use(authMiddleware);

router.get("/", trashController.getTrashObjects);
router.delete("/", trashController.emptyTrash);
router.post("/:id", trashController.moveToTrash);
router.post("/:id/restore", trashController.restoreFromTrash);
router.delete("/:id", trashController.permanentDelete);

export default router;
