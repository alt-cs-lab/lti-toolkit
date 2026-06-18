/**
 * @file main Express application
 * @author Russell Feldhausen <russfeld@ksu.edu>
 * @exports app Express application
 */

// Load environment (must be first)
import "@dotenvx/dotenvx/config";

// Import libraries
import express from "express";
import nunjucks from "nunjucks";
import path from "path";
import session from "express-session";
import morgan from "morgan";

// Import LTI configuration
import lti from "./configs/lti.js";

// Import Middleware
import { requireAdmin } from "./middlewares/require-admin.js";
import { requireLTI } from "./middlewares/require-lti.js";
import { requireDeeplink } from "./middlewares/require-deeplink.js";

// Import Handlers
import ConsumerConfigHandler from "./routes/consumer-config.js";
import AdminHandler from "./routes/admin.js";
import IndexHandler from "./routes/index.js";
import InstructorGradeHandler from "./routes/instructor-grade.js";
import InstructorReadGradeHandler from "./routes/instructor-read-grade.js";
import InstructorDeleteGradeHandler from "./routes/instructor-delete-grade.js";
import InstructorHandler from "./routes/instructor.js";
import StudentGradeHandler from "./routes/student-grade.js";
import StudentHandler from "./routes/student.js";
import ConsumerHandler from "./routes/consumer.js";
import ConsumerDeleteHandler from "./routes/consumer-delete.js";
import ConsumerRotateHandler from "./routes/consumer-rotate.js";
import DeepLinkHandler from "./routes/deeplink.js";
import DeepLinkSelect from "./routes/deeplink-select.js";

// Create Express application
var app = express();

// Configure Express Application
// app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Configure in-memory session store
app.set("trust proxy", 1); // trust first proxy
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: { secure: "auto" }, // Note: Set to true if using HTTPS
  }),
);

// Configure Nunjucks templating engine
nunjucks.configure("src/views", {
  autoescape: true,
  express: app,
});
app.set("view engine", "njk");

// Configure global in-memory data store
// (for example purposes only - do not use in production)
app.locals.dataStore = {
  courses: {},
};

// Add Logger
app.use(morgan("dev"));

// Add LTI Toolkit Routes
app.use("/lti/provider", lti.routers.provider);

// Add Handlers
app.get("/", IndexHandler);
app.get("/admin", requireAdmin, AdminHandler);
app.get("/consumer/:id", requireAdmin, ConsumerHandler);
app.post("/consumer/:id/config", requireAdmin, ConsumerConfigHandler);
app.post("/consumer/:id/rotate", requireAdmin, ConsumerRotateHandler);
app.post("/consumer/:id/delete", requireAdmin, ConsumerDeleteHandler);
app.get("/student", requireLTI, StudentHandler);
app.post("/student/grade", requireLTI, StudentGradeHandler);
app.get("/instructor", requireLTI, InstructorHandler);
app.post("/instructor/grade", requireLTI, InstructorGradeHandler);
app.post("/instructor/read-grade", requireLTI, InstructorReadGradeHandler);
app.post("/instructor/delete-grade", requireLTI, InstructorDeleteGradeHandler);
app.get("/deeplink", requireDeeplink, DeepLinkHandler);
app.post("/deeplink/select", requireDeeplink, DeepLinkSelect);

// Use static files
app.use(express.static(path.join(import.meta.dirname, "../public")));

// Global error handler — must be registered after all routes and middleware.
// The 4-argument signature is required for Express to treat this as an error handler.
// A real application should extend this with appropriate logging and error reporting.
app.use((err, req, res, next) => {
  // eslint-disable-next-line no-console
  console.error(err);
  res.status(500).render("error.njk", { title: "Error" });
});

// Export the app
export default app;
