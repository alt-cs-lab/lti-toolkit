/**
 * @file Middleware to require LTI Deeplink Launch
 * @author Russell Feldhausen <russfeld@ksu.edu>
 * @exports requireLTI Middleware to require LTI Deeplink launch
 */

/**
 * Middleware to require LTI Deeplink launch
 *
 * @param {Object} req - the Express request object
 * @param {Object} res - the Express response object
 * @param {Function} next - the next middleware function
 */
export function requireDeeplink(req, res, next) {
  // Check if LTI Launch Data is in session
  if (req.session.ltiDeeplinkData) {
    // LTI Deeplink Launch Data exists, proceed to next middleware
    return next();
  } else {
    // No LTI Launch Data, redirect to error page or show message
    return res.status(403).send("Access denied. LTI deeplink launch required.");
  }
}

export default requireDeeplink;
