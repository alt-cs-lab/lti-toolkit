/**
 * @file Callback Validation Utility Tests
 * @author Russell Feldhausen <russfeld@ksu.edu>
 */

// Load Libraries
import { should } from "chai";

// Modify Object.prototype for BDD style assertions
should();

// Import the library to test
import {
  assertGradeResult,
  assertScoreResult,
  assertLineItem,
  assertLineItems,
  assertResults,
  assertRedirectUrl,
} from "../../src/lib/callback-validation.js";

describe("Callback Validation", () => {
  describe("assertGradeResult", () => {
    it("should not throw for a valid grade result", () => {
      (() => assertGradeResult({ success: true, message: "ok" }, "postProviderGrade")).should.not.throw();
      (() => assertGradeResult({ success: false, message: "ok" }, "postProviderGrade")).should.not.throw();
    });

    it("should throw if the result is null or undefined", () => {
      (() => assertGradeResult(null, "postProviderGrade")).should.throw(
        "Invalid postProviderGrade return value: expected { success: boolean, message: string }",
      );
      (() => assertGradeResult(undefined, "postProviderGrade")).should.throw(
        "Invalid postProviderGrade return value: expected { success: boolean, message: string }",
      );
    });

    it("should throw if success is missing or not a boolean", () => {
      (() => assertGradeResult({ message: "ok" }, "postProviderGrade")).should.throw(
        "Invalid postProviderGrade return value: expected success to be a boolean",
      );
      (() => assertGradeResult({ success: "true", message: "ok" }, "deleteProviderGrade")).should.throw(
        "Invalid deleteProviderGrade return value: expected success to be a boolean",
      );
    });
  });

  describe("assertScoreResult", () => {
    it("should not throw for a valid score result", () => {
      (() => assertScoreResult({ score: 0.5 }, "readProviderGrade")).should.not.throw();
    });

    it("should not throw for null or undefined", () => {
      (() => assertScoreResult(null, "readProviderGrade")).should.not.throw();
      (() => assertScoreResult(undefined, "readProviderGrade")).should.not.throw();
    });

    it("should throw if score is missing or not a number", () => {
      (() => assertScoreResult({}, "readProviderGrade")).should.throw(
        "Invalid readProviderGrade return value: expected score to be a number",
      );
      (() => assertScoreResult({ score: "0.5" }, "readProviderGrade")).should.throw(
        "Invalid readProviderGrade return value: expected score to be a number",
      );
    });
  });

  describe("assertLineItem", () => {
    it("should not throw for a valid line item", () => {
      (() => assertLineItem({ label: "Quiz 1", scoreMaximum: 10 }, "getProviderLineItem")).should.not.throw();
    });

    it("should not throw for null or undefined", () => {
      (() => assertLineItem(null, "getProviderLineItem")).should.not.throw();
      (() => assertLineItem(undefined, "getProviderLineItem")).should.not.throw();
    });

    it("should throw if label is missing or not a string", () => {
      (() => assertLineItem({ scoreMaximum: 10 }, "getProviderLineItem")).should.throw(
        "Invalid getProviderLineItem return value: expected label to be a string",
      );
    });

    it("should throw if scoreMaximum is missing or not a number", () => {
      (() => assertLineItem({ label: "Quiz 1", scoreMaximum: "10" }, "getProviderLineItem")).should.throw(
        "Invalid getProviderLineItem return value: expected scoreMaximum to be a number",
      );
    });
  });

  describe("assertLineItems", () => {
    const validItem = { label: "Quiz 1", scoreMaximum: 10, resourceKey: "resource_1", gradebookKey: "gradebook_1" };

    it("should not throw for a valid array of line items", () => {
      (() => assertLineItems([validItem], "getProviderLineItems")).should.not.throw();
    });

    it("should not throw for null or undefined", () => {
      (() => assertLineItems(null, "getProviderLineItems")).should.not.throw();
      (() => assertLineItems(undefined, "getProviderLineItems")).should.not.throw();
    });

    it("should throw if the result is not an array", () => {
      (() => assertLineItems({}, "getProviderLineItems")).should.throw(
        "Invalid getProviderLineItems return value: expected an array or null",
      );
    });

    it("should throw if an item is not an object", () => {
      (() => assertLineItems([null], "getProviderLineItems")).should.throw(
        "Invalid getProviderLineItems return value: expected items[0] to be an object",
      );
    });

    it("should throw if an item is missing required fields", () => {
      (() => assertLineItems([{ ...validItem, label: undefined }], "getProviderLineItems")).should.throw(
        "Invalid getProviderLineItems return value: expected items[0].label to be a string",
      );
      (() => assertLineItems([{ ...validItem, scoreMaximum: "10" }], "getProviderLineItems")).should.throw(
        "Invalid getProviderLineItems return value: expected items[0].scoreMaximum to be a number",
      );
      (() => assertLineItems([{ ...validItem, resourceKey: 1 }], "getProviderLineItems")).should.throw(
        "Invalid getProviderLineItems return value: expected items[0].resourceKey to be a string",
      );
      (() => assertLineItems([{ ...validItem, gradebookKey: 1 }], "getProviderLineItems")).should.throw(
        "Invalid getProviderLineItems return value: expected items[0].gradebookKey to be a string",
      );
    });
  });

  describe("assertResults", () => {
    const validResult = { userId: "user_1", resultScore: 9, resultMaximum: 10, comment: "Nice work" };

    it("should not throw for a valid array of results", () => {
      (() => assertResults([validResult], "getProviderResults")).should.not.throw();
    });

    it("should not throw for null or undefined", () => {
      (() => assertResults(null, "getProviderResults")).should.not.throw();
      (() => assertResults(undefined, "getProviderResults")).should.not.throw();
    });

    it("should throw if the result is not an array", () => {
      (() => assertResults({}, "getProviderResults")).should.throw(
        "Invalid getProviderResults return value: expected an array or null",
      );
    });

    it("should throw if an item is not an object", () => {
      (() => assertResults([null], "getProviderResults")).should.throw(
        "Invalid getProviderResults return value: expected items[0] to be an object",
      );
    });

    it("should throw if an item is missing required fields", () => {
      (() => assertResults([{ ...validResult, userId: 1 }], "getProviderResults")).should.throw(
        "Invalid getProviderResults return value: expected items[0].userId to be a string",
      );
      (() => assertResults([{ ...validResult, resultScore: "9" }], "getProviderResults")).should.throw(
        "Invalid getProviderResults return value: expected items[0].resultScore to be a number",
      );
      (() => assertResults([{ ...validResult, resultMaximum: "10" }], "getProviderResults")).should.throw(
        "Invalid getProviderResults return value: expected items[0].resultMaximum to be a number",
      );
    });
  });

  describe("assertRedirectUrl", () => {
    it("should not throw for a non-empty string", () => {
      (() => assertRedirectUrl("https://example.com", "handleLaunch")).should.not.throw();
    });

    it("should throw for a non-string value", () => {
      (() => assertRedirectUrl(null, "handleLaunch")).should.throw(
        "Invalid handleLaunch return value: expected a non-empty URL string",
      );
      (() => assertRedirectUrl(undefined, "handleDeeplink")).should.throw(
        "Invalid handleDeeplink return value: expected a non-empty URL string",
      );
    });

    it("should throw for an empty string", () => {
      (() => assertRedirectUrl("", "handleLaunch")).should.throw(
        "Invalid handleLaunch return value: expected a non-empty URL string",
      );
    });
  });
});
