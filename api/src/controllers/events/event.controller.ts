import type { Request, Response } from "express";
import { sendSuccess, sendError } from "../../utils/apiResponse";
import {
  createEventSchema,
  updateEventSchema,
  eventIdParamSchema,
} from "../../validation/event.validation";
import * as eventService from "../../services/events/event.service";

function formatZodError(error: { issues: { message: string }[] }) {
  return error.issues.map((issue) => issue.message).join(", ");
}

export async function createEvent(req: Request, res: Response) {
  const parsed = createEventSchema.safeParse(req.body);
  if (!parsed.success) {
    return sendError(res, formatZodError(parsed.error), 400);
  }

  const event = await eventService.createEvent(req.userId as string, parsed.data);
  return sendSuccess(res, event, 201);
}

export async function getEvents(req: Request, res: Response) {
  const events = await eventService.getEventsByUser(req.userId as string);
  return sendSuccess(res, events);
}

export async function getEvent(req: Request, res: Response) {
  const paramsParsed = eventIdParamSchema.safeParse(req.params);
  if (!paramsParsed.success) {
    return sendError(res, formatZodError(paramsParsed.error), 400);
  }

  const event = await eventService.getEventById(paramsParsed.data.id, req.userId as string);
  if (!event) {
    return sendError(res, "Event not found", 404);
  }
  return sendSuccess(res, event);
}

export async function updateEvent(req: Request, res: Response) {
  const paramsParsed = eventIdParamSchema.safeParse(req.params);
  if (!paramsParsed.success) {
    return sendError(res, formatZodError(paramsParsed.error), 400);
  }

  const bodyParsed = updateEventSchema.safeParse(req.body);
  if (!bodyParsed.success) {
    return sendError(res, formatZodError(bodyParsed.error), 400);
  }

  const event = await eventService.updateEvent(
    paramsParsed.data.id,
    req.userId as string,
    bodyParsed.data
  );
  if (!event) {
    return sendError(res, "Event not found", 404);
  }
  return sendSuccess(res, event);
}

export async function deleteEvent(req: Request, res: Response) {
  const paramsParsed = eventIdParamSchema.safeParse(req.params);
  if (!paramsParsed.success) {
    return sendError(res, formatZodError(paramsParsed.error), 400);
  }

  const event = await eventService.deleteEvent(paramsParsed.data.id, req.userId as string);
  if (!event) {
    return sendError(res, "Event not found", 404);
  }
  return sendSuccess(res, event);
}
