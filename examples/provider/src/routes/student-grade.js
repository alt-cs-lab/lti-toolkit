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
  if (isNaN(grade) || grade < 0 || grade > 1) {
    error = "Invalid grade value. Must be between 0 and 1.";
  } else {
    // Post grade back to the LTI Provider
    // Build Grade Object
    const gradeObject = {
      // LTI Consumer ID
      consumer_id: consumer.id,
      // LTI 1.0 Outcome Information
      grade_url: launchData.outcome_url,
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
    if (lti.controllers.lti.postGrade(gradeObject)) {
      message = `Successfully posted grade of ${grade} back to the LMS.`;
      // Record grade in local data store
      updateDataStoreWithGrade(launchData, grade, req);
    } else {
      error = "Failed to post grade back to the LMS.";
    }
  }

  // Render student view with LTI Launch Data
  res.render("student.njk", {
    title: "LTI Tool Provider - Student View",
    message: message,
    error: error,
    launchData: launchData,
    consumer: consumer,
  });
}

/**
 * Update local data store with posted grade
 * @param {Object} launchData - the LTI Launch Data object
 * @param {Number} grade - the grade value between 0.0 and 1.0
 * @param {Object} req - the Express request object
 */
function updateDataStoreWithGrade(launchData, grade, req) {
  // This is a placeholder function for updating a local data store
  // In a real application, you would implement logic to store
  // relevant grade data in your database or other storage system
  const courses = req.app.locals.dataStore.courses;
  const courseId = launchData.course_id;
  const assignmentId = launchData.assignment_id;
  const userId = launchData.user_lis_id;
  if (
    courses[courseId] &&
    courses[courseId].assignments[assignmentId] &&
    courses[courseId].assignments[assignmentId].grades[userId]
  ) {
    courses[courseId].assignments[assignmentId].grades[userId].score = grade;
  }
}

export default StudentGradeHandler;
