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
        id: "a3",
        type: "create_project",
        label: "Create Project",
        condition: { fieldId: "is_business", operator: "equals", value: "Yes" },
        titleMapping: { source: "field", fieldId: "company_name" },
        propertyMappings: {},
        relations: [{ relationType: "works_on", sourceActionId: "a1", targetActionId: "self" }],
      },
      {
        id: "a4",
        type: "create_task",
        label: "Create kickoff Task",
        condition: { fieldId: "is_business", operator: "equals", value: "Yes" },
        titleMapping: { source: "static", value: "Kickoff call" },
        propertyMappings: {},
        relations: [{ relationType: "has_task", sourceActionId: "a3", targetActionId: "self" }],
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
  {
    id: "customer-feedback",
    name: "Customer Feedback",
    description: "Rating + open feedback. No automation — pairs well with the Analytics-style breakdown on the Responses tab.",
    fields: [
      { id: "satisfaction", type: "rating", label: "How satisfied are you?", required: true, ratingMax: 5 },
      {
        id: "recommend",
        type: "dropdown",
        label: "Would you recommend us?",
        required: true,
        options: ["Definitely", "Probably", "Not sure", "Probably not", "Definitely not"],
      },
      { id: "comments", type: "long_text", label: "Anything else you'd like to share?", required: false },
    ],
    automations: [],
  },
  {
    id: "job-application",
    name: "Job Application",
    description: "Creates a Person and a follow-up Task to review the application.",
    formDescription: "Apply for a role with us.",
    fields: [
      { id: "name", type: "short_text", label: "Full name", required: true },
      { id: "email", type: "email", label: "Email", required: true },
      { id: "phone", type: "phone", label: "Phone", required: false },
      { id: "role", type: "dropdown", label: "Role applying for", required: true, options: ["Engineering", "Design", "Sales", "Support", "Other"] },
      { id: "resume", type: "file", label: "Resume", required: true },
      { id: "cover_letter", type: "long_text", label: "Why do you want to work with us?", required: false },
    ],
    automations: [
      {
        id: "a1",
        type: "create_person",
        label: "Create Person",
        titleMapping: { source: "field", fieldId: "name" },
        propertyMappings: { email: { source: "field", fieldId: "email" }, phone: { source: "field", fieldId: "phone" }, role: { source: "field", fieldId: "role" } },
      },
      {
        id: "a2",
        type: "create_task",
        label: "Review application",
        titleMapping: { source: "static", value: "Review application" },
        propertyMappings: {},
        relations: [{ relationType: "assigned_to", sourceActionId: "self", targetActionId: "a1" }],
      },
    ],
  },
  {
    id: "event-registration",
    name: "Event Registration",
    description: "Creates a Person for every registrant.",
    formDescription: "Reserve your spot.",
    fields: [
      { id: "name", type: "short_text", label: "Full name", required: true },
      { id: "email", type: "email", label: "Email", required: true },
      { id: "guests", type: "number", label: "Number of guests", required: false, min: 0, max: 10 },
      { id: "dietary", type: "checkbox", label: "Dietary requirements", required: false, options: ["Vegetarian", "Vegan", "Gluten-free", "None"] },
    ],
    automations: [
      {
        id: "a1",
        type: "create_person",
        label: "Create Person",
        titleMapping: { source: "field", fieldId: "name" },
        propertyMappings: { email: { source: "field", fieldId: "email" } },
      },
    ],
  },
  {
    id: "lead-capture",
    name: "Lead Capture",
    description: "Creates a Person and a follow-up Task, connected to each other.",
    formDescription: "Get in touch and we'll follow up.",
    fields: [
      { id: "name", type: "short_text", label: "Name", required: true },
      { id: "email", type: "email", label: "Work email", required: true },
      { id: "company_name", type: "short_text", label: "Company", required: false },
      { id: "interested_in", type: "dropdown", label: "Interested in", required: false, options: ["Product demo", "Pricing", "Partnership", "Other"] },
    ],
    automations: [
      {
        id: "a1",
        type: "create_person",
        label: "Create Person",
        titleMapping: { source: "field", fieldId: "name" },
        propertyMappings: { email: { source: "field", fieldId: "email" }, company: { source: "field", fieldId: "company_name" } },
      },
      {
        id: "a2",
        type: "create_task",
        label: "Follow up with lead",
        titleMapping: { source: "static", value: "Follow up with new lead" },
        propertyMappings: {},
        relations: [{ relationType: "assigned_to", sourceActionId: "self", targetActionId: "a1" }],
      },
    ],
  },
  {
    id: "employee-feedback",
    name: "Employee Feedback",
    description: "Anonymous-by-default pulse survey. No automation.",
    fields: [
      { id: "department", type: "dropdown", label: "Department", required: false, options: ["Engineering", "Design", "Sales", "Support", "Operations", "Other"] },
      { id: "satisfaction", type: "rating", label: "Overall satisfaction this quarter", required: true, ratingMax: 5 },
      { id: "comments", type: "long_text", label: "What should we do differently?", required: false },
    ],
    automations: [],
  },
  {
    id: "survey",
    name: "Survey",
    description: "A general-purpose multi-question survey. No automation.",
    fields: [
      { id: "age_range", type: "dropdown", label: "Age range", required: false, options: ["18-24", "25-34", "35-44", "45-54", "55+"] },
      { id: "usage", type: "radio", label: "How often do you use our product?", required: true, options: ["Daily", "Weekly", "Monthly", "Rarely"] },
      { id: "features", type: "checkbox", label: "Which features do you use?", required: false, options: ["Dashboard", "Reports", "Automation", "Integrations", "Mobile app"] },
      { id: "satisfaction", type: "rating", label: "Overall satisfaction", required: true, ratingMax: 5 },
    ],
    automations: [],
  },
  {
    id: "order-form",
    name: "Order Form",
    description: "Creates a Transaction in Money Manager for the order amount. Set the Account/Category after adding this template.",
    formDescription: "Place an order.",
    fields: [
      { id: "item", type: "short_text", label: "Item", required: true },
      { id: "quantity", type: "number", label: "Quantity", required: true, min: 1 },
      { id: "amount", type: "currency", label: "Total amount", required: true, currencyCode: "USD" },
      { id: "order_date", type: "datetime", label: "Order date", required: true },
      { id: "shipping_address", type: "address", label: "Shipping address", required: true },
    ],
    automations: [
      {
        id: "a1",
        type: "create_transaction",
        label: "Create Transaction",
        titleMapping: { source: "field", fieldId: "item" },
        propertyMappings: {
          amount: { source: "field", fieldId: "amount" },
          date: { source: "field", fieldId: "order_date" },
          transactionType: { source: "static", value: "income" },
        },
      },
    ],
  },
];
