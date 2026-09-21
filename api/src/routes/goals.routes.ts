import { Router } from "express";
import * as goalController from "../controllers/goals/goal.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

router.use(authMiddleware);

router.post("/", goalController.createGoal);
router.get("/", goalController.getGoals);
router.get("/:id", goalController.getGoal);
router.patch("/:id", goalController.updateGoal);
router.delete("/:id", goalController.deleteGoal);

export default router;
