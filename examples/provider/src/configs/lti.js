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
  // Use an in-memory database for demo/testing purposes only - all registered
  // consumers/providers/keys are lost on every restart. For a real application,
  // use a file-based (or external) database instead, e.g.:
  // db_storage: "./data/lti.sqlite",
  db_storage: ":memory:",
  // Encryption key used to encrypt secrets and private keys at rest (64-character hex string)
  encryption_key: process.env.LTI_ENCRYPTION_KEY,
  provider: {
    // Incoming LTI Launch Handler
    handleLaunch: LTILaunch,
    // Enable Deeplinking
    handleDeeplink: LTIDeepLink,
    // Enable Course Navigation Link
    navigation: true,
  },
});

// Create a single LTI 1.0 consumer on startup if one with this key doesn't already exist.
// Using getByKey + createConsumer is safe across restarts: on an in-memory database the
// consumer is always absent; on a persistent database it is only created once.
if (process.env.LTI_CONSUMER_KEY && process.env.LTI_CONSUMER_SECRET) {
  const existing = await lti.controllers.consumerRegistry.getByKey(process.env.LTI_CONSUMER_KEY);
  if (!existing) {
    await lti.controllers.consumerRegistry.createConsumer({
      name: "My LMS",
      key: process.env.LTI_CONSUMER_KEY,
      secret: process.env.LTI_CONSUMER_SECRET,
      lti13: false,
    });
  }
}

export default lti;
