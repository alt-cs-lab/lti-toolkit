---
title: "LTI Launch Data"
pre: "3. "
weight: 30
---

The LTI controller constructs a `launchData` object from each LTI launch that contains the following information:

`baseURL` = `"https://purl.imsglobal.org/spec/lti/claim/"`
`agsURL` = `"https://purl.imsglobal.org/spec/lti-ags/claim/"`

* `launch_type` - the type of LTI launch
  * LTI 1.0: `"lti1.0"`
  * LTI 1.3: `"lti1.3"`
* `tool_consumer_key` - the locally-generated key used to identify the tool consumer (either the OAuth Key for LTI 1.0 or the provided Key in the Login URL for LTI 1.3)
  * LTI 1.0: `thisisasupersecretkey`
  * LTI 1.3: `thisisasupersecretkey`
* `tool_consumer_product` - the tool consumer product name (e.g. `"canvas"`)
  * LTI 1.0: `tool_consumer_info_product_family_code`
  * LTI 1.3: `[baseUrl + "tool_platform"].product_family_code`
* `tool_consumer_guid` - the unique GUID of the tool consumer instance
  * LTI 1.0: `tool_consumer_instance_guid`
  * LTI 1.3: `[baseUrl + "tool_platform"].guid`
* `tool_consumer_name` - the name of the tool consumer instance (e.g. `"ALT+CS Canvas"`)
  * LTI 1.0: `tool_consumer_instance_name`
  * LTI 1.3: `[baseUrl + "tool_platform"].name`
* `tool_consumer_version` - the version of the tool consumer instance
  * LTI 1.0: `tool_consumer_info_version`
  * LTI 1.3: `[baseUrl + "tool_platform"].version`
* `course_id` - the unique ID of the course
  * LTI 1.0: `context_id`
  * LTI 1.3: `[baseUrl + "context"].id`
* `course_label` - the short title of the course (e.g. `"CIS 101"`)
  * LTI 1.0: `context_label`
  * LTI 1.3: `[baseUrl + "context"].label`
* `course_name` - the full title of the course (e.g `"Computer Programming"`)
  * LTI 1.0: `context_title`
  * LTI 1.3: `[baseUrl + "context"].title`
* `assignment_id` - the unique ID of the assignment
  * LTI 1.0: `resource_link_id`
  * LTI 1.3: `[baseUrl + "lti1p1"].resource_link_id`
* `assignment_lti_id` - the unique LTI ID of the assignment
  * LTI 1.0: `ext_lti_assignment_id`
  * LTI 1.3: `[baseUrl + "resource_link"].id`
* `assignment_name` - the name of the assignment (e.g. `"Programming Lab 1"`)
  * LTI 1.0: `resource_link_title`
  * LTI 1.3: `[baseUrl + "resource_link"].title`
* `return_url` - the URL to return students to after finishing the assignment
  * LTI 1.0: `launch_presentation_return_url`
  * LTI 1.3: `[baseUrl + "launch_presentation"].return_url`
* `outcome_url` - the URL to submit grades to
  * LTI 1.0: `lis_outcome_service_url`
  * LTI 1.3: `[agsUrl + "endpoint"].lineitem`
* `outcome_id` - the ID of the outcome to submit (only present on student launches)
  * LTI 1.0: `lis_result_sourcedid`
  * LTI 1.3: `null`
* `outcome_ags` - information for the LTI Assignment & Grade Services (AGS)
  * LTI 1.0: `null`
  * LTI 1.3: `launchResult[agsUrl + "endpoint"]`
* `user_lis_id` - the unique ID of the student for LTI 1.0
  * LTI 1.0: `user_id`
  * LTI 1.3: `[baseUrl + "lti1p1"].user_id`
* `user_lis13_id` - the unique ID of the student for LTI 1.3
  * LTI 1.0: `null`
  * LTI 1.3: `launchResult.sub`
* `user_email` - the email address of the student
  * LTI 1.0: `lis_person_contact_email_primary`
  * LTI 1.3: `email`
* `user_name` - the full name of the student (e.g. `"Willie Wildcat"`)
  * LTI 1.0: `lis_person_name_full`
  * LTI 1.3: `name`
* `user_given_name` - the given name (first name) of the student (e.g. `"Willie"`)
  * LTI 1.0: `lis_person_name_given`
  * LTI 1.3: `given_name`
* `user_family_name` - the famly name (last name or surname) of the student (e.g. `"Wildcat"`)
  * LTI 1.0: `lis_person_name_family`
  * LTI 1.3: `family_name`
* `user_image` - the URL of the profile image of the user
  * LTI 1.0: `user_image`
  * LTI 1.3: `picture`
