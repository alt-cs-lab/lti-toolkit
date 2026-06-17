/**
 * @file LTI Instructor Delete Grade Example
 * @author Russell Feldhausen <russfeld@ksu.edu>
 * @exports InstructorDeleteGradeHandler LTI Instructor Delete Grade Handler
 */

// Import LTI configuration
import lti from "../configs/lti.js";

/**
 * Handle LTI Instructor Delete Grade Request (LTI 1.0 Basic Outcomes)
 *
 * @param {Object} req - the Express request object
 * @param {Object} res - the Express response object
 */
async function InstructorDeleteGradeHandler(req, res) {
  // Get LTI Launch Data and Consumer from session
  const launchData = req.session.ltiLaunchData;
  const consumer = req.session.ltiConsumer;

  let error = null;
  let message = null;

  // Get form data
  const courseId = req.body.course;
  const assignmentId = req.body.assignment;
  const userId = req.body.user;

  const courses = req.app.locals.dataStore.courses;
  const assignment = courses[courseId]?.assignments[assignmentId];
  const studentGrade = assignment?.grades[userId];

  if (!studentGrade || !studentGrade.outcome_id) {
    error = "No LTI 1.0 outcome ID found for this student.";
  } else {
    try {
      await lti.controllers.provider.deleteGrade(consumer.key, assignment.grade_url, studentGrade.outcome_id);
      message = `Grade deleted successfully for ${studentGrade.name}.`;
      // Clear the stored score since it's been deleted on the LMS
      studentGrade.score = null;
    } catch (err) {
      error = "Error deleting grade from the LMS: " + err.message;
    }
  }

  // Render instructor view with result
  res.render("instructor.njk", {
    title: "LTI Tool Provider - Instructor View",
    message: message,
    error: error,
    courses: courses,
    launchData: launchData,
    consumer: consumer,
  });
}

export default InstructorDeleteGradeHandler;
