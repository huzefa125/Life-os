import express from "express";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
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
import expensesRouter from "./routes/expenses.routes";
import pagesRouter from "./routes/pages.routes";
import favoritesRouter from "./routes/favorites.routes";
import archiveRouter from "./routes/archive.routes";
import trashRouter from "./routes/trash.routes";
import tagsRouter from "./routes/tags.routes";
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
app.use("/api/expenses", expensesRouter);
app.use("/api/pages", pagesRouter);
app.use("/api/favorites", favoritesRouter);
app.use("/api/archive", archiveRouter);
app.use("/api/trash", trashRouter);
app.use("/api/tags", tagsRouter);

app.get("/api-docs.json", (req, res) => res.json(openApiDocument));
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(openApiDocument));

app.use(errorHandler);

export default app;