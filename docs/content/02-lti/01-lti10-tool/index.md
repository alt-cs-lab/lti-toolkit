---
title: "LTI 1.0 Tool Provider"
pre: "1. "
weight: 10
---

**Sample LTI 1.0 Launch from Canvas - Admin**

```json
{
  "oauth_consumer_key": "thisisasupersecretkey",
  "oauth_signature_method": "HMAC-SHA1",
  "oauth_timestamp": "1749754327",
  "oauth_nonce": "JUcK2ZIwc5I9SJsDDwAeODA76PgtBHMYyHgPQ8YvEEw",
  "oauth_version": "1.0",
  "context_id": "d3a2504bba5184799a38f141e8df2335cfa8206d",
  "context_label": "LTI13",
  "context_title": "LTI 1.3 Test Course",
  "custom_canvas_api_domain": "canvas.home.russfeld.me",
  "custom_canvas_assignment_id": "2",
  "custom_canvas_assignment_points_possible": "100",
  "custom_canvas_assignment_title": "Test LTI 1.3 Assignment Name",
  "custom_canvas_course_id": "3",
  "custom_canvas_enrollment_state": "",
  "custom_canvas_module_id": "$Canvas.module.id",
  "custom_canvas_module_item_id": "2",
  "custom_canvas_user_id": "1",
  "custom_canvas_user_login_id": "canvasadmin@russfeld.me",
  "custom_canvas_workflow_state": "available",
  "ext_ims_lis_basic_outcome_url": "https://canvas.home.russfeld.me/api/lti/v1/tools/6/ext_grade_passback",
  "ext_lti_assignment_id": "8aa641d1-b4d4-4fea-8a9b-e9fedfb62b1e",
  "ext_outcome_data_values_accepted": "url,text",
  "ext_outcome_result_total_score_accepted": "true",
  "ext_outcome_submission_needs_additional_review_accepted": "true",
  "ext_outcome_submission_prioritize_non_tool_grade_accepted": "true",
  "ext_outcome_submission_submitted_at_accepted": "true",
  "ext_outcomes_tool_placement_url": "https://canvas.home.russfeld.me/api/lti/v1/turnitin/outcomes_placement/6",
  "ext_roles": "urn:lti:instrole:ims/lis/Administrator,urn:lti:sysrole:ims/lis/SysAdmin,urn:lti:sysrole:ims/lis/User",
  "launch_presentation_document_target": "iframe",
  "launch_presentation_locale": "en",
  "launch_presentation_return_url": "https://canvas.home.russfeld.me/courses/3/assignments",
  "lis_outcome_service_url": "https://canvas.home.russfeld.me/api/lti/v1/tools/6/grade_passback",
  "lis_person_contact_email_primary": "canvasadmin@russfeld.me",
  "lis_person_name_family": "",
  "lis_person_name_full": "canvasadmin@russfeld.me",
  "lis_person_name_given": "canvasadmin@russfeld.me",
  "lti_message_type": "basic-lti-launch-request",
  "lti_version": "LTI-1p0",
  "oauth_callback": "about:blank",
  "resource_link_id": "6a8aaca162bfc4393804afd4cd53cd94413c48bb",
  "resource_link_title": "Test LTI 1.3 Assignment Name",
  "roles": "urn:lti:instrole:ims/lis/Administrator,urn:lti:sysrole:ims/lis/SysAdmin",
  "tool_consumer_info_product_family_code": "canvas",
  "tool_consumer_info_version": "cloud",
  "tool_consumer_instance_contact_email": "canvas@russfeld.me",
  "tool_consumer_instance_guid": "zOUAtkfS3gI8nh5IskzlgAro1oCx3rx6SGGahiLL:canvas-lms",
  "tool_consumer_instance_name": "ALT+CS Lab",
  "user_id": "535fa085f22b4655f48cd5a36a9215f64c062838",
  "user_image": "http://canvas.instructure.com/images/messages/avatar-50.png",
  "oauth_signature": "lrWfY8y049li0gJBEM//4hwgUy8="
}
```

**Sample LTI 1.0 Launch from Canvas - Teacher**

