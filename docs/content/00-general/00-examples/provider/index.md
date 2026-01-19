---
title: "LTI Provider"
pre: "A. "
weight: 10
---

A fully-featured LTI Tool Provider example can be found in `/examples/provider`. This document will walk through the details of how that application works.

## Environment

The application expects the following environment variables (typically loaded from `.env`): 

```env {title=".env"}
# Express Session Secret
SESSION_SECRET=your_session_secret

# Log Level
# One of error warn info http verbose lti debug sql silly
LOG_LEVEL=lti

# Application Domain Name
DOMAIN_NAME=https://ltidemo.home.russfeld.me

# LTI Consumer Key and Secret
LTI_CONSUMER_KEY=your_lti_consumer_key
LTI_CONSUMER_SECRET=your_lti_consumer_secret

# LTI 1.3 LMS Domain
LTI_13_LMS_DOMAIN=https://canvas.instructure.com
```

## LMS Configuration

The settings above can then be used to configure this application in your learning management system (LMS). An example using Canvas is given below.

![LTI 1.0 Configuration in Canvas](images/lti10.png)

## LTI Toolkit Configuration

The `src/configs/lti.js` file contains a minimal configuration for the LTI Toolkit for use as an LTI 1.0 Tool Provider:

```js {title="src/configs/lti.js"}
/**
 * @file Configuration information for LTI Toolkit
 * @author Russell Feldhausen <russfeld@ksu.edu>
 * @exports lti an LTI Toolkit instance configured for this app
 */

// Import LTI Toolkit
import LTIToolkit from "lti-toolkit";

// LTI Launch Handler
import LTILaunch from "../routes/lti-launch.js";

// Initialize LTI Toolkit
const lti = await LTIToolkit({
  // Domain name for this application
  domain_name: process.env.DOMAIN_NAME,
  // Logging Level
  log_level: process.env.LOG_LEVEL || "silly",
  // Use In-memory database for testing
  db_storage: ":memory:",
  provider: {
    // Incoming LTI Launch Handler
    handleLaunch: LTILaunch,
    // LTI 1.0 Consumer Key and Shared Secret
    // for single LTI consumer setup
    key: process.env.LTI_CONSUMER_KEY,
    secret: process.env.LTI_CONSUMER_SECRET,
  },
});

export default lti;
```

It configures a default LTI 1.0 Tool Provider using the domain, key and secret provided in the environment. It also configures the log level and tells the system to use an in-memory database instance. Finally, it directs the library ro the `LTILaunch` function provided by one of the routes as the handler for incoming LTI Launch Requests.

## Integrating Application Routes

The `app.js` file creates a basic [Express](https://www.npmjs.com/package/express) application with a minimal set of libraries and configuration.

```js {title="app.js"}
// Import LTI configuration
import lti from "./configs/lti.js";

// Other imports here

// Create Express application
var app = express();

// Other configuration here

// Add LTI Toolkit Routes
app.use("/lti/provider", lti.routers.provider);
```

The details of that file are omitted (_read the source, you must_), but the notable configuration is shown above. The configured LTI Toolkit is imported, and then the LTI Provider Router is connected to the application at the `/lti/provider` path. So, any incoming requests sent to that URL will be passed to the LTI Toolkit for handling. This matches the route used when configuring the tool in Canvas as shown above.

## LTI Launch Handler

The LTI Launch Handler function will receive three parameters:

* `launchData` - an instance of the [LTI Launch Data]({{% relref "02-lti/03-launchdata/" %}})
* `consumer` - a Sequelize instance of an [LTI Consumer]({{% relref "00-general/01-database/#lti-consumers" %}}) from the database
* `req` - the incoming Express request object

In the example project, we use the following LTI Launch Handler:

```js {title="src/routes/lti-launch.js"}
/**
 * Handle an incoming LTI Launch Request
 *
 * @param {Object} launchData - an LTI Launch Data object
 * @param {Object} consumer - the LTI consumer object
 * @param {Object} req - the Express request object
 * @returns {String} a URL to redirect the user to after launch
 */
async function LTILaunch(launchData, consumer, req) {
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
```

Notice that we serialize the `consumer` parameter to JSON since it is provided as a Sequelize object instance. 

This handler users two helper functions. The first will parse the incoming roles in the `launchData` object:

```js {title="src/routes/lti-launch.js"}
/**
 * Parse LTI roles to determine user type
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
```

It will simply return `true` if the role is a student, otherwise it will treat the role as an instructor. This may or may not be desired behavior for a production application.

Finally, it also stores data about the incoming `launchData` in a shared data structure that is only stored in memory.

```js {title="src/routes/lti-launch.js"} 
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
    const userId = launchData.user_lis_id;
    const userId13 = launchData.user_lis13_id;
    const outcomeId = launchData.outcome_id;
    assignments[assignmentId].grades[userId] = {
      name: userName,
      lis_id: userId,
      lis13_id: userId13,
      outcome_id: outcomeId,
      score: null,
    };
  }
}
```

In practice, this would be replaced with appropriate code and logic to store this data in a database or other storage mechanism for the application. However, this data structure is instructive as it shows a minimal set of data that could be stored in order to track courses, assignments, students, and grades. 

## Student Grade Passback

Once a student's grade has been determined, it can be passed back to the learning management system (LMS) using the LTI Controller's `postGrade` method:

```js {title="src/routes/student-grade.js"}
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
        assignment_id:
          launchData.assignment_id + "(" + launchData.assignment_lti_id + ")",
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
```

This method constructs the grade object required by the `postGrade` method using data from the LTI Launch Data and the LTI Consumer originally provided to the LTI Launch Handler. In this example, those values are read directly from the user's session. 

## Instructor Grade Passback

A more advanced example of submitting grades could involve the instructor providing grades after a student has completed an assignment:

```js {title="src/routes/instructor-grade.js"}
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
  const courseId = req.body.course;
  const assignmentId = req.body.assignment;
  const userId = req.body.user;
  const grade = parseFloat(req.body.grade);

  // Get assignment and user info from local data store
  // This is a placeholder function for updating a local data store
  // In a real application, you would implement logic to store
  // relevant grade data in your database or other storage system
  const courses = req.app.locals.dataStore.courses;
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
```

In this example, the same data required to build a grade object is read from the shared data structure stored in memory. Again, in practice, this data would be read from a database or another storage mechanism, but this code should be instructive.