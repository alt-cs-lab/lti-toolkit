/**
 * @file Configuration information for LTI Toolkit
 * @author Russell Feldhausen <russfeld@ksu.edu>
 * @exports lti an LTI Toolkit instance configured for this app
 */

// Import LTI Toolkit
import LTIToolkit from "lti-toolkit";

// LTI Grade Handlers (post, read, delete)
import postProviderGrade, { readGradeHandler, deleteGradeHandler } from "../routes/post-grade.js";

// LTI AGS Line Item and Results Handlers
import {
  getProviderLineItemHandler,
  getProviderLineItemsHandler,
  getProviderResultsHandler,
} from "../routes/get-lineitems.js";

// LTI 1.3 Deep Linking callback
import { handleDeeplink } from "../routes/deeplink-result.js";

// Initialize LTI Toolkit
const lti = await LTIToolkit({
  // Domain name for this application
  domain_name: process.env.DOMAIN_NAME,
  // Admin email address for this application
  admin_email: process.env.ADMIN_EMAIL,
  // Logging Level
  log_level: process.env.LOG_LEVEL || "silly",
  // Use an in-memory database for demo/testing purposes only - all registered
  // consumers/providers/keys are lost on every restart. For a real application,
  // use a file-based (or external) database instead, e.g.:
  // db_storage: "./data/lti.sqlite",
  db_storage: ":memory:",
  // Encryption key used to encrypt secrets and private keys at rest (64-character hex string)
  encryption_key: process.env.LTI_ENCRYPTION_KEY,
  // Consumer Configuration
  consumer: {
    // Grade handlers (LTI 1.0)
    postProviderGrade: postProviderGrade,
    readProviderGrade: readGradeHandler,
    deleteProviderGrade: deleteGradeHandler,
    // AGS handlers (LTI 1.3)
    getProviderLineItem: getProviderLineItemHandler,
    getProviderLineItems: getProviderLineItemsHandler,
    getProviderResults: getProviderResultsHandler,
    // LTI 1.3 Deep Linking response handler
    handleDeeplink: handleDeeplink,
    // LTI Tool Consumer Information
    deployment_name: process.env.DEPLOYMENT_NAME,
    deployment_id: process.env.DEPLOYMENT_ID,
  },
});

export default lti;
