/**
 * @file Middleware to require LTI launch
 * @author Russell Feldhausen <russfeld@ksu.edu>
 * @exports requireLTI Middleware to require LTI launch
 */

/**
 * Middleware to require LTI launch
 *
 * @param {Object} req - the Express request object
 * @param {Object} res - the Express response object
 * @param {Function} next - the next middleware function
 */
export function requireLTI(req, res, next) {
  // Check if LTI Launch Data is in session
  if (req.session.ltiLaunchData) {
    // LTI Launch Data exists, proceed to next middleware
    return next();
  } else {
    // No LTI Launch Data, redirect to error page or show message
    return res.status(403).send("Access denied. LTI launch required.");
  }
}

export default requireLTI;
