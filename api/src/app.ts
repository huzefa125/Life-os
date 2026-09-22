import path from "path";
import express from "express";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import { env } from "./config/env";
import healthRouter from "./routes/health.routes";
import dbHealthRouter from "./routes/db-health.routes";
import authRouter from "./routes/auth.routes";
import peopleRouter from "./routes/people.routes";
import relationsRouter from "./routes/relations.routes";
import objectsRouter from "./routes/object.routes";
import searchRouter from "./routes/search.routes";
import timelineRouter from "./routes/timeline.routes";
import tasksRouter from "./routes/tasks.routes";
import projectsRouter from "./routes/projects.routes";
import notesRouter from "./routes/notes.routes";
import eventsRouter from "./routes/events.routes";
import filesRouter from "./routes/files.routes";
import accountsRouter from "./routes/accounts.routes";
import categoriesRouter from "./routes/categories.routes";
import transactionsRouter from "./routes/transactions.routes";
import budgetsRouter from "./routes/budgets.routes";
import recurringRouter from "./routes/recurring.routes";
import goalsRouter from "./routes/goals.routes";
import moneyRouter from "./routes/money.routes";
import pagesRouter from "./routes/pages.routes";
import favoritesRouter from "./routes/favorites.routes";
import archiveRouter from "./routes/archive.routes";
import trashRouter from "./routes/trash.routes";
import tagsRouter from "./routes/tags.routes";
import formsRouter from "./routes/forms.routes";
import publicFormsRouter from "./routes/public-forms.routes";
import { errorHandler } from "./middleware/errorHandler";
import { openApiDocument } from "./docs/openapi";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/health", healthRouter);
app.use("/api/db-health", dbHealthRouter);
app.use("/api/auth", authRouter);
app.use("/api/people", peopleRouter);
app.use("/api/relations", relationsRouter);
app.use("/api/objects", objectsRouter);
app.use("/api/search", searchRouter);
app.use("/api/timeline", timelineRouter);
app.use("/api/tasks", tasksRouter);
app.use("/api/projects", projectsRouter);
app.use("/api/notes", notesRouter);
app.use("/api/events", eventsRouter);
app.use("/api/files", filesRouter);
app.use("/api/accounts", accountsRouter);
app.use("/api/categories", categoriesRouter);
app.use("/api/transactions", transactionsRouter);
app.use("/api/budgets", budgetsRouter);
app.use("/api/recurring-transactions", recurringRouter);
app.use("/api/goals", goalsRouter);
app.use("/api/money", moneyRouter);
app.use("/api/pages", pagesRouter);
app.use("/api/favorites", favoritesRouter);
app.use("/api/archive", archiveRouter);
app.use("/api/trash", trashRouter);
app.use("/api/tags", tagsRouter);
app.use("/api/forms", formsRouter);
app.use("/api/public/forms", publicFormsRouter);

// Uploaded form attachments — served with headers that prevent stored-XSS
// via user-uploaded content (e.g. a crafted PDF/image opened as HTML).
app.use(
  "/uploads",
  (req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Content-Security-Policy", "default-src 'none'");
    res.setHeader("Content-Disposition", "inline");
    next();
  },
  express.static(path.resolve(process.cwd(), env.UPLOAD_DIR))
);

app.get("/api-docs.json", (req, res) => res.json(openApiDocument));
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(openApiDocument));

app.use(errorHandler);

export default app;