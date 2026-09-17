import bcrypt from "bcrypt";
import { randomUUID } from "crypto";
import { prisma } from "../src/db";

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

interface SeedRecord {
  id?: string;
  type: string;
  title: string;
  properties: Record<string, JsonValue>;
}

const PEOPLE: SeedRecord[] = [
  {
    type: "person",
    title: "Dario Amodei",
    properties: { email: "dario@anthropic.com", company: "Anthropic", role: "CEO" },
  },
  {
    type: "person",
    title: "Ivan Zhao",
    properties: { email: "ivan@notion.so", company: "Notion", role: "CEO" },
  },
  {
    type: "person",
    title: "Dylan Field",
    properties: { email: "dylan@figma.com", company: "Figma", role: "CEO", phone: "+1 415 555 0132" },
  },
  {
    type: "person",
    title: "Patrick Collison",
    properties: { email: "patrick@stripe.com", company: "Stripe", role: "CEO" },
  },
  {
    type: "person",
    title: "David Kim",
    properties: { email: "david@talentco.com", company: "TalentCo", role: "Recruiter", category: "recruiting" },
  },
  {
    type: "person",
    title: "Priya Sharma",
    properties: { email: "priya.sharma@example.com", company: "Acme Corp", phone: "+91 98765 43210" },
  },
  {
    type: "person",
    title: "Mom",
    properties: { phone: "+1 555 010 2200", category: "family" },
  },
  {
    type: "person",
    title: "Sarah (Sister)",
    properties: { phone: "+1 555 010 2288", category: "family" },
  },
  {
    type: "person",
    title: "Alex Chen",
    properties: { phone: "+1 415 555 0177", category: "healthcare", notes: "Dentist, Powell St clinic" },
  },
  {
    type: "person",
    title: "Maria Gomez",
    properties: { phone: "+1 415 555 0188", category: "vendor", notes: "Plumber, call for emergencies" },
  },
  {
    type: "person",
    title: "James O'Brien",
    properties: { email: "james@brightlaw.com", company: "Bright & Law LLP", category: "legal" },
  },
  {
    type: "person",
    title: "Ananya Rao",
    properties: { phone: "+91 91234 56789" },
  },
];

const TASKS: SeedRecord[] = [
  {
    type: "task",
    title: "Follow up with Dylan about partnership",
    properties: { status: "todo", priority: "high", dueDate: "2026-09-15" },
  },
  {
    type: "task",
    title: "Send proposal to Acme Corp",
    properties: { status: "in_progress", priority: "medium", dueDate: "2026-09-12" },
  },
  {
    type: "task",
    title: "Renew passport",
    properties: { status: "todo", priority: "low" },
  },
  {
    type: "task",
    title: "Review Q3 budget",
    properties: { status: "completed", priority: "high", dueDate: "2026-09-01" },
  },
  {
    type: "task",
    title: "Book flight to SF",
    properties: { status: "todo", dueDate: "2026-09-20" },
  },
  {
    type: "task",
    title: "Prepare onboarding deck",
    properties: { status: "in_progress", priority: "medium" },
  },
];

const PROJECTS: SeedRecord[] = [
  {
    type: "project",
    title: "LifeOS v1 Launch",
    properties: {
      status: "active",
      description: "Ship the core CRM, notes and tasks module",
      deadline: "2026-10-01",
    },
  },
  {
    type: "project",
    title: "Website Redesign",
    properties: { status: "planning", description: "Refresh the marketing site", deadline: "2026-11-15" },
  },
  {
    type: "project",
    title: "Q4 Fundraising",
    properties: { status: "active", description: "Raise the seed round", deadline: "2026-12-20" },
  },
];

