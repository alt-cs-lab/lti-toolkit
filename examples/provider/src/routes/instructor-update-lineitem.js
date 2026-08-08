/**
 * @file LTI Instructor Update Line Item Example
 * @author Russell Feldhausen <russfeld@ksu.edu>
 * @exports InstructorUpdateLineItemHandler LTI Instructor Update Line Item Handler
 */

// Import LTI configuration
import lti from "../configs/lti.js";

/**
 * Handle LTI Instructor Update Line Item Request (LTI 1.3 AGS)
 *
 * @param {Object} req - the Express request object
 * @param {Object} res - the Express response object
 */
async function InstructorUpdateLineItemHandler(req, res) {
  // Get LTI Launch Data and Consumer from session
  const launchData = req.session.ltiLaunchData;
  const consumer = req.session.ltiConsumer;

  let error = null;
  let message = null;

  // Get form data
  const lineitemId = req.body.lineitem_id;
  const label = req.body.label;
  const scoreMaximum = parseFloat(req.body.scoreMaximum);
  const resourceId = req.body.resourceId || undefined;
  const tag = req.body.tag || undefined;
  // Client-side JS converts the datetime-local inputs to full UTC ISO strings before submit
  const startDateTime = req.body.startDateTime || undefined;
  const endDateTime = req.body.endDateTime || undefined;

  if (!lineitemId) {
    error = "No line item selected to update.";
  } else if (!label || isNaN(scoreMaximum)) {
    error = "A label and a valid maximum score are required to update a line item.";
  } else {
    try {
      const lineItem = await lti.controllers.provider.updateLineItem(consumer.key, lineitemId, {
        label,
        scoreMaximum,
        resourceId,
        tag,
        startDateTime,
        endDateTime,
      });
      message = `Successfully updated line item "${lineItem.label}".`;
    } catch (err) {
      error = "Error updating line item on the LMS: " + err.message;
    }
  }

  let lineItem = null;
  let results = null;
  let lineItems = null;
  let agsError = null;

  // Re-fetch AGS data so the page renders with the updated line item
  if (launchData.launch_type === "lti1.3" && launchData.outcome_url) {
    try {
      lineItem = await lti.controllers.provider.getLineItem(consumer.key, launchData.outcome_url);
      results = await lti.controllers.provider.getResults(consumer.key, launchData.outcome_url + "/results");
    } catch (err) {
      agsError = "Error fetching AGS data: " + err.message;
    }
  }
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
    message: message,
    error: error,
    courses: req.app.locals.dataStore.courses,
    launchData: launchData,
    consumer: consumer,
    lineItem: lineItem,
    lineItems: lineItems,
    results: results,
    agsError: agsError,
  });
}

export default InstructorUpdateLineItemHandler;
