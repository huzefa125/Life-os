import { Router } from "express";
import * as formController from "../controllers/forms/form.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

router.use(authMiddleware);

router.post("/", formController.createForm);
router.get("/", formController.getForms);
router.get("/:id", formController.getForm);
router.patch("/:id", formController.updateForm);
router.delete("/:id", formController.deleteForm);

router.post("/:id/publish", formController.publishForm);
router.post("/:id/unpublish", formController.unpublishForm);

router.get("/:id/responses/export.csv", formController.exportResponsesCsv);
router.get("/:id/responses/:responseId", formController.getResponse);
router.delete("/:id/responses/:responseId", formController.deleteResponse);
router.get("/:id/responses", formController.getResponses);

export default router;