const NOTES: SeedRecord[] = [
  {
    type: "note",
    title: "Dashboard ideas",
    properties: { content: "Add a weekly digest email summarizing tasks and events." },
  },
  {
    type: "note",
    title: "Meeting notes - Anthropic call",
    properties: { content: "Discussed API pricing and enterprise SLAs. Follow up next week." },
  },
  {
    type: "note",
    title: "Book recommendations",
    properties: { content: "Reid recommended 'The Cold Start Problem'." },
  },
];

const EVENTS: SeedRecord[] = [
  {
    type: "event",
    title: "Coffee with Priya",
    properties: {
      description: "Catch up on the Acme partnership",
      startAt: "2026-09-12T10:00:00Z",
      endAt: "2026-09-12T10:30:00Z",
      location: "Blue Bottle Coffee",
    },
  },
  {
    type: "event",
    title: "Board meeting",
    properties: {
      startAt: "2026-09-18T15:00:00Z",
      endAt: "2026-09-18T17:00:00Z",
      location: "HQ Conference Room",
    },
  },
  {
    type: "event",
    title: "Dentist appointment",
    properties: { startAt: "2026-09-14T09:00:00Z", endAt: "2026-09-14T09:45:00Z" },
  },
];

const FILES: SeedRecord[] = [
  {
    type: "file",
    title: "resume.pdf",
    properties: {
      url: "https://example.com/files/resume.pdf",
      fileName: "resume.pdf",
      mimeType: "application/pdf",
      size: 245678,
    },
  },
  {
    type: "file",
    title: "pitch-deck.pdf",
    properties: {
      url: "https://example.com/files/pitch-deck.pdf",
      fileName: "pitch-deck.pdf",
      mimeType: "application/pdf",
      size: 5242880,
    },
  },
  {
    type: "file",
    title: "headshot.jpg",
    properties: {
      url: "https://example.com/files/headshot.jpg",
      fileName: "headshot.jpg",
      mimeType: "image/jpeg",
      size: 184320,
    },
  },
];

/**
 * Money records cross-reference each other by id (transactions point at
 * accounts/categories), and those ids must be unique per row across the
 * whole Object table — so unlike the other seed groups, these can't be
 * static module-level arrays shared by every seeded user. Called once per
 * user in the main loop below.
 */
function buildMoneyRecords(): (SeedRecord & { tags?: string[] })[] {
  const cashAccountId = randomUUID();
  const checkingAccountId = randomUUID();
  const foodCategoryId = randomUUID();
  const softwareCategoryId = randomUUID();
  const travelCategoryId = randomUUID();
  const salaryCategoryId = randomUUID();

  return [
    {
      id: cashAccountId,
      type: "account",
      title: "Cash Wallet",
      properties: { accountType: "cash", currency: "USD", startingBalance: 200 },
    },
    {
      id: checkingAccountId,
      type: "account",
      title: "Main Checking",
      properties: { accountType: "checking", currency: "USD", startingBalance: 5000, institution: "Demo Bank" },
    },
    { id: foodCategoryId, type: "category", title: "Food", properties: { kind: "expense", color: "#f97316" } },
    {
      id: softwareCategoryId,
      type: "category",
      title: "Software",
      properties: { kind: "expense", color: "#6366f1" },
    },
    { id: travelCategoryId, type: "category", title: "Travel", properties: { kind: "expense", color: "#0ea5e9" } },
    { id: salaryCategoryId, type: "category", title: "Salary", properties: { kind: "income", color: "#22c55e" } },
    {
      type: "transaction",
      title: "Team lunch",
      properties: {
        transactionType: "expense",
        amount: 42.5,
        currency: "USD",
        date: "2026-09-03",
        description: "Team lunch",
        accountId: cashAccountId,
        categoryId: foodCategoryId,
      },
    },
    {
      type: "transaction",
      title: "Annual SaaS subscriptions",
      properties: {
        transactionType: "expense",
        amount: 1200,
        currency: "USD",
        date: "2026-09-05",
        description: "Annual SaaS subscriptions",
        accountId: checkingAccountId,
        categoryId: softwareCategoryId,
      },
    },
    {
      type: "transaction",
      title: "Uber to airport",
      properties: {
        transactionType: "expense",
        amount: 89.99,
        currency: "USD",
        date: "2026-09-08",
        description: "Uber to airport",
        accountId: cashAccountId,
        categoryId: travelCategoryId,
      },
    },
    {
      type: "transaction",
      title: "September paycheck",
      properties: {
        transactionType: "income",
        amount: 6000,
        currency: "USD",
        date: "2026-09-01",
        description: "September paycheck",
        accountId: checkingAccountId,
        categoryId: salaryCategoryId,
      },
    },
    {
      type: "transaction",
      title: "Move cash to checking",
      properties: {
        transactionType: "transfer",
        amount: 100,
        currency: "USD",
        date: "2026-09-10",
        description: "Move cash to checking",
        accountId: cashAccountId,
        toAccountId: checkingAccountId,
      },
    },
  ];
}

