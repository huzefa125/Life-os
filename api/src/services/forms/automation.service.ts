import type { FormAutomation, FormFieldMapping } from "../../validation/form.validation";
import { evaluateCondition } from "./condition.util";
import * as personService from "../people/person.service";
import * as projectService from "../projects/project.service";
import * as taskService from "../tasks/task.service";
import * as transactionService from "../transactions/transaction.service";
import * as relationService from "../relations/relation.service";

export interface CreatedObjectRecord {
  actionId: string;
  actionType: FormAutomation["type"];
  objectId: string;
  objectType: string;
  objectTitle: string;
}

function resolveMapping(
  mapping: FormFieldMapping,
  answers: Record<string, unknown>,
  createdObjectIds: Map<string, string>
): unknown {
  if (mapping.source === "field") return answers[mapping.fieldId];
  if (mapping.source === "static") return mapping.value;
  return createdObjectIds.get(mapping.actionId);
}

function resolveTitle(mapping: FormFieldMapping, answers: Record<string, unknown>, createdObjectIds: Map<string, string>): string {
  const value = resolveMapping(mapping, answers, createdObjectIds);
  return value === undefined || value === null ? "" : String(value);
}

function resolveProperties(
  propertyMappings: Record<string, FormFieldMapping>,
  answers: Record<string, unknown>,
  createdObjectIds: Map<string, string>
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, mapping] of Object.entries(propertyMappings)) {
    const value = resolveMapping(mapping, answers, createdObjectIds);
    if (value !== undefined && value !== "") result[key] = value;
  }
  return result;
}

function resolveActionRef(ref: string, currentActionId: string, createdObjectIds: Map<string, string>): string | undefined {
  const actionId = ref === "self" ? currentActionId : ref;
  return createdObjectIds.get(actionId);
}

/**
 * Runs a form's automations in order against one submission's answers.
 * Reuses each domain's existing "trusted caller" create function directly
 * (personService.createPerson, projectService.createProject, taskService.createTask,
 * transactionService.createTransactionRecord) rather than re-implementing object
 * creation — none of these needed a refactor, they already accept typed input
 * with no request parsing inside them.
 *
 * A bad mapping (e.g. an automation references an Account that no longer
 * exists) skips that one action rather than failing the whole submission —
 * matches the app's existing "relation failure is non-fatal" convention.
 */
export async function runAutomations(
  userId: string,
  responseId: string,
  automations: FormAutomation[],
  answers: Record<string, unknown>
): Promise<CreatedObjectRecord[]> {
  const createdObjectIds = new Map<string, string>();
  const created: CreatedObjectRecord[] = [];

  for (const action of automations) {
    if (!evaluateCondition(action.condition, answers)) continue;

    const title = resolveTitle(action.titleMapping, answers, createdObjectIds);
    const properties = resolveProperties(action.propertyMappings, answers, createdObjectIds);

    let objectId: string | null = null;
    let objectTitle = title;

    try {
      if (action.type === "create_person") {
        const person = await personService.createPerson(userId, {
          name: title,
          properties: properties as Parameters<typeof personService.createPerson>[1]["properties"],
        });
        objectId = person.id;
        objectTitle = person.title;
      } else if (action.type === "create_project") {
        const project = await projectService.createProject(userId, { title, properties });
        objectId = project.id;
        objectTitle = project.title;
      } else if (action.type === "create_task") {
        const task = await taskService.createTask(userId, { title, properties });
        objectId = task.id;
        objectTitle = task.title;
      } else if (action.type === "create_transaction") {
        const amount = Number(properties.amount);
        const accountId = typeof properties.accountId === "string" ? properties.accountId : undefined;
        const date = typeof properties.date === "string" ? properties.date : undefined;
        const transactionType =
          properties.transactionType === "income" || properties.transactionType === "transfer"
            ? properties.transactionType
            : "expense";

        if (!accountId || !date || !Number.isFinite(amount) || amount <= 0) {
          console.error(`Skipping automation "${action.id}": missing/invalid amount, date, or accountId`);
          continue;
        }

        const result = await transactionService.createTransactionRecord(userId, title || "Form submission", {
          transactionType,
          amount,
          currency: typeof properties.currency === "string" ? properties.currency : "USD",
          date,
          description: typeof properties.description === "string" ? properties.description : undefined,
          accountId,
          toAccountId: typeof properties.toAccountId === "string" ? properties.toAccountId : undefined,
          categoryId: typeof properties.categoryId === "string" ? properties.categoryId : undefined,
        });

        if (!result.ok) {
          console.error(`Skipping automation "${action.id}": ${result.reason}`);
          continue;
        }
        objectId = result.transaction.id;
        objectTitle = result.transaction.title;
      }
    } catch (err) {
      console.error(`Automation action "${action.id}" (${action.type}) failed:`, err);
      continue;
    }

    if (!objectId) continue;

    createdObjectIds.set(action.id, objectId);
    created.push({
      actionId: action.id,
      actionType: action.type,
      objectId,
      objectType: action.type.replace("create_", ""),
      objectTitle,
    });

    await relationService.createRelation(userId, { sourceId: responseId, targetId: objectId, type: "created" }).catch((err) => {
      console.error(`Couldn't link response to created object for action "${action.id}":`, err);
    });

    for (const rel of action.relations ?? []) {
      const sourceId = resolveActionRef(rel.sourceActionId, action.id, createdObjectIds);
      const targetId = resolveActionRef(rel.targetActionId, action.id, createdObjectIds);
      if (!sourceId || !targetId) continue;

      await relationService.createRelation(userId, { sourceId, targetId, type: rel.relationType }).catch((err) => {
        console.error(`Couldn't create automation relation for action "${action.id}":`, err);
      });
    }
  }

  return created;
}
