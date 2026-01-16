/**
 * @file LTI Instructor Grade Example
 * @author Russell Feldhausen <russfeld@ksu.edu>
 * @exports InstructorGradeHandler LTI Instructor Grade Handler
 */

// Import LTI configuration
import lti from "../configs/lti.js";

/**
 * Handle LTI Instructor Grade Postback
 *
 * @param {Object} req - the Express request object
 * @param {Object} res - the Express response object
 */
async function InstructorGradeHandler(req, res) {
  // Get LTI Launch Data and Consumer from session
  const launchData = req.session.ltiLaunchData;
  const consumer = req.session.ltiConsumer;

  let error = null;
  let message = null;

  // Get form data
  const assignmentId = req.body.assignment;
  const userId = req.body.user;
  const grade = parseFloat(req.body.grade);

  // Get assignment and user info from local data store
  // This is a placeholder function for updating a local data store
  // In a real application, you would implement logic to store
  // relevant grade data in your database or other storage system
  const courses = req.app.locals.dataStore.courses;
  const courseId = launchData.course_id;
  const assignments = courses[courseId].assignments;

  if (isNaN(grade) || grade < 0 || grade > 1) {
    error = "Invalid grade value. Must be between 0 and 1.";
  } else {
    // Post grade back to the LTI Provider
    // Build Grade Object
    const gradeObject = {
      // LTI Consumer ID
      consumer_id: consumer.id,
      // LTI 1.0 Outcome Information
      grade_url: assignments[assignmentId].grade_url,
      lms_grade_id: assignments[assignmentId].grades[userId].outcome_id,
      // Grade value between 0.0 and 1.0
      score: grade,
      // LTI 1.3 User ID
      user_lis13_id: assignments[assignmentId].grades[userId].lis13_id,
      // Helpful Debugging Information
      debug: {
        // User Name
        user: assignments[assignmentId].grades[userId].name,
        // User ID (LTI 1.0 and LTI 1.3)
        user_id:
          assignments[assignmentId].grades[userId].lis_id +
          " (" +
          assignments[assignmentId].grades[userId].lis13_id +
          ")",
        // Assignment Name
        assignment: assignments[assignmentId].name,
        // Assignment ID (LTI 1.0 and LTI 1.3)
        assignment_id:
          assignmentId + "(" + assignments[assignmentId].lti_id + ")",
      },
    };
    if (lti.controllers.lti.postGrade(gradeObject)) {
      message = `Successfully posted grade of ${grade} back to the LMS.`;

      // Record grade in local data store
      assignments[assignmentId].grades[userId].score = grade;
    } else {
      error = "Failed to post grade back to the LMS.";
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
  });
}

export default InstructorGradeHandler;
