import type { FormAutomation, FormField } from "@/lib/types";

export interface FormTemplate {
  id: string;
  name: string;
  description: string;
  formDescription?: string;
  fields: FormField[];
  automations: FormAutomation[];
}

export const FORM_TEMPLATES: FormTemplate[] = [
  {
    id: "client-onboarding",
    name: "Client Onboarding",
    description: "Creates a Person, and — for business clients — a Project with a kickoff Task, automatically linked.",
    formDescription: "Tell us a bit about yourself so we can get you set up.",
    fields: [
      { id: "name", type: "short_text", label: "Full name", required: true },
      { id: "email", type: "email", label: "Email", required: true },
      { id: "phone", type: "phone", label: "Phone", required: false },
      { id: "is_business", type: "radio", label: "Are you a business?", required: true, options: ["Yes", "No"] },
      {
        id: "company_name",
        type: "short_text",
        label: "Company name",
        required: true,
        visibleIf: { fieldId: "is_business", operator: "equals", value: "Yes" },
      },
      {
        id: "company_size",
        type: "number",
        label: "Company size",
        required: false,
        visibleIf: { fieldId: "is_business", operator: "equals", value: "Yes" },
      },
      {
        id: "website",
        type: "url",
        label: "Website",
        required: false,
        visibleIf: { fieldId: "is_business", operator: "equals", value: "Yes" },
      },
    ],
    automations: [
      {
        id: "a1",
        type: "create_person",
        label: "Create Person",
        titleMapping: { source: "field", fieldId: "name" },
        propertyMappings: {
          email: { source: "field", fieldId: "email" },
          phone: { source: "field", fieldId: "phone" },
          company: { source: "field", fieldId: "company_name" },
        },
      },
      {
        id: "a2",
        type: "create_project",
        label: "Create Project",
        condition: { fieldId: "is_business", operator: "equals", value: "Yes" },
        titleMapping: { source: "field", fieldId: "company_name" },
        propertyMappings: {
          description: { source: "field", fieldId: "website" },
        },
        relations: [{ relationType: "works_on", sourceActionId: "a1", targetActionId: "self" }],
      },
      {
        id: "a3",
        type: "create_task",
        label: "Create kickoff Task",
        condition: { fieldId: "is_business", operator: "equals", value: "Yes" },
        titleMapping: { source: "static", value: "Kickoff call" },
        propertyMappings: {},
        relations: [{ relationType: "has_task", sourceActionId: "a2", targetActionId: "self" }],
      },
    ],
  },
  {
    id: "expense-claim",
    name: "Expense Claim",
    description: "Creates a Money Transaction directly in Money Manager. Set the Account/Category after adding this template.",
    formDescription: "Submit an expense for reimbursement.",
    fields: [
      { id: "description", type: "short_text", label: "What was this expense for?", required: true },
      { id: "amount", type: "currency", label: "Amount", required: true, currencyCode: "USD" },
      { id: "date", type: "datetime", label: "Date of expense", required: true },
      { id: "receipt", type: "file", label: "Receipt", required: false },
    ],
    automations: [
      {
        id: "a1",
        type: "create_transaction",
        label: "Create Transaction",
        titleMapping: { source: "field", fieldId: "description" },
        propertyMappings: {
          amount: { source: "field", fieldId: "amount" },
          date: { source: "field", fieldId: "date" },
          transactionType: { source: "static", value: "expense" },
        },
      },
    ],
  },
  {
    id: "contact-form",
    name: "Contact Form",
    description: "A plain contact form with no LifeOS automation — a good starting point for a simple form.",
    fields: [
      { id: "name", type: "short_text", label: "Name", required: true },
      { id: "email", type: "email", label: "Email", required: true },
      { id: "message", type: "long_text", label: "Message", required: true },
    ],
    automations: [],
  },
];
