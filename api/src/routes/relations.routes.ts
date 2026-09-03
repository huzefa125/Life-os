import { Router } from "express";
import * as relationController from "../controllers/relations/relation.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

router.use(authMiddleware);

router.post("/", relationController.createRelation);
router.get("/object/:objectId", relationController.getRelationsForObject);
router.delete("/:id", relationController.deleteRelation);

export default router;
