/**
 * @file LTI Student Grade Example
 * @author Russell Feldhausen <russfeld@ksu.edu>
 * @exports StudentHandler LTI Student Grade Handler
 */

// Import LTI configuration
import lti from "../configs/lti.js";

/**
 * Handle LTI Student Grade Postback
 *
 * @param {Object} req - the Express request object
 * @param {Object} res - the Express response object
 */
async function StudentGradeHandler(req, res) {
  // Get LTI Launch Data and Consumer from session
  const launchData = req.session.ltiLaunchData;
  const consumer = req.session.ltiConsumer;

  let error = null;
  let message = null;

  // Get grade from form submission
  const grade = parseFloat(req.body.grade);
  const activityProgress = req.body.activityProgress || "Submitted";
  const gradingProgress = req.body.gradingProgress || "FullyGraded";
  // Students may optionally pick a different line item from the AGS line items
  // list (see lineItems below); falls back to the line item for the resource
  // link they actually launched.
  const lineitemUrl = req.body.lineitem_url || launchData.outcome_url;
  if (isNaN(grade) || grade < 0 || grade > 1) {
    error = "Invalid grade value. Must be between 0 and 1.";
  } else {
    // Post grade back to the LTI Provider
    // Build Grade Object
    const gradeObject = {
      // LTI 1.0 Outcome Information
      grade_url: lineitemUrl,
      lms_grade_id: launchData.outcome_id,
      // Grade value between 0.0 and 1.0
      score: grade,
      // LTI 1.3 User ID
      user_lis13_id: launchData.user_lis13_id,
      // Helpful Debugging Information
      debug: {
        // User Name
        user: launchData.user_name,
        // User ID (LTI 1.0 and LTI 1.3)
        user_id: launchData.user_lis_id + " (" + launchData.user_lis13_id + ")",
        // Assignment Name
        assignment: launchData.assignment_name,
        // Assignment ID (LTI 1.0 and LTI 1.3)
        assignment_id: launchData.assignment_id + "(" + launchData.assignment_lti_id + ")",
      },
    };
    try {
      if (
        await lti.controllers.provider.postGrade(
          consumer.key,
          gradeObject.grade_url,
          gradeObject.lms_grade_id,
          gradeObject.score,
          gradeObject.user_lis13_id,
          gradeObject.debug,
          activityProgress,
          gradingProgress,
        )
      ) {
        message = `Successfully posted grade of ${grade} back to the LMS.`;
        // Record grade in local data store
        updateDataStoreWithGrade(launchData, grade, lineitemUrl, req);
      } else {
        error = "Failed to post grade back to the LMS.";
      }
    } catch (err) {
      error = "Error posting grade back to the LMS: " + err.message;
    }
  }

  let lineItems = null;
  let agsError = null;

  // Re-fetch AGS line items so the page renders with the selection list intact
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
    message: message,
    error: error,
    launchData: launchData,
    consumer: consumer,
    lineItems: lineItems,
    agsError: agsError,
  });
}

/**
 * Update local data store with posted grade
 * @param {Object} launchData - the LTI Launch Data object
 * @param {Number} grade - the grade value between 0.0 and 1.0
 * @param {String} lineitemUrl - the line item URL the grade was posted to
 * @param {Object} req - the Express request object
 */
function updateDataStoreWithGrade(launchData, grade, lineitemUrl, req) {
  // This is a placeholder function for updating a local data store
  // In a real application, you would implement logic to store
  // relevant grade data in your database or other storage system

  // Only cache the score locally if it was posted to the line item for the
  // resource link the student actually launched - a grade posted to a
  // different, arbitrarily-chosen line item doesn't correspond to any known
  // local assignment record. The LMS's own AGS results remain the source of
  // truth for grades posted to other line items.
  if (lineitemUrl !== launchData.outcome_url) {
    return;
  }

  const courses = req.app.locals.dataStore.courses;
  const courseId = launchData.course_id;
  const assignmentId = launchData.assignment_id;
  const userEmail = launchData.user_email;
  if (
    courses[courseId] &&
    courses[courseId].assignments[assignmentId] &&
    courses[courseId].assignments[assignmentId].grades[userEmail]
  ) {
    courses[courseId].assignments[assignmentId].grades[userEmail].score = grade;
  }
}

export default StudentGradeHandler;
