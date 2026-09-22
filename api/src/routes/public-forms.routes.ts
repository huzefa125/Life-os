import { Router } from "express";
import * as publicFormController from "../controllers/forms/public-form.controller";
import { uploadMiddleware } from "../services/forms/storage.service";
import { sendError } from "../utils/apiResponse";

const router = Router();

// No authMiddleware anywhere in this router — respondents are never logged in.
router.get("/:formId", publicFormController.getPublicForm);
router.get("/:formId/responses/:responseId", publicFormController.getResumableResponse);
router.post("/:formId/submit", publicFormController.submitPublicForm);
router.post(
  "/:formId/upload",
  (req, res, next) => {
    uploadMiddleware(req, res, (err) => {
      if (err) return sendError(res, err instanceof Error ? err.message : "Upload failed", 400);
      next();
    });
  },
  publicFormController.uploadPublicFormFile
);

export default router;
