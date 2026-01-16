/**
 * @file LTI Student Example
 * @author Russell Feldhausen <russfeld@ksu.edu>
 * @exports StudentHandler LTI Student Launch Handler
 */

/**
 * Handle LTI Student Launch
 *
 * @param {Object} req - the Express request object
 * @param {Object} res - the Express response object
 */
async function StudentHandler(req, res) {
  // Get LTI Launch Data and Consumer from session
  const launchData = req.session.ltiLaunchData;
  const consumer = req.session.ltiConsumer;

  // Render student view with LTI Launch Data
  res.render("student.njk", {
    title: "LTI Tool Provider - Student View",
    launchData: launchData,
    consumer: consumer,
  });
}

export default StudentHandler;
