import type { Request, Response } from "express";
import { sendSuccess, sendError } from "../../utils/apiResponse";
import {
  bulkRecordActionSchema,
  collectionIdParamSchema,
  createCollectionSchema,
  createFieldSchema,
  createRecordSchema,
  createViewSchema,
  fieldIdParamSchema,
  listCollectionsQuerySchema,
  listRecordsQuerySchema,
  recordIdParamSchema,
  reorderFieldsSchema,
  updateCollectionSchema,
  updateFieldSchema,
  updateRecordSchema,
  updateViewSchema,
  viewIdParamSchema,
} from "../../validation/collection.validation";
import * as collectionService from "../../services/collections/collection.service";
import * as recordService from "../../services/collections/record.service";
import type { ServiceResult } from "../../services/collections/collection.service";

function formatZodError(error: { issues: { message: string; path: PropertyKey[] }[] }) {
  return error.issues
    .map((issue) => (issue.path.length ? `${issue.path.join(".")}: ${issue.message}` : issue.message))
    .join(", ");
}

function sendResult(res: Response, result: ServiceResult<unknown>, status = 200) {
  if (!result.ok) return sendError(res, result.message, result.status);
  return sendSuccess(res, result.data, status);
}

// ---------- Collections ----------

export async function listCollections(req: Request, res: Response) {
  const parsed = listCollectionsQuerySchema.safeParse(req.query);
  if (!parsed.success) return sendError(res, formatZodError(parsed.error), 400);
  return sendSuccess(res, await collectionService.listCollections(req.userId as string, parsed.data.status));
}

export async function getCollection(req: Request, res: Response) {
  const parsed = collectionIdParamSchema.safeParse(req.params);
  if (!parsed.success) return sendError(res, formatZodError(parsed.error), 400);
  const collection = await collectionService.getCollection(req.userId as string, parsed.data.id);
  if (!collection) return sendError(res, "Collection not found", 404);
  return sendSuccess(res, collection);
}

export async function createCollection(req: Request, res: Response) {
  const parsed = createCollectionSchema.safeParse(req.body);
  if (!parsed.success) return sendError(res, formatZodError(parsed.error), 400);
  return sendResult(res, await collectionService.createCollection(req.userId as string, parsed.data), 201);
}

export async function updateCollection(req: Request, res: Response) {
  const params = collectionIdParamSchema.safeParse(req.params);
  if (!params.success) return sendError(res, formatZodError(params.error), 400);
  const body = updateCollectionSchema.safeParse(req.body);
  if (!body.success) return sendError(res, formatZodError(body.error), 400);
  return sendResult(res, await collectionService.updateCollection(req.userId as string, params.data.id, body.data));
}

export async function deleteCollection(req: Request, res: Response) {
  const parsed = collectionIdParamSchema.safeParse(req.params);
  if (!parsed.success) return sendError(res, formatZodError(parsed.error), 400);
  const trashed = await collectionService.deleteCollection(req.userId as string, parsed.data.id);
  if (!trashed) return sendError(res, "Collection not found", 404);
  return sendSuccess(res, { id: trashed.id });
}

// ---------- Fields ----------

export async function addField(req: Request, res: Response) {
  const params = collectionIdParamSchema.safeParse(req.params);
  if (!params.success) return sendError(res, formatZodError(params.error), 400);
  const body = createFieldSchema.safeParse(req.body);
  if (!body.success) return sendError(res, formatZodError(body.error), 400);
  return sendResult(res, await collectionService.addField(req.userId as string, params.data.id, body.data), 201);
}

export async function updateField(req: Request, res: Response) {
  const params = fieldIdParamSchema.safeParse(req.params);
  if (!params.success) return sendError(res, formatZodError(params.error), 400);
  const body = updateFieldSchema.safeParse(req.body);
  if (!body.success) return sendError(res, formatZodError(body.error), 400);
  return sendResult(
    res,
    await collectionService.updateField(req.userId as string, params.data.id, params.data.fieldId, body.data)
  );
}

export async function deleteField(req: Request, res: Response) {
  const params = fieldIdParamSchema.safeParse(req.params);
  if (!params.success) return sendError(res, formatZodError(params.error), 400);
  return sendResult(res, await collectionService.deleteField(req.userId as string, params.data.id, params.data.fieldId));
}

