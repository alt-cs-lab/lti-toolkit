---
title: "LTI Registration"
pre: "5. "
weight: 50
---

## Sample LTI Registration Messages

### LTI 1.0 XML

The XML below has been reformatted a bit for readability

```xml
<cartridge_basiclti_link 
  xmlns="http://www.imsglobal.org/xsd/imslticc_v1p0" 
  xmlns:blti="http://www.imsglobal.org/xsd/imsbasiclti_v1p0" 
  xmlns:lticm="http://www.imsglobal.org/xsd/imslticm_v1p0" 
  xmlns:lticp="http://www.imsglobal.org/xsd/imslticp_v1p0" 
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" 
  xsi:schemaLocation="http://www.imsglobal.org/xsd/imslticc_v1p0 
    http://www.imsglobal.org/xsd/lti/ltiv1p0/imslticc_v1p0.xsd 
    http://www.imsglobal.org/xsd/imsbasiclti_v1p0 
    http://www.imsglobal.org/xsd/lti/ltiv1p0/imsbasiclti_v1p0.xsd 
    http://www.imsglobal.org/xsd/imslticm_v1p0 
    http://www.imsglobal.org/xsd/lti/ltiv1p0/imslticm_v1p0.xsd 
    http://www.imsglobal.org/xsd/imslticp_v1p0 
    http://www.imsglobal.org/xsd/lti/ltiv1p0/imslticp_v1p0.xsd"
  >
  <blti:title>LTI Toolkit</blti:title>
  <blti:description>LTI Toolkit for LTI Tool Providers</blti:description>
  <blti:icon>https://placehold.co/64x64.png</blti:icon>
  <blti:launch_url>https://ltidemo.home.russfeld.me/lti/provider/launch10</blti:launch_url>
  <blti:custom>
    <lticm:property name="custom_name">custom_value</lticm:property>
  </blti:custom>
  <blti:extensions platform="canvas.instructure.com">
    <lticm:property name="tool_id">lti_toolkit</lticm:property>
    <lticm:property name="privacy_level">public</lticm:property>
    <lticm:property name="domain">ltidemo.home.russfeld.me</lticm:property>
  </blti:extensions>
  <cartridge_bundle identifierref="BLTI001_Bundle"/>
  <cartridge_icon identifierref="BLTI001_Icon"/>
</cartridge_basiclti_link>
```

Helpful references:

* LTI XML Builder: https://www.edu-apps.org/build_xml.html
* LTI XML Example: https://codecheck.io/lti/config

### LTI 1.3 Dynamic Registration

#### Initial Request

The process begins with the LMS sending a request to the dynamic configuration URL for the tool (`register13`). These are the query parameters received from Canvas sent in that POST request.

```json
{
  "openid_configuration":"https://canvas.home.russfeld.me/api/lti/security/openid-configuration?registration_token=eyJ0eXAiOiJKV...","registration_token":"eyJ0eXAiOiJKV..."
}
```

From Canvas, the token is a JWT containing the following information (this is generally opaque to the tool, but interesting to see):

```json
{
  "uuid": "58daa07f-f662-44d7-9408-9cbf4ef1699e",
  "initiated_at": "2026-02-06T13:19:21-07:00",
  "user_id": 1,
  "root_account_global_id": 10000000000001,
  "root_account_domain": "canvas.home.russfeld.me",
  "registration_url": "https://ltidemo.home.russfeld.me/lti/provider/register13",
  "exp": 1770412761
}
```

#### LMS Information

The tool then sends a request to the `openid_configuration` URL received in the initial request to learn about the LMS. The following information is received from Canvas:

