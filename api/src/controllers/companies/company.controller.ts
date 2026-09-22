import type { Request, Response } from "express";
import { sendSuccess, sendError } from "../../utils/apiResponse";
import {
  createCompanySchema,
  updateCompanySchema,
  companyIdParamSchema,
} from "../../validation/company.validation";
import * as companyService from "../../services/companies/company.service";

function formatZodError(error: { issues: { message: string }[] }) {
  return error.issues.map((issue) => issue.message).join(", ");
}

export async function createCompany(req: Request, res: Response) {
  const parsed = createCompanySchema.safeParse(req.body);
  if (!parsed.success) return sendError(res, formatZodError(parsed.error), 400);

  const company = await companyService.createCompany(req.userId as string, parsed.data);
  return sendSuccess(res, company, 201);
}

export async function getCompanies(req: Request, res: Response) {
  const companies = await companyService.getCompaniesByUser(req.userId as string);
  return sendSuccess(res, companies);
}

export async function getCompany(req: Request, res: Response) {
  const paramsParsed = companyIdParamSchema.safeParse(req.params);
  if (!paramsParsed.success) return sendError(res, formatZodError(paramsParsed.error), 400);

  const company = await companyService.getCompanyById(paramsParsed.data.id, req.userId as string);
  if (!company) return sendError(res, "Company not found", 404);
  return sendSuccess(res, company);
}

export async function updateCompany(req: Request, res: Response) {
  const paramsParsed = companyIdParamSchema.safeParse(req.params);
  if (!paramsParsed.success) return sendError(res, formatZodError(paramsParsed.error), 400);

  const bodyParsed = updateCompanySchema.safeParse(req.body);
  if (!bodyParsed.success) return sendError(res, formatZodError(bodyParsed.error), 400);

  const company = await companyService.updateCompany(paramsParsed.data.id, req.userId as string, bodyParsed.data);
  if (!company) return sendError(res, "Company not found", 404);
  return sendSuccess(res, company);
}

export async function deleteCompany(req: Request, res: Response) {
  const paramsParsed = companyIdParamSchema.safeParse(req.params);
  if (!paramsParsed.success) return sendError(res, formatZodError(paramsParsed.error), 400);

  const company = await companyService.deleteCompany(paramsParsed.data.id, req.userId as string);
  if (!company) return sendError(res, "Company not found", 404);
  return sendSuccess(res, company);
}
