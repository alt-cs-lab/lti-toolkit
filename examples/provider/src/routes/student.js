/**
 * @file LTI Student Example
 * @author Russell Feldhausen <russfeld@ksu.edu>
 * @exports StudentHandler LTI Student Launch Handler
 */

// Import LTI configuration
import lti from "../configs/lti.js";

/**
 * Handle LTI Student Launch
 *
 * @param {Object} req - the Express request object
 * @param {Object} res - the Express response object
 */
async function StudentHandler(req, res) {
  // Get LTI Launch Data and Consumer from session
  const launchData = req.session.ltiLaunchData;
  const consumer = req.session.ltiConsumer;

  let lineItems = null;
  let agsError = null;

  // For LTI 1.3 launches, fetch all line items in the course so the student can
  // submit a grade for any of them, not just the one they launched
  if (launchData.launch_type === "lti1.3" && launchData.outcome_lineitems) {
    try {
      lineItems = await lti.controllers.provider.getLineItems(consumer.key, launchData.outcome_lineitems);
    } catch (err) {
      agsError = "Error fetching AGS line items: " + err.message;
    }
  }

  // Render student view with LTI Launch Data
  res.render("student.njk", {
    title: "LTI Tool Provider - Student View",
    launchData: launchData,
    consumer: consumer,
    lineItems: lineItems,
    agsError: agsError,
  });
}

export default StudentHandler;
