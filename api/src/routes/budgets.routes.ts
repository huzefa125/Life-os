import { Router } from "express";
import * as budgetController from "../controllers/budgets/budget.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

router.use(authMiddleware);

router.post("/", budgetController.createBudget);
router.get("/", budgetController.getBudgets);
router.get("/:id", budgetController.getBudget);
router.patch("/:id", budgetController.updateBudget);
router.delete("/:id", budgetController.deleteBudget);

export default router;
