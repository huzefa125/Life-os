import { Router } from "express";
import * as pageController from "../controllers/pages/page.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

router.use(authMiddleware);

router.post("/", pageController.createPage);
router.get("/", pageController.getPages);
router.get("/:id", pageController.getPage);
router.patch("/:id", pageController.updatePage);
router.delete("/:id", pageController.deletePage);

export default router;
