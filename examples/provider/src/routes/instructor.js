/**
 * @file LTI Instructor Example
 * @author Russell Feldhausen <russfeld@ksu.edu>
 * @exports Instructor LTI Instructor Launch Handler
 */

// Import LTI configuration
import lti from "../configs/lti.js";

/**
 * Handle LTI Instructor Launch
 *
 * @param {Object} req - the Express request object
 * @param {Object} res - the Express response object
 */
async function InstructorHandler(req, res) {
  // Get LTI Launch Data and Consumer from session
  const launchData = req.session.ltiLaunchData;
  const consumer = req.session.ltiConsumer;

  let lineItem = null;
  let results = null;
  let agsError = null;

  // For LTI 1.3 launches, fetch line item info and results from the consumer
  if (launchData.launch_type === "lti1.3" && launchData.outcome_url) {
    try {
      lineItem = await lti.controllers.lti.provider.getLineItem(consumer.key, launchData.outcome_url);
      results = await lti.controllers.lti.provider.getResults(consumer.key, launchData.outcome_url + "/results");
    } catch (err) {
      agsError = "Error fetching AGS data: " + err.message;
    }
  }

  // Render instructor view with LTI Launch Data
  res.render("instructor.njk", {
    title: "LTI Tool Provider - Instructor View",
    courses: req.app.locals.dataStore.courses,
    launchData: launchData,
    consumer: consumer,
    lineItem: lineItem,
    results: results,
    agsError: agsError,
  });
}

export default InstructorHandler;
