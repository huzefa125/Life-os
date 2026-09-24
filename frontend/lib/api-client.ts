import { getToken } from "@/lib/auth-storage";
import type {
  Account,
  AccountProperties,
  ApiUser,
  Budget,
  BudgetProperties,
  CalendarEvent,
  Category,
  Collection,
  CollectionAutomation,
  CollectionField,
  CollectionRecord,
  CollectionRecordPage,
  CollectionRecordQuery,
  CollectionRecordValues,
  CollectionView,
  Company,
  CategoryProperties,
  DetailedObject,
  EventProperties,
  FavoriteItem,
  FileProperties,
  Form,
  FormAutomationType,
  FormFieldMapping,
  FormProperties,
  FormResponse,
  FormResponseCreatedObject,
  GenericObject,
  Goal,
  GoalProperties,
  JsonValue,
  MoneyGranularity,
  MoneySummary,
  Note,
  NoteProperties,
  ObjectWithConnections,
  Page,
  PageProperties,
  Person,
  Project,
  ProjectProperties,
  PublicFormSchema,
  RecurringTransaction,
  RecurringTransactionProperties,
  Relation,
  RelationType,
  StoredFile,
  TagItem,
  Task,
  TaskProperties,
  Transaction,
  TransactionFilters,
  TransactionProperties,
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
  companies: {
    list: () => request<Company[]>("/api/companies"),
    get: (id: string) => request<Company>(`/api/companies/${id}`),
    create: (input: { name: string; properties?: Record<string, JsonValue> }) =>
      request<Company>("/api/companies", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    update: (id: string, input: { name?: string; properties?: Record<string, JsonValue> }) =>
      request<Company>(`/api/companies/${id}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      }),
    remove: (id: string) => request<Company>(`/api/companies/${id}`, { method: "DELETE" }),
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
  events: {
    list: () => request<CalendarEvent[]>("/api/events"),
    get: (id: string) => request<CalendarEvent>(`/api/events/${id}`),
    create: (input: { title: string; properties: EventProperties }) =>
      request<CalendarEvent>("/api/events", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    update: (id: string, input: { title?: string; properties?: Partial<EventProperties> }) =>
      request<CalendarEvent>(`/api/events/${id}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      }),
    remove: (id: string) => request<CalendarEvent>(`/api/events/${id}`, { method: "DELETE" }),
  },
  files: {
    list: () => request<StoredFile[]>("/api/files"),
    get: (id: string) => request<StoredFile>(`/api/files/${id}`),
    create: (input: { properties: FileProperties }) =>
      request<StoredFile>("/api/files", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    remove: (id: string) => request<StoredFile>(`/api/files/${id}`, { method: "DELETE" }),
  },
  accounts: {
    list: () => request<Account[]>("/api/accounts"),
    get: (id: string) => request<Account>(`/api/accounts/${id}`),
    create: (input: { title: string; properties: AccountProperties }) =>
      request<Account>("/api/accounts", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    update: (id: string, input: { title?: string; properties?: AccountProperties }) =>
      request<Account>(`/api/accounts/${id}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      }),
    remove: (id: string) => request<Account>(`/api/accounts/${id}`, { method: "DELETE" }),
  },
  categories: {
    list: () => request<Category[]>("/api/categories"),
    get: (id: string) => request<Category>(`/api/categories/${id}`),
    create: (input: { title: string; properties: CategoryProperties }) =>
      request<Category>("/api/categories", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    update: (id: string, input: { title?: string; properties?: CategoryProperties }) =>
      request<Category>(`/api/categories/${id}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      }),
    remove: (id: string) => request<Category>(`/api/categories/${id}`, { method: "DELETE" }),
  },
  transactions: {
    list: (filters?: TransactionFilters) => {
      const params = new URLSearchParams();
      if (filters) {
        for (const [key, value] of Object.entries(filters)) {
          if (value) params.set(key, value);
        }
      }
      const query = params.toString();
      return request<Transaction[]>(`/api/transactions${query ? `?${query}` : ""}`);
    },
    get: (id: string) => request<Transaction>(`/api/transactions/${id}`),
    create: (input: { title: string; properties: TransactionProperties }) =>
      request<Transaction>("/api/transactions", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    update: (id: string, input: { title?: string; properties?: TransactionProperties }) =>
      request<Transaction>(`/api/transactions/${id}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      }),
    remove: (id: string) => request<Transaction>(`/api/transactions/${id}`, { method: "DELETE" }),
  },
  budgets: {
    list: () => request<Budget[]>("/api/budgets"),
    get: (id: string) => request<Budget>(`/api/budgets/${id}`),
    create: (input: { title: string; properties: BudgetProperties }) =>
      request<Budget>("/api/budgets", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    update: (id: string, input: { title?: string; properties?: BudgetProperties }) =>
      request<Budget>(`/api/budgets/${id}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      }),
    remove: (id: string) => request<Budget>(`/api/budgets/${id}`, { method: "DELETE" }),
  },
  recurringTransactions: {
    list: () => request<RecurringTransaction[]>("/api/recurring-transactions"),
    get: (id: string) => request<RecurringTransaction>(`/api/recurring-transactions/${id}`),
    create: (input: { title: string; properties: Omit<RecurringTransactionProperties, "nextRunDate"> }) =>
      request<RecurringTransaction>("/api/recurring-transactions", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    update: (id: string, input: { title?: string; properties?: Omit<RecurringTransactionProperties, "nextRunDate"> }) =>
      request<RecurringTransaction>(`/api/recurring-transactions/${id}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      }),
    remove: (id: string) => request<RecurringTransaction>(`/api/recurring-transactions/${id}`, { method: "DELETE" }),
  },
  goals: {
    list: () => request<Goal[]>("/api/goals"),
    get: (id: string) => request<Goal>(`/api/goals/${id}`),
    create: (input: { title: string; properties: GoalProperties }) =>
      request<Goal>("/api/goals", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    update: (id: string, input: { title?: string; properties?: GoalProperties }) =>
      request<Goal>(`/api/goals/${id}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      }),
    remove: (id: string) => request<Goal>(`/api/goals/${id}`, { method: "DELETE" }),
  },
  money: {
    summary: (granularity: MoneyGranularity) =>
      request<MoneySummary>(`/api/money/summary?granularity=${granularity}`),
  },
  timeline: {
    list: () => request<GenericObject[]>("/api/timeline"),
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
    detail: (id: string) => request<DetailedObject>(`/api/objects/${id}/detail`),
  },
  pages: {
    list: (tag?: string) => {
      const params = tag ? `?tag=${encodeURIComponent(tag)}` : "";
      return request<Page[]>(`/api/pages${params}`);
    },
    get: (id: string) => request<Page>(`/api/pages/${id}`),
    create: (input: { title: string; properties?: PageProperties; tags?: string[] }) =>
      request<Page>("/api/pages", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    update: (id: string, input: { title?: string; properties?: PageProperties; tags?: string[] }) =>
      request<Page>(`/api/pages/${id}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      }),
    remove: (id: string) => request<{ message: string }>(`/api/pages/${id}`, { method: "DELETE" }),
  },
  favorites: {
    list: () => request<FavoriteItem[]>("/api/favorites"),
    add: (objectId: string) =>
      request<FavoriteItem>("/api/favorites", {
        method: "POST",
        body: JSON.stringify({ objectId }),
      }),
    remove: (idOrObjectId: string) =>
      request<{ message: string }>(`/api/favorites/${idOrObjectId}`, { method: "DELETE" }),
  },
  archive: {
    list: () => request<GenericObject[]>("/api/archive"),
    archive: (id: string) =>
      request<GenericObject>(`/api/archive/${id}`, {
        method: "POST",
      }),
    restore: (id: string) =>
      request<GenericObject>(`/api/archive/${id}/restore`, {
        method: "POST",
      }),
  },
  trash: {
    list: () => request<GenericObject[]>("/api/trash"),
    move: (id: string) =>
      request<GenericObject>(`/api/trash/${id}`, {
        method: "POST",
      }),
    restore: (id: string) =>
      request<GenericObject>(`/api/trash/${id}/restore`, {
        method: "POST",
      }),
    permanentDelete: (id: string) =>
      request<{ message: string }>(`/api/trash/${id}`, {
        method: "DELETE",
      }),
    empty: () =>
      request<{ count: number; message: string }>("/api/trash", {
        method: "DELETE",
      }),
  },
  tags: {
    list: () => request<TagItem[]>("/api/tags"),
    getObjects: (tag: string) => request<GenericObject[]>(`/api/tags/${encodeURIComponent(tag)}`),
    update: (id: string, tags: string[]) =>
      request<GenericObject>(`/api/tags/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ tags }),
      }),
  },
  search: {
    query: (q: string, type?: string) => {
      const params = new URLSearchParams({ q });
      if (type) params.set("type", type);
      return request<GenericObject[]>(`/api/search?${params.toString()}`);
    },
  },
  forms: {
    list: () => request<Form[]>("/api/forms"),
    get: (id: string) => request<Form>(`/api/forms/${id}`),
    create: (input: { title: string }) =>
      request<Form>("/api/forms", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    update: (id: string, input: { title?: string; properties?: FormProperties }) =>
      request<Form>(`/api/forms/${id}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      }),
    remove: (id: string) => request<Form>(`/api/forms/${id}`, { method: "DELETE" }),
    publish: (id: string) => request<Form>(`/api/forms/${id}/publish`, { method: "POST" }),
    unpublish: (id: string) => request<Form>(`/api/forms/${id}/unpublish`, { method: "POST" }),
    close: (id: string) => request<Form>(`/api/forms/${id}/close`, { method: "POST" }),
    reopen: (id: string) => request<Form>(`/api/forms/${id}/reopen`, { method: "POST" }),
    responses: {
      list: (formId: string) => request<FormResponse[]>(`/api/forms/${formId}/responses`),
      get: (formId: string, responseId: string) =>
        request<FormResponse>(`/api/forms/${formId}/responses/${responseId}`),
      remove: (formId: string, responseId: string) =>
        request<FormResponse>(`/api/forms/${formId}/responses/${responseId}`, { method: "DELETE" }),
      createObject: (
        formId: string,
        responseId: string,
        action: { type: FormAutomationType; titleMapping: FormFieldMapping; propertyMappings: Record<string, FormFieldMapping> }
      ) =>
        request<FormResponseCreatedObject>(`/api/forms/${formId}/responses/${responseId}/create-object`, {
          method: "POST",
          body: JSON.stringify(action),
        }),
      exportCsv: async (formId: string) => {
        const token = getToken();
        const res = await fetch(`${API_URL}/api/forms/${formId}/responses/export.csv`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) throw new ApiError(`Export failed (${res.status})`, res.status);
        return res.blob();
      },
    },
  },
  collections: {
    list: (status: "active" | "archived" = "active") => request<Collection[]>(`/api/collections?status=${status}`),
    get: (id: string) => request<Collection>(`/api/collections/${id}`),
    create: (input: {
      name: string;
      description?: string;
      icon?: string;
      color?: string;
      fields?: CollectionField[];
      views?: CollectionView[];
    }) =>
      request<Collection>("/api/collections", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    update: (
      id: string,
      input: { name?: string; description?: string; icon?: string; color?: string; automations?: CollectionAutomation[] }
    ) =>
      request<Collection>(`/api/collections/${id}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      }),
    remove: (id: string) => request<{ id: string }>(`/api/collections/${id}`, { method: "DELETE" }),
    fields: {
      add: (id: string, field: CollectionField) =>
        request<Collection>(`/api/collections/${id}/fields`, { method: "POST", body: JSON.stringify(field) }),
      update: (
        id: string,
        fieldId: string,
        patch: Partial<Pick<CollectionField, "name" | "description" | "required" | "config">>
      ) =>
        request<Collection>(`/api/collections/${id}/fields/${fieldId}`, { method: "PATCH", body: JSON.stringify(patch) }),
      remove: (id: string, fieldId: string) =>
        request<Collection>(`/api/collections/${id}/fields/${fieldId}`, { method: "DELETE" }),
      reorder: (id: string, fieldIds: string[]) =>
        request<Collection>(`/api/collections/${id}/fields/reorder`, { method: "POST", body: JSON.stringify({ fieldIds }) }),
    },
    views: {
      add: (id: string, view: CollectionView) =>
        request<Collection>(`/api/collections/${id}/views`, { method: "POST", body: JSON.stringify(view) }),
      update: (
        id: string,
        viewId: string,
        patch: Partial<Omit<CollectionView, "id" | "type" | "groupByFieldId" | "dateFieldId">> & {
          groupByFieldId?: string | null;
          dateFieldId?: string | null;
        }
      ) =>
        request<Collection>(`/api/collections/${id}/views/${viewId}`, { method: "PATCH", body: JSON.stringify(patch) }),
      remove: (id: string, viewId: string) =>
        request<Collection>(`/api/collections/${id}/views/${viewId}`, { method: "DELETE" }),
    },
    records: {
      list: (id: string, query: CollectionRecordQuery = {}) => {
        const params = new URLSearchParams();
        if (query.page) params.set("page", String(query.page));
        if (query.pageSize) params.set("pageSize", String(query.pageSize));
        if (query.search) params.set("search", query.search);
        if (query.viewId) params.set("viewId", query.viewId);
        if (query.filters?.length) params.set("filters", JSON.stringify(query.filters));
        if (query.sorts?.length) params.set("sorts", JSON.stringify(query.sorts));
        return request<CollectionRecordPage>(`/api/collections/${id}/records?${params.toString()}`);
      },
      get: (id: string, recordId: string) =>
        request<CollectionRecord & { related: CollectionRecordPage["related"] }>(`/api/collections/${id}/records/${recordId}`),
      create: (id: string, values: CollectionRecordValues) =>
        request<CollectionRecord & { related: CollectionRecordPage["related"] }>(`/api/collections/${id}/records`, {
          method: "POST",
          body: JSON.stringify({ values }),
        }),
      update: (id: string, recordId: string, values: CollectionRecordValues) =>
        request<CollectionRecord & { related: CollectionRecordPage["related"] }>(`/api/collections/${id}/records/${recordId}`, {
          method: "PATCH",
          body: JSON.stringify({ values }),
        }),
      remove: (id: string, recordId: string) =>
        request<{ id: string }>(`/api/collections/${id}/records/${recordId}`, { method: "DELETE" }),
      bulk: (id: string, action: "trash" | "archive", recordIds: string[]) =>
        request<{ count: number }>(`/api/collections/${id}/records/bulk`, {
          method: "POST",
          body: JSON.stringify({ action, recordIds }),
        }),
      exportCsv: async (id: string) => {
        const token = getToken();
        const res = await fetch(`${API_URL}/api/collections/${id}/records/export.csv`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) throw new ApiError(`Export failed (${res.status})`, res.status);
        return res.blob();
      },
    },
  },
  publicForms: {
    getSchema: (formId: string) => request<PublicFormSchema>(`/api/public/forms/${formId}`),
    getResumable: (formId: string, responseId: string) =>
      request<{ answers: Record<string, JsonValue>; draft: boolean }>(`/api/public/forms/${formId}/responses/${responseId}`),
    submit: (formId: string, answers: Record<string, JsonValue>, options?: { draft?: boolean; resumeId?: string }) =>
      request<{ responseId: string; draft?: boolean; successMessage?: string; redirectUrl?: string }>(
        `/api/public/forms/${formId}/submit`,
        {
          method: "POST",
          body: JSON.stringify({ answers, ...options }),
        }
      ),
    upload: async (formId: string, file: File) => {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch(`${API_URL}/api/public/forms/${formId}/upload`, { method: "POST", body });
      const payload = await res.json().catch(() => null);
      if (!res.ok || !payload?.success) {
        throw new ApiError(payload?.message ?? `Upload failed (${res.status})`, res.status);
      }
      return payload.data as { url: string; fileName: string; mimeType: string; size: number };
    },
  },
};
