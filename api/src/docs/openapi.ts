import "../lib/zod-openapi-setup";

import { OpenAPIRegistry, OpenApiGeneratorV3 } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";

import { env } from "../config/env";

import { registerSchema, loginSchema } from "../validation/auth.validation";
import { createPersonSchema, updatePersonSchema, personIdParamSchema } from "../validation/person.validation";
import {
  createRelationSchema,
  relationIdParamSchema,
  objectIdParamSchema,
} from "../validation/relation.validation";
import { objectIdParamSchema as objectsIdParamSchema } from "../validation/object.validation";
import { searchQuerySchema } from "../validation/search.validation";
import { createTaskSchema, updateTaskSchema, taskIdParamSchema } from "../validation/task.validation";
import {
  createProjectSchema,
  updateProjectSchema,
  projectIdParamSchema,
} from "../validation/project.validation";
import { createNoteSchema, updateNoteSchema, noteIdParamSchema } from "../validation/note.validation";
import { createEventSchema, updateEventSchema, eventIdParamSchema } from "../validation/event.validation";
import { createFileSchema, fileIdParamSchema } from "../validation/file.validation";
import {
  createAccountSchema,
  updateAccountSchema,
  accountIdParamSchema,
} from "../validation/account.validation";
import {
  createCategorySchema,
  updateCategorySchema,
  categoryIdParamSchema,
} from "../validation/category.validation";
import {
  createTransactionSchema,
  updateTransactionSchema,
  transactionIdParamSchema,
} from "../validation/transaction.validation";

const registry = new OpenAPIRegistry();

const bearerAuth = registry.registerComponent("securitySchemes", "bearerAuth", {
  type: "http",
  scheme: "bearer",
  bearerFormat: "JWT",
});
const authSecurity = [{ [bearerAuth.name]: [] }];

const successResponse = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({ success: z.literal(true), data: dataSchema });

const errorResponse = z
  .object({ success: z.literal(false), message: z.string() })
  .openapi("ErrorResponse");

const authUserSchema = z
  .object({
    id: z.uuid(),
    name: z.string().openapi({ example: "Huzef" }),
    email: z.email().openapi({ example: "huzef@example.com" }),
  })
  .openapi("AuthUser");