* `user_roles` - the roles assigned to the user
  * LTI 1.0: `role`
  * LTI 1.3: `[baseUrl + "roles"]`
* `custom` - any custom parameters provided to the system (in LTI 1.0, they **MUST** be prefixed with `lpp` to be detected)
  * LTI 1.0: search for any attributes prefixed with `lpp_`
  * LTI 1.3: `[baseUrl + "custom"]`
 
**LTI 1.0 Example**

```js
{
  launch_type: 'lti1.0',
  tool_consumer_key: 'thisisasupersecretkey',
  tool_consumer_product: 'canvas',
  tool_consumer_guid: 'zOUAtkfS3gI8nh5IskzlgAro1oCx3rx6SGGahiLL:canvas-lms',
  tool_consumer_name: 'ALT+CS Lab',
  tool_consumer_version: 'cloud',
  course_id: '4dde05e8ca1973bcca9bffc13e1548820eee93a3',
  course_label: 'LTI10',
  course_name: 'LTI 1.0 Test Course',
  assignment_id: 'ae06e3eb8ea83588f0a1c5897b98830dc93f47d8',
  assignment_lti_id: '599692b2-3abe-4ca2-a6c8-2323ef57189d',
  assignment_name: 'Test LTI 1.0 Assignment Name',
  return_url: 'https://canvas.home.russfeld.me/courses/1/assignments',
  outcome_url: 'https://canvas.home.russfeld.me/api/lti/v1/tools/1/grade_passback',
  outcome_id: '1-1-1-2-c14957047fa8fd73a6aa4d7ec543574aff29597b',
  outcome_ags: null,
  user_lis_id: '86157096483e6b3a50bfedc6bac902c0b20a824f',
  user_email: 'canvasstudent@russfeld.me',
  user_name: 'StudentFirst StudentLast',
  user_given_name: 'StudentFirst',
  user_family_name: 'StudentLast',
  user_image: 'https://canvas.home.russfeld.me/images/thumbnails/3/fnQIzMRWPAny4JOWMUvz8FiHsvP5Tyk4CRBKmMhm',
  user_roles: 'Learner',
  custom: { custom_1: 'value_1', custom_2: 'value_2' }
}
```

**LTI 1.3 Example**

```js
{
  launch_type: 'lti1.3',
  tool_consumer_product: 'canvas',
  tool_consumer_guid: 'zOUAtkfS3gI8nh5IskzlgAro1oCx3rx6SGGahiLL:canvas-lms',
  tool_consumer_name: 'ALT+CS Lab',
  tool_consumer_version: 'cloud',
  course_id: 'd3a2504bba5184799a38f141e8df2335cfa8206d',
  course_label: 'LTI13',
  course_name: 'LTI 1.3 Test Course',
  assignment_id: '6a8aaca162bfc4393804afd4cd53cd94413c48bb',
  assignment_lti_id: '8aa641d1-b4d4-4fea-8a9b-e9fedfb62b1e',
  assignment_name: 'Test LTI 1.3 Assignment Name',
  return_url: 'https://canvas.home.russfeld.me/courses/3/assignments',
  outcome_url: null,
  outcome_id: null,
  outcome_ags: '{"lineitem":"https://canvas.home.russfeld.me/api/lti/courses/3/line_items/1","scope":["https://purl.imsglobal.org/spec/lti-ags/scope/lineitem","https://purl.imsglobal.org/spec/lti-ags/scope/lineitem.readonly","https://purl.imsglobal.org/spec/lti-ags/scope/result.readonly","https://purl.imsglobal.org/spec/lti-ags/scope/score","https://canvas.instructure.com/lti-ags/progress/scope/show"],"lineitems":"http://canvas.home.russfeld.me/api/lti/courses/3/line_items"}',
  user_lis_id: '86157096483e6b3a50bfedc6bac902c0b20a824f',
  user_email: 'canvasstudent@russfeld.me',
  user_name: 'StudentFirst StudentLast',
  user_given_name: 'StudentFirst',
  user_family_name: 'StudentLast',
  user_image: 'https://canvas.home.russfeld.me/images/thumbnails/3/fnQIzMRWPAny4JOWMUvz8FiHsvP5Tyk4CRBKmMhm',
  user_roles: [
    'http://purl.imsglobal.org/vocab/lis/v2/institution/person#Student',
    'http://purl.imsglobal.org/vocab/lis/v2/membership#Learner',
    'http://purl.imsglobal.org/vocab/lis/v2/system/person#User'
  ],
  custom: { custom1: 'value1', custom2: 'value2' }
}
```

Documentation:

* LTI 1.0: https://www.imsglobal.org/specs/ltiv1p1/implementation-guide
* LTI 1.3: https://www.imsglobal.org/spec/lti/v1p3#required-message-claims 
* Roles: 
