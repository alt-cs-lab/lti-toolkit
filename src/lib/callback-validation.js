/**
 * @file Runtime shape validation for user-provided LTI Toolkit callbacks
 * @author Russell Feldhausen <russfeld@ksu.edu>
 */

function assertType(value, expectedType, fieldPath, callbackName) {
  if (typeof value !== expectedType) {
    throw new Error(`Invalid ${callbackName} return value: expected ${fieldPath} to be a ${expectedType}`);
  }
}

/**
 * Validate the return shape of postProviderGrade / deleteProviderGrade: { success: boolean, message: string }
 */
function assertGradeResult(result, callbackName) {
  if (!result || typeof result !== "object") {
    throw new Error(`Invalid ${callbackName} return value: expected { success: boolean, message: string }`);
  }
  assertType(result.success, "boolean", "success", callbackName);
}

/**
 * Validate the return shape of readProviderGrade: { score: number } or null/undefined
 */
function assertScoreResult(result, callbackName) {
  if (result === null || result === undefined) {
    return;
  }
  assertType(result.score, "number", "score", callbackName);
}

/**
 * Validate the return shape of getProviderLineItem: { label: string, scoreMaximum: number } or null/undefined
 */
function assertLineItem(result, callbackName) {
  if (result === null || result === undefined) {
    return;
  }
  assertType(result.label, "string", "label", callbackName);
  assertType(result.scoreMaximum, "number", "scoreMaximum", callbackName);
}

/**
 * Validate the return shape of getProviderLineItems:
 * [{ resourceKey: string, gradebookKey: string, label: string, scoreMaximum: number }] or null/undefined
 */
function assertLineItems(result, callbackName) {
  if (result === null || result === undefined) {
    return;
  }
  if (!Array.isArray(result)) {
    throw new Error(`Invalid ${callbackName} return value: expected an array or null`);
  }
  result.forEach((item, index) => {
    const fieldPrefix = `items[${index}]`;
    if (!item || typeof item !== "object") {
      throw new Error(`Invalid ${callbackName} return value: expected ${fieldPrefix} to be an object`);
    }
    assertType(item.label, "string", `${fieldPrefix}.label`, callbackName);
    assertType(item.scoreMaximum, "number", `${fieldPrefix}.scoreMaximum`, callbackName);
    assertType(item.resourceKey, "string", `${fieldPrefix}.resourceKey`, callbackName);
    assertType(item.gradebookKey, "string", `${fieldPrefix}.gradebookKey`, callbackName);
  });
}

/**
 * Validate the return shape of getProviderResults:
 * [{ userId: string, resultScore: number, resultMaximum: number, comment: string }] or null/undefined
 */
function assertResults(result, callbackName) {
  if (result === null || result === undefined) {
    return;
  }
  if (!Array.isArray(result)) {
    throw new Error(`Invalid ${callbackName} return value: expected an array or null`);
  }
  result.forEach((item, index) => {
    const fieldPrefix = `items[${index}]`;
    if (!item || typeof item !== "object") {
      throw new Error(`Invalid ${callbackName} return value: expected ${fieldPrefix} to be an object`);
    }
    assertType(item.userId, "string", `${fieldPrefix}.userId`, callbackName);
    assertType(item.resultScore, "number", `${fieldPrefix}.resultScore`, callbackName);
    assertType(item.resultMaximum, "number", `${fieldPrefix}.resultMaximum`, callbackName);
  });
}

/**
 * Validate the return shape of handleLaunch / handleDeeplink: a non-empty URL string
 */
function assertRedirectUrl(result, callbackName) {
  if (typeof result !== "string" || result.length === 0) {
    throw new Error(`Invalid ${callbackName} return value: expected a non-empty URL string`);
  }
}

export { assertGradeResult, assertScoreResult, assertLineItem, assertLineItems, assertResults, assertRedirectUrl };
