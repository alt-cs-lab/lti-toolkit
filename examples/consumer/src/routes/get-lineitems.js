/**
 * @file LTI AGS Line Item Handlers for LTI Tool Consumer
 * @author Russell Feldhausen <russfeld@ksu.edu>
 * @exports getProviderLineItemHandler handler for fetching a single line item
 * @exports getProviderLineItemsHandler handler for fetching all line items in a context
 */

/**
 * Handler for LTI 1.3 AGS GET line item requests.
 * Returns metadata for a single gradebook line item identified by context, resource, and gradebook key.
 *
 * @param {string} providerKey the provider key (from the AGS token)
 * @param {string} contextKey the context (course) key
 * @param {string} resourceKey the resource (assignment) key
 * @param {string} gradebookKey the gradebook key
 * @param {Object} req the Express request object
 * @returns {{ label: string, scoreMaximum: number }|null} line item metadata, or null if not found
 */
async function getProviderLineItemHandler(providerKey, contextKey, resourceKey, gradebookKey, req) {
  const courses = req.app.locals.dataStore.courses;
  const assignment = courses[contextKey]?.assignments[resourceKey];

  if (!assignment) {
    return null;
  }

  // Find a scoreMaximum from any stored grade for this gradebook key, defaulting to 1.0
  let scoreMaximum = 1.0;
  for (const user of Object.values(assignment.users)) {
    const grade = user.grades[gradebookKey];
    if (grade && grade.scoreMaximum !== undefined && grade.scoreMaximum !== null) {
      scoreMaximum = grade.scoreMaximum;
      break;
    }
  }

  return {
    label: assignment.name,
    scoreMaximum,
  };
}

/**
 * Handler for LTI 1.3 AGS GET line items requests.
 * Returns all line items for a context, optionally filtered by resource link ID.
 * Each unique (resourceKey, gradebookKey) pair is returned as a separate line item.
 *
 * @param {string} providerKey the provider key (from the AGS token)
 * @param {string} contextKey the context (course) key
 * @param {string|null} resource_link_id optional resource link ID to filter results
 * @param {Object} req the Express request object
 * @returns {Array<{ resourceKey: string, gradebookKey: string, label: string, scoreMaximum: number }>|null}
 *   array of line item metadata, or null if context not found
 */
async function getProviderLineItemsHandler(providerKey, contextKey, resource_link_id, req) {
  const courses = req.app.locals.dataStore.courses;
  const course = courses[contextKey];

  if (!course) {
    return null;
  }

  const lineItems = [];

  for (const [resourceKey, assignment] of Object.entries(course.assignments)) {
    // Apply optional resource link ID filter
    if (resource_link_id && resourceKey !== resource_link_id) {
      continue;
    }

    // Collect unique gradebook keys and their scoreMaximums across all users
    const gradebookKeys = new Map();
    for (const user of Object.values(assignment.users)) {
      for (const [gKey, grade] of Object.entries(user.grades)) {
        if (!gradebookKeys.has(gKey)) {
          const scoreMaximum =
            grade && grade.scoreMaximum !== undefined && grade.scoreMaximum !== null ? grade.scoreMaximum : 1.0;
          gradebookKeys.set(gKey, scoreMaximum);
        }
      }
    }

    for (const [gradebookKey, scoreMaximum] of gradebookKeys) {
      lineItems.push({
        resourceKey,
        gradebookKey,
        label: assignment.name,
        scoreMaximum,
      });
    }
  }

  return lineItems;
}

/**
 * Handler for LTI 1.3 AGS GET results requests.
 * Returns the current result status for each user who has submitted a grade for a given line item.
 *
 * @param {string} providerKey the provider key (from the AGS token)
 * @param {string} contextKey the context (course) key
 * @param {string} resourceKey the resource (assignment) key
 * @param {string} gradebookKey the gradebook key
 * @param {string|null} userId optional user ID to filter results to a single user
 * @param {Object} req the Express request object
 * @returns {Array<{ userId: string, resultScore: number, resultMaximum: number, comment: null }>|null}
 *   array of result objects, or null if assignment not found
 */
async function getProviderResultsHandler(providerKey, contextKey, resourceKey, gradebookKey, userId, req) {
  const courses = req.app.locals.dataStore.courses;
  const assignment = courses[contextKey]?.assignments[resourceKey];

  if (!assignment) {
    return null;
  }

  const results = [];
  for (const [userKey, user] of Object.entries(assignment.users)) {
    if (userId && userKey !== userId) {
      continue;
    }
    const grade = user.grades[gradebookKey];
    if (grade && grade.scoreGiven !== null && grade.scoreGiven !== undefined) {
      results.push({
        userId: userKey,
        resultScore: grade.scoreGiven,
        resultMaximum: grade.scoreMaximum,
        comment: null,
      });
    }
  }
  return results;
}

export { getProviderLineItemHandler, getProviderLineItemsHandler, getProviderResultsHandler };
