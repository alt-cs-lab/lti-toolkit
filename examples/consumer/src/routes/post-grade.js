/**
 * @file LTI Grade Passback Handler for LTI Tool Consumer
 * @author Russell Feldhausen <russfeld@ksu.edu>
 * @exports postGradeHandler LTI Tool Consumer Grade Passback Handler
 */

/**
 * LTI Grade Passback Handler for LTI Tool Consumer
 *
 * @param {string} providerKey the provider key
 * @param {string} contextKey the context (course) key
 * @param {string} resourceKey the resource (lesson or assignment) key
 * @param {string} gradebookKey the gradebook key
 * @param {Object} gradeScore the AGS-style grade score object
 * @param {string} gradeScore.userId the user ID
 * @param {number} gradeScore.scoreGiven the score given (0.0 - 1.0)
 * @param {number} gradeScore.scoreMaximum the maximum score
 * @param {string} gradeScore.activityProgress the activity progress status
 * @param {string} gradeScore.gradingProgress the grading progress status
 * @param {string} gradeScore.timestamp the ISO 8601 timestamp of the grade
 * @param {Object} req the Express request object
 */
async function postGradeHandler(providerKey, contextKey, resourceKey, gradebookKey, gradeScore, req) {
  // Store grade in the local data store
  updateLocalDataStoreWithGrade(req, contextKey, resourceKey, gradebookKey, gradeScore);

  // Return success response
  return {
    success: true,
    message: "Grade posted successfully",
  };
}

/**
 * Function to update local data store with grade
 *
 * @param {Object} req the Express request object
 * @param {string} contextKey the context (course) key
 * @param {string} resourceKey the resource (lesson or assignment) key
 * @param {string} gradebookKey the gradebook key
 * @param {Object} gradeScore the AGS-style grade score object
 */
function updateLocalDataStoreWithGrade(req, contextKey, resourceKey, gradebookKey, gradeScore) {
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

  const userKey = gradeScore.userId;

  // Ensure user exists
  if (!courses[contextKey].assignments[resourceKey].users[userKey]) {
    courses[contextKey].assignments[resourceKey].users[userKey] = {
      id: userKey,
      grades: {},
    };
  }

  // Store full grade score object
  courses[contextKey].assignments[resourceKey].users[userKey].grades[gradebookKey] = gradeScore;
}

/**
 * LTI 1.0 Read Grade Handler for LTI Tool Consumer
 *
 * @param {string} providerKey the provider key
 * @param {string} contextKey the context (course) key
 * @param {string} resourceKey the resource (lesson or assignment) key
 * @param {string} userKey the user key
 * @param {string} gradebookKey the gradebook key
 * @param {Object} req the Express request object
 * @returns {{ score: number }|null} the grade score (0.0 - 1.0), or null if no grade on file
 */
async function readGradeHandler(providerKey, contextKey, resourceKey, userKey, gradebookKey, req) {
  const courses = req.app.locals.dataStore.courses;
  const grade = courses[contextKey]?.assignments[resourceKey]?.users[userKey]?.grades[gradebookKey];
  if (!grade || grade.scoreGiven === null || grade.scoreGiven === undefined) {
    return null;
  }
  const score = grade.scoreMaximum > 0 ? grade.scoreGiven / grade.scoreMaximum : 0;
  return { score };
}

/**
 * LTI 1.0 Delete Grade Handler for LTI Tool Consumer
 *
 * @param {string} providerKey the provider key
 * @param {string} contextKey the context (course) key
 * @param {string} resourceKey the resource (lesson or assignment) key
 * @param {string} userKey the user key
 * @param {string} gradebookKey the gradebook key
 * @param {Object} req the Express request object
 * @returns {{ success: boolean, message: string }} result of the delete operation
 */
async function deleteGradeHandler(providerKey, contextKey, resourceKey, userKey, gradebookKey, req) {
  const courses = req.app.locals.dataStore.courses;
  const user = courses[contextKey]?.assignments[resourceKey]?.users[userKey];
  if (!user || !user.grades[gradebookKey]) {
    return { success: true, message: "No grade to delete" };
  }
  delete user.grades[gradebookKey];
  return { success: true, message: "Grade deleted successfully" };
}

export default postGradeHandler;
export { readGradeHandler, deleteGradeHandler };
