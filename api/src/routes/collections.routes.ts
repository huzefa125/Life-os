import { Router } from "express";
import * as collectionController from "../controllers/collections/collection.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

router.use(authMiddleware);

router.get("/", collectionController.listCollections);
router.post("/", collectionController.createCollection);
router.get("/:id", collectionController.getCollection);
router.patch("/:id", collectionController.updateCollection);
router.delete("/:id", collectionController.deleteCollection);

router.post("/:id/fields", collectionController.addField);
router.post("/:id/fields/reorder", collectionController.reorderFields);
router.patch("/:id/fields/:fieldId", collectionController.updateField);
router.delete("/:id/fields/:fieldId", collectionController.deleteField);

router.post("/:id/views", collectionController.addView);
router.patch("/:id/views/:viewId", collectionController.updateView);
router.delete("/:id/views/:viewId", collectionController.deleteView);

// Static segments before /:recordId so they aren't parsed as record ids.
router.get("/:id/records/export.csv", collectionController.exportRecordsCsv);
router.post("/:id/records/bulk", collectionController.bulkRecords);
router.get("/:id/records", collectionController.listRecords);
router.post("/:id/records", collectionController.createRecord);
router.get("/:id/records/:recordId", collectionController.getRecord);
router.patch("/:id/records/:recordId", collectionController.updateRecord);
router.delete("/:id/records/:recordId", collectionController.deleteRecord);

export default router;
