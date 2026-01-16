/**
 * @file LTI Instructor Example
 * @author Russell Feldhausen <russfeld@ksu.edu>
 * @exports Instructor LTI Instructor Launch Handler
 */

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

  // Render instructor view with LTI Launch Data
  res.render("instructor.njk", {
    title: "LTI Tool Provider - Instructor View",
    courses: req.app.locals.dataStore.courses,
    launchData: launchData,
    consumer: consumer
  });
}

export default InstructorHandler;