json"---
title: "LTI Deeplink"
pre: "6. "
weight: 60
---

## Sample LTI Deeplink Message from Canvas

```json
{
  "https://purl.imsglobal.org/spec/lti/claim/message_type": "LtiDeepLinkingRequest",
  "https://purl.imsglobal.org/spec/lti/claim/version": "1.3.0",
  "https://purl.imsglobal.org/spec/lti-dl/claim/deep_linking_settings": {
    deep_link_return_url: "https://canvas.home.russfeld.me/courses/6/deep_linking_response?data=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJub25jZSI6IjJjNzFhNDg3LTkyZDMtNDgyMy05MzQ3LTBjOTA4M2VjNjE3YiIsIm1vZGFsIjp0cnVlLCJwbGFjZW1lbnQiOiJhc3NpZ25tZW50X3NlbGVjdGlvbiJ9.oLJ-mERLRbnPrXKlIFckI6PwdVP3AK7yuZ7YAXwfA5c",
    accept_types: [ "ltiResourceLink" ],
    accept_presentation_document_targets: [ "iframe", "window" ],
    accept_media_types: "application/vnd.ims.lti.v1.ltilink",
    auto_create: false,
    accept_multiple: false
  },
  aud: "10000000000019",
  azp: "10000000000019",
  "https://purl.imsglobal.org/spec/lti/claim/deployment_id": "25:8865aa05b4b79b64a91a86042e43af5ea8ae79eb",
  exp: 1770859890,
  iat: 1770856290,
  iss: "https://canvas.home.russfeld.me",
  nonce: "k65Xz-gLbWZ3qS6GMMGfp",
  sub: "64e54a81-ff9a-4ad5-8bb0-16932216d7de",
  "https://purl.imsglobal.org/spec/lti/claim/target_link_uri": "https://ltidemo.home.russfeld.me/lti/provider/launch",
  picture: "http://canvas.instructure.com/images/messages/avatar-50.png",
  email: "canvasteacher@russfeld.me",
  name: "TeacherFirst TeacherLast",
  given_name: "TeacherFirst",
  family_name: "TeacherLast",
  "https://purl.imsglobal.org/spec/lti/claim/lis": {
    person_sourcedid: "7858675309",
    course_offering_sourcedid: "$CourseSection.sourcedId"
  },
  "https://purl.imsglobal.org/spec/lti/claim/context": {
    id: "20d4c62c24a96e1f3afb75776a253004109a1e22",
    label: "LTI 1.3 DR",
    title: "LTI 1.3 Dynamic Registration Test",
    type: [ "http://purl.imsglobal.org/vocab/lis/v2/course#CourseOffering" ]
  },
  "https://purl.imsglobal.org/spec/lti/claim/tool_platform": {
    guid: "aUiNs1PwAjfVJ29mX5po2mGGUd1FjvpxfBxX8gHl:canvas-lms",
    name: "ALT+CS Dev Canvas",
    version: "cloud",
    product_family_code: "canvas"
  },
  "https://purl.imsglobal.org/spec/lti/claim/launch_presentation": {
    document_target: "iframe",
    return_url: "https://canvas.home.russfeld.me/deep_linking_cancel?include_host=true&placement=assignment_selection",
    locale: "en",
    height: 400,
    width: 800
  },
  locale: "en",
  "https://purl.imsglobal.org/spec/lti/claim/roles": [
    "http://purl.imsglobal.org/vocab/lis/v2/institution/person#Instructor",
    "http://purl.imsglobal.org/vocab/lis/v2/membership#Instructor",
    "http://purl.imsglobal.org/vocab/lis/v2/system/person#User"
  ],
  "https://purl.imsglobal.org/spec/lti/claim/custom": {},
  "https://purl.imsglobal.org/spec/lti-ags/claim/endpoint": {
    scope: [ "https://purl.imsglobal.org/spec/lti-ags/scope/score" ],
    lineitems: "http://canvas.home.russfeld.me/api/lti/courses/6/line_items"
  },
  "https://purl.imsglobal.org/spec/lti/claim/lti11_legacy_user_id": "f326d6a8a55f30f47b2480586f97991ab9e602bb",
  "https://purl.imsglobal.org/spec/lti/claim/lti1p1": { user_id: "f326d6a8a55f30f47b2480586f97991ab9e602bb" },
  "https://purl.imsglobal.org/spec/lti/claim/eulaservice": {
    url: "http://canvas.home.russfeld.me/api/lti/asset_processor_eulas/25",
    scope: [
      "https://purl.imsglobal.org/spec/lti/scope/eula/user",
      "https://purl.imsglobal.org/spec/lti/scope/eula/deployment"
    ]
  },
  "https://www.instructure.com/placement": "assignment_selection",
  key: "7zPyT2Y3FqkkEDyRRgv5o"
}
```

## Deeplink Data Object

The LTI Toolkit constructs a `deeplinkData` object from each incoming LTI Deeplink launch that contains the following information. Each attribute is documented with the original source of that attribute from the LTI 1.3 launch request. To simplify things, the `baseURL` in the descriptions below has been replaced with a variable that carries this value:

```js
baseURL = "https://purl.imsglobal.org/spec/lti/claim/"
```

* `launch_type` - the type of LTI launch
  * LTI 1.3: `"lti1.3deeplink"`
* `tool_consumer_key` - the locally-generated key used to identify the tool consumer (either the OAuth Key for LTI 1.0 or the provided Key in the Login URL for LTI 1.3)
  * LTI 1.3: `thisisasupersecretkey`
* `course_id` - the unique ID of the course
  * LTI 1.3: `[baseUrl + "context"].id`
* `course_label` - the short title of the course (e.g. `"CIS 101"`)
  * LTI 1.3: `[baseUrl + "context"].label`
* `course_name` - the full title of the course (e.g `"Computer Programming"`)
  * LTI 1.3: `[baseUrl + "context"].title`
* `return_url` - the URL to return students to after finishing the assignment
  * LTI 1.3: `[baseUrl + "launch_presentation"].return_url`
* `user_lis_id` - the unique ID of the student for LTI 1.0
  * LTI 1.3: `[baseUrl + "lti1p1"].user_id`
* `user_lis13_id` - the unique ID of the student for LTI 1.3
  * LTI 1.3: `launchResult.sub`
* `user_email` - the email address of the student
  * LTI 1.3: `email`
  * May be omitted depending on privacy level selected
* `user_name` - the full name of the student (e.g. `"Willie Wildcat"`)
  * LTI 1.3: `name`
  * May be omitted depending on privacy level selected
* `user_given_name` - the given name (first name) of the student (e.g. `"Willie"`)
  * LTI 1.3: `given_name`
  * May be omitted depending on privacy level selected
* `user_family_name` - the famly name (last name or surname) of the student (e.g. `"Wildcat"`)
  * LTI 1.3: `family_name`
  * May be omitted depending on privacy level selected
* `user_image` - the URL of the profile image of the user
  * LTI 1.3: `picture`
  * May be omitted depending on privacy level selected
* `user_roles` - the roles assigned to the user
  * LTI 1.3: `[baseUrl + "roles"]`
* `custom` - any custom parameters provided to the system (in LTI 1.0, they **MUST** be prefixed with `lpp` to be detected)
  * LTI 1.0: search for any attributes prefixed with `custom_`
  * LTI 1.3: `[baseUrl + "custom"]`
* `deep_link_return_url` - the URL to return the DeepLink data to

