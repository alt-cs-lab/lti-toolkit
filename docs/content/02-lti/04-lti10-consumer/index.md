---
title: "LTI 1.0 Tool Consumer"
pre: "4. "
weight: 40
---

When using the LTI Toolkit as an LTI Tool Consumer (LMS), it will send LTI Launch Requests using this format.

## Sample LTI 1.0 Tool Launch

```json
{
  "oauth_consumer_key": "Kyfb4eihmljr2ehgq",
  "oauth_signature_method": "HMAC-SHA1",
  "oauth_timestamp": "1768590571",
  "oauth_nonce": "_yX_tiCIcAV-pGE3Lq0PS",
  "oauth_version": "1.0",
  "context_id": "thisisasectionkey",
  "context_label": "PL Default",
  "context_title": "PrairieLearn Default Section",
  "launch_presentation_document_target": "iframe",
  "launch_presentation_locale": "en",
  "launch_presentation_return_url": "https://lpp.home.russfeld.me/student/1",
  "lis_outcome_service_url": "https://lpp.home.russfeld.me/lti/consumer/grade_passback",
  "lis_result_sourcedid": "thisisasectionkey:thisisalessonkey:n7StL49uxddH2Gf5aBqoC:hqTqbHFOw1IoSA4Qf6R_A",
  "lis_person_contact_email_primary": "canvasstudent@russfeld.me",
  "lis_person_name_family": "StudentLast",
  "lis_person_name_full": "StudentFirst StudentLast",
  "lis_person_name_given": "StudentFirst",
  "lti_message_type": "basic-lti-launch-request",
  "lti_version": "LTI-1p0",
  "oauth_callback": "about:blank",
  "resource_link_id": "thisisalessonkey",
  "resource_link_title": "Introduction to Variables in Python",
  "roles": "Learner",
  "tool_consumer_info_product_family_code": "learningpathplatform",
  "tool_consumer_info_version": "cloud",
  "tool_consumer_instance_contact_email": "russfeld@ksu.edu",
  "tool_consumer_instance_guid": "devplatform",
  "tool_consumer_instance_name": "Learning Path Platform",
  "user_id": "n7StL49uxddH2Gf5aBqoC",
  "user_image": "http://canvas.instructure.com/images/messages/avatar-50.png",
  "oauth_signature": "DzeROfQzBafyvblTAZeeM+n4ryA="
}
```