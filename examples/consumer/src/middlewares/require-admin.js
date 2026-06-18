/**
 * @file Middleware to require admin authentication
 * @author Russell Feldhausen <russfeld@ksu.edu>
 * @exports requireAdmin Middleware to require admin authentication
 */

// Import libraries
import crypto from "crypto";

/**
 * Middleware to require HTTP Basic Auth for admin routes.
 *
 * This is the bare minimum for protecting admin routes in a demo application.
 * A real application should use proper authentication and authorization (e.g.
 * OAuth 2.0, SSO, or a framework-level auth system) instead of Basic Auth.
 *
 * Set the ADMIN_PASSWORD environment variable to enable access. If the variable
 * is not set, all requests are rejected.
 *
 * @param {Object} req - the Express request object
 * @param {Object} res - the Express response object
 * @param {Function} next - the next middleware function
 */
export function requireAdmin(req, res, next) {
  const adminPassword = process.env.ADMIN_PASSWORD;

  // Fail closed: if no password is configured, deny all access
  if (!adminPassword) {
    res.setHeader("WWW-Authenticate", 'Basic realm="Admin"');
    return res.status(401).send("Unauthorized: ADMIN_PASSWORD environment variable is not set.");
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Basic ")) {
    res.setHeader("WWW-Authenticate", 'Basic realm="Admin"');
    return res.status(401).send("Unauthorized");
  }

  // Decode Basic Auth credentials (username:password) — only the password is checked
  const credentials = Buffer.from(authHeader.slice(6), "base64").toString("utf8");
  const colonIndex = credentials.indexOf(":");
  const password = colonIndex >= 0 ? credentials.slice(colonIndex + 1) : credentials;

  // Use timingSafeEqual to prevent timing-based attacks
  const passwordBuf = Buffer.from(password);
  const adminPasswordBuf = Buffer.from(adminPassword);
  if (passwordBuf.length !== adminPasswordBuf.length || !crypto.timingSafeEqual(passwordBuf, adminPasswordBuf)) {
    res.setHeader("WWW-Authenticate", 'Basic realm="Admin"');
    return res.status(401).send("Unauthorized");
  }

  return next();
}

export default requireAdmin;
