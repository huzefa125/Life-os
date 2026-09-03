import { Router } from "express";
import * as taskController from "../controllers/tasks/task.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

router.use(authMiddleware);

router.post("/", taskController.createTask);
router.get("/", taskController.getTasks);
router.get("/:id", taskController.getTask);
router.patch("/:id", taskController.updateTask);
router.delete("/:id", taskController.deleteTask);

export default router;