```json
{
  "oauth_consumer_key": "thisisasupersecretkey",
  "oauth_signature_method": "HMAC-SHA1",
  "oauth_timestamp": "1749756799",
  "oauth_nonce": "aVAIWQpIfbCZAtCr5FP0ruPHY4522yzGwhtFLNIA4",
  "oauth_version": "1.0",
  "context_id": "4dde05e8ca1973bcca9bffc13e1548820eee93a3",
  "context_label": "LTI10",
  "context_title": "LTI 1.0 Test Course",
  "custom_1": "value_1",
  "custom_2": "value_2",
  "custom_canvas_api_domain": "canvas.home.russfeld.me",
  "custom_canvas_assignment_id": "1",
  "custom_canvas_assignment_points_possible": "100",
  "custom_canvas_assignment_title": "Test LTI 1.0 Assignment Name",
  "custom_canvas_course_id": "1",
  "custom_canvas_enrollment_state": "active",
  "custom_canvas_module_id": "$Canvas.module.id",
  "custom_canvas_module_item_id": "1",
  "custom_canvas_user_id": "3",
  "custom_canvas_user_login_id": "canvasteacher@russfeld.me",
  "custom_canvas_workflow_state": "available",
  "ext_ims_lis_basic_outcome_url": "https://canvas.home.russfeld.me/api/lti/v1/tools/1/ext_grade_passback",
  "ext_lti_assignment_id": "599692b2-3abe-4ca2-a6c8-2323ef57189d",
  "ext_outcome_data_values_accepted": "url,text",
  "ext_outcome_result_total_score_accepted": "true",
  "ext_outcome_submission_needs_additional_review_accepted": "true",
  "ext_outcome_submission_prioritize_non_tool_grade_accepted": "true",
  "ext_outcome_submission_submitted_at_accepted": "true",
  "ext_outcomes_tool_placement_url": "https://canvas.home.russfeld.me/api/lti/v1/turnitin/outcomes_placement/1",
  "ext_roles": "urn:lti:instrole:ims/lis/Instructor,urn:lti:role:ims/lis/Instructor,urn:lti:sysrole:ims/lis/User",
  "launch_presentation_document_target": "iframe",
  "launch_presentation_locale": "en",
  "launch_presentation_return_url": "https://canvas.home.russfeld.me/courses/1/assignments",
  "lis_outcome_service_url": "https://canvas.home.russfeld.me/api/lti/v1/tools/1/grade_passback",
  "lis_person_contact_email_primary": "canvasteacher@russfeld.me",
  "lis_person_name_family": "TeacherLast",
  "lis_person_name_full": "TeacherFirst TeacherLast",
  "lis_person_name_given": "TeacherFirst",
  "lis_person_sourcedid": "7858675309",
  "lti_message_type": "basic-lti-launch-request",
  "lti_version": "LTI-1p0",
  "oauth_callback": "about:blank",
  "resource_link_id": "ae06e3eb8ea83588f0a1c5897b98830dc93f47d8",
  "resource_link_title": "Test LTI 1.0 Assignment Name",
  "roles": "Instructor",
  "tool_consumer_info_product_family_code": "canvas",
  "tool_consumer_info_version": "cloud",
  "tool_consumer_instance_contact_email": "canvas@russfeld.me",
  "tool_consumer_instance_guid": "zOUAtkfS3gI8nh5IskzlgAro1oCx3rx6SGGahiLL:canvas-lms",
  "tool_consumer_instance_name": "ALT+CS Lab",
  "user_id": "c0ddd6c90cbe1ef0f32fbce5c3bf654204be186c",
  "user_image": "https://canvas.home.russfeld.me/images/thumbnails/2/GJhBgjcBm2BG6aFOlLDZpjEMDRzB5jgUBJYuVqJu",
  "oauth_signature": "99TXj++LWMqCjKfHcCE7KFt9aZk="
}
```

**Sample LTI 1.0 Launch from Canvas - Student**

