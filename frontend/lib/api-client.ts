import { getToken } from "@/lib/auth-storage";
import type {
  ApiUser,
  GenericObject,
  JsonValue,
  Note,
  NoteProperties,
  ObjectWithConnections,
  Person,
  Project,
  ProjectProperties,
  Relation,
  RelationType,
  Task,
  TaskProperties,
} from "@/lib/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

interface ApiSuccess<T> {
  success: true;
  data: T;
}

interface ApiFailure {
  success: false;
  message: string;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  let body: ApiSuccess<T> | ApiFailure | null = null;
  try {
    body = await res.json();
  } catch {
    // no JSON body (e.g. network failure before response)
  }

  if (!body || !res.ok || !body.success) {
    const message = body && body.success === false ? body.message : `Request failed (${res.status})`;
    throw new ApiError(message, res.status);
  }

  return body.data;
}

export const api = {
  auth: {
    register: (input: { name: string; email: string; password: string }) =>
      request<ApiUser>("/api/auth/register", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    login: (input: { email: string; password: string }) =>
      request<{ token: string; user: ApiUser }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    me: () => request<ApiUser>("/api/auth/me"),
  },
  people: {
    list: () => request<Person[]>("/api/people"),
    get: (id: string) => request<Person>(`/api/people/${id}`),
    create: (input: { name: string; properties?: Record<string, JsonValue> }) =>
      request<Person>("/api/people", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    update: (id: string, input: { name?: string; properties?: Record<string, JsonValue> }) =>
      request<Person>(`/api/people/${id}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      }),
    remove: (id: string) => request<Person>(`/api/people/${id}`, { method: "DELETE" }),
  },
  tasks: {
    list: () => request<Task[]>("/api/tasks"),
    get: (id: string) => request<Task>(`/api/tasks/${id}`),
    create: (input: { title: string; properties?: TaskProperties }) =>
      request<Task>("/api/tasks", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    update: (id: string, input: { title?: string; properties?: TaskProperties }) =>
      request<Task>(`/api/tasks/${id}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      }),
    remove: (id: string) => request<Task>(`/api/tasks/${id}`, { method: "DELETE" }),
  },
  projects: {
    list: () => request<Project[]>("/api/projects"),
    get: (id: string) => request<Project>(`/api/projects/${id}`),
    create: (input: { title: string; properties?: ProjectProperties }) =>
      request<Project>("/api/projects", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    update: (id: string, input: { title?: string; properties?: ProjectProperties }) =>
      request<Project>(`/api/projects/${id}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      }),
    remove: (id: string) => request<Project>(`/api/projects/${id}`, { method: "DELETE" }),
  },
  notes: {
    list: () => request<Note[]>("/api/notes"),
    get: (id: string) => request<Note>(`/api/notes/${id}`),
    create: (input: { title: string; properties: NoteProperties }) =>
      request<Note>("/api/notes", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    update: (id: string, input: { title?: string; properties?: NoteProperties }) =>
      request<Note>(`/api/notes/${id}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      }),
    remove: (id: string) => request<Note>(`/api/notes/${id}`, { method: "DELETE" }),
  },
  relations: {
    create: (input: { sourceId: string; targetId: string; type: RelationType }) =>
      request<Relation>("/api/relations", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    remove: (id: string) => request<Relation>(`/api/relations/${id}`, { method: "DELETE" }),
  },
  objects: {
    connections: (id: string) => request<ObjectWithConnections>(`/api/objects/${id}/connections`),
  },
  search: {
    query: (q: string, type?: string) => {
      const params = new URLSearchParams({ q });
      if (type) params.set("type", type);
      return request<GenericObject[]>(`/api/search?${params.toString()}`);
    },
  },
};
