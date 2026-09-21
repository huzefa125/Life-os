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
  notes?: string;
}

export interface Task {
  id: string;
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
  type: "note";
  title: string;
  properties: NoteProperties | null;
  tags?: string[];
  status?: "active" | "archived" | "trash";
  isFavorite?: boolean;
  createdAt: string;
  updatedAt: string;
}

export type EventMode = "online" | "in_person";

export interface EventProperties {
  description?: string;
  startAt: string;
  endAt: string;
  mode?: EventMode;
  location?: string;
  link?: string;
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

export type AccountType = "checking" | "savings" | "credit_card" | "cash" | "investment" | "loan" | "other";

export interface AccountProperties {
  accountType: AccountType;
  currency: string;
  startingBalance: number;
  institution?: string;
  notes?: string;
}

export interface Account {
  id: string;
  type: "account";
  title: string;
  properties: AccountProperties | null;
  balance: number;
  tags?: string[];
  status?: "active" | "archived" | "trash";
  isFavorite?: boolean;
  createdAt: string;
  updatedAt: string;
}

export type CategoryKind = "income" | "expense";

export interface CategoryProperties {
  kind: CategoryKind;
  color?: string;
  icon?: string;
}

export interface Category {
  id: string;
  type: "category";
  title: string;
  properties: CategoryProperties | null;
  tags?: string[];
  status?: "active" | "archived" | "trash";
  isFavorite?: boolean;
  createdAt: string;
  updatedAt: string;
}

export type TransactionType = "income" | "expense" | "transfer";

export interface TransactionProperties {
  transactionType: TransactionType;
  amount: number;
  currency: string;
  date: string;
  description?: string;
  accountId: string;
  toAccountId?: string;
  categoryId?: string;
  recurringId?: string;
}

export interface Transaction {
  id: string;
  type: "transaction";
  title: string;
  properties: TransactionProperties | null;
  tags?: string[];
  status?: "active" | "archived" | "trash";
  isFavorite?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TransactionFilters {
  accountId?: string;
  categoryId?: string;
  transactionType?: TransactionType;
  dateFrom?: string;
  dateTo?: string;
  q?: string;
}

export type BudgetPeriod = "weekly" | "monthly";

export interface BudgetProperties {
  categoryId: string;
  amount: number;
  currency: string;
  period: BudgetPeriod;
}

export interface Budget {
  id: string;
  type: "budget";
  title: string;
  properties: BudgetProperties | null;
  spent: number;
  remaining: number;
  tags?: string[];
  status?: "active" | "archived" | "trash";
  isFavorite?: boolean;
  createdAt: string;
  updatedAt: string;
}

export type RecurringFrequency = "weekly" | "monthly" | "yearly";

export interface RecurringTransactionProperties {
  transactionType: TransactionType;
  amount: number;
  currency: string;
  description?: string;
  accountId: string;
  toAccountId?: string;
  categoryId?: string;
  frequency: RecurringFrequency;
  startDate: string;
  nextRunDate: string;
  endDate?: string;
  active?: boolean;
}

export interface RecurringTransaction {
  id: string;
  type: "recurring_transaction";
  title: string;
  properties: RecurringTransactionProperties | null;
  tags?: string[];
  status?: "active" | "archived" | "trash";
  isFavorite?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GoalProperties {
  targetAmount: number;
  currency: string;
  targetDate?: string;
  currentAmount?: number;
  linkedAccountId?: string;
}

export interface Goal {
  id: string;
  type: "goal";
  title: string;
  properties: GoalProperties | null;
  currentValue: number;
  progress: number;
  tags?: string[];
  status?: "active" | "archived" | "trash";
  isFavorite?: boolean;
  createdAt: string;
  updatedAt: string;
}

export type MoneyGranularity = "day" | "week" | "month" | "year";

export interface MoneySummaryPeriod {
  periodStart: string;
  periodLabel: string;
  income: number;
  expense: number;
  net: number;
  netWorth: number;
}

export interface MoneySummaryCategory {
  categoryId: string;
  title: string;
  total: number;
}

export interface MoneySummary {
  granularity: MoneyGranularity;
  currency: string;
  series: MoneySummaryPeriod[];
  categoryBreakdown: MoneySummaryCategory[];
}

export interface GenericObject {
  id: string;
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
  | "assigned_to"
  | "in_account"
  | "in_category"
  | "transfer_to"
  | "for_category"
  | "funds_from";

export interface Relation {
  id: string;
  sourceId: string;
  targetId: string;
  type: RelationType;
}

export interface ObjectConnection {
  relation: { id: string; type: RelationType; direction: "outgoing" | "incoming" };
  object: GenericObject;
}

export interface ObjectWithConnections {
  object: GenericObject;
  connections: ObjectConnection[];
}