```json
{
  "oauth_consumer_key": "thisisasupersecretkey",
  "oauth_signature_method": "HMAC-SHA1",
  "oauth_timestamp": "1749756960",
  "oauth_nonce": "MBh6cnqdWZBavuubUyf66SHaMlylmIVbjkbLa4HDLZA",
  "oauth_version": "1.0",
  "context_id": "4dde05e8ca1973bcca9bffc13e1548820eee93a3",
  "context_label": "LTI10",
  "context_title": "LTI 1.0 Test Course",
  "custom_1": "value_1",
  "custom_2": "value_2",
  "custom_canvas_api_domain": "canvas.home.russfeld.me",
  "custom_canvas_assignment_id": "1",
  "custom_canvas_assignment_points_possible": "100",
  "custom_canvas_assignment_title": "Test LTI 1.0 Assignment Name",
  "custom_canvas_course_id": "1",
  "custom_canvas_enrollment_state": "active",
  "custom_canvas_module_id": "$Canvas.module.id",
  "custom_canvas_module_item_id": "1",
  "custom_canvas_user_id": "2",
  "custom_canvas_user_login_id": "canvasstudent@russfeld.me",
  "custom_canvas_workflow_state": "available",
  "ext_ims_lis_basic_outcome_url": "https://canvas.home.russfeld.me/api/lti/v1/tools/1/ext_grade_passback",
  "ext_lti_assignment_id": "599692b2-3abe-4ca2-a6c8-2323ef57189d",
  "ext_outcome_data_values_accepted": "url,text",
  "ext_outcome_result_total_score_accepted": "true",
  "ext_outcome_submission_needs_additional_review_accepted": "true",
  "ext_outcome_submission_prioritize_non_tool_grade_accepted": "true",
  "ext_outcome_submission_submitted_at_accepted": "true",
  "ext_outcomes_tool_placement_url": "https://canvas.home.russfeld.me/api/lti/v1/turnitin/outcomes_placement/1",
  "ext_roles": "urn:lti:instrole:ims/lis/Student,urn:lti:role:ims/lis/Learner,urn:lti:sysrole:ims/lis/User",
  "launch_presentation_document_target": "iframe",
  "launch_presentation_locale": "en",
  "launch_presentation_return_url": "https://canvas.home.russfeld.me/courses/1/assignments",
  "lis_outcome_service_url": "https://canvas.home.russfeld.me/api/lti/v1/tools/1/grade_passback",
  "lis_person_contact_email_primary": "canvasstudent@russfeld.me",
  "lis_person_name_family": "StudentLast",
  "lis_person_name_full": "StudentFirst StudentLast",
  "lis_person_name_given": "StudentFirst",
  "lis_person_sourcedid": "835203884",
  "lis_result_sourcedid": "1-1-1-2-c14957047fa8fd73a6aa4d7ec543574aff29597b",
  "lti_message_type": "basic-lti-launch-request",
  "lti_version": "LTI-1p0",
  "oauth_callback": "about:blank",
  "resource_link_id": "ae06e3eb8ea83588f0a1c5897b98830dc93f47d8",
  "resource_link_title": "Test LTI 1.0 Assignment Name",
  "roles": "Learner",
  "tool_consumer_info_product_family_code": "canvas",
  "tool_consumer_info_version": "cloud",
  "tool_consumer_instance_contact_email": "canvas@russfeld.me",
  "tool_consumer_instance_guid": "zOUAtkfS3gI8nh5IskzlgAro1oCx3rx6SGGahiLL:canvas-lms",
  "tool_consumer_instance_name": "ALT+CS Lab",
  "user_id": "86157096483e6b3a50bfedc6bac902c0b20a824f",
  "user_image": "https://canvas.home.russfeld.me/images/thumbnails/3/fnQIzMRWPAny4JOWMUvz8FiHsvP5Tyk4CRBKmMhm",
  "oauth_signature": "eXuQHonpd554T34k8Ro22+lhI+c="
}
```

Documentation:

![Sequence Diagram](images/lti_10_seq.png)

References:

* https://www.imsglobal.org/specs/ltiv1p1/implementation-guide - super helpful
* https://datatracker.ietf.org/doc/html/rfc5849 - OAuth 1.0
* https://github.com/request/oauth-sign/blob/master/index.js - reference implementation
* https://github.com/omsmith/ims-lti - reference implementation