/**
 * @file LTI Consumer Controller
 * @author Russell Feldhausen <russfeld@ksu.edu>
 * @exports LTIConsumerController an LTI Controller instance
 */

class LTIConsumerController {

    /**
     * Generate LTI 1.0 Launch Form Data
     *
     * @param {string} key - the consumer key for the LTI tool
     * @param {string} secret - the consumer secret for the LTI tool
     * @param {string} url - the URL to launch the LTI tool
     * @param {string} ret_url - the return URL for the LTI tool
     * @param {Object} context - the context for the LTI launch (course)
     * @param {Object} resource - the resource for the LTI launch (assignment or lesson)
     * @param {Object} user - the user launching the LTI tool
     * @param {boolean} manager - true if the user is a course manager, else false
     * @param {string} gradebook_key - the gradebook ID for the LTI launch
     * @return {Object} an object containing the form fields and action URL for the LTI launch
     */
    generateLTI10FormData(
      key,
      secret,
      url,
      ret_url,
      context,
      resource,
      user,
      manager,
      gradebook_key,
    ) {
      if (!this.consumer) {
        this.#logger.error("LTI Consumer not found");
        return null;
      }
      this.#logger.lti("Generating LTI 1.0 Launch Form Data");
      // TODO: Add custom data
      const launch = {
        oauth_consumer_key: key,
        oauth_signature_method: "HMAC-SHA1",
        oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
        oauth_nonce: nanoid(),
        oauth_version: "1.0",
        context_id: context.key,
        context_label: context.label,
        context_title: context.name,
        launch_presentation_document_target: "iframe",
        launch_presentation_locale: "en",
        launch_presentation_return_url: ret_url,
        lis_outcome_service_url: new URL(
          `${this.consumer.route_prefix}/grade`,
          this.domain_name,
        ).href,
        lis_result_sourcedid: `${context.key}:${resource.key}:${user.key}:${gradebook_key}`,
        lis_person_contact_email_primary: user.email,
        lis_person_name_family: user.family_name,
        lis_person_name_full: user.name,
        lis_person_name_given: user.given_name,
        lti_message_type: "basic-lti-launch-request",
        lti_version: "LTI-1p0",
        oauth_callback: "about:blank",
        resource_link_id: resource.key,
        resource_link_title: resource.name,
        roles: manager ? "Instructor" : "Learner",
        tool_consumer_info_product_family_code: this.consumer.product_name,
        tool_consumer_info_version: this.consumer.product_version,
        tool_consumer_instance_contact_email: this.admin_email,
        tool_consumer_instance_guid: this.consumer.deployment_id,
        tool_consumer_instance_name: this.consumer.deployment_name,
        user_id: user.key,
        user_image: user.image,
      };
      const signature = this.#LTI10Utils.oauth_sign(
        "HMAC-SHA1",
        "POST",
        url,
        launch,
        secret,
      );
      launch["oauth_signature"] = signature;
      return {
        fields: launch,
        action: url,
      };
    }
  
    /**
     * Basic Outcomes Handler
     *
     * @param req - Express request object
     * @returns {Object} - XML response body
     * @see https://www.imsglobal.org/spec/lti-bo/v1p1
     * @see https://www.imsglobal.org/gws/gwsv1p0/imsgws_wsdlBindv1p0.html
     */
    async basicOutcomesHandler(req) {
      this.#logger.lti("LTI Basic Outcomes Request Received");
      this.#logger.silly(JSON.stringify(req.body, null, 2));
      this.#logger.silly(req.headers["authorization"]);
      this.#logger.silly(req.headers["content-type"]);
  
      // Validate the request
      const providerKey = await this.#LTI10Utils.validateOauthBody(req);
      if (!providerKey) {
        this.#logger.lti("Invalid OAuth Signature");
        return this.failureResponse({
          code: "failure",
          severity: "invalidtargetdatafail",
          description: "Invalid OAuth Signature",
        });
      }
  
      // Check Envelope
      if (
        !req.body["imsx_poxenveloperequest"] ||
        req.body["imsx_poxenveloperequest"]["$"]["xmlns"] !=
          "http://www.imsglobal.org/services/ltiv1p1/xsd/imsoms_v1p0"
      ) {
        this.#logger.lti("Invalid Envelope Request");
        return this.failureResponse(
          {
            code: "failure",
            severity: "invalidtargetdatafail",
            description: "Invalid Envelope Request",
          },
          providerKey,
          req.originalUrl,
        );
      }
      // Get Envelope
      const envelope = req.body["imsx_poxenveloperequest"];
  
      // Check Header
      if (!envelope["imsx_poxheader"]) {
        this.#logger.lti("Missing Envelope Header");
        return this.failureResponse(
          {
            code: "failure",
            severity: "invalidtargetdatafail",
            description: "Invalid Envelope Header",
          },
          providerKey,
          req.originalUrl,
        );
      }
      const header = envelope["imsx_poxheader"];
      if (!header["imsx_poxrequestheaderinfo"]) {
        this.#logger.lti("Missing Envelope Header Info");
        return this.failureResponse(
          {
            code: "failure",
            severity: "invalidtargetdatafail",
            description: "Invalid Envelope Header Info",
          },
          providerKey,
          req.originalUrl,
        );
      }
      const headerinfo = header["imsx_poxrequestheaderinfo"];
      if (!headerinfo["imsx_version"] || headerinfo["imsx_version"] !== "V1.0") {
        this.#logger.lti("Invalid Envelope Version");
        return this.failureResponse(
          {
            code: "failure",
            severity: "invalidtargetdatafail",
            description: "Invalid Envelope Version",
          },
          providerKey,
          req.originalUrl,
        );
      }
      if (
        !headerinfo["imsx_messageidentifier"] ||
        headerinfo["imsx_messageidentifier"].length === 0
      ) {
        this.#logger.lti("Missing Envelope Message Identifier");
        return this.failureResponse(
          {
            code: "failure",
            severity: "invalidtargetdatafail",
            description: "Missing Envelope Message Identifier",
          },
          providerKey,
          req.originalUrl,
        );
      }
      // Get Message Identifier
      const message_id = headerinfo["imsx_messageidentifier"];
  
      // Check Body
      if (!envelope["imsx_poxbody"]) {
        this.#logger.lti("Missing Envelope Body");
        return this.failureResponse(
          {
            code: "failure",
            severity: "invalidtargetdatafail",
            description: "Invalid Envelope Body",
          },
          providerKey,
          req.originalUrl,
          message_id,
        );
      }
      const body = envelope["imsx_poxbody"];
  
      if (body["replaceresultrequest"]) {
        return await this.replaceResultRequest(
          body["replaceresultrequest"],
          providerKey,
          req.originalUrl,
          message_id,
          req,
        );
      } else {
        // TODO handle readResult or deleteResult?
        let operation = Object.keys(body);
        if (operation.endsWith("request")) {
          operation = operation.slice(0, -7); // Remove "request" suffix
        }
        this.#logger.lti("Unsupported Operation: " + operation);
        // Return Unsupported Operation Response
        const message = `The operation ${operation} is not supported by this LTI Tool Consumer`;
        return this.failureResponse(
          { code: "unsupported", severity: "status", description: message },
          providerKey,
          req.originalUrl,
          message_id,
          operation,
        );
      }
    }
  
    /**
     * Handle a Replace Result Request
     *
     * @param {Object} request - the request object from the body
     * @param {Object} providerKey - the key and secret for the provider
     * @param {string} url - the original request URL
     * @param {string} message_id - the message identifier from the header
     * @param {Object} req - Express request object
     * @returns {boolean} - true if the request is valid, else false
     */
    async replaceResultRequest(request, providerKey, url, message_id, req) {
      this.#logger.lti("Handling Replace Result Request");
  
      // Parse Message
      if (!request["resultrecord"]) {
        this.#logger.lti("Missing Result Record");
        return this.failureResponse(
          {
            code: "failure",
            severity: "invalidtargetdatafail",
            description: "Missing Result Record",
          },
          providerKey,
          url,
          message_id,
          "replaceResult",
        );
      }
      const resultRecord = request["resultrecord"];
      if (!resultRecord["result"]) {
        this.#logger.lti("Missing Result");
        return this.failureResponse(
          {
            code: "failure",
            severity: "invalidtargetdatafail",
            description: "Missing Result",
          },
          providerKey,
          url,
          message_id,
          "replaceResult",
        );
      }
      const result = resultRecord["result"];
  
      // Check Result
      if (!result["resultscore"]) {
        this.#logger.lti("Missing Result Score");
        return this.failureResponse(
          {
            code: "failure",
            severity: "invalidtargetdatafail",
            description: "Missing Result Score",
          },
          providerKey,
          url,
          message_id,
          "replaceResult",
        );
      }
      if (
        !result["resultscore"]["textstring"] ||
        result["resultscore"]["textstring"].length === 0
      ) {
        this.#logger.lti("Missing Result Score Value");
        return this.failureResponse(
          {
            code: "failure",
            severity: "invalidtargetdatafail",
            description: "Missing Result Score Value",
          },
          providerKey,
          url,
          message_id,
          "replaceResult",
        );
      }
      const score = result["resultscore"]["textstring"];
      if (isNaN(score)) {
        this.#logger.lti("Invalid Result Score Value: " + score);
        return this.failureResponse(
          {
            code: "failure",
            severity: "invalidtargetdatafail",
            description: "Invalid Result Score Value",
          },
          providerKey,
          url,
          message_id,
          "replaceResult",
        );
      }
  
      // Check Source ID
      if (!resultRecord["sourcedguid"]) {
        this.#logger.lti("Missing Result Source ID");
        return this.failureResponse(
          {
            code: "failure",
            severity: "invalidtargetdatafail",
            description: "Missing Result Source ID",
          },
          providerKey,
          url,
          message_id,
          "replaceResult",
        );
      }
      const sourcedId = resultRecord["sourcedguid"];
      if (!sourcedId["sourcedid"] || sourcedId["sourcedid"].length === 0) {
        this.#logger.lti("Missing Result Source ID Value");
        return this.failureResponse(
          {
            code: "failure",
            severity: "invalidtargetdatafail",
            description: "Missing Result Source ID Value",
          },
          providerKey,
          url,
          message_id,
          "replaceResult",
        );
      }
      const sourcedIdValue = sourcedId["sourcedid"];
  
      // Parse Source ID
      const sourceValues = sourcedIdValue.split(":");
      if (sourceValues.length != 4) {
        this.#logger.lti(
          "Invalid Source ID " + sourcedIdValue + " - expected 4 parts",
        );
        return this.failureResponse(
          {
            code: "failure",
            severity: "invalididfail",
            description:
              "Invalid Source ID " + sourcedIdValue + " - expected 4 parts",
          },
          providerKey,
          url,
          message_id,
          "replaceResult",
        );
      }
      const [contextKey, resourceKey, userKey, gradebookKey] = sourceValues;
  
      // Post Provider Grade to Handler Function
      await this.consumer.postProviderGrade(
        providerKey.key,
        contextKey,
        resourceKey,
        userKey,
        gradebookKey,
        score,
        req,
      );
  
      // TODO update assignment grade and send to tool consumer
  
      /**
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
      const reply = {
        imsx_POXEnvelopeResponse: {
          $: {
            xmlns: "http://www.imsglobal.org/services/ltiv1p1/xsd/imsoms_v1p0",
          },
          imsx_POXHeader: {
            imsx_POXResponseHeaderInfo: {
              imsx_version: "V1.0",
              imsx_messageIdentifier: nanoid(),
              imsx_statusInfo: {
                imsx_codeMajor: "success",
                imsx_severity: "status",
                imsx_description: `Score for ${sourcedIdValue} is now ${score}`,
                imsx_messageRefIdentifier: message_id || "unknown",
                imsx_operationRefIdentifier: "replaceResult",
              },
            },
          },
          imsx_POXBody: {
            replaceResultResponse: {},
          },
        },
      };
      const builder = new xml2js.Builder();
      const content = builder.buildObject(reply);
      let headers = null;
      if (providerKey && url) {
        headers = await this.#LTI10Utils.signOauthBody(
          content,
          providerKey.key,
          providerKey.secret,
          url,
        );
      }
      return {
        content: content,
        headers: headers,
      };
    }
  
    /**
     * Handle a failure response
     *
     * @param {Object} error - the error
     * @param {Object} providerKey - the key and secret for the provider
     * @param {string} message_id - the message ID if available
     * @param {string} operation - the failed operation
     * @returns {Object} the response message
     */
    static async failureResponse(
      error,
      providerKey = null,
      url = null,
      message_id = null,
      operation = null,
    ) {
      /**
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
       */
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
                imsx_codeMajor: error.code,
                imsx_severity: error.severity,
                imsx_description: error.description,
                imsx_messageRefIdentifier: message_id || "unknown",
                imsx_operationRefIdentifier: operation || "unknown",
              },
            },
          },
          imsx_POXBody: {},
        },
      };
      const builder = new xml2js.Builder();
      const content = builder.buildObject(result);
      let headers = null;
      if (providerKey && url) {
        headers = await this.#LTI10Utils.signOauthBody(
          content,
          providerKey.key,
          providerKey.secret,
          url,
        );
      }
      return {
        content: content,
        headers: headers,
      };
    }
}