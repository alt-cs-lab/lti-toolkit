/**
 * @file LTI 1.0 Utilities
 * @author Russell Feldhausen <russfeld@ksu.edu>
 * @exports validate10 Validate LTI 1.0 Connection
 * @exports oauth_sign Generate OAuth 1.0 Signature
 */

// Import libraries
import crypto from "crypto";
import { nanoid } from "nanoid";
import xml2js from "xml2js";
import ky from "ky";

class LTI10Utils {
  // Private Attributes
  #OauthNonceModel;
  #ConsumerKeyModel;
  #logger;
  #domain_name;

  /**
   * Constructor for LTI 1.0 Utilities
   *
   * @param {Object} models the database models
   * @param {Object} logger the logger instance
   */
  constructor(models, logger, domain_name) {
    this.#OauthNonceModel = models.OauthNonce;
    this.#ConsumerKeyModel = models.ConsumerKey;
    this.#logger = logger;
    this.#domain_name = domain_name;
  }

  /**
   * Validate an LTI 1.0 Launch Request
   *
   * @param {Object} req - Express request object
   */
  async validate10(req) {
    const body = req.body;

    // Body must not be empty
    if (!body) {
      throw new Error("Validation Error: Empty Body");
    }

    // #######################
    // LTI SPECIFIC THINGS
    // #######################
    // Body must include lti_message_type
    if (!body.lti_message_type || body.lti_message_type !== "basic-lti-launch-request") {
      throw new Error("Validation Error: Invalid LTI Message Type: " + body.lti_message_type);
    }
    // Body must include lti_version
    if (!body.lti_version || body.lti_version !== "LTI-1p0") {
      throw new Error("Validation Error: Invalid LTI Version: " + body.lti_version);
    }

    // #######################
    // OAUTH SPECIFIC THINGS
    // #######################
    // Body must include oauth_version
    if (!body.oauth_version || body.oauth_version !== "1.0") {
      throw new Error("Validation Error: Invalid OAuth Version: " + body.oauth_version);
    }
    // Body must include oauth_signature_method
    if (!body.oauth_signature_method || body.oauth_signature_method !== "HMAC-SHA1") {
      throw new Error("Validation Error: Invalid OAuth Signature Method: " + body.oauth_signature_method);
    }
    // Body must include oauth_consumer_key
    if (!body.oauth_consumer_key) {
      throw new Error("Validation Error: OAuth Consumer Key Missing");
    }
    // Body must include oauth_signature
    if (!body.oauth_signature) {
      throw new Error("Validation Error: OAuth Signature Missing");
    }
    // Body must include oauth_callback
    if (!body.oauth_callback || body.oauth_callback !== "about:blank") {
      throw new Error("Validation Error: Invalid OAuth Callback: " + body.oauth_callback);
    }
    // Body must include oauth_timestamp
    if (!body.oauth_timestamp) {
      throw new Error("Validation Error: OAuth Timestamp Missing");
    }
    // Timestamp must be recent (allow 1 minute into future and 10 minutes into past)
    const currentTime = Math.floor(Date.now() / 1000);
    const requestTime = parseInt(body.oauth_timestamp);
    if (currentTime + 60 < requestTime || currentTime > requestTime + 600) {
      throw new Error(
        "Validation Error: OAuth Timestamp Invalid! Timestamp: " + requestTime + " | Current: " + currentTime,
      );
    }
    // Body must include oauth_nonce
    if (!body.oauth_nonce) {
      throw new Error("Validation Error: OAuth Nonce Missing");
    }
    // Nonce must be unique
    const nonceLookup = await this.#OauthNonceModel.findOne({
      where: {
        key: body.oauth_consumer_key,
        nonce: body.oauth_nonce,
      },
    });
    if (nonceLookup) {
      throw new Error("Validation Error: Duplicate OAuth Nonce Detected " + body.oauth_nonce);
    }

    // #######################
    // VALIDATE OAUTH SIGNATURE
    // #######################
    const consumerKey = await this.#ConsumerKeyModel.findByPk(body.oauth_consumer_key);
    if (!consumerKey) {
      throw new Error("Validation Error: Unable to find secret for consumer key: " + body.oauth_consumer_key);
    }
    // Extract signature from body
    const { oauth_signature, ...signedParams } = req.body;
    // Compute signature
    const computedSignature = this.oauth_sign(
      body.oauth_signature_method,
      req.method,
      req.originalUrl,
      signedParams,
      consumerKey.secret,
    );
    // Compare extracted signature to computed
    if (computedSignature !== oauth_signature) {
      throw new Error(
        "Validation Error: Invalid OAuth Signature!: Computed: " +
          computedSignature +
          " | Provided: " +
          oauth_signature,
      );
    }

    // Store Nonce
    const nonceCreated = await this.models.OauthNonce.create({
      key: body.oauth_consumer_key,
      nonce: body.oauth_nonce,
    });
    if (!nonceCreated || nonceCreated.nonce != body.oauth_nonce) {
      throw new Error("Validation Error: Unable to save OAuth Nonce - Aborting!");
    }

    // Return validated payload to controller
    return signedParams;
  }

  /**
   * Much of the code below is based on a reference implementation found online
   *
   * https://github.com/request/oauth-sign/blob/master/index.js
   */

  /**
   * Generate OAuth 1.0 Signature
   *
   * @param {string} method - OAuth Signing Method (must be HMAC-SHA1)
   * @param {*} http_method - http method (get or post)
   * @param {*} base_uri - base URI for the request
   * @param {*} params - parameters in the body
   * @param {*} secret - signing secret
   * @returns {string} the generated signature
   * @throws {Error} if the signing method is not supported
   */
  oauth_sign(method, http_method, base_uri, params, secret) {
    // Currently only HMAC-SHA1 signature supported
    if (method !== "HMAC-SHA1") {
      throw new Error("Only HMAC-SHA1 Supported for OAuth Signature Method");
    }

    // Compute OAuth Signature
    // Part 1 - HTTP method in uppercase
    const part1 = LTI10Utils.#rfc3986(http_method.toUpperCase());
    // Part 2 - Base String URI
    // TODO update this to read domain name from headers?
    const part2 = LTI10Utils.#rfc3986(new URL(base_uri, this.#domain_name).href);
    // Part 3 - Parameters
    const part3 = LTI10Utils.#rfc3986(LTI10Utils.#normalizeParams(params));

    const base = [part1, part2, part3].join("&");
    const secretKey = secret + "&";

    return crypto.createHmac("sha1", secretKey).update(base).digest("base64");
  }

  /**
   * Convert string according to RFC3986
   * https://datatracker.ietf.org/doc/html/rfc3986
   * Original Source: https://github.com/request/oauth-sign/blob/master/index.js
   *
   * @param {string} str - string to convert
   * @returns converted string
   */
  static #rfc3986(str) {
    return encodeURIComponent(str)
      .replace(/!/g, "%21")
      .replace(/\*/g, "%2A")
      .replace(/\(/g, "%28")
      .replace(/\)/g, "%29")
      .replace(/'/g, "%27");
  }

  /**
   * Normalize parameters
   * Adapted from: https://github.com/request/oauth-sign/blob/master/index.js
   *
   * @param {Object} params - the body of parameters
   * @returns a string of normalized parameters
   */
  static #normalizeParams(params) {
    // Parameter normalization
    // http://tools.ietf.org/html/rfc5849#section-3.4.1.3.2
    const normalized = Object.entries(params)
      // 1.  First, the name and value of each parameter are encoded
      .map(function (key) {
        return [LTI10Utils.#rfc3986(key[0]), LTI10Utils.#rfc3986(key[1] || "")];
      })
      // 2.  The parameters are sorted by name, using ascending byte value
      //     ordering.  If two or more parameters share the same name, they
      //     are sorted by their value.
      .sort(function (a, b) {
        return LTI10Utils.#compare(a[0], b[0]) || LTI10Utils.#compare(a[1], b[1]);
      })
      // 3.  The name of each parameter is concatenated to its corresponding
      //     value using an "=" character (ASCII code 61) as a separator, even
      //     if the value is empty.
      .map(function (p) {
        return p.join("=");
      })
      // 4.  The sorted name/value pairs are concatenated together into a
      //     single string by using an "&" character (ASCII code 38) as
      //     separator.
      .join("&");

    return normalized;
  }

  /**
   * Compare function for sort
   * Original Source: https://github.com/request/oauth-sign/blob/master/index.js
   *
   * @param {*} a
   * @param {*} b
   * @returns {number} the sort order
   */
  static #compare(a, b) {
    return a > b ? 1 : a < b ? -1 : 0;
  }

  /**
   * Validate OAuth body signed message
   *
   * @param {Object} req - Express request object
   * @returns {Object} the validated key and secret, or false if validation fails
   */
  async validateOauthBody(req) {
    // OAuth Headers
    const authHeader = req.headers["authorization"];
    if (!authHeader || !authHeader.startsWith("OAuth ")) {
      throw new Error("Validation Error: Missing or Invalid Authorization Header");
    }

    // Trim leading "OAuth " and split headers by comma
    const authHeaders = authHeader.substring(6).split(",");

    // Reformat to Javascript Object
    const oauthHeaders = {};
    for (let i = 0; i < authHeaders.length; i++) {
      const [key, value] = authHeaders[i].split("=");
      if (key && value) {
        oauthHeaders[key.trim()] = decodeURIComponent(value.trim().replace(/"/g, ""));
      }
    }

    // Check required OAuth headers
    if (!oauthHeaders["oauth_consumer_key"]) {
      throw new Error("Validation Error: OAuth Consumer Key Missing");
    }
    if (!oauthHeaders["oauth_version"] || oauthHeaders["oauth_version"] !== "1.0") {
      throw new Error("Validation Error: Invalid OAuth Version: " + oauthHeaders["oauth_version"]);
    }
    if (!oauthHeaders["oauth_signature_method"]) {
      throw new Error("Validation Error: Missing OAuth Signature Method");
    }
    if (!oauthHeaders["oauth_signature"]) {
      throw new Error("Validation Error: Missing OAuth Signature");
    }

    // Check Timestamp
    if (!oauthHeaders["oauth_timestamp"]) {
      throw new Error("Validation Error: Missing OAuth Timestamp");
    }
    // Timestamp must be recent (allow 1 minute into future and 10 minutes into past)
    const currentTime = Math.floor(Date.now() / 1000);
    const requestTime = parseInt(oauthHeaders["oauth_timestamp"]);
    if (currentTime + 60 < requestTime || currentTime > requestTime + 600) {
      throw new Error(
        "Validation Error: OAuth Timestamp Invalid! Timestamp: " + requestTime + " | Current: " + currentTime,
      );
    }

    // Check Nonce
    if (!oauthHeaders["oauth_nonce"]) {
      throw new Error("Validation Error: Missing OAuth Nonce");
    }
    // Nonce must be unique
    const nonceLookup = await this.models.OauthNonce.findOne({
      where: {
        key: oauthHeaders["oauth_consumer_key"],
        nonce: oauthHeaders["oauth_nonce"],
      },
    });
    if (nonceLookup) {
      throw new Error("Validation Error: Duplicate OAuth Nonce Detected " + oauthHeaders["oauth_nonce"]);
    }

    // Extract and validate hash
    if (!oauthHeaders["oauth_body_hash"]) {
      throw new Error("Validation Error: Missing OAuth Body Hash");
    }
    if (oauthHeaders["oauth_body_hash"] !== crypto.createHash("sha1").update(req.rawBody).digest("base64")) {
      throw new Error("Validation Error: Invalid OAuth Body Hash");
    }

    // Find secret for key
    const providerKey = await this.models.ProviderKey.findOne({
      where: { key: oauthHeaders["oauth_consumer_key"] },
    });
    if (!providerKey) {
      throw new Error("Validation Error: Invalid OAuth Consumer Key");
    }

    // Check signature using headers
    const headersNoSignature = { ...oauthHeaders };
    delete headersNoSignature["oauth_signature"];
    const signature = this.oauth_sign(
      headersNoSignature["oauth_signature_method"],
      "POST",
      req.originalUrl,
      headersNoSignature,
      providerKey.secret,
    );
    if (signature !== oauthHeaders["oauth_signature"]) {
      throw new Error("Validation Error: Invalid OAuth Signature");
    }

    // Store Nonce
    const nonceCreated = await this.models.OauthNonce.create({
      key: oauthHeaders["oauth_consumer_key"],
      nonce: oauthHeaders["oauth_nonce"],
    });
    if (!nonceCreated || nonceCreated.nonce != oauthHeaders["oauth_nonce"]) {
      throw new Error("Validation Error: Unable to save OAuth Nonce");
    }
    return {
      key: providerKey.key,
      secret: providerKey.secret,
    };
  }

  /**
   * Sign OAuth Body
   *
   * @param {String} body - the body to sign
   * @param {String} key - the key for signing
   * @param {String} secret - the secret for signing
   * @param {String} url - the URL for the request
   * @returns {String} the OAuth headers
   */
  async signOauthBody(body, key, secret, url) {
    const bodyHash = crypto.createHash("sha1").update(body).digest("base64");
    const oauthHeaders = {
      oauth_consumer_key: key,
      oauth_signature_method: "HMAC-SHA1",
      oauth_version: "1.0",
      oauth_body_hash: bodyHash,
      oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
      oauth_nonce: crypto.randomBytes(16).toString("hex"),
    };
    const signature = this.oauth_sign("HMAC-SHA1", "POST", url, oauthHeaders, secret);
    oauthHeaders["oauth_signature"] = signature;
    const headerString =
      "OAuth " +
      Object.keys(oauthHeaders)
        .map((key) => {
          return `${key}="${encodeURIComponent(oauthHeaders[key])}"`;
        })
        .join(",");
    return headerString;
  }

  /**
   * Post grade to an LTI 1.0 Outcome Service
   *
   * @param {string} url - the URL for the outcome service
   * @param {string} consumer_key - the consumer key for signing
   * @param {string} lms_grade_id - the LMS grade ID (sourcedId)
   * @param {string} score - the score to post (0.0 to 1.0)
   * @returns {boolean} true if the grade was posted successfully, false otherwise
   * @throws {Error} if required information is missing or if posting fails
   */
  async postOutcome(lms_grade_id, score, consumer_key, url) {
    /**
     * Example LTI 1.0 Outcome Service Request Body
     *
     * <?xml version="1.0" encoding="UTF-8"?>
     * <imsx_POXEnvelopeRequest xmlns="http://www.imsglobal.org/services/ltiv1p1/xsd/imsoms_v1p0">
     * <imsx_POXHeader>
     *   <imsx_POXRequestHeaderInfo>
     *     <imsx_version>V1.0</imsx_version>
     *     <imsx_messageIdentifier>999999123</imsx_messageIdentifier>
     *   </imsx_POXRequestHeaderInfo>
     * </imsx_POXHeader>
     * <imsx_POXBody>
     *   <replaceResultRequest>
     *     <resultRecord>
     *       <sourcedGUID>
     *         <sourcedId>3124567</sourcedId>
     *       </sourcedGUID>
     *       <result>
     *         <resultScore>
     *           <language>en</language>
     *           <textString>0.92</textString>
     *         </resultScore>
     *       </result>
     *     </resultRecord>
     *   </replaceResultRequest>
     * </imsx_POXBody>
     * </imsx_POXEnvelopeRequest>
     */

    // Build XML Envelope
    const envelope = {
      imsx_POXEnvelopeRequest: {
        $: {
          xmlns: "http://www.imsglobal.org/services/ltiv1p1/xsd/imsoms_v1p0",
        },
        imsx_POXHeader: {
          imsx_POXRequestHeaderInfo: {
            imsx_version: "V1.0",
            imsx_messageIdentifier: nanoid(),
          },
        },
        imsx_POXBody: {
          replaceResultRequest: {
            resultRecord: {
              sourcedGUID: {
                sourcedId: lms_grade_id,
              },
              result: {
                resultScore: {
                  language: "en",
                  textString: score,
                },
              },
            },
          },
        },
      },
    };
    const builder = new xml2js.Builder();
    const content = builder.buildObject(envelope);

    // Get Key and Secret for Consumer
    const providerKey = await this.#ConsumerKeyModel.findOne({
      where: { key: consumer_key },
      attributes: ["key", "secret"],
    });
    if (!providerKey) {
      throw new Error("Cannot find secret for consumer key: " + consumer_key);
    }

    // Sign Body
    const authHeader = await this.signOauthBody(content, providerKey.key, providerKey.secret, url);

    this.#logger.lti("Posting grade to LTI 1.0 Outcome Service at " + url);
    this.#logger.silly(authHeader);
    this.#logger.silly(content);

    // Post to Outcome Service
    const response = await ky.post(url, {
      headers: {
        "Content-Type": "application/xml",
        Authorization: authHeader,
      },
      body: content,
    });

    // parse response.text to xml
    const responseText = await response.text();
    const parser = new xml2js.Parser({ explicitArray: false, trim: true });
    const responseXml = await parser.parseStringPromise(responseText);
    this.#logger.silly("Response XML: " + JSON.stringify(responseXml, null, 2));

    if (response && response.status === 200) {
      if (
        responseXml.imsx_POXEnvelopeResponse.imsx_POXHeader.imsx_POXResponseHeaderInfo.imsx_statusInfo
          .imsx_codeMajor === "success"
      ) {
        this.#logger.lti("Grade posted successfully");
        return true;
      } else {
        throw new Error("Failed to post grade: " + JSON.stringify(responseXml, null, 2));
      }
    } else {
      throw new Error("Failed to post grade: HTTP " + response.status + " - " + response.statusText);
    }
  }

  /**
   * Build an XML Response to a Basic Outcomes Request
   *
   * @param {string} codeMajor - the code major for the response (e.g. "success", "unsupported", "processing_error")
   * @param {string} severity - the severity of the response (e.g. "status", "error", "fatal")
   * @param {string} description - a human readable description of the response
   * @param {Object} providerKey - the provider key object containing the key and secret for signing
   * @param {string} providerKey.key - the provider key
   * @param {string} providerKey.secret - the provider secret
   * @param {string} url - the original request URL
   * @param {string} messageIdentifier - a unique identifier for the message (optional, will be generated if not provided)
   * @param {string} operation - the operation to respond to (e.g. "replaceResult", "readResult", "deleteResult")
   * @param {Object} body - the body of the response, which will be included in the appropriate place based on the operation
   * @returns {string} the XML response body
   */
  async buildResponse(
    codeMajor,
    severity,
    description,
    providerKey,
    url,
    messageIdentifier,
    operation = null,
    body = null,
  ) {
    /**
     * Example LTI 1.0 Outcome Service Response Body for Errors
     *
     * <?xml version="1.0" encoding="UTF-8"?>
     * <imsx_POXEnvelopeResponse xmlns="http://www.imsglobal.org/services/ltiv1p1/xsd/imsoms_v1p0">
     * <imsx_POXHeader>
     *   <imsx_POXResponseHeaderInfo>
     *     <imsx_version>V1.0</imsx_version>
     *     <imsx_messageIdentifier>4560</imsx_messageIdentifier>
     *     <imsx_statusInfo>
     *       <imsx_codeMajor>unsupported</imsx_codeMajor>
     *       <imsx_severity>status</imsx_severity>
     *       <imsx_description>readPerson is not supported</imsx_description>
     *       <imsx_messageRefIdentifier>999999123</imsx_messageRefIdentifier>
     *       <imsx_operationRefIdentifier>readPerson</imsx_operationRefIdentifier>
     *     </imsx_statusInfo>
     *   </imsx_POXResponseHeaderInfo>
     * </imsx_POXHeader>
     * <imsx_POXBody/>
     * </imsx_POXEnvelopeResponse>
     *
     * Example LTI 1.0 Outcome Service Response Body for Success
     *
     * <?xml version="1.0" encoding="UTF-8"?>
     * <imsx_POXEnvelopeResponse xmlns="http://www.imsglobal.org/services/ltiv1p1/xsd/imsoms_v1p0">
     * <imsx_POXHeader>
     *   <imsx_POXResponseHeaderInfo>
     *     <imsx_version>V1.0</imsx_version>
     *     <imsx_messageIdentifier>4560</imsx_messageIdentifier>
     *     <imsx_statusInfo>
     *       <imsx_codeMajor>success</imsx_codeMajor>
     *       <imsx_severity>status</imsx_severity>
     *       <imsx_description>Score for 3124567 is now 0.92</imsx_description>
     *       <imsx_messageRefIdentifier>999999123</imsx_messageRefIdentifier>
     *       <imsx_operationRefIdentifier>replaceResult</imsx_operationRefIdentifier>
     *     </imsx_statusInfo>
     *   </imsx_POXResponseHeaderInfo>
     * </imsx_POXHeader>
     * <imsx_POXBody>
     *   <replaceResultResponse />
     * </imsx_POXBody>
     * </imsx_POXEnvelopeResponse>
     */

    // Build XML Envelope
    const result = {
      imsx_POXEnvelopeResponse: {
        $: {
          xmlns: "http://www.imsglobal.org/services/ltiv1p1/xsd/imsoms_v1p0",
        },
        imsx_POXHeader: {
          imsx_POXResponseHeaderInfo: {
            imsx_version: "V1.0",
            imsx_messageIdentifier: nanoid(),
            imsx_statusInfo: {
              imsx_codeMajor: codeMajor,
              imsx_severity: severity,
              imsx_description: description,
              imsx_messageRefIdentifier: messageIdentifier || "unknown",
              imsx_operationRefIdentifier: operation || "unknown",
            },
          },
        },
        imsx_POXBody: body || {},
      },
    };

    // Convert to XML
    const builder = new xml2js.Builder();
    const content = builder.buildObject(result);
    let headers = null;
    if (providerKey && url) {
      headers = await this.signOauthBody(content, providerKey.key, providerKey.secret, url);
    }
    return {
      content: content,
      headers: headers,
    };
  }

  /**
   * Validate a Basic Outcomes Request
   *
   * @param {Object} req - Express request object
   * @throws {Error} if the request is not a valid Basic Outcomes Request
   * @returns {Object} an object containing the message ID and body of the request if valid
   */
  validateBasicOutcomesRequest(req) {
    // Check Envelope
    if (
      !req.body["imsx_poxenveloperequest"] ||
      req.body["imsx_poxenveloperequest"]["$"]["xmlns"] != "http://www.imsglobal.org/services/ltiv1p1/xsd/imsoms_v1p0"
    ) {
      throw new Error("Invalid Envelope Request");
    }
    // Get Envelope
    const envelope = req.body["imsx_poxenveloperequest"];

    // Check Header
    if (!envelope["imsx_poxheader"]) {
      throw new Error("Invalid Envelope Header");
    }

    const header = envelope["imsx_poxheader"];
    if (!header["imsx_poxrequestheaderinfo"]) {
      throw new Error("Invalid Envelope Header Info");
    }

    const headerinfo = header["imsx_poxrequestheaderinfo"];
    if (!headerinfo["imsx_version"] || headerinfo["imsx_version"] !== "V1.0") {
      throw new Error("Invalid Envelope Version");
    }
    if (!headerinfo["imsx_messageidentifier"] || headerinfo["imsx_messageidentifier"].length === 0) {
      throw new Error("Invalid Envelope Message Identifier");
    }

    // Check Body
    if (!envelope["imsx_poxbody"]) {
      throw new Error("Invalid Envelope Body");
    }

    return {
      message_id: headerinfo["imsx_messageidentifier"],
      body: envelope["imsx_poxbody"],
    };
  }

  /**
   * Validate a Basic Outcomes Replace Result Request
   *
   * @param {Object} request - The replace result request body extracted from the envelope
   * @throws {Error} if the request is not a valid Basic Outcomes Replace Result Request
   * @returns {Object} an object containing the score and sourcedIdValue if the request is valid
   */
  validateReplaceResultRequest(request) {
    // Parse Message
    if (!request["resultrecord"]) {
      throw new Error("Missing Result Record");
    }

    // Check Result Record
    const resultRecord = request["resultrecord"];
    if (!resultRecord["result"]) {
      throw new Error("Missing Result");
    }

    // Check Result
    const result = resultRecord["result"];
    if (!result["resultscore"]) {
      throw new Error("Missing Result Score");
    }
    if (!result["resultscore"]["textstring"] || result["resultscore"]["textstring"].length === 0) {
      throw new Error("Missing Result Score Value");
    }

    // Check Score
    const score = result["resultscore"]["textstring"];
    if (isNaN(score)) {
      throw new Error("Invalid Result Score Value: " + score);
    }

    // Check Source ID
    if (!resultRecord["sourcedguid"]) {
      throw new Error("Missing Result Source ID");
    }
    const sourcedId = resultRecord["sourcedguid"];
    if (!sourcedId["sourcedid"] || sourcedId["sourcedid"].length === 0) {
      throw new Error("Missing Result Source ID Value");
    }

    return {
      score,
      sourcedIdValue: sourcedId["sourcedid"],
    };
  }
}

export default LTI10Utils;
