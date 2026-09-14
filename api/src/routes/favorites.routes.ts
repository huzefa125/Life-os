import { Router } from "express";
import * as favoriteController from "../controllers/favorites/favorite.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

router.use(authMiddleware);

router.post("/", favoriteController.addFavorite);
router.delete("/:id", favoriteController.removeFavorite);
router.get("/", favoriteController.getFavorites);

export default router;
