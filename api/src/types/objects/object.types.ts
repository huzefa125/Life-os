import type { Prisma } from "../../generated/prisma/client";

export interface CreateObjectInput {
  userId: string;
  type: string;
  title: string;
  properties?: Prisma.InputJsonValue;
}

export interface UpdateObjectInput {
  type?: string;
  title?: string;
  properties?: Prisma.InputJsonValue;
}

export interface ObjectResponse {
  id: string;
  userId: string;
  type: string;
  title: string;
  properties: Prisma.JsonValue;
  createdAt: Date;
  updatedAt: Date;
}
