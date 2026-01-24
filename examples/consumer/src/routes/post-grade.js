/**
 * @file LTI 1.0 Grade Passback Handler for LTI Tool Consumer
 * @author Russell Feldhausen <russfeld@ksu.edu>
 * @exports postGradeHandler LTI Tool Consumer Grade Passback Handler
 */

/**
 * LTI 1.0 Grade Passback Handler for LTI Tool Consumer
 *
 * @param {string} contextKey the context (course) key
 * @param {string} resourceKey the resource (lesson or assignment) key
 * @param {string} userKey the user (student) key
 * @param {string} gradebookKey the gradebook key
 * @param {number} score the score to post (0.0 - 1.0)
 */
async function postGradeHandler(providerKey, contextKey, resourceKey, userKey, gradebookKey, score) {
  // For now, just log the grade passback attempt
  // eslint-disable-next-line no-console
  console.log(
    `LTI 1.0 Grade Passback Received: providerKey=${providerKey}, contextKey=${contextKey}, resourceKey=${resourceKey}, userKey=${userKey}, gradebookKey=${gradebookKey}, score=${score}`,
  );
}

export default postGradeHandler;