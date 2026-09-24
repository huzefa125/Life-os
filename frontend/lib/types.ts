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
  /** Set on custom collection records (type `collection_record`). */
  collectionId?: string | null;
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

export type FormFieldType =
  | "short_text"
  | "long_text"
  | "email"
  | "phone"
  | "number"
  | "datetime"
  | "dropdown"
  | "radio"
  | "checkbox"
  | "rating"
  | "url"
  | "currency"
  | "address"
  | "file";

export type FormConditionOperator = "equals" | "not_equals" | "contains" | "is_empty" | "is_not_empty";

export interface FormCondition {
  fieldId: string;
  operator: FormConditionOperator;
  value?: string;
}

export interface FormField {
  id: string;
  type: FormFieldType;
  label: string;
  helpText?: string;
  placeholder?: string;
  required: boolean;
  sectionId?: string;
  options?: string[];
  optionDescriptions?: Record<string, string>;
  allowOther?: boolean;
  randomizeOptions?: boolean;
  minSelections?: number;
  maxSelections?: number;
  min?: number;
  max?: number;
  step?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  patternMessage?: string;
  currencyCode?: string;
  ratingMax?: number;
  maxSizeMB?: number;
  acceptedMimeTypes?: string[];
  visibleIf?: FormCondition;
}

export interface FormSection {
  id: string;
  title: string;
  description?: string;
  skipIf?: FormCondition;
}

export type FormFieldMapping =
  | { source: "field"; fieldId: string }
  | { source: "static"; value: JsonValue }
  | { source: "action_object_id"; actionId: string };

export type FormAutomationType = "create_person" | "create_project" | "create_task" | "create_transaction";

export interface FormAutomationRelation {
  relationType: RelationType;
  sourceActionId: string;
  targetActionId: string;
}

export interface FormAutomation {
  id: string;
  type: FormAutomationType;
  label?: string;
  condition?: FormCondition;
  titleMapping: FormFieldMapping;
  propertyMappings: Record<string, FormFieldMapping>;
  relations?: FormAutomationRelation[];
}

export type FormStatus = "draft" | "published" | "closed";
export type FormLayout = "card" | "full_page";

export interface FormSettings {
  status: FormStatus;
  acceptResponses: boolean;
  startDate?: string;
  endDate?: string;
  responseLimit?: number;
  onePerPerson: boolean;
  allowResponseEditing: boolean;
  saveAndResumeLater: boolean;
  redirectUrl?: string;
  requireLogin: boolean;
  anonymousResponses: boolean;
  spamProtectionEnabled: boolean;
  randomizeFields?: boolean;
  showProgressBar?: boolean;
  layout?: FormLayout;
}

export interface FormDesign {
  accentColor?: string;
  logoUrl?: string;
  coverImageUrl?: string;
  backgroundColor?: string;
}

export interface FormProperties {
  description?: string;
  fields: FormField[];
  sections?: FormSection[];
  settings: FormSettings;
  design?: FormDesign;
  automations: FormAutomation[];
  submitButtonLabel?: string;
  successMessage?: string;
}

