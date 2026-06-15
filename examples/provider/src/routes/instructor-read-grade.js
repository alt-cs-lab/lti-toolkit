/**
 * @file LTI Instructor Read Grade Example
 * @author Russell Feldhausen <russfeld@ksu.edu>
 * @exports InstructorReadGradeHandler LTI Instructor Read Grade Handler
 */

// Import LTI configuration
import lti from "../configs/lti.js";

/**
 * Handle LTI Instructor Read Grade Request (LTI 1.0 Basic Outcomes)
 *
 * @param {Object} req - the Express request object
 * @param {Object} res - the Express response object
 */
async function InstructorReadGradeHandler(req, res) {
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
      const score = await lti.controllers.lti.provider.readGrade(
        consumer.key,
        assignment.grade_url,
        studentGrade.outcome_id,
      );
      if (score === null) {
        message = `No grade on file for ${studentGrade.name}.`;
      } else {
        message = `Current grade for ${studentGrade.name}: ${score} (${Math.round(score * 100)}%)`;
      }
    } catch (err) {
      error = "Error reading grade from the LMS: " + err.message;
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

export default InstructorReadGradeHandler;
