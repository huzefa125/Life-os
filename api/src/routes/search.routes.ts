import { Router } from "express";
import * as searchController from "../controllers/search/search.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

router.use(authMiddleware);

router.get("/", searchController.search);

export default router;
