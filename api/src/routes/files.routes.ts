import { Router } from "express";
import * as fileController from "../controllers/files/file.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

router.use(authMiddleware);

router.post("/", fileController.createFile);
router.get("/", fileController.getFiles);
router.get("/:id", fileController.getFile);
router.delete("/:id", fileController.deleteFile);

export default router;
