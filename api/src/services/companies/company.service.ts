import { prisma } from "../../db";
import type { CreateCompanyBody, UpdateCompanyBody } from "../../validation/company.validation";
import { logActivity } from "../activity/activity.service";

export const COMPANY_TYPE = "company";

export async function createCompany(userId: string, input: CreateCompanyBody) {
  const company = await prisma.object.create({
    data: {
      userId,
      type: COMPANY_TYPE,
      title: input.name,
      status: "active",
      properties: input.properties ?? {},
    },
  });

  await logActivity(userId, company.id, "created", { title: company.title });
  return company;
}

export async function getCompaniesByUser(userId: string) {
  return prisma.object.findMany({
    where: { userId, type: COMPANY_TYPE, status: "active" },
    orderBy: { createdAt: "desc" },
  });
}

export async function getCompanyById(id: string, userId: string) {
  return prisma.object.findFirst({
    where: { id, userId, type: COMPANY_TYPE },
  });
}

export async function updateCompany(id: string, userId: string, input: UpdateCompanyBody) {
  const existing = await prisma.object.findFirst({
    where: { id, userId, type: COMPANY_TYPE },
  });
  if (!existing) return null;

  const updated = await prisma.object.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { title: input.name } : {}),
      ...(input.properties !== undefined ? { properties: input.properties } : {}),
    },
  });

  await logActivity(userId, id, "updated");
  return updated;
}

export async function deleteCompany(id: string, userId: string) {
  const existing = await prisma.object.findFirst({
    where: { id, userId, type: COMPANY_TYPE },
  });
  if (!existing) return null;

  const trashed = await prisma.object.update({
    where: { id },
    data: { status: "trash", deletedAt: new Date() },
  });

  await logActivity(userId, id, "trashed");
  return trashed;
}