const loginResponseSchema = z
  .object({
    token: z.string().openapi({ example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." }),
    user: authUserSchema,
  })
  .openapi("LoginResponse");

const personSchema = z
  .object({
    id: z.uuid().openapi({ example: "44e159ff-d349-4716-848f-f0102556ac69" }),
    type: z.literal("person"),
    title: z.string().openapi({ example: "Rahul Shah" }),
    properties: z
      .record(z.string(), z.unknown())
      .nullable()
      .openapi({
        example: { company: "Acme", role: "Developer", email: "rahul@example.com" },
      }),
  })
  .openapi("Person");

const taskSchema = z
  .object({
    id: z.uuid(),
    type: z.literal("task"),
    title: z.string().openapi({ example: "Build LifeOS API" }),
    properties: z
      .object({
        status: z.enum(["todo", "in_progress", "completed"]),
        priority: z.enum(["low", "medium", "high"]).optional(),
        dueDate: z.string().optional().openapi({ example: "2026-09-10" }),
        notes: z.string().optional().openapi({ example: "Waiting on legal sign-off" }),
      })
      .nullable(),
  })
  .openapi("Task");

const projectSchema = z
  .object({
    id: z.uuid(),
    type: z.literal("project"),
    title: z.string().openapi({ example: "LifeOS" }),
    properties: z
      .object({
        status: z.string().optional().openapi({ example: "active" }),
        description: z.string().optional().openapi({ example: "Build LifeOS" }),
        deadline: z.string().optional().openapi({ example: "2026-09-30" }),
      })
      .nullable(),
  })
  .openapi("Project");

const noteSchema = z
  .object({
    id: z.uuid(),
    type: z.literal("note"),
    title: z.string().openapi({ example: "Dashboard ideas" }),
    properties: z
      .object({
        content: z.string().openapi({ example: "Ideas for LifeOS dashboard..." }),
      })
      .nullable(),
  })
  .openapi("Note");

const eventSchema = z
  .object({
    id: z.uuid(),
    type: z.literal("event"),
    title: z.string().openapi({ example: "Client meeting" }),
    properties: z
      .object({
        description: z.string().optional().openapi({ example: "Client meeting" }),
        startAt: z.string().datetime().openapi({ example: "2026-09-10T10:00:00Z" }),
        endAt: z.string().datetime().openapi({ example: "2026-09-10T11:00:00Z" }),
        mode: z.enum(["online", "in_person"]).optional().openapi({ example: "in_person" }),
        location: z.string().optional().openapi({ example: "Ahmedabad" }),
        link: z.string().optional().openapi({ example: "https://meet.google.com/abc-defg-hij" }),
      })
      .nullable(),
  })
  .openapi("Event");

const fileSchema = z
  .object({
    id: z.uuid(),
    type: z.literal("file"),
    title: z.string().openapi({ example: "resume.pdf" }),
    properties: z
      .object({
        url: z.url().openapi({ example: "https://example.com/files/resume.pdf" }),
        fileName: z.string().openapi({ example: "resume.pdf" }),
        mimeType: z.string().openapi({ example: "application/pdf" }),
        size: z.number().int().openapi({ example: 123456 }),
      })
      .nullable(),
  })
  .openapi("File");

const accountSchema = z
  .object({
    id: z.uuid(),
    type: z.literal("account"),
    title: z.string().openapi({ example: "Main Checking" }),
    properties: z
      .object({
        accountType: z.string().openapi({ example: "checking" }),
        currency: z.string().openapi({ example: "INR" }),
        startingBalance: z.number().openapi({ example: 10000 }),
        institution: z.string().optional().openapi({ example: "HDFC Bank" }),
        notes: z.string().optional(),
      })
      .nullable(),
    balance: z.number().openapi({ example: 8200 }),
  })
  .openapi("Account");

const categorySchema = z
  .object({
    id: z.uuid(),
    type: z.literal("category"),
    title: z.string().openapi({ example: "Food" }),
    properties: z
      .object({
        kind: z.string().openapi({ example: "expense" }),
        color: z.string().optional().openapi({ example: "#f97316" }),
        icon: z.string().optional(),
      })
      .nullable(),
  })
  .openapi("Category");

const transactionSchema = z
  .object({
    id: z.uuid(),
    type: z.literal("transaction"),
    title: z.string().openapi({ example: "Lunch" }),
    properties: z
      .object({
        transactionType: z.string().openapi({ example: "expense" }),
        amount: z.number().openapi({ example: 500 }),
        currency: z.string().openapi({ example: "INR" }),
        date: z.string().openapi({ example: "2026-09-03" }),
        description: z.string().optional().openapi({ example: "Lunch" }),
        accountId: z.uuid(),
        toAccountId: z.uuid().optional(),
        categoryId: z.uuid().optional(),
      })
      .nullable(),
  })
  .openapi("Transaction");

const relationSchema = z
  .object({
    id: z.uuid(),
    sourceId: z.uuid(),
    targetId: z.uuid(),
    type: z.string().openapi({ example: "works_on" }),
  })
  .openapi("Relation");

const genericObjectSchema = z
  .object({
    id: z.uuid(),
    type: z.string().openapi({ example: "person" }),
    title: z.string(),
    properties: z.record(z.string(), z.unknown()).nullable(),
  })
  .openapi("Object");

const objectConnectionSchema = z
  .object({
    relation: z.object({
      id: z.uuid(),
      type: z.string().openapi({ example: "works_on" }),
      direction: z.enum(["outgoing", "incoming"]),
    }),
    object: genericObjectSchema,
  })
  .openapi("ObjectConnection");

const objectWithConnectionsSchema = z
  .object({
    object: genericObjectSchema,
    connections: z.array(objectConnectionSchema),
  })
  .openapi("ObjectWithConnections");

const healthResponse = z
  .object({
    success: z.literal(true),
    message: z.string(),
    timestamp: z.string().datetime(),
  })
  .openapi("HealthResponse");

const unhealthyResponse = z
  .object({
    success: z.literal(false),
    message: z.string(),
    timestamp: z.string().datetime(),
  })
  .openapi("UnhealthyResponse");

const jsonBody = <T extends z.ZodTypeAny>(schema: T) => ({
  content: { "application/json": { schema } },
});

// -- Health --

registry.registerPath({
  method: "get",
  path: "/api/health",
  tags: ["Health"],
  summary: "API health check",
  responses: {
    200: { description: "API is healthy", ...jsonBody(healthResponse) },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/db-health",
  tags: ["Health"],
  summary: "Database health check",
  responses: {
    200: { description: "Database is healthy", ...jsonBody(healthResponse) },
    500: { description: "Database is not healthy", ...jsonBody(unhealthyResponse) },
  },
});

// -- Auth --

registry.registerPath({
  method: "post",
  path: "/api/auth/register",
  tags: ["Auth"],
  summary: "Register a new user",
  request: { body: jsonBody(registerSchema) },
  responses: {
    201: { description: "User registered", ...jsonBody(successResponse(authUserSchema)) },
    400: { description: "Validation error", ...jsonBody(errorResponse) },
    409: { description: "Email is already registered", ...jsonBody(errorResponse) },
  },
});

registry.registerPath({
  method: "post",
  path: "/api/auth/login",
  tags: ["Auth"],
  summary: "Log in and receive a JWT",
  request: { body: jsonBody(loginSchema) },
  responses: {
    200: { description: "Login successful", ...jsonBody(successResponse(loginResponseSchema)) },
    400: { description: "Validation error", ...jsonBody(errorResponse) },
    401: { description: "Invalid email or password", ...jsonBody(errorResponse) },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/auth/me",
  tags: ["Auth"],
  summary: "Get the currently authenticated user",
  security: authSecurity,
  responses: {
    200: { description: "Current user", ...jsonBody(successResponse(authUserSchema)) },
    401: { description: "Missing or invalid token", ...jsonBody(errorResponse) },
  },
});

// -- People --

registry.registerPath({
  method: "post",
  path: "/api/people",
  tags: ["People"],
  summary: "Create a Person",
  security: authSecurity,
  request: { body: jsonBody(createPersonSchema) },
  responses: {
    201: { description: "Person created", ...jsonBody(successResponse(personSchema)) },
    400: { description: "Validation error", ...jsonBody(errorResponse) },
    401: { description: "Missing or invalid token", ...jsonBody(errorResponse) },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/people",
  tags: ["People"],
  summary: "List all People belonging to the authenticated user",
  security: authSecurity,
  responses: {
    200: { description: "List of people", ...jsonBody(successResponse(z.array(personSchema))) },
    401: { description: "Missing or invalid token", ...jsonBody(errorResponse) },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/people/{id}",
  tags: ["People"],
  summary: "Get a single Person",
  security: authSecurity,
  request: { params: personIdParamSchema },
  responses: {
    200: { description: "Person found", ...jsonBody(successResponse(personSchema)) },
    400: { description: "Validation error", ...jsonBody(errorResponse) },
    401: { description: "Missing or invalid token", ...jsonBody(errorResponse) },
    404: { description: "Person not found", ...jsonBody(errorResponse) },
  },
});

registry.registerPath({
  method: "patch",
  path: "/api/people/{id}",
  tags: ["People"],
  summary: "Update a Person",
  security: authSecurity,
  request: { params: personIdParamSchema, body: jsonBody(updatePersonSchema) },
  responses: {
    200: { description: "Person updated", ...jsonBody(successResponse(personSchema)) },
    400: { description: "Validation error", ...jsonBody(errorResponse) },
    401: { description: "Missing or invalid token", ...jsonBody(errorResponse) },
    404: { description: "Person not found", ...jsonBody(errorResponse) },
  },
});

registry.registerPath({
  method: "delete",
  path: "/api/people/{id}",
  tags: ["People"],
  summary: "Delete a Person",
  security: authSecurity,
  request: { params: personIdParamSchema },
  responses: {
    200: { description: "Person deleted", ...jsonBody(successResponse(personSchema)) },
    400: { description: "Validation error", ...jsonBody(errorResponse) },
    401: { description: "Missing or invalid token", ...jsonBody(errorResponse) },
    404: { description: "Person not found", ...jsonBody(errorResponse) },
  },
});

// -- Tasks --

registry.registerPath({
  method: "post",
  path: "/api/tasks",
  tags: ["Tasks"],
  summary: "Create a Task",
  security: authSecurity,
  request: { body: jsonBody(createTaskSchema) },
  responses: {
    201: { description: "Task created", ...jsonBody(successResponse(taskSchema)) },
    400: { description: "Validation error", ...jsonBody(errorResponse) },
    401: { description: "Missing or invalid token", ...jsonBody(errorResponse) },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/tasks",
  tags: ["Tasks"],
  summary: "List all Tasks belonging to the authenticated user",
  security: authSecurity,
  responses: {
    200: { description: "List of tasks", ...jsonBody(successResponse(z.array(taskSchema))) },
    401: { description: "Missing or invalid token", ...jsonBody(errorResponse) },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/tasks/{id}",
  tags: ["Tasks"],
  summary: "Get a single Task",
  security: authSecurity,
  request: { params: taskIdParamSchema },
  responses: {
    200: { description: "Task found", ...jsonBody(successResponse(taskSchema)) },
    400: { description: "Validation error", ...jsonBody(errorResponse) },
    401: { description: "Missing or invalid token", ...jsonBody(errorResponse) },
    404: { description: "Task not found", ...jsonBody(errorResponse) },
  },
});

registry.registerPath({
  method: "patch",
  path: "/api/tasks/{id}",
  tags: ["Tasks"],
  summary: "Update a Task",
  security: authSecurity,
  request: { params: taskIdParamSchema, body: jsonBody(updateTaskSchema) },
  responses: {
    200: { description: "Task updated", ...jsonBody(successResponse(taskSchema)) },
    400: { description: "Validation error", ...jsonBody(errorResponse) },
    401: { description: "Missing or invalid token", ...jsonBody(errorResponse) },
    404: { description: "Task not found", ...jsonBody(errorResponse) },
  },
});

registry.registerPath({
  method: "delete",
  path: "/api/tasks/{id}",
  tags: ["Tasks"],
  summary: "Delete a Task",
  security: authSecurity,
  request: { params: taskIdParamSchema },
  responses: {
    200: { description: "Task deleted", ...jsonBody(successResponse(taskSchema)) },
    400: { description: "Validation error", ...jsonBody(errorResponse) },
    401: { description: "Missing or invalid token", ...jsonBody(errorResponse) },
    404: { description: "Task not found", ...jsonBody(errorResponse) },
  },
});

// -- Projects --

registry.registerPath({
  method: "post",
  path: "/api/projects",
  tags: ["Projects"],
  summary: "Create a Project",
  security: authSecurity,
  request: { body: jsonBody(createProjectSchema) },
  responses: {
    201: { description: "Project created", ...jsonBody(successResponse(projectSchema)) },
    400: { description: "Validation error", ...jsonBody(errorResponse) },
    401: { description: "Missing or invalid token", ...jsonBody(errorResponse) },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/projects",
  tags: ["Projects"],
  summary: "List all Projects belonging to the authenticated user",
  security: authSecurity,
  responses: {
    200: { description: "List of projects", ...jsonBody(successResponse(z.array(projectSchema))) },
    401: { description: "Missing or invalid token", ...jsonBody(errorResponse) },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/projects/{id}",
  tags: ["Projects"],
  summary: "Get a single Project",
  security: authSecurity,
  request: { params: projectIdParamSchema },
  responses: {
    200: { description: "Project found", ...jsonBody(successResponse(projectSchema)) },
    400: { description: "Validation error", ...jsonBody(errorResponse) },
    401: { description: "Missing or invalid token", ...jsonBody(errorResponse) },
    404: { description: "Project not found", ...jsonBody(errorResponse) },
  },
});

registry.registerPath({
  method: "patch",
  path: "/api/projects/{id}",
  tags: ["Projects"],
  summary: "Update a Project",
  security: authSecurity,
  request: { params: projectIdParamSchema, body: jsonBody(updateProjectSchema) },
  responses: {
    200: { description: "Project updated", ...jsonBody(successResponse(projectSchema)) },
    400: { description: "Validation error", ...jsonBody(errorResponse) },
    401: { description: "Missing or invalid token", ...jsonBody(errorResponse) },
    404: { description: "Project not found", ...jsonBody(errorResponse) },
  },
});

registry.registerPath({
  method: "delete",
  path: "/api/projects/{id}",
  tags: ["Projects"],
  summary: "Delete a Project",
  security: authSecurity,
  request: { params: projectIdParamSchema },
  responses: {
    200: { description: "Project deleted", ...jsonBody(successResponse(projectSchema)) },
    400: { description: "Validation error", ...jsonBody(errorResponse) },
    401: { description: "Missing or invalid token", ...jsonBody(errorResponse) },
    404: { description: "Project not found", ...jsonBody(errorResponse) },
  },
});

// -- Notes --

registry.registerPath({
  method: "post",
  path: "/api/notes",
  tags: ["Notes"],
  summary: "Create a Note",
  security: authSecurity,
  request: { body: jsonBody(createNoteSchema) },
  responses: {
    201: { description: "Note created", ...jsonBody(successResponse(noteSchema)) },
    400: { description: "Validation error", ...jsonBody(errorResponse) },
    401: { description: "Missing or invalid token", ...jsonBody(errorResponse) },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/notes",
  tags: ["Notes"],
  summary: "List all Notes belonging to the authenticated user",
  security: authSecurity,
  responses: {
    200: { description: "List of notes", ...jsonBody(successResponse(z.array(noteSchema))) },
    401: { description: "Missing or invalid token", ...jsonBody(errorResponse) },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/notes/{id}",
  tags: ["Notes"],
  summary: "Get a single Note",
  security: authSecurity,
  request: { params: noteIdParamSchema },
  responses: {
    200: { description: "Note found", ...jsonBody(successResponse(noteSchema)) },
    400: { description: "Validation error", ...jsonBody(errorResponse) },
    401: { description: "Missing or invalid token", ...jsonBody(errorResponse) },
    404: { description: "Note not found", ...jsonBody(errorResponse) },
  },
});

registry.registerPath({
  method: "patch",
  path: "/api/notes/{id}",
  tags: ["Notes"],
  summary: "Update a Note",
  security: authSecurity,
  request: { params: noteIdParamSchema, body: jsonBody(updateNoteSchema) },
  responses: {
    200: { description: "Note updated", ...jsonBody(successResponse(noteSchema)) },
    400: { description: "Validation error", ...jsonBody(errorResponse) },
    401: { description: "Missing or invalid token", ...jsonBody(errorResponse) },
    404: { description: "Note not found", ...jsonBody(errorResponse) },
  },
});

registry.registerPath({
  method: "delete",
  path: "/api/notes/{id}",
  tags: ["Notes"],
  summary: "Delete a Note",
  security: authSecurity,
  request: { params: noteIdParamSchema },
  responses: {
    200: { description: "Note deleted", ...jsonBody(successResponse(noteSchema)) },
    400: { description: "Validation error", ...jsonBody(errorResponse) },
    401: { description: "Missing or invalid token", ...jsonBody(errorResponse) },
    404: { description: "Note not found", ...jsonBody(errorResponse) },
  },
});

// -- Events --

registry.registerPath({
  method: "post",
  path: "/api/events",
  tags: ["Events"],
  summary: "Create an Event",
  security: authSecurity,
  request: { body: jsonBody(createEventSchema) },
  responses: {
    201: { description: "Event created", ...jsonBody(successResponse(eventSchema)) },
    400: { description: "Validation error", ...jsonBody(errorResponse) },
    401: { description: "Missing or invalid token", ...jsonBody(errorResponse) },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/events",
  tags: ["Events"],
  summary: "List all Events belonging to the authenticated user",
  security: authSecurity,
  responses: {
    200: { description: "List of events", ...jsonBody(successResponse(z.array(eventSchema))) },
    401: { description: "Missing or invalid token", ...jsonBody(errorResponse) },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/events/{id}",
  tags: ["Events"],
  summary: "Get a single Event",
  security: authSecurity,
  request: { params: eventIdParamSchema },
  responses: {
    200: { description: "Event found", ...jsonBody(successResponse(eventSchema)) },
    400: { description: "Validation error", ...jsonBody(errorResponse) },
    401: { description: "Missing or invalid token", ...jsonBody(errorResponse) },
    404: { description: "Event not found", ...jsonBody(errorResponse) },
  },
});

registry.registerPath({
  method: "patch",
  path: "/api/events/{id}",
  tags: ["Events"],
  summary: "Update an Event",
  security: authSecurity,
  request: { params: eventIdParamSchema, body: jsonBody(updateEventSchema) },
  responses: {
    200: { description: "Event updated", ...jsonBody(successResponse(eventSchema)) },
    400: { description: "Validation error", ...jsonBody(errorResponse) },
    401: { description: "Missing or invalid token", ...jsonBody(errorResponse) },
    404: { description: "Event not found", ...jsonBody(errorResponse) },
  },
});

registry.registerPath({
  method: "delete",
  path: "/api/events/{id}",
  tags: ["Events"],
  summary: "Delete an Event",
  security: authSecurity,
  request: { params: eventIdParamSchema },
  responses: {
    200: { description: "Event deleted", ...jsonBody(successResponse(eventSchema)) },
    400: { description: "Validation error", ...jsonBody(errorResponse) },
    401: { description: "Missing or invalid token", ...jsonBody(errorResponse) },
    404: { description: "Event not found", ...jsonBody(errorResponse) },
  },
});

// -- Files --

registry.registerPath({
  method: "post",
  path: "/api/files",
  tags: ["Files"],
  summary: "Create a File metadata record (no actual upload/storage)",
  security: authSecurity,
  request: { body: jsonBody(createFileSchema) },
  responses: {
    201: { description: "File record created", ...jsonBody(successResponse(fileSchema)) },
    400: { description: "Validation error", ...jsonBody(errorResponse) },
    401: { description: "Missing or invalid token", ...jsonBody(errorResponse) },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/files",
  tags: ["Files"],
  summary: "List all Files belonging to the authenticated user",
  security: authSecurity,
  responses: {
    200: { description: "List of files", ...jsonBody(successResponse(z.array(fileSchema))) },
    401: { description: "Missing or invalid token", ...jsonBody(errorResponse) },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/files/{id}",
  tags: ["Files"],
  summary: "Get a single File",
  security: authSecurity,
  request: { params: fileIdParamSchema },
  responses: {
    200: { description: "File found", ...jsonBody(successResponse(fileSchema)) },
    400: { description: "Validation error", ...jsonBody(errorResponse) },
    401: { description: "Missing or invalid token", ...jsonBody(errorResponse) },
    404: { description: "File not found", ...jsonBody(errorResponse) },
  },
});

registry.registerPath({
  method: "delete",
  path: "/api/files/{id}",
  tags: ["Files"],
  summary: "Delete a File",
  security: authSecurity,
  request: { params: fileIdParamSchema },
  responses: {
    200: { description: "File deleted", ...jsonBody(successResponse(fileSchema)) },
    400: { description: "Validation error", ...jsonBody(errorResponse) },
    401: { description: "Missing or invalid token", ...jsonBody(errorResponse) },
    404: { description: "File not found", ...jsonBody(errorResponse) },
  },
});

// -- Accounts --

registry.registerPath({
  method: "post",
  path: "/api/accounts",
  tags: ["Accounts"],
  summary: "Create an Account",
  security: authSecurity,
  request: { body: jsonBody(createAccountSchema) },
  responses: {
    201: { description: "Account created", ...jsonBody(successResponse(accountSchema)) },
    400: { description: "Validation error", ...jsonBody(errorResponse) },
    401: { description: "Missing or invalid token", ...jsonBody(errorResponse) },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/accounts",
  tags: ["Accounts"],
  summary: "List all Accounts belonging to the authenticated user, with computed balances",
  security: authSecurity,
  responses: {
    200: { description: "List of accounts", ...jsonBody(successResponse(z.array(accountSchema))) },
    401: { description: "Missing or invalid token", ...jsonBody(errorResponse) },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/accounts/{id}",
  tags: ["Accounts"],
  summary: "Get a single Account",
  security: authSecurity,
  request: { params: accountIdParamSchema },
  responses: {
    200: { description: "Account found", ...jsonBody(successResponse(accountSchema)) },
    400: { description: "Validation error", ...jsonBody(errorResponse) },
    401: { description: "Missing or invalid token", ...jsonBody(errorResponse) },
    404: { description: "Account not found", ...jsonBody(errorResponse) },
  },
});

registry.registerPath({
  method: "patch",
  path: "/api/accounts/{id}",
  tags: ["Accounts"],
  summary: "Update an Account",
  security: authSecurity,
  request: { params: accountIdParamSchema, body: jsonBody(updateAccountSchema) },
  responses: {
    200: { description: "Account updated", ...jsonBody(successResponse(accountSchema)) },
    400: { description: "Validation error", ...jsonBody(errorResponse) },
    401: { description: "Missing or invalid token", ...jsonBody(errorResponse) },
    404: { description: "Account not found", ...jsonBody(errorResponse) },
  },
});

registry.registerPath({
  method: "delete",
  path: "/api/accounts/{id}",
  tags: ["Accounts"],
  summary: "Delete an Account",
  security: authSecurity,
  request: { params: accountIdParamSchema },
  responses: {
    200: { description: "Account deleted", ...jsonBody(successResponse(accountSchema)) },
    400: { description: "Validation error", ...jsonBody(errorResponse) },
    401: { description: "Missing or invalid token", ...jsonBody(errorResponse) },
    404: { description: "Account not found", ...jsonBody(errorResponse) },
  },
});

// -- Categories --

registry.registerPath({
  method: "post",
  path: "/api/categories",
  tags: ["Categories"],
  summary: "Create a Category",
  security: authSecurity,
  request: { body: jsonBody(createCategorySchema) },
  responses: {
    201: { description: "Category created", ...jsonBody(successResponse(categorySchema)) },
    400: { description: "Validation error", ...jsonBody(errorResponse) },
    401: { description: "Missing or invalid token", ...jsonBody(errorResponse) },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/categories",
  tags: ["Categories"],
  summary: "List all Categories belonging to the authenticated user",
  security: authSecurity,
  responses: {
    200: { description: "List of categories", ...jsonBody(successResponse(z.array(categorySchema))) },
    401: { description: "Missing or invalid token", ...jsonBody(errorResponse) },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/categories/{id}",
  tags: ["Categories"],
  summary: "Get a single Category",
  security: authSecurity,
  request: { params: categoryIdParamSchema },
  responses: {
    200: { description: "Category found", ...jsonBody(successResponse(categorySchema)) },
    400: { description: "Validation error", ...jsonBody(errorResponse) },
    401: { description: "Missing or invalid token", ...jsonBody(errorResponse) },
    404: { description: "Category not found", ...jsonBody(errorResponse) },
  },
});

registry.registerPath({
  method: "patch",
  path: "/api/categories/{id}",
  tags: ["Categories"],
  summary: "Update a Category",
  security: authSecurity,
  request: { params: categoryIdParamSchema, body: jsonBody(updateCategorySchema) },
  responses: {
    200: { description: "Category updated", ...jsonBody(successResponse(categorySchema)) },
    400: { description: "Validation error", ...jsonBody(errorResponse) },
    401: { description: "Missing or invalid token", ...jsonBody(errorResponse) },
    404: { description: "Category not found", ...jsonBody(errorResponse) },
  },
});

registry.registerPath({
  method: "delete",
  path: "/api/categories/{id}",
  tags: ["Categories"],
  summary: "Delete a Category",
  security: authSecurity,
  request: { params: categoryIdParamSchema },
  responses: {
    200: { description: "Category deleted", ...jsonBody(successResponse(categorySchema)) },
    400: { description: "Validation error", ...jsonBody(errorResponse) },
    401: { description: "Missing or invalid token", ...jsonBody(errorResponse) },
    404: { description: "Category not found", ...jsonBody(errorResponse) },
  },
});

// -- Transactions --

registry.registerPath({
  method: "post",
  path: "/api/transactions",
  tags: ["Transactions"],
  summary: "Create a Transaction (income, expense, or transfer between accounts)",
  security: authSecurity,
  request: { body: jsonBody(createTransactionSchema) },
  responses: {
    201: { description: "Transaction created", ...jsonBody(successResponse(transactionSchema)) },
    400: { description: "Validation error", ...jsonBody(errorResponse) },
    401: { description: "Missing or invalid token", ...jsonBody(errorResponse) },
    404: { description: "Account or category not found", ...jsonBody(errorResponse) },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/transactions",
  tags: ["Transactions"],
  summary: "List Transactions belonging to the authenticated user, optionally filtered",
  security: authSecurity,
  request: {
    query: z.object({
      accountId: z.uuid().optional(),
      categoryId: z.uuid().optional(),
      transactionType: z.enum(["income", "expense", "transfer"]).optional(),
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
      q: z.string().optional(),
    }),
  },
  responses: {
    200: { description: "List of transactions", ...jsonBody(successResponse(z.array(transactionSchema))) },
    401: { description: "Missing or invalid token", ...jsonBody(errorResponse) },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/transactions/{id}",
  tags: ["Transactions"],
  summary: "Get a single Transaction",
  security: authSecurity,
  request: { params: transactionIdParamSchema },
  responses: {
    200: { description: "Transaction found", ...jsonBody(successResponse(transactionSchema)) },
    400: { description: "Validation error", ...jsonBody(errorResponse) },
    401: { description: "Missing or invalid token", ...jsonBody(errorResponse) },
    404: { description: "Transaction not found", ...jsonBody(errorResponse) },
  },
});

registry.registerPath({
  method: "patch",
  path: "/api/transactions/{id}",
  tags: ["Transactions"],
  summary: "Update a Transaction",
  security: authSecurity,
  request: { params: transactionIdParamSchema, body: jsonBody(updateTransactionSchema) },
  responses: {
    200: { description: "Transaction updated", ...jsonBody(successResponse(transactionSchema)) },
    400: { description: "Validation error", ...jsonBody(errorResponse) },
    401: { description: "Missing or invalid token", ...jsonBody(errorResponse) },
    404: { description: "Transaction, account, or category not found", ...jsonBody(errorResponse) },
  },
});

registry.registerPath({
  method: "delete",
  path: "/api/transactions/{id}",
  tags: ["Transactions"],
  summary: "Delete a Transaction",
  security: authSecurity,
  request: { params: transactionIdParamSchema },
  responses: {
    200: { description: "Transaction deleted", ...jsonBody(successResponse(transactionSchema)) },
    400: { description: "Validation error", ...jsonBody(errorResponse) },
    401: { description: "Missing or invalid token", ...jsonBody(errorResponse) },
    404: { description: "Transaction not found", ...jsonBody(errorResponse) },
  },
});

// -- Objects --

registry.registerPath({
  method: "get",
  path: "/api/objects/{id}/connections",
  tags: ["Objects"],
  summary: "Get an Object and all Objects directly connected to it via Relations",
  security: authSecurity,
  request: { params: objectsIdParamSchema },
  responses: {
    200: {
      description: "Object with its direct connections",
      ...jsonBody(successResponse(objectWithConnectionsSchema)),
    },
    400: { description: "Validation error", ...jsonBody(errorResponse) },
    401: { description: "Missing or invalid token", ...jsonBody(errorResponse) },
    404: { description: "Object not found", ...jsonBody(errorResponse) },
  },
});

// -- Relations --

registry.registerPath({
  method: "post",
  path: "/api/relations",
  tags: ["Relations"],
  summary: "Create a Relation between two Objects",
  security: authSecurity,
  request: { body: jsonBody(createRelationSchema) },
  responses: {
    201: { description: "Relation created", ...jsonBody(successResponse(relationSchema)) },
    400: { description: "Validation error", ...jsonBody(errorResponse) },
    401: { description: "Missing or invalid token", ...jsonBody(errorResponse) },
    404: { description: "Source or target object not found", ...jsonBody(errorResponse) },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/relations/object/{objectId}",
  tags: ["Relations"],
  summary: "Get all Relations for an Object (as source or target)",
  security: authSecurity,
  request: { params: objectIdParamSchema },
  responses: {
    200: {
      description: "List of relations",
      ...jsonBody(successResponse(z.array(relationSchema))),
    },
    400: { description: "Validation error", ...jsonBody(errorResponse) },
    401: { description: "Missing or invalid token", ...jsonBody(errorResponse) },
    404: { description: "Object not found", ...jsonBody(errorResponse) },
  },
});

registry.registerPath({
  method: "delete",
  path: "/api/relations/{id}",
  tags: ["Relations"],
  summary: "Delete a Relation",
  security: authSecurity,
  request: { params: relationIdParamSchema },
  responses: {
    200: { description: "Relation deleted", ...jsonBody(successResponse(relationSchema)) },
    400: { description: "Validation error", ...jsonBody(errorResponse) },
    401: { description: "Missing or invalid token", ...jsonBody(errorResponse) },
    404: { description: "Relation not found", ...jsonBody(errorResponse) },
  },
});

// -- Search --

registry.registerPath({
  method: "get",
  path: "/api/search",
  tags: ["Search"],
  summary: "Search the authenticated user's Objects by title, optionally filtered by type",
  security: authSecurity,
  request: { query: searchQuerySchema },
  responses: {
    200: {
      description: "Matching objects",
      ...jsonBody(successResponse(z.array(genericObjectSchema))),
    },
    400: { description: "Validation error", ...jsonBody(errorResponse) },
    401: { description: "Missing or invalid token", ...jsonBody(errorResponse) },
  },
});

// -- Timeline --

registry.registerPath({
  method: "get",
  path: "/api/timeline",
  tags: ["Timeline"],
  summary: "Get the authenticated user's Objects, latest first (default limit 50)",
  security: authSecurity,
  responses: {
    200: {
      description: "Objects ordered by createdAt descending",
      ...jsonBody(successResponse(z.array(genericObjectSchema))),
    },
    401: { description: "Missing or invalid token", ...jsonBody(errorResponse) },
  },
});

const generator = new OpenApiGeneratorV3(registry.definitions);

export const openApiDocument = generator.generateDocument({
  openapi: "3.0.0",
  info: {
    version: "1.0.0",
    title: "LifeOS API",
    description:
      "API documentation for the LifeOS core module: Auth, People and Relations (backed by the generic Object model), Search and Timeline. All endpoints except /api/auth/register and /api/auth/login require a Bearer JWT.",
  },
  servers: [{ url: `http://localhost:${env.PORT}`, description: "Local server" }],
});
