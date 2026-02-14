/**
 * @file LTI Provider Controller
 * @author Russell Feldhausen <russfeld@ksu.edu>
 * @exports LTIProviderController an LTI Controller instance
 */

class LTIProviderController {
  /**
     * Post a grade to a consumer
     *
     * @param {Object} grade - the grade to post
     * @param {Integer} [grade.consumer_id] - the consumer ID
     * @param {String} [grade.grade_url] - the grade post URL
     * @param {String} [grade.lms_grade_id] - the LMS grade ID (for LTI 1.0 Basic Outcomes)
     * @param {String} [grade.score] - the score to post (0.0 to 1.0)
     * @param {String} [grade.user_lis13_id] - the user LTI 1.3 ID (for LTI 1.3)
     * @param {Object} [grade.debug] - debugging information (optional)
     * @param {String} [grade.debug.user] - the user (for debugging)
     * @param {String} [grade.debug.user_id] - the user ID (for debugging)
     * @param {String} [grade.debug.assignment] - the assignment (for debugging)
     * @param {String} [grade.debug.assignment_id] - the assignment ID (for debugging)
     */
    async postGrade(grade) {
      this.#logger.lti(
        "Posting grade for user " +
          grade.debug.user +
          " (" +
          grade.debug.user_id +
          ") to assignment " +
          grade.debug.assignment +
          " (" +
          grade.debug.assignment_id +
          ")",
      );
      // TODO: consumer_user only needed for LTI 1.3 - can this be removed?
      if (!grade.consumer_id) {
        this.#logger.error("Consumer ID not provided for grade posting");
        return false;
      }
      const consumer = await this.models.Consumer.findByPk(grade.consumer_id);
      if (!consumer) {
        this.#logger.error("Cannot find consumer for ID: " + grade.consumer_id);
        return false;
      }
      if (!grade.grade_url) {
        this.#logger.error("Grade post does not have a grade URL");
        return false;
      }
      // Switch between LTI 1.0 and LTI 1.3
      if (grade.lms_grade_id) {
        // Has Grade ID, expecting Basic Outcomes
        /**
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
                    sourcedId: grade.lms_grade_id,
                  },
                  result: {
                    resultScore: {
                      language: "en",
                      textString: grade.score,
                    },
                  },
                },
              },
            },
          },
        };
        const builder = new xml2js.Builder();
        const content = builder.buildObject(envelope);
        let headers = null;
        const providerKey = await this.models.ConsumerKey.findOne({
          where: { key: consumer.key },
          attributes: ["key", "secret"],
        });
        const url = grade.grade_url;
        if (!providerKey) {
          this.#logger.error(
            "Cannot find provider key for consumer " + consumer.key,
          );
          return false;
        }
        if (providerKey && url) {
          headers = await this.#LTI10Utils.signOauthBody(
            content,
            providerKey.key,
            providerKey.secret,
            url,
          );
        }
        this.#logger.silly("Posting grade to " + grade.grade_url);
        this.#logger.silly("Headers: " + headers);
        this.#logger.silly("Content: " + content);
        try {
          const response = await ky.post(grade.grade_url, {
            headers: {
              Authorization: headers,
              "Content-Type": "application/xml",
            },
            body: content,
          });
          // parse response.text to xml
          const responseText = await response.text();
          const parser = new xml2js.Parser({ explicitArray: false, trim: true });
          const responseXml = await parser.parseStringPromise(responseText);
          this.#logger.silly(
            "Response XML: " + JSON.stringify(responseXml, null, 2),
          );
          if (response && response.status === 200) {
            if (
              responseXml.imsx_POXEnvelopeResponse.imsx_POXHeader
                .imsx_POXResponseHeaderInfo.imsx_statusInfo.imsx_codeMajor ===
              "success"
            ) {
              this.#logger.lti(
                "Grade posted successfully for user " +
                  grade.debug.user +
                  " (" +
                  grade.debug.user_id +
                  ")",
              );
              return true;
            } else {
              this.#logger.lti(
                "Failed to post grade for user " +
                  grade.debug.user +
                  " (" +
                  grade.debug.user_id +
                  ")",
              );
              this.#logger.debug(
                "Response: " + JSON.stringify(responseXml, null, 2),
              );
              return false;
            }
          } else {
            this.#logger.lti(
              "Failed to post grade for user " +
                grade.debug.user +
                " (" +
                grade.debug.user_id +
                ")",
            );
            this.#logger.debug(
              "Response: " + JSON.stringify(responseXml, null, 2),
            );
            return false;
          }
        } catch (error) {
          this.#logger.error("Error posting grade: " + error.message);
          return false;
        }
      } else {
        // Does not have Grade ID, expecting AGS
        if (!consumer.lti13) {
          this.#logger.error(
            "Assignment does not have LMS grade ID but Consumer does not support LTI 1.3",
          );
          return false;
        }
        const token = await this.#LTI13Utils.getAccessToken(
          grade.consumer_id,
          "https://purl.imsglobal.org/spec/lti-ags/scope/score",
        );
        // TODO Handle completed vs. incomplete grades here
        const lineitem = {
          timestamp: new Date(Date.now()).toISOString(),
          scoreGiven: parseFloat(grade.score),
          scoreMaximum: 1.0,
          activityProgress: "Submitted",
          gradingProgress: "FullyGraded",
          userId: grade.user_lis13_id,
        };
        this.#logger.silly(JSON.stringify(lineitem, null, 2));
        try {
          const response = await ky.post(grade.grade_url + "/scores", {
            json: lineitem,
            headers: {
              Authorization: `${token.token_type} ${token.access_token}`,
              "Content-Type": "application/vnd.ims.lis.v1.score+json",
            },
          });
          if (response && response.status === 200) {
            this.#logger.lti(
              "Grade posted successfully for user " +
                grade.debug.user +
                " (" +
                grade.debug.user_id +
                ")",
            );
            return true;
          } else {
            this.#logger.lti(
              "Failed to post grade for user " +
                grade.debug.user +
                " (" +
                grade.debug.user_id +
                ")",
            );
            this.#logger.lti("Response: " + JSON.stringify(response, null, 2));
            return false;
          }
        } catch (error) {
          this.#logger.error("Error posting grade: " + error.message);
          return false;
        }
      }
    }

    /**
   * LTI 1.3 Deeplink Selection Handler
   *
   * @param {Object} res the Express response object
   * @param {Consumer} consumer the LTI Consumer
   * @param {string} return_url the URL to send the data to
   * @param {string} id the ID of the resource to be created
   * @param {string} title the title of the resource to be created
   */
  async createDeepLink(res, consumer, return_url, id, title) {
    const data = {
      iss: consumer.client_id,
      aud: consumer.platform_id,
      nonce: nanoid(),
      "https://purl.imsglobal.org/spec/lti/claim/deployment_id":
        consumer.deployment_id,
      "https://purl.imsglobal.org/spec/lti/claim/message_type":
        "LtiDeepLinkingResponse",
      "https://purl.imsglobal.org/spec/lti/claim/version": "1.3.0",
      "https://purl.imsglobal.org/spec/lti-dl/claim/content_items": [
        {
          type: "ltiResourceLink",
          title: title,
          url: this.domain_name + this.#provider_config.route_prefix + "/launch",
          window: {
            targetName: "_blank",
          },
          custom: {
            custom_id: id,
          },
        },
      ],
    };
    const token = await this.#LTI13Utils.createToolToken(consumer.key, data);
    this.#logger.lti("Sending DeepLink Response to " + return_url);
    this.#logger.silly(token);
    res.header("Content-Type", "text/html");
    res.header("Content-Security-Policy", "form-action " + return_url);
    nunjucks.configure({ autoescape: true });
    const output = nunjucks.renderString(
      '<!doctype html>\
<head>\
<title>LTI Autoform</title>\
</head>\
<body onload="document.forms[0].submit()">\
<form method="POST" action="{{ return_url }}">\
  <input type="hidden" id="JWT" name="JWT" value="{{ token }}" />\
</form>\
</body>',
      {
        return_url,
        token,
      },
    );
    res.status(200).send(output);
  }
}