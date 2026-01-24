/**
 * @file Gradebook Handler for LTI Tool Consumer
 * @author Russell Feldhausen <russfeld@ksu.edu>
 * @exports GradeHandler LTI Tool Gradebook Handler
 */

/**
 * Provider Handler for LTI Tool Consumer
 *
 * @param {Object} req - the Express request object
 * @param {Object} res - the Express response object
 */
async function GradeHandler(req, res) {
  // Get grades from local storage (if any)
  const courses = req.app.locals.dataStore.courses;

  // Render grades view
  res.render("grades.njk", {
    title: "LTI Tool Consumer - Grades",
    courses: courses,
  });
}

export default GradeHandler;