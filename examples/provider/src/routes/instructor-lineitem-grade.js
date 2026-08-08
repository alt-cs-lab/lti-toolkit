/**
 * @file LTI Instructor Line Item Grade Example
 * @author Russell Feldhausen <russfeld@ksu.edu>
 * @exports InstructorLineItemGradeHandler LTI Instructor Line Item Grade Handler
 */

// Import LTI configuration
import lti from "../configs/lti.js";

/**
 * Handle LTI Instructor Grade Postback for any student on any line item (LTI 1.3 AGS)
 *
 * @param {Object} req - the Express request object
 * @param {Object} res - the Express response object
 */
async function InstructorLineItemGradeHandler(req, res) {
  // Get LTI Launch Data and Consumer from session
  const launchData = req.session.ltiLaunchData;
  const consumer = req.session.ltiConsumer;

  let error = null;
  let message = null;

  // Get form data
  const lineitemUrl = req.body.lineitem_url;
  const userLis13Id = req.body.user_lis13_id;
  const grade = parseFloat(req.body.grade);
  const activityProgress = req.body.activityProgress || "Submitted";
  const gradingProgress = req.body.gradingProgress || "FullyGraded";

  if (!lineitemUrl || !userLis13Id) {
    error = "A line item and a student are required to post a grade.";
  } else if (isNaN(grade) || grade < 0 || grade > 1) {
    error = "Invalid grade value. Must be between 0 and 1.";
  } else {
    try {
      // No lms_grade_id is available for an arbitrary student/line item combination,
      // so this always takes the LTI 1.3 AGS path via postGrade.
      await lti.controllers.provider.postGrade(
        consumer.key,
        lineitemUrl,
        null,
        grade,
        userLis13Id,
        {},
        activityProgress,
        gradingProgress,
      );
      message = `Successfully posted grade of ${grade} to the selected line item.`;
    } catch (err) {
      error = "Error posting grade to the LMS: " + err.message;
    }
  }

  let lineItem = null;
  let results = null;
  let lineItems = null;
  let agsError = null;

  // Re-fetch AGS data so the page renders with current state
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

export default InstructorLineItemGradeHandler;
