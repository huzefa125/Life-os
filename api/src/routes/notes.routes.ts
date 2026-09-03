import { Router } from "express";
import * as noteController from "../controllers/notes/note.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

router.use(authMiddleware);

router.post("/", noteController.createNote);
router.get("/", noteController.getNotes);
router.get("/:id", noteController.getNote);
router.patch("/:id", noteController.updateNote);
router.delete("/:id", noteController.deleteNote);

export default router;