const PAGES: (SeedRecord & { tags?: string[] })[] = [
  {
    type: "page",
    title: "LifeOS Architecture & Specs",
    tags: ["work", "project"],
    properties: {
      blocks: [
        {
          id: "b-1",
          type: "heading",
          content: "LifeOS Phase 2",
        },
        {
          id: "b-2",
          type: "text",
          content: "Unified Operating System with Notion-style Pages, Blocks, Tags, and Relations.",
        },
        {
          id: "b-3",
          type: "todo",
          content: "Complete block editor implementation",
          checked: true,
        },
        {
          id: "b-4",
          type: "bullet",
          content: "Interactive Notion-style blocks (heading, text, todo, bullet, quote, code)",
        },
        {
          id: "b-5",
          type: "quote",
          content: "Simplicity is prerequisite for reliability. — Edsger Dijkstra",
        },
        {
          id: "b-6",
          type: "code",
          content: "console.log('LifeOS is running');",
        },
      ],
    },
  },
];

const ALL_RECORDS: (SeedRecord & { tags?: string[] })[] = [
  ...PEOPLE,
  ...TASKS,
  ...PROJECTS,
  ...NOTES,
  ...EVENTS,
  ...FILES,
  ...PAGES,
];
const DEMO_USER = {
  name: "Demo User",
  email: "demo@lifeos.local",
  password: "password123",
};
const SALT_ROUNDS = 10;

async function main() {
  let users = await prisma.user.findMany({ select: { id: true, email: true, name: true } });

  if (users.length === 0) {
    const password = await bcrypt.hash(DEMO_USER.password, SALT_ROUNDS);
    const user = await prisma.user.create({
      data: { name: DEMO_USER.name, email: DEMO_USER.email, password },
      select: { id: true, email: true, name: true },
    });
    users = [user];
    console.log(`Created demo user: ${DEMO_USER.email} / ${DEMO_USER.password}`);
  }

  for (const user of users) {
    const existing = await prisma.object.findMany({
      where: { userId: user.id },
      select: { title: true, type: true },
    });
    const existingKeys = new Set(existing.map((o) => `${o.type}:${o.title}`));

    const records = [...ALL_RECORDS, ...buildMoneyRecords()];
    const toCreate = records.filter((r) => !existingKeys.has(`${r.type}:${r.title}`));

    if (toCreate.length === 0) {
      console.log(`Skipping ${user.email} — already has all seed data.`);
      continue;
    }

    await prisma.object.createMany({
      data: toCreate.map((r) => ({
        ...(r.id ? { id: r.id } : {}),
        userId: user.id,
        type: r.type,
        title: r.title,
        status: "active",
        tags: r.tags ?? [],
        properties: r.properties,
      })),
    });

    const counts = toCreate.reduce<Record<string, number>>((acc, r) => {
      acc[r.type] = (acc[r.type] ?? 0) + 1;
      return acc;
    }, {});
    console.log(`Seeded for ${user.email}:`, counts);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
