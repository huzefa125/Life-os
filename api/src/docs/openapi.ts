import { OpenAPIRegistry, OpenApiGeneratorV3, extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";

extendZodWithOpenApi(z);

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
    userId: z.uuid(),
    type: z.literal("person"),
    title: z.string().openapi({ example: "Rahul Shah" }),
    properties: z
      .record(z.string(), z.unknown())
      .nullable()
      .openapi({
        example: { company: "Acme", role: "Developer", email: "rahul@example.com" },
      }),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .openapi("Person");

const taskSchema = z
  .object({
    id: z.uuid(),
    userId: z.uuid(),
    type: z.literal("task"),
    title: z.string().openapi({ example: "Build LifeOS API" }),
    properties: z
      .object({
        status: z.enum(["todo", "in_progress", "completed"]),
        priority: z.enum(["low", "medium", "high"]).optional(),
        dueDate: z.string().optional().openapi({ example: "2026-09-10" }),
      })
      .nullable(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .openapi("Task");

const projectSchema = z
  .object({
    id: z.uuid(),
    userId: z.uuid(),
    type: z.literal("project"),
    title: z.string().openapi({ example: "LifeOS" }),
    properties: z
      .object({
        status: z.string().optional().openapi({ example: "active" }),
        description: z.string().optional().openapi({ example: "Build LifeOS" }),
        deadline: z.string().optional().openapi({ example: "2026-09-30" }),
      })
      .nullable(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .openapi("Project");

const relationSchema = z
  .object({
    id: z.uuid(),
    userId: z.uuid(),
    sourceId: z.uuid(),
    targetId: z.uuid(),
    type: z.string().openapi({ example: "works_on" }),
    createdAt: z.string().datetime(),
  })
  .openapi("Relation");

const genericObjectSchema = z
  .object({
    id: z.uuid(),
    userId: z.uuid(),
    type: z.string().openapi({ example: "person" }),
    title: z.string(),
    properties: z.record(z.string(), z.unknown()).nullable(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
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
