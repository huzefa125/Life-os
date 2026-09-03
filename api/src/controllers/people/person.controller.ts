import type { Request, Response } from "express";
import { sendSuccess, sendError } from "../../utils/apiResponse";
import {
  createPersonSchema,
  updatePersonSchema,
  personIdParamSchema,
} from "../../validation/person.validation";
import * as personService from "../../services/people/person.service";

function formatZodError(error: { issues: { message: string }[] }) {
  return error.issues.map((issue) => issue.message).join(", ");
}

export async function createPerson(req: Request, res: Response) {
  const parsed = createPersonSchema.safeParse(req.body);
  if (!parsed.success) {
    return sendError(res, formatZodError(parsed.error), 400);
  }

  const person = await personService.createPerson(req.userId as string, parsed.data);
  return sendSuccess(res, person, 201);
}

export async function getPeople(req: Request, res: Response) {
  const people = await personService.getPeopleByUser(req.userId as string);
  return sendSuccess(res, people);
}

export async function getPerson(req: Request, res: Response) {
  const paramsParsed = personIdParamSchema.safeParse(req.params);
  if (!paramsParsed.success) {
    return sendError(res, formatZodError(paramsParsed.error), 400);
  }

  const person = await personService.getPersonById(paramsParsed.data.id, req.userId as string);
  if (!person) {
    return sendError(res, "Person not found", 404);
  }
  return sendSuccess(res, person);
}

export async function updatePerson(req: Request, res: Response) {
  const paramsParsed = personIdParamSchema.safeParse(req.params);
  if (!paramsParsed.success) {
    return sendError(res, formatZodError(paramsParsed.error), 400);
  }

  const bodyParsed = updatePersonSchema.safeParse(req.body);
  if (!bodyParsed.success) {
    return sendError(res, formatZodError(bodyParsed.error), 400);
  }

  const person = await personService.updatePerson(
    paramsParsed.data.id,
    req.userId as string,
    bodyParsed.data
  );
  if (!person) {
    return sendError(res, "Person not found", 404);
  }
  return sendSuccess(res, person);
}

export async function deletePerson(req: Request, res: Response) {
  const paramsParsed = personIdParamSchema.safeParse(req.params);
  if (!paramsParsed.success) {
    return sendError(res, formatZodError(paramsParsed.error), 400);
  }

  const person = await personService.deletePerson(paramsParsed.data.id, req.userId as string);
  if (!person) {
    return sendError(res, "Person not found", 404);
  }
  return sendSuccess(res, person);
}
