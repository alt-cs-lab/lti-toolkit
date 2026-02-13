/**
 * @file Configuration information for LTI Toolkit
 * @author Russell Feldhausen <russfeld@ksu.edu>
 * @exports lti an LTI Toolkit instance configured for this app
 */

// Import LTI Toolkit
import LTIToolkit from "lti-toolkit";

// LTI Launch Handler
import LTILaunch from "../routes/lti-launch.js";

// LTI Deeplink Handler
import LTIDeepLink from "../routes/deeplink-launch.js";

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
  provider: {
    // Incoming LTI Launch Handler
    handleLaunch: LTILaunch,
    // // LTI 1.0 Consumer Key and Shared Secret
    // // for single LTI consumer setup
    // key: process.env.LTI_CONSUMER_KEY,
    // secret: process.env.LTI_CONSUMER_SECRET,
    // Enable Deeplinking
    handleDeeplink: LTIDeepLink,
    // Enable Course Navigation Link
    navigation: true,
  },
});

export default lti;
