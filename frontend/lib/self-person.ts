import { api } from "@/lib/api-client";
import type { ApiUser, JsonValue, Person } from "@/lib/types";

const SELF_PROPERTY = "self";

export function isSelf(properties: Record<string, JsonValue> | null | undefined): boolean {
  return properties?.[SELF_PROPERTY] === "true";
}

/** Finds the person record representing the current user, creating one if it doesn't exist yet. */
export async function ensureSelfPerson(user: ApiUser, people: Person[]): Promise<Person> {
  const existing = people.find((p) => isSelf(p.properties));
  if (existing) return existing;
  return api.people.create({
    name: user.name,
    properties: { [SELF_PROPERTY]: "true", email: user.email },
  });
}
