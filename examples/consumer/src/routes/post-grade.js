/**
 * @file LTI 1.0 Grade Passback Handler for LTI Tool Consumer
 * @author Russell Feldhausen <russfeld@ksu.edu>
 * @exports postGradeHandler LTI Tool Consumer Grade Passback Handler
 */

/**
 * LTI 1.0 Grade Passback Handler for LTI Tool Consumer
 *
 * @param {string} providerKey the provider key
 * @param {string} contextKey the context (course) key
 * @param {string} resourceKey the resource (lesson or assignment) key
 * @param {string} userKey the user (student) key
 * @param {string} gradebookKey the gradebook key
 * @param {number} score the score to post (0.0 - 1.0)
 * @param {Object} req the Express request object
 */
async function postGradeHandler(
  providerKey,
  contextKey,
  resourceKey,
  userKey,
  gradebookKey,
  score,
  req,
) {
  // Store grade in the local data store
  updateLocalDataStoreWithGrade(
    req,
    contextKey,
    resourceKey,
    userKey,
    gradebookKey,
    score,
  );

  // No need to return anything; library assumes success here
}

/**
 * Function to update local data store with grade
 *
 * @param {Object} req the Express request object
 * @param {string} providerKey the provider key
 * @param {string} contextKey the context (course) key
 * @param {string} resourceKey the resource (lesson or assignment) key
 * @param {string} userKey the user (student) key
 * @param {string} gradebookKey the gradebook key
 * @param {number} score the score to post (0.0 - 1.0)
 */
function updateLocalDataStoreWithGrade(
  req,
  contextKey,
  resourceKey,
  userKey,
  gradebookKey,
  score,
) {
  // This is a placeholder function for updating a local data store
  // In a real application, you would implement logic to store
  // relevant course and grade data in your database or other storage system
  const courses = req.app.locals.dataStore.courses;

  // Ensure course exists
  if (!courses[contextKey]) {
    courses[contextKey] = {
      id: contextKey,
      assignments: {},
    };
  }

  // Ensure assignment exists
  if (!courses[contextKey].assignments[resourceKey]) {
    courses[contextKey].assignments[resourceKey] = {
      id: resourceKey,
      users: {},
    };
  }

  // Ensure user exists
  if (!courses[contextKey].assignments[resourceKey].users[userKey]) {
    courses[contextKey].assignments[resourceKey].users[userKey] = {
      id: userKey,
      grades: {},
    };
  }

  // Store grade
  courses[contextKey].assignments[resourceKey].users[userKey].grades[
    gradebookKey
  ] = {
    score: score,
  };
}

export default postGradeHandler;