```json
{
  "issuer": "https://canvas.home.russfeld.me",
  "authorization_endpoint": "https://canvas.home.russfeld.me/api/lti/authorize_redirect",
  "registration_endpoint": "https://canvas.home.russfeld.me/api/lti/registrations",
  "jwks_uri": "https://canvas.home.russfeld.me/api/lti/security/jwks",
  "token_endpoint": "https://canvas.home.russfeld.me/login/oauth2/token",
  "token_endpoint_auth_methods_supported": [
    "private_key_jwt"
  ],
  "token_endpoint_auth_signing_alg_values_supported": [
    "RS256"
  ],
  "scopes_supported": [
    "openid",
    "https://purl.imsglobal.org/spec/lti-reg/scope/registration.readonly",
    "https://purl.imsglobal.org/spec/lti-reg/scope/registration",
    "https://purl.imsglobal.org/spec/lti-ags/scope/lineitem",
    "https://purl.imsglobal.org/spec/lti-ags/scope/lineitem.readonly",
    "https://purl.imsglobal.org/spec/lti-ags/scope/result.readonly",
    "https://purl.imsglobal.org/spec/lti-ags/scope/score",
    "https://purl.imsglobal.org/spec/lti-nrps/scope/contextmembership.readonly",
    "https://purl.imsglobal.org/spec/lti/scope/noticehandlers",
    "https://purl.imsglobal.org/spec/lti/scope/asset.readonly",
    "https://purl.imsglobal.org/spec/lti/scope/report",
    "https://purl.imsglobal.org/spec/lti/scope/eula/deployment",
    "https://purl.imsglobal.org/spec/lti/scope/eula/user",
    "https://canvas.instructure.com/lti/public_jwk/scope/update",
    "https://canvas.instructure.com/lti/account_lookup/scope/show",
    "https://canvas.instructure.com/lti-ags/progress/scope/show",
    "https://canvas.instructure.com/lti/page_content/show"
  ],
  "response_types_supported": [
    "id_token"
  ],
  "id_token_signing_alg_values_supported": [
    "RS256"
  ],
  "claims_supported": [
    "sub",
    "picture",
    "email",
    "name",
    "given_name",
    "family_name",
    "locale"
  ],
  "subject_types_supported": [
    "public"
  ],
  "authorization_server": "canvas.home.russfeld.me",
  "https://purl.imsglobal.org/spec/lti-platform-configuration": {
    "product_family_code": "canvas",
    "version": "OpenSource",
    "messages_supported": [
      {
        "type": "LtiResourceLinkRequest",
        "placements": [
          "https://canvas.instructure.com/lti/account_navigation",
          "https://canvas.instructure.com/lti/analytics_hub",
          "https://canvas.instructure.com/lti/assignment_edit",
          "https://canvas.instructure.com/lti/assignment_group_menu",
          "https://canvas.instructure.com/lti/assignment_index_menu",
          "https://canvas.instructure.com/lti/assignment_menu",
          "https://canvas.instructure.com/lti/assignment_selection",
          "https://canvas.instructure.com/lti/assignment_view",
          "https://canvas.instructure.com/lti/collaboration",
          "https://canvas.instructure.com/lti/conference_selection",
          "https://canvas.instructure.com/lti/course_assignments_menu",
          "https://canvas.instructure.com/lti/course_home_sub_navigation",
          "https://canvas.instructure.com/lti/course_navigation",
          "https://canvas.instructure.com/lti/course_settings_sub_navigation",
          "https://canvas.instructure.com/lti/discussion_topic_index_menu",
          "https://canvas.instructure.com/lti/discussion_topic_menu",
          "https://canvas.instructure.com/lti/file_index_menu",
          "https://canvas.instructure.com/lti/file_menu",
          "https://canvas.instructure.com/lti/global_navigation",
          "https://canvas.instructure.com/lti/homework_submission",
          "https://canvas.instructure.com/lti/link_selection",
          "https://canvas.instructure.com/lti/migration_selection",
          "https://canvas.instructure.com/lti/module_group_menu",
          "https://canvas.instructure.com/lti/module_index_menu",
          "https://canvas.instructure.com/lti/module_index_menu_modal",
          "https://canvas.instructure.com/lti/module_menu_modal",
          "https://canvas.instructure.com/lti/module_menu",
          "https://canvas.instructure.com/lti/post_grades",
          "https://canvas.instructure.com/lti/quiz_index_menu",
          "https://canvas.instructure.com/lti/quiz_menu",
          "https://canvas.instructure.com/lti/similarity_detection",
          "https://canvas.instructure.com/lti/student_context_card",
          "https://canvas.instructure.com/lti/submission_type_selection",
          "https://canvas.instructure.com/lti/tool_configuration",
          "https://canvas.instructure.com/lti/top_navigation",
          "https://canvas.instructure.com/lti/user_navigation",
          "https://canvas.instructure.com/lti/wiki_index_menu",
          "https://canvas.instructure.com/lti/wiki_page_menu",
          "ContentArea"
        ]
      },
      {
        "type": "LtiDeepLinkingRequest",
        "placements": [
          "https://canvas.instructure.com/lti/assignment_selection",
          "ActivityAssetProcessor",
          "ActivityAssetProcessorContribution",
          "https://canvas.instructure.com/lti/collaboration",
          "https://canvas.instructure.com/lti/conference_selection",
          "https://canvas.instructure.com/lti/course_assignments_menu",
          "https://canvas.instructure.com/lti/editor_button",
          "https://canvas.instructure.com/lti/homework_submission",
          "https://canvas.instructure.com/lti/link_selection",
          "https://canvas.instructure.com/lti/migration_selection",
          "https://canvas.instructure.com/lti/module_index_menu_modal",
          "https://canvas.instructure.com/lti/module_menu_modal",
          "https://canvas.instructure.com/lti/submission_type_selection",
          "ContentArea",
          "RichTextEditor"
        ]
      },
      {
        "type": "LtiEulaRequest"
      }
    ],
    "notice_types_supported": [
      "LtiHelloWorldNotice",
      "LtiAssetProcessorSubmissionNotice",
      "LtiContextCopyNotice",
      "LtiAssetProcessorContributionNotice"
    ],
    "variables": [
      "ResourceLink.id",
      "ResourceLink.description",
      "ResourceLink.title",
      "ResourceLink.available.startDateTime",
      "ResourceLink.available.endDateTime",
      "ResourceLink.submission.endDateTime",
      "com.instructure.User.observees",
      "com.instructure.User.sectionNames",
      "com.instructure.RCS.app_host",
      "com.instructure.User.student_view",
      "com.instructure.RCS.service_jwt",
      "com.instructure.instui_nav",
      "com.instructure.Observee.sisIds",
      "Context.title",
      "com.instructure.Editor.contents",
      "com.instructure.Editor.selection",
      "com.instructure.PostMessageToken",
      "com.instructure.Assignment.lti.id",
      "com.instructure.Assignment.description",
      "com.instructure.Assignment.allowedFileExtensions",
      "com.instructure.OriginalityReport.id",
      "com.instructure.Submission.id",
      "com.instructure.File.id",
      "CourseOffering.sourcedId",
      "Context.id",
      "com.instructure.Context.globalId",
      "com.instructure.Context.uuid",
      "Context.sourcedId",
      "Context.id.history",
      "Activity.id.history",
      "Message.documentTarget",
      "Message.locale",
      "ToolConsumerInstance.guid",
      "Canvas.api.domain",
      "Canvas.api.collaborationMembers.url",
      "Canvas.api.baseUrl",
      "ToolProxyBinding.memberships.url",
      "Canvas.account.id",
      "Canvas.account.name",
      "Canvas.account.sisSourceId",
      "Canvas.rootAccount.id",
      "Canvas.rootAccount.sisSourceId",
      "com.instructure.Account.instructureIdentityOrganizationId",
      "Canvas.externalTool.global_id",
      "Canvas.externalTool.url",
      "com.instructure.brandConfigJSON.url",
      "com.instructure.brandConfigJSON",
      "com.instructure.brandConfigJS.url",
      "Canvas.css.common",
      "Canvas.shard.id",
      "Canvas.root_account.global_id",
      "Canvas.root_account.id",
      "vnd.Canvas.root_account.uuid",
      "Canvas.root_account.sisSourceId",
      "Canvas.course.id",
      "vnd.instructure.Course.uuid",
      "Canvas.course.name",
      "Canvas.course.sisSourceId",
      "com.instructure.Course.integrationId",
      "Canvas.course.startAt",
      "Canvas.course.endAt",
      "Canvas.course.workflowState",
      "Canvas.course.hideDistributionGraphs",
      "Canvas.course.gradePassbackSetting",
      "Canvas.term.startAt",
      "Canvas.term.endAt",
      "Canvas.term.name",
      "Canvas.term.id",
      "CourseSection.sourcedId",
      "Canvas.enrollment.enrollmentState",
      "com.instructure.Assignment.anonymous_grading",
      "com.instructure.Assignment.restrict_quantitative_data",
      "com.instructure.Course.gradingScheme",
      "com.Instructure.membership.roles",
      "Canvas.membership.roles",
      "Canvas.membership.concludedRoles",
      "Canvas.membership.permissions<>",
      "Canvas.course.previousContextIds",
      "Canvas.course.previousContextIds.recursive",
      "Canvas.course.previousCourseIds",
      "com.instructure.Course.rce_studio_embed_improvements",
      "Person.name.full",
      "Person.name.display",
      "Person.name.family",
      "Person.name.given",
      "com.instructure.Person.name_sortable",
      "Person.email.primary",
      "com.instructure.Person.pronouns",
      "vnd.Canvas.Person.email.sis",
      "Person.address.timezone",
      "User.image",
      "User.id",
      "Canvas.user.id",
      "vnd.instructure.User.uuid",
      "vnd.instructure.User.current_uuid",
      "com.instructure.User.instructureIdentityGlobalUserId",
      "com.instructure.User.instructureIdentityOrganizationUserId",
      "Canvas.user.prefersHighContrast",
      "Canvas.user.prefersDyslexicFont",
      "com.instructure.Course.groupIds",
      "Canvas.group.contextIds",
      "Membership.role",
      "Canvas.xuser.allRoles",
      "com.instructure.User.allRoles",
      "Canvas.user.globalId",
      "Canvas.user.isRootAccountAdmin",
      "Canvas.user.adminableAccounts",
      "User.username",
      "Canvas.user.loginId",
      "Canvas.user.sisSourceId",
      "Canvas.user.sisIntegrationId",
      "Person.sourcedId",
      "Canvas.logoutService.url",
      "Canvas.masqueradingUser.id",
      "Canvas.masqueradingUser.userId",
      "Canvas.xapi.url",
      "Caliper.url",
      "Canvas.course.sectionIds",
      "Canvas.course.sectionRestricted",
      "Canvas.course.sectionSisSourceIds",
      "com.instructure.contextLabel",
      "Canvas.module.id",
      "Canvas.moduleItem.id",
      "Canvas.assignment.id",
      "Canvas.assignment.new_quizzes_type",
      "Canvas.assignment.anonymous_participants",
      "Canvas.assignment.description",
      "CourseGroup.id",
      "com.instructure.Group.id",
      "com.instructure.Group.name",
      "com.instructure.Tag.id",
      "com.instructure.Tag.name",
      "Canvas.assignment.title",
      "Canvas.assignment.pointsPossible",
      "Canvas.assignment.hideInGradebook",
      "Canvas.assignment.omitFromFinalGrade",
      "Canvas.assignment.unlockAt",
      "Canvas.assignment.lockAt",
      "Canvas.assignment.dueAt",
      "Canvas.assignment.unlockAt.iso8601",
      "Canvas.assignment.lockAt.iso8601",
      "Canvas.assignment.dueAt.iso8601",
      "Canvas.assignment.earliestEnrollmentDueAt.iso8601",
      "Canvas.assignment.allDueAts.iso8601",
      "Canvas.assignment.published",
      "Canvas.assignment.lockdownEnabled",
      "Canvas.assignment.allowedAttempts",
      "Canvas.assignment.submission.studentAttempts",
      "LtiLink.custom.url",
      "ToolProxyBinding.custom.url",
      "ToolProxy.custom.url",
      "ToolConsumerProfile.url",
      "vnd.Canvas.OriginalityReport.url",
      "vnd.Canvas.submission.url",
      "vnd.Canvas.submission.history.url",
      "Canvas.file.media.id",
      "Canvas.file.media.type",
      "Canvas.file.media.duration",
      "Canvas.file.media.size",
      "Canvas.file.media.title",
      "Canvas.file.usageRights.name",
      "Canvas.file.usageRights.url",
      "Canvas.file.usageRights.copyrightText",
      "com.instructure.Course.accept_canvas_resource_types",
      "com.instructure.Course.canvas_resource_type",
      "com.instructure.Course.canvas_resource_id",
      "com.instructure.Course.allow_canvas_resource_selection",
      "com.instructure.Course.available_canvas_resources",
      "com.instructure.Account.usage_metrics_enabled",
      "com.instructure.user.lti_1_1_id.history",
      "LineItem.resultValue.max",
      "Canvas.account.decimal_separator",
      "Canvas.account.thousand_separator",
      "Canvas.course.aiQuizGeneration"
    ],
    "https://canvas.instructure.com/lti/account_name": "ALT+CS Dev Canvas",
    "https://canvas.instructure.com/lti/account_lti_guid": "aUiNs1PwAjfVJ29mX5po2mGGUd1FjvpxfBxX8gHl:canvas-lms",
    "https://canvas.instructure.com/lti/account_domain": "canvas.home.russfeld.me"
  }
}
```

