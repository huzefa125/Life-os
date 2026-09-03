import type { Prisma } from "../../generated/prisma/client";

export interface ObjectResponse {
  id: string;
  userId: string;
  type: string;
  title: string;
  properties: Prisma.JsonValue;
  createdAt: Date;
  updatedAt: Date;
}
