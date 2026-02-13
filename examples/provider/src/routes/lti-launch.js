/* eslint no-console: ["error", { allow: ["error"] }] */

/**
 * @file LTI Launch Handler
 * @author Russell Feldhausen <russfeld@ksu.edu>
 * @exports LTILaunch LTI Launch Handler
 */

/**
 * Handle an incoming LTI Launch Request
 *
 * @see https://alt.cs.ksu.edu/lti-toolkit//02-lti/03-launchdata/
 *
 * @param {Object} launchData - an LTI Launch Data object
 * @param {Object} consumer - the LTI consumer object
 * @param {Object} req - the Express request object
 * @returns {String} a URL to redirect the user to after launch
 */
async function LTILaunch(launchData, consumer, req) {
  // Enable logging to console
  // (this data also appears at the bottom of each template page)
  // console.log("LTI Launch Data:", launchData);
  // console.log("LTI Consumer:", consumer.toJSON());

  // We will store the LTI Launch Data and Consumer in the session for later use
  req.session.ltiLaunchData = launchData;
  req.session.ltiConsumer = consumer.toJSON();

  // Determine if the user is a teacher or student
  const isStudent = parseRoles(launchData);

  // Record data in local data store
  updateDataStore(launchData, isStudent, req);

  // Redirect user based on role
  if (isStudent) {
    return "/student";
  } else {
    return "/instructor";
  }
}

/**
 * Parse LTI roles to determine user type
 *
 * @param {Object} launchData - the LTI Launch Data object
 * @returns {Boolean} 'true' if user is a student, 'false' otherwise
 */
function parseRoles(launchData) {
  try {
    if (launchData.launch_type === "lti1.0") {
      // See https://www.imsglobal.org/specs/ltiv1p0/implementation-guide#toc-9
      // LTI 1.0 roles are a long string
      if (launchData.user_roles.includes("Learner")) {
        return true;
      }
      return false;
    } else if (launchData.launch_type === "lti1.3") {
      // See https://www.imsglobal.org/spec/lti/v1p3#role-vocabularies
      // LTI 1.3 roles are an array of strings
      if (launchData.user_roles.some((role) => role.includes("Learner"))) {
        return true;
      }
      return false;
    } else {
      // Unknown LTI version
      console.error("Unknown LTI launch type:", launchData.launch_type);
      return false;
    }
  } catch (error) {
    console.error("Error parsing roles:", error);
    console.error("Roles data:", launchData.user_roles);
    return false;
  }
}

/**
 * Update local data store
 *
 * @param {Object} launchData - the LTI Launch Data object
 * @param {Boolean} isStudent - 'true' if user is a student, 'false' otherwise
 * @param {Object} req - the Express request object
 */
function updateDataStore(launchData, isStudent, req) {
  // This is a placeholder function for updating a local data store
  // In a real application, you would implement logic to store
  // relevant launch data in your database or other storage system
  const courses = req.app.locals.dataStore.courses;
  const courseId = launchData.course_id;
  if (!courses[courseId]) {
    courses[courseId] = {
      name: launchData.course_name,
      label: launchData.course_label,
      assignments: {},
    };
  }
  const assignments = courses[courseId].assignments;
  const assignmentId = launchData.assignment_id;
  if (!assignments[assignmentId]) {
    assignments[assignmentId] = {
      name: launchData.assignment_name,
      lti_id: launchData.assignment_lti_id,
      grade_url: launchData.outcome_url,
      grades: {},
    };
  }
  if (isStudent) {
    const userName = launchData.user_name;
    const userEmail = launchData.user_email;
    const userId = launchData.user_lis_id;
    const userId13 = launchData.user_lis13_id;
    const outcomeId = launchData.outcome_id;
    assignments[assignmentId].grades[userEmail] = {
      name: userName,
      email: userEmail,
      lis_id: userId,
      lis13_id: userId13,
      outcome_id: outcomeId,
      score: null,
    };
  }
}

export default LTILaunch;