The tool must verify the `registration_endpoint` is a valid endpoint that includes the `issuer` as the domain to prevent any attacks. 

#### Registration Request

The tool then sends a POST request to the LMS using the `registration_endpoint` URL, and optionally with the `registration_token` provided in a header. Sample content of that request is shown below:

```json
{
  "application_type": "web",
  "response_types": ["id_token"],
  "grant_types": ["implicit", "client_credentials"],
  "initiate_login_uri": "https://example.com/lti/provider/login13",
  "redirect_uris": [
    "https://example.com/lti/provider/redirect13",
  ],
  "client_name": "LTI Toolkit",
  "logo_uri": "https://example.com/icon.png",
  "token_endpoint_auth_method": "private_key_jwt",
  "jwks_uri": "https://example.com/lti/provider/key13",
  "contacts": ["admin@example.com"],   
  "scope": "https://purl.imsglobal.org/spec/lti-ags/scope/score",
  "https://purl.imsglobal.org/spec/lti-tool-configuration": {
    "domain": "ltidemo.home.russfeld.me",
    "description": "LTI Demo Tool Description",
    "target_link_uri": "https://example.com/lti/provider//launch13",
    "custom_parameters": {
      "custom_name": "custom_value"
    },
    "claims": ["iss", "sub", "name", "given_name", "family_name", "email", "picture"],
    "messages": []
  }
}
```

