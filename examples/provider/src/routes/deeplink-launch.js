/* eslint no-console: ["error", { allow: ["error"] }] */

/**
 * @file LTI Deeplink Handler
 * @author Russell Feldhausen <russfeld@ksu.edu>
 * @exports LTIDeepLink LTI Deeplink Handler
 */

/**
 * Handle an incoming LTI Deeplink Request
 *
 * @param {Object} deeplinkData - an LTI Deep Link Data object
 * @param {Object} consumer - the LTI consumer object
 * @param {Object} req - the Express request object
 * @returns {String} a URL to redirect the user to after launch
 */
async function LTIDeepLink(deeplinkData, consumer, req) {
  // Enable logging to console
  // (this data also appears at the bottom of each template page)
  // console.log("LTI Launch Data:", launchData);
  // console.log("LTI Consumer:", consumer.toJSON());

  // We will store the LTI Launch Data and Consumer in the session for later use
  req.session.ltiDeeplinkData = deeplinkData;
  req.session.ltiConsumer = consumer.toJSON();

  // Determine if the user is a teacher or student
  const isStudent = parseRoles(deeplinkData);

  // Redirect user based on role
  if (isStudent) {
    // Students should not reach this, so redirecting to an error URL that will 404
    return "/error";
  } else {
    return "/deeplink";
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
    } else if (launchData.launch_type.startsWith("lti1.3")) {
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

export default LTIDeepLink;
