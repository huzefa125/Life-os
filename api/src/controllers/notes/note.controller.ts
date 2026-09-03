import type { Request, Response } from "express";
import { sendSuccess, sendError } from "../../utils/apiResponse";
import {
  createNoteSchema,
  updateNoteSchema,
  noteIdParamSchema,
} from "../../validation/note.validation";
import * as noteService from "../../services/notes/note.service";

function formatZodError(error: { issues: { message: string }[] }) {
  return error.issues.map((issue) => issue.message).join(", ");
}

export async function createNote(req: Request, res: Response) {
  const parsed = createNoteSchema.safeParse(req.body);
  if (!parsed.success) {
    return sendError(res, formatZodError(parsed.error), 400);
  }

  const note = await noteService.createNote(req.userId as string, parsed.data);
  return sendSuccess(res, note, 201);
}

export async function getNotes(req: Request, res: Response) {
  const notes = await noteService.getNotesByUser(req.userId as string);
  return sendSuccess(res, notes);
}

export async function getNote(req: Request, res: Response) {
  const paramsParsed = noteIdParamSchema.safeParse(req.params);
  if (!paramsParsed.success) {
    return sendError(res, formatZodError(paramsParsed.error), 400);
  }

  const note = await noteService.getNoteById(paramsParsed.data.id, req.userId as string);
  if (!note) {
    return sendError(res, "Note not found", 404);
  }
  return sendSuccess(res, note);
}

export async function updateNote(req: Request, res: Response) {
  const paramsParsed = noteIdParamSchema.safeParse(req.params);
  if (!paramsParsed.success) {
    return sendError(res, formatZodError(paramsParsed.error), 400);
  }

  const bodyParsed = updateNoteSchema.safeParse(req.body);
  if (!bodyParsed.success) {
    return sendError(res, formatZodError(bodyParsed.error), 400);
  }

  const note = await noteService.updateNote(
    paramsParsed.data.id,
    req.userId as string,
    bodyParsed.data
  );
  if (!note) {
    return sendError(res, "Note not found", 404);
  }
  return sendSuccess(res, note);
}

export async function deleteNote(req: Request, res: Response) {
  const paramsParsed = noteIdParamSchema.safeParse(req.params);
  if (!paramsParsed.success) {
    return sendError(res, formatZodError(paramsParsed.error), 400);
  }

  const note = await noteService.deleteNote(paramsParsed.data.id, req.userId as string);
  if (!note) {
    return sendError(res, "Note not found", 404);
  }
  return sendSuccess(res, note);
}
