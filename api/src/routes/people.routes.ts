import { Router } from "express";
import * as personController from "../controllers/people/person.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

router.use(authMiddleware);

router.post("/", personController.createPerson);
router.get("/", personController.getPeople);
router.get("/:id", personController.getPerson);
router.patch("/:id", personController.updatePerson);
router.delete("/:id", personController.deletePerson);

export default router;