#### Registration Response

If successful, the LMS will return a JSON response containing information about the registration. An example from Canvas is below:

```json
{
  "client_id": "10000000000005",
  "application_type": "web",
  "grant_types": [
    "client_credentials",
    "implicit"
  ],
  "initiate_login_uri": "https://ltidemo.home.russfeld.me/lti/provider/login13",
  "redirect_uris": [
    "https://ltidemo.home.russfeld.me/lti/provider/redirect13"
  ],
  "response_types": [
    "id_token"
  ],
  "client_name": "LTI Toolkit",
  "jwks_uri": "https://ltidemo.home.russfeld.me/lti/provider/key13",
  "logo_uri": "https://placehold.co/64x64.png",
  "token_endpoint_auth_method": "private_key_jwt",
  "scope": "https://purl.imsglobal.org/spec/lti-ags/scope/score",
  "https://purl.imsglobal.org/spec/lti-tool-configuration": {
    "domain": "ltidemo.home.russfeld.me",
    "messages": [],
    "claims": [
      "iss",
      "sub",
      "name",
      "given_name",
      "family_name",
      "email",
      "picture"
    ],
    "target_link_uri": "https://ltidemo.home.russfeld.me/lti/provider/launch13",
    "custom_parameters": {},
    "description": "LTI Toolkit for LTI Tool Providers",
    "https://canvas.instructure.com/lti/registration_config_url": "https://canvas.home.russfeld.me/api/lti/registrations/10000000000001/view"
  },
  "deployment_id": "9:8865aa05b4b79b64a91a86042e43af5ea8ae79eb"
}
```

This provides the `client_id` and `deployment_id`, which is needed to complete the registration. 

## Helpful Resources

* https://developerdocs.instructure.com/services/canvas/external-tools/lti/file.registration
* https://www.imsglobal.org/spec/lti-dr/v1p0 