export interface Form {
  id: string;
  type: "form";
  title: string;
  properties: FormProperties | null;
  tags?: string[];
  status?: "active" | "archived" | "trash";
  isFavorite?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FormResponseCreatedObject {
  actionId: string;
  actionType: FormAutomationType;
  objectId: string;
  objectType: string;
  objectTitle: string;
}

export interface FormResponseProperties {
  formId: string;
  answers: Record<string, JsonValue>;
  submittedAt: string;
  createdObjects: FormResponseCreatedObject[];
}

export interface FormResponse {
  id: string;
  type: "form_response";
  title: string;
  properties: FormResponseProperties | null;
  tags?: string[];
  status?: "active" | "archived" | "trash";
  isFavorite?: boolean;
  createdAt: string;
  updatedAt: string;
}

export type FormAvailabilityStatus = "open" | "not_yet_open" | "closed" | "paused" | "limit_reached";

export interface FormAvailability {
  status: FormAvailabilityStatus;
  message?: string;
}

export interface PublicFormSchema {
  id: string;
  title: string;
  description?: string;
  fields: FormField[];
  sections?: FormSection[];
  design?: FormDesign;
  submitButtonLabel?: string;
  availability: FormAvailability;
  allowResponseEditing: boolean;
  saveAndResumeLater: boolean;
  onePerPerson: boolean;
  requireLogin: boolean;
  showProgressBar?: boolean;
  randomizeFields?: boolean;
  layout?: FormLayout;
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
  | "funds_from"
  | "has_response"
  | "created"
  | "collection_link";

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

// ---------- Collections ----------

export type CollectionFieldType =
  | "text"
  | "long_text"
  | "number"
  | "currency"
  | "email"
  | "phone"
  | "url"
  | "date"
  | "datetime"
  | "checkbox"
  | "select"
  | "multi_select"
  | "rating"
  | "relation";

export type RelationTargetType =
  | "person"
  | "project"
  | "task"
  | "note"
  | "event"
  | "file"
  | "transaction"
  | "account"
  | "collection_record";

export interface CollectionSelectOption {
  value: string;
  label: string;
  color?: string;
}

export interface CollectionFieldConfig {
  options?: CollectionSelectOption[];
  currencyCode?: string;
  min?: number;
  max?: number;
  decimals?: number;
  ratingMax?: number;
  targetType?: RelationTargetType;
  targetCollectionId?: string;
  multiple?: boolean;
}

export interface CollectionField {
  id: string;
  key?: string;
  name: string;
  type: CollectionFieldType;
  description?: string;
  required: boolean;
  config?: CollectionFieldConfig;
}

export type CollectionViewType = "table" | "board" | "gallery" | "calendar";

export type CollectionFilterOperator =
  | "equals"
  | "not_equals"
  | "contains"
  | "not_contains"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "before"
  | "after"
  | "is_empty"
  | "is_not_empty"
  | "is_checked"
  | "is_not_checked"
  | "in";

export interface CollectionFilter {
  fieldId: string;
  operator: CollectionFilterOperator;
  value?: string | number | boolean | string[];
}

export interface CollectionSort {
  /** A field id, or one of the built-ins `createdAt` / `updatedAt` / `title`. */
  fieldId: string;
  direction: "asc" | "desc";
}

export interface CollectionView {
  id: string;
  name: string;
  type: CollectionViewType;
  filters: CollectionFilter[];
  sorts: CollectionSort[];
  visibleFieldIds?: string[];
  fieldOrder?: string[];
  groupByFieldId?: string;
  dateFieldId?: string;
}

export interface CollectionAutomation {
  id: string;
  name: string;
  enabled: boolean;
  trigger: FormCondition;
  actions: FormAutomation[];
}

export interface CollectionProperties {
  description?: string;
  icon?: string;
  color?: string;
  slug: string;
  fields: CollectionField[];
  views: CollectionView[];
  automations: CollectionAutomation[];
}

export interface Collection {
  id: string;
  title: string;
  status: "active" | "archived" | "trash";
  archivedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  properties: CollectionProperties;
  recordCount: number;
  isFavorite: boolean;
}

export type CollectionRecordValues = Record<string, JsonValue>;

export interface CollectionRecord {
  id: string;
  title: string;
  values: CollectionRecordValues;
  createdAt: string;
  updatedAt: string;
}

export interface CollectionRelatedObject {
  id: string;
  title: string;
  type: string;
  collectionId: string | null;
}

export interface CollectionRecordPage {
  records: CollectionRecord[];
  total: number;
  page: number;
  pageSize: number;
  related: Record<string, CollectionRelatedObject>;
}

export interface CollectionRecordQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  viewId?: string;
  filters?: CollectionFilter[];
  sorts?: CollectionSort[];
}
