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

// Import Handlers
import IndexHandler from "./routes/index.js";
import ConfigureProviderHandler from "./routes/configure.js";
import GradeHandler from "./routes/grades.js";
import ProviderHandler from "./routes/provider.js";
import ProviderLaunchHandler from "./routes/provider-launch.js";
import ProviderConfigXMLHandler from "./routes/configurexml.js";
import ProviderConfigDynamicHandler from "./routes/configuredynamic.js";
import DeepLinkHandler from "./routes/deeplink.js";
import DeepLinkResultHandler from "./routes/deeplink-result.js";
import ProviderUpdateHandler from "./routes/provider-update.js";
import ProviderDeleteHandler from "./routes/provider-delete.js";
import ProviderRotateHandler from "./routes/provider-rotate.js";

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
app.use("/lti/consumer", lti.routers.consumer);

// Add Handlers
app.get("/", IndexHandler);
app.post("/configure", requireAdmin, ConfigureProviderHandler);
app.post("/configure/xml", requireAdmin, ProviderConfigXMLHandler);
app.post("/configure/dynamic", requireAdmin, ProviderConfigDynamicHandler);
app.get("/provider/:id", requireAdmin, ProviderHandler);
app.post("/provider/:id/launch", requireAdmin, ProviderLaunchHandler);
app.post("/provider/:id/deeplink", requireAdmin, DeepLinkHandler);
app.post("/provider/:id/update", requireAdmin, ProviderUpdateHandler);
app.post("/provider/:id/delete", requireAdmin, ProviderDeleteHandler);
app.post("/provider/:id/rotate", requireAdmin, ProviderRotateHandler);
app.get("/deeplink-result", requireAdmin, DeepLinkResultHandler);
app.get("/grades", requireAdmin, GradeHandler);

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
