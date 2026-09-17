import { Router } from "express";
import * as accountController from "../controllers/accounts/account.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

router.use(authMiddleware);

router.post("/", accountController.createAccount);
router.get("/", accountController.getAccounts);
router.get("/:id", accountController.getAccount);
router.patch("/:id", accountController.updateAccount);
router.delete("/:id", accountController.deleteAccount);

export default router;
