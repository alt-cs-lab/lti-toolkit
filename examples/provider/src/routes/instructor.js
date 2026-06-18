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

  let lineItems = null;

  // For LTI 1.3 launches, fetch line item info and results from the consumer
  if (launchData.launch_type === "lti1.3" && launchData.outcome_url) {
    try {
      lineItem = await lti.controllers.provider.getLineItem(consumer.key, launchData.outcome_url);
      results = await lti.controllers.provider.getResults(consumer.key, launchData.outcome_url + "/results");
    } catch (err) {
      agsError = "Error fetching AGS data: " + err.message;
    }
  }

  // For LTI 1.3 launches, also fetch the full line items collection for this course
  if (launchData.launch_type === "lti1.3" && launchData.outcome_lineitems) {
    try {
      lineItems = await lti.controllers.provider.getLineItems(consumer.key, launchData.outcome_lineitems);
    } catch (err) {
      agsError = agsError || "Error fetching AGS line items: " + err.message;
    }
  }

  // Render instructor view with LTI Launch Data
  res.render("instructor.njk", {
    title: "LTI Tool Provider - Instructor View",
    courses: req.app.locals.dataStore.courses,
    launchData: launchData,
    consumer: consumer,
    lineItem: lineItem,
    lineItems: lineItems,
    results: results,
    agsError: agsError,
  });
}

export default InstructorHandler;
