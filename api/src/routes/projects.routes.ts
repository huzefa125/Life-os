import { Router } from "express";
import * as projectController from "../controllers/projects/project.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

router.use(authMiddleware);

router.post("/", projectController.createProject);
router.get("/", projectController.getProjects);
router.get("/:id", projectController.getProject);
router.patch("/:id", projectController.updateProject);
router.delete("/:id", projectController.deleteProject);

export default router;
