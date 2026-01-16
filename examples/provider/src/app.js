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

// Import LTI configuration
import lti from "./configs/lti.js";

// Import Middleware
import { requireLTI } from "./middlewares/require-lti.js";

// Import Handlers
import IndexHandler from "./routes/index.js";
import StudentHandler from "./routes/student.js";
import StudentGradeHandler from "./routes/student-grade.js";
import InstructorHandler from "./routes/instructor.js";
import InstructorGradeHandler from "./routes/instructor-grade.js";

// Create Express application
var app = express();

// Configure Express Application
// app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Configure in-memory session store
app.set('trust proxy', 1) // trust first proxy
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
  cookie: { secure: 'auto' } // Note: Set to true if using HTTPS
}));

// Configure Nunjucks templating engine
nunjucks.configure("src/views", {
  autoescape: true,
  express: app
});
app.set("view engine", "njk");

// Configure global in-memory data store
// (for example purposes only - do not use in production)
app.locals.dataStore = {
  courses: {},
};

// Add LTI Toolkit Routes
app.use("/lti/provider", lti.routers.provider);

// Add Handlers
app.get("/student", requireLTI, StudentHandler);
app.post("/student/grade", requireLTI, StudentGradeHandler);
app.get("/instructor", requireLTI, InstructorHandler);
app.post("/instructor/grade", requireLTI, InstructorGradeHandler);
app.get("/", IndexHandler);

// Use static files
app.use(express.static(path.join(import.meta.dirname, "../public")));

// Export the app
export default app;