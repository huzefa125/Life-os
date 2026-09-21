import { Router } from "express";
import * as recurringController from "../controllers/recurring/recurring.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

router.use(authMiddleware);

router.post("/", recurringController.createRecurring);
router.get("/", recurringController.getRecurring);
router.get("/:id", recurringController.getRecurringOne);
router.patch("/:id", recurringController.updateRecurring);
router.delete("/:id", recurringController.deleteRecurring);

export default router;
