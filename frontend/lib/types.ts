export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export interface ApiUser {
  id: string;
  name: string;
  email: string;
}

export interface Person {
  id: string;
  userId: string;
  type: "person";
  title: string;
  properties: Record<string, JsonValue> | null;
  tags?: string[];
  status?: "active" | "archived" | "trash";
  isFavorite?: boolean;
  createdAt: string;
  updatedAt: string;
}

export type TaskStatus = "todo" | "in_progress" | "completed";
export type TaskPriority = "low" | "medium" | "high";

export interface TaskProperties {
  status: TaskStatus;
  priority?: TaskPriority;
  dueDate?: string;
}

export interface Task {
  id: string;
  userId: string;
  type: "task";
  title: string;
  properties: TaskProperties | null;
  tags?: string[];
  status?: "active" | "archived" | "trash";
  isFavorite?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectProperties {
  status?: string;
  description?: string;
  deadline?: string;
}

export interface Project {
  id: string;
  userId: string;
  type: "project";
  title: string;
  properties: ProjectProperties | null;
  tags?: string[];
  status?: "active" | "archived" | "trash";
  isFavorite?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NoteProperties {
  content: string;
}

export interface Note {
  id: string;
  userId: string;
  type: "note";
  title: string;
  properties: NoteProperties | null;
  tags?: string[];
  status?: "active" | "archived" | "trash";
  isFavorite?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface EventProperties {
  description?: string;
  startAt: string;
  endAt: string;
  location?: string;
}

export interface CalendarEvent {
  id: string;
  userId: string;
  type: "event";
  title: string;
  properties: EventProperties | null;
  tags?: string[];
  status?: "active" | "archived" | "trash";
  isFavorite?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FileProperties {
  url: string;
  fileName: string;
  mimeType: string;
  size: number;
}

export interface StoredFile {
  id: string;
  userId: string;
  type: "file";
  title: string;
  properties: FileProperties | null;
  tags?: string[];
  status?: "active" | "archived" | "trash";
  isFavorite?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ExpenseProperties {
  amount: number;
  currency: string;
  category: string;
  date: string;
  description?: string;
}

export interface Expense {
  id: string;
  userId: string;
  type: "expense";
  title: string;
  properties: ExpenseProperties | null;
  tags?: string[];
  status?: "active" | "archived" | "trash";
  isFavorite?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GenericObject {
  id: string;
  userId: string;
  type: string;
  title: string;
  properties: Record<string, JsonValue> | null;
  tags?: string[];
  status?: "active" | "archived" | "trash";
  isFavorite?: boolean;
  archivedAt?: string | null;
  deletedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type BlockType = "text" | "heading" | "todo" | "bullet" | "quote" | "code";

export interface Block {
  id: string;
  type: BlockType;
  content: string;
  level?: 1 | 2 | 3;
  checked?: boolean;
  language?: string;
}

export interface PageProperties {
  blocks: Block[];
}

export interface Page {
  id: string;
  userId: string;
  type: "page";
  title: string;
  tags?: string[];
  status?: "active" | "archived" | "trash";
  isFavorite?: boolean;
  properties: PageProperties | null;
  createdAt: string;
  updatedAt: string;
}

export interface ActivityItem {
  id: string;
  action: string;
  details: Record<string, JsonValue> | null;
  createdAt: string;
}

export interface DetailedObject {
  object: GenericObject & { isFavorite: boolean };
  relations: Array<{
    id: string;
    type: string;
    direction: "outgoing" | "incoming";
    otherObject: GenericObject;
  }>;
  files: Array<{
    id: string;
    title: string;
    properties: FileProperties | Record<string, JsonValue> | null;
    relationId?: string;
  }>;
  activities: ActivityItem[];
}

export interface FavoriteItem extends GenericObject {
  favoriteId: string;
  favoritedAt: string;
  isFavorite: true;
}

export interface TagItem {
  tag: string;
  count: number;
}

export type RelationType =
  | "works_on"
  | "has_task"
  | "has_file"
  | "has_note"
  | "has_event"
  | "knows"
  | "related_to"
  | "assigned_to";

export interface Relation {
  id: string;
  userId: string;
  sourceId: string;
  targetId: string;
  type: RelationType;
  createdAt: string;
}

export interface ObjectConnection {
  relation: { id: string; type: RelationType; direction: "outgoing" | "incoming" };
  object: GenericObject;
}

export interface ObjectWithConnections {
  object: GenericObject;
  connections: ObjectConnection[];
}