export async function reorderFields(req: Request, res: Response) {
  const params = collectionIdParamSchema.safeParse(req.params);
  if (!params.success) return sendError(res, formatZodError(params.error), 400);
  const body = reorderFieldsSchema.safeParse(req.body);
  if (!body.success) return sendError(res, formatZodError(body.error), 400);
  return sendResult(res, await collectionService.reorderFields(req.userId as string, params.data.id, body.data.fieldIds));
}

// ---------- Views ----------

export async function addView(req: Request, res: Response) {
  const params = collectionIdParamSchema.safeParse(req.params);
  if (!params.success) return sendError(res, formatZodError(params.error), 400);
  const body = createViewSchema.safeParse(req.body);
  if (!body.success) return sendError(res, formatZodError(body.error), 400);
  return sendResult(res, await collectionService.addView(req.userId as string, params.data.id, body.data), 201);
}

export async function updateView(req: Request, res: Response) {
  const params = viewIdParamSchema.safeParse(req.params);
  if (!params.success) return sendError(res, formatZodError(params.error), 400);
  const body = updateViewSchema.safeParse(req.body);
  if (!body.success) return sendError(res, formatZodError(body.error), 400);
  return sendResult(
    res,
    await collectionService.updateView(req.userId as string, params.data.id, params.data.viewId, body.data)
  );
}

export async function deleteView(req: Request, res: Response) {
  const params = viewIdParamSchema.safeParse(req.params);
  if (!params.success) return sendError(res, formatZodError(params.error), 400);
  return sendResult(res, await collectionService.deleteView(req.userId as string, params.data.id, params.data.viewId));
}

// ---------- Records ----------

export async function listRecords(req: Request, res: Response) {
  const params = collectionIdParamSchema.safeParse(req.params);
  if (!params.success) return sendError(res, formatZodError(params.error), 400);
  const query = listRecordsQuerySchema.safeParse(req.query);
  if (!query.success) return sendError(res, formatZodError(query.error), 400);
  return sendResult(res, await recordService.listRecords(req.userId as string, params.data.id, query.data));
}

export async function getRecord(req: Request, res: Response) {
  const params = recordIdParamSchema.safeParse(req.params);
  if (!params.success) return sendError(res, formatZodError(params.error), 400);
  return sendResult(res, await recordService.getRecord(req.userId as string, params.data.id, params.data.recordId));
}

export async function createRecord(req: Request, res: Response) {
  const params = collectionIdParamSchema.safeParse(req.params);
  if (!params.success) return sendError(res, formatZodError(params.error), 400);
  const body = createRecordSchema.safeParse(req.body);
  if (!body.success) return sendError(res, formatZodError(body.error), 400);
  return sendResult(res, await recordService.createRecord(req.userId as string, params.data.id, body.data.values), 201);
}

export async function updateRecord(req: Request, res: Response) {
  const params = recordIdParamSchema.safeParse(req.params);
  if (!params.success) return sendError(res, formatZodError(params.error), 400);
  const body = updateRecordSchema.safeParse(req.body);
  if (!body.success) return sendError(res, formatZodError(body.error), 400);
  return sendResult(
    res,
    await recordService.updateRecord(req.userId as string, params.data.id, params.data.recordId, body.data.values)
  );
}

export async function deleteRecord(req: Request, res: Response) {
  const params = recordIdParamSchema.safeParse(req.params);
  if (!params.success) return sendError(res, formatZodError(params.error), 400);
  return sendResult(res, await recordService.deleteRecord(req.userId as string, params.data.id, params.data.recordId));
}

export async function bulkRecords(req: Request, res: Response) {
  const params = collectionIdParamSchema.safeParse(req.params);
  if (!params.success) return sendError(res, formatZodError(params.error), 400);
  const body = bulkRecordActionSchema.safeParse(req.body);
  if (!body.success) return sendError(res, formatZodError(body.error), 400);
  return sendResult(
    res,
    await recordService.bulkRecordAction(req.userId as string, params.data.id, body.data.action, body.data.recordIds)
  );
}

export async function exportRecordsCsv(req: Request, res: Response) {
  const params = collectionIdParamSchema.safeParse(req.params);
  if (!params.success) return sendError(res, formatZodError(params.error), 400);
  const result = await recordService.exportRecordsCsv(req.userId as string, params.data.id);
  if (!result) return sendError(res, "Collection not found", 404);

  const filename = result.name.replace(/[^A-Za-z0-9_-]+/g, "-").slice(0, 60) || "collection";
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}.csv"`);
  return res.status(200).send(result.csv);
}
