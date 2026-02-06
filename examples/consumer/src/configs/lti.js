/**
 * @file Configuration information for LTI Toolkit
 * @author Russell Feldhausen <russfeld@ksu.edu>
 * @exports lti an LTI Toolkit instance configured for this app
 */

// Import LTI Toolkit
import LTIToolkit from "lti-toolkit";

// LTI Post Provider Grade Handler
import postProviderGrade from "../routes/post-grade.js";

// Initialize LTI Toolkit
const lti = await LTIToolkit({
  // Domain name for this application
  domain_name: process.env.DOMAIN_NAME,
  // Admin email address for this application
  admin_email: process.env.ADMIN_EMAIL,
  // Logging Level
  log_level: process.env.LOG_LEVEL || "silly",
  // Use In-memory database for testing
  db_storage: ":memory:",
  // Consumer Configuration
  consumer: {
    // Incoming grade handler
    postProviderGrade: postProviderGrade,
    // LTI Tool Consumer Information
    deployment_name: process.env.DEPLOYMENT_NAME,
    deployment_id: process.env.DEPLOYMENT_ID,
  },
});

export default lti;
