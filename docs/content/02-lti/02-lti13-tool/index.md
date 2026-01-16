---
title: "LTI 1.3 Tool Provider"
pre: "2. "
weight: 20
---

This page documents the messages sent from an LMS to this tool acting as an LTI 1.3 Tool Provider. 

## Sequence Diagram

![Sequence Diagram](images/lti_13_seq.png)

## Sample LTI Launch Messages

### Login Message from Canvas

```json
{
  "iss": "https://canvas.home.russfeld.me",
  "login_hint": "535fa085f22b4655f48cd5a36a9215f64c062838",
  "client_id": "10000000000002",
  "lti_deployment_id": "5:d3a2504bba5184799a38f141e8df2335cfa8206d",
  "target_link_uri": "https://lpp.home.russfeld.me/lti/provider/launch13",
  "lti_message_hint": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ2ZXJpZmllciI6IjBlNGYxMTZhZWZjNWZiYTEyMzI1MWI2MjhhMDM5MDM5NDZjYjYxOGYzNTYzMTI5OGIwMzlkMGVlOTM3ZGQxMGU3ZGVlOTkzNDc0Y2FiZGU0OGNiYjFlZjNhOWY5NGI3OGM3YWZkOTI5ZjZlZjU5MzZkMDIyNjMyMTcyZDllYTY5IiwiY2FudmFzX2RvbWFpbiI6ImNhbnZhcy5ob21lLnJ1c3NmZWxkLm1lIiwiY29udGV4dF90eXBlIjoiQ291cnNlIiwiY29udGV4dF9pZCI6MTAwMDAwMDAwMDAwMDMsImNhbnZhc19sb2NhbGUiOiJlbiIsImluY2x1ZGVfc3RvcmFnZV90YXJnZXQiOnRydWUsImV4cCI6MTc0OTY2MjgwOH0.HyNhJe1cNlkA29tJy9oBxNsUD3jWZdUb_VwZinfVjvc",
  "canvas_environment": "prod",
  "canvas_region": "not_configured",
  "lti_storage_target": "post_message_forwarding"
}
```

### Auth Request from LTI Toolkit back to Canvas

```json
{
  "scope": "openid",
  "response_type": "id_token",
  "client_id": "10000000000002",
  "redirect_uri": "https://lpp.home.russfeld.me/lti/provider/redirect13",
  "login_hint": "535fa085f22b4655f48cd5a36a9215f64c062838",
  "state": "Zp22IH6qgj7YIPgXIkOf_",
  "response_mode": "form_post",
  "nonce": "pSESxuF1KbfCqvRl5u9HW",
  "prompt": "pSESxuF1KbfCqvRl5u9HW",
  "lti_message_hint": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ2ZXJpZmllciI6IjBlNGYxMTZhZWZjNWZiYTEyMzI1MWI2MjhhMDM5MDM5NDZjYjYxOGYzNTYzMTI5OGIwMzlkMGVlOTM3ZGQxMGU3ZGVlOTkzNDc0Y2FiZGU0OGNiYjFlZjNhOWY5NGI3OGM3YWZkOTI5ZjZlZjU5MzZkMDIyNjMyMTcyZDllYTY5IiwiY2FudmFzX2RvbWFpbiI6ImNhbnZhcy5ob21lLnJ1c3NmZWxkLm1lIiwiY29udGV4dF90eXBlIjoiQ291cnNlIiwiY29udGV4dF9pZCI6MTAwMDAwMDAwMDAwMDMsImNhbnZhc19sb2NhbGUiOiJlbiIsImluY2x1ZGVfc3RvcmFnZV90YXJnZXQiOnRydWUsImV4cCI6MTc0OTY2MjgwOH0.HyNhJe1cNlkA29tJy9oBxNsUD3jWZdUb_VwZinfVjvc",
}

```

### Redirect Message from Canvas

```json
{
  "utf8": "✓",
  "authenticity_token": "0tT0C8svDcwBdK19trVo7sVrcT+lSkf6g7Vw8YjJel6W599ypx19/jM75w7+5QKHnTpGVdEOFsvahx+ixpsMbA==",
  "id_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImtpZCI6IjIwMTgtMDYtMThUMjI6MzM6MjBaIn0.eyJodHRwczovL3B1cmwuaW1zZ2xvYmFsLm9yZy9zcGVjL2x0aS9jbGFpbS9tZXNzYWdlX3R5cGUiOiJMdGlSZXNvdXJjZUxpbmtSZXF1ZXN0IiwiaHR0cHM6Ly9wdXJsLmltc2dsb2JhbC5vcmcvc3BlYy9sdGkvY2xhaW0vdmVyc2lvbiI6IjEuMy4wIiwiaHR0cHM6Ly9wdXJsLmltc2dsb2JhbC5vcmcvc3BlYy9sdGkvY2xhaW0vcmVzb3VyY2VfbGluayI6eyJpZCI6IjhhYTY0MWQxLWI0ZDQtNGZlYS04YTliLWU5ZmVkZmI2MmIxZSIsImRlc2NyaXB0aW9uIjoiXHUwMDNjcFx1MDAzZUFzc2lnbm1lbnQgRGVzY3JpcHRpb25cdTAwM2MvcFx1MDAzZSIsInRpdGxlIjoiVGVzdCBMVEkgMS4zIEFzc2lnbm1lbnQgTmFtZSJ9LCJodHRwczovL3B1cmwuaW1zZ2xvYmFsLm9yZy9zcGVjL2x0aS1hZ3MvY2xhaW0vZW5kcG9pbnQiOnsibGluZWl0ZW0iOiJodHRwczovL2NhbnZhcy5ob21lLnJ1c3NmZWxkLm1lL2FwaS9sdGkvY291cnNlcy8zL2xpbmVfaXRlbXMvMSIsInNjb3BlIjpbImh0dHBzOi8vcHVybC5pbXNnbG9iYWwub3JnL3NwZWMvbHRpLWFncy9zY29wZS9saW5laXRlbSIsImh0dHBzOi8vcHVybC5pbXNnbG9iYWwub3JnL3NwZWMvbHRpLWFncy9zY29wZS9saW5laXRlbS5yZWFkb25seSIsImh0dHBzOi8vcHVybC5pbXNnbG9iYWwub3JnL3NwZWMvbHRpLWFncy9zY29wZS9yZXN1bHQucmVhZG9ubHkiLCJodHRwczovL3B1cmwuaW1zZ2xvYmFsLm9yZy9zcGVjL2x0aS1hZ3Mvc2NvcGUvc2NvcmUiLCJodHRwczovL2NhbnZhcy5pbnN0cnVjdHVyZS5jb20vbHRpLWFncy9wcm9ncmVzcy9zY29wZS9zaG93Il0sImxpbmVpdGVtcyI6Imh0dHA6Ly9jYW52YXMuaG9tZS5ydXNzZmVsZC5tZS9hcGkvbHRpL2NvdXJzZXMvMy9saW5lX2l0ZW1zIn0sImF1ZCI6IjEwMDAwMDAwMDAwMDAyIiwiYXpwIjoiMTAwMDAwMDAwMDAwMDIiLCJodHRwczovL3B1cmwuaW1zZ2xvYmFsLm9yZy9zcGVjL2x0aS9jbGFpbS9kZXBsb3ltZW50X2lkIjoiNTpkM2EyNTA0YmJhNTE4NDc5OWEzOGYxNDFlOGRmMjMzNWNmYTgyMDZkIiwiZXhwIjoxNzQ5NjcyNzc2LCJpYXQiOjE3NDk2NjkxNzYsImlzcyI6Imh0dHBzOi8vY2FudmFzLmhvbWUucnVzc2ZlbGQubWUiLCJub25jZSI6InBTRVN4dUYxS2JmQ3F2Umw1dTlIVyIsInN1YiI6ImFhYzIyNzEzLTI4YjMtNDM5Ny05ZmY5LWEzZDI4ODBlY2UxYSIsImh0dHBzOi8vcHVybC5pbXNnbG9iYWwub3JnL3NwZWMvbHRpL2NsYWltL3RhcmdldF9saW5rX3VyaSI6Imh0dHBzOi8vbHBwLmhvbWUucnVzc2ZlbGQubWUvbHRpL3Byb3ZpZGVyL2xhdW5jaDEzIiwicGljdHVyZSI6Imh0dHA6Ly9jYW52YXMuaW5zdHJ1Y3R1cmUuY29tL2ltYWdlcy9tZXNzYWdlcy9hdmF0YXItNTAucG5nIiwiZW1haWwiOiJjYW52YXNhZG1pbkBydXNzZmVsZC5tZSIsIm5hbWUiOiJjYW52YXNhZG1pbkBydXNzZmVsZC5tZSIsImdpdmVuX25hbWUiOiJjYW52YXNhZG1pbkBydXNzZmVsZC5tZSIsImZhbWlseV9uYW1lIjoiIiwiaHR0cHM6Ly9wdXJsLmltc2dsb2JhbC5vcmcvc3BlYy9sdGkvY2xhaW0vbGlzIjp7InBlcnNvbl9zb3VyY2VkaWQiOiIkUGVyc29uLnNvdXJjZWRJZCIsImNvdXJzZV9vZmZlcmluZ19zb3VyY2VkaWQiOiIkQ291cnNlU2VjdGlvbi5zb3VyY2VkSWQifSwiaHR0cHM6Ly9wdXJsLmltc2dsb2JhbC5vcmcvc3BlYy9sdGkvY2xhaW0vY29udGV4dCI6eyJpZCI6ImQzYTI1MDRiYmE1MTg0Nzk5YTM4ZjE0MWU4ZGYyMzM1Y2ZhODIwNmQiLCJsYWJlbCI6IkxUSTEzIiwidGl0bGUiOiJMVEkgMS4zIFRlc3QgQ291cnNlIiwidHlwZSI6WyJodHRwOi8vcHVybC5pbXNnbG9iYWwub3JnL3ZvY2FiL2xpcy92Mi9jb3Vyc2UjQ291cnNlT2ZmZXJpbmciXX0sImh0dHBzOi8vcHVybC5pbXNnbG9iYWwub3JnL3NwZWMvbHRpL2NsYWltL3Rvb2xfcGxhdGZvcm0iOnsiZ3VpZCI6InpPVUF0a2ZTM2dJOG5oNUlza3psZ0FybzFvQ3gzcng2U0dHYWhpTEw6Y2FudmFzLWxtcyIsIm5hbWUiOiJBTFQrQ1MgTGFiIiwidmVyc2lvbiI6ImNsb3VkIiwicHJvZHVjdF9mYW1pbHlfY29kZSI6ImNhbnZhcyJ9LCJodHRwczovL3B1cmwuaW1zZ2xvYmFsLm9yZy9zcGVjL2x0aS9jbGFpbS9sYXVuY2hfcHJlc2VudGF0aW9uIjp7ImRvY3VtZW50X3RhcmdldCI6ImlmcmFtZSIsInJldHVybl91cmwiOiJodHRwczovL2NhbnZhcy5ob21lLnJ1c3NmZWxkLm1lL2NvdXJzZXMvMy9hc3NpZ25tZW50cyIsImxvY2FsZSI6ImVuIn0sImh0dHBzOi8vcHVybC5pbXNnbG9iYWwub3JnL3NwZWMvbHRpL2NsYWltL3BsYXRmb3Jtbm90aWZpY2F0aW9uc2VydmljZSI6eyJzZXJ2aWNlX3ZlcnNpb25zIjpbIjEuMCJdLCJwbGF0Zm9ybV9ub3RpZmljYXRpb25fc2VydmljZV91cmwiOiJodHRwczovL2NhbnZhcy5ob21lLnJ1c3NmZWxkLm1lL2FwaS9sdGkvbm90aWNlLWhhbmRsZXJzLzUiLCJzY29wZSI6WyJodHRwczovL3B1cmwuaW1zZ2xvYmFsLm9yZy9zcGVjL2x0aS9zY29wZS9ub3RpY2VoYW5kbGVycyJdLCJub3RpY2VfdHlwZXNfc3VwcG9ydGVkIjpbIkx0aUhlbGxvV29ybGROb3RpY2UiLCJMdGlBc3NldFByb2Nlc3NvclN1Ym1pc3Npb25Ob3RpY2UiLCJMdGlDb250ZXh0Q29weU5vdGljZSJdfSwibG9jYWxlIjoiZW4iLCJodHRwczovL3B1cmwuaW1zZ2xvYmFsLm9yZy9zcGVjL2x0aS9jbGFpbS9yb2xlcyI6WyJodHRwOi8vcHVybC5pbXNnbG9iYWwub3JnL3ZvY2FiL2xpcy92Mi9pbnN0aXR1dGlvbi9wZXJzb24jQWRtaW5pc3RyYXRvciIsImh0dHA6Ly9wdXJsLmltc2dsb2JhbC5vcmcvdm9jYWIvbGlzL3YyL3N5c3RlbS9wZXJzb24jU3lzQWRtaW4iLCJodHRwOi8vcHVybC5pbXNnbG9iYWwub3JnL3ZvY2FiL2xpcy92Mi9zeXN0ZW0vcGVyc29uI1VzZXIiXSwiaHR0cHM6Ly9wdXJsLmltc2dsb2JhbC5vcmcvc3BlYy9sdGkvY2xhaW0vY3VzdG9tIjp7ImN1c3RvbTEiOiJ2YWx1ZTEiLCJjdXN0b20yIjoidmFsdWUyIn0sImh0dHBzOi8vcHVybC5pbXNnbG9iYWwub3JnL3NwZWMvbHRpLW5ycHMvY2xhaW0vbmFtZXNyb2xlc2VydmljZSI6eyJjb250ZXh0X21lbWJlcnNoaXBzX3VybCI6Imh0dHBzOi8vY2FudmFzLmhvbWUucnVzc2ZlbGQubWUvYXBpL2x0aS9jb3Vyc2VzLzMvbmFtZXNfYW5kX3JvbGVzIiwic2VydmljZV92ZXJzaW9ucyI6WyIyLjAiXX0sImh0dHBzOi8vcHVybC5pbXNnbG9iYWwub3JnL3NwZWMvbHRpL2NsYWltL2x0aTExX2xlZ2FjeV91c2VyX2lkIjoiNTM1ZmEwODVmMjJiNDY1NWY0OGNkNWEzNmE5MjE1ZjY0YzA2MjgzOCIsImh0dHBzOi8vcHVybC5pbXNnbG9iYWwub3JnL3NwZWMvbHRpL2NsYWltL2x0aTFwMSI6eyJyZXNvdXJjZV9saW5rX2lkIjoiNmE4YWFjYTE2MmJmYzQzOTM4MDRhZmQ0Y2Q1M2NkOTQ0MTNjNDhiYiIsInVzZXJfaWQiOiI1MzVmYTA4NWYyMmI0NjU1ZjQ4Y2Q1YTM2YTkyMTVmNjRjMDYyODM4In0sImh0dHBzOi8vcHVybC5pbXNnbG9iYWwub3JnL3NwZWMvbHRpL2NsYWltL2V1bGFzZXJ2aWNlIjp7InVybCI6Imh0dHA6Ly9jYW52YXMuaG9tZS5ydXNzZmVsZC5tZS9hcGkvbHRpL2Fzc2V0X3Byb2Nlc3Nvcl9ldWxhcy81Iiwic2NvcGUiOlsiaHR0cHM6Ly9wdXJsLmltc2dsb2JhbC5vcmcvc3BlYy9sdGkvc2NvcGUvZXVsYS91c2VyIiwiaHR0cHM6Ly9wdXJsLmltc2dsb2JhbC5vcmcvc3BlYy9sdGkvc2NvcGUvZXVsYS9kZXBsb3ltZW50Il19LCJodHRwczovL3d3dy5pbnN0cnVjdHVyZS5jb20vcGxhY2VtZW50IjpudWxsfQ.U-gWxLRdjeOrV9egBJTdiln90LIGl-gzfSI9inS5TLYdabtiPFv9vmxieUXtcu_XMG9kJuFPUzMVkp2GeqAuRw",
  "state": "Zp22IH6qgj7YIPgXIkOf_",
  "lti_storage_target": "post_message_forwarding"
}
```

### Decoded JWT in Redirect Message from Canvas - Admin Account

```json
{
  "https://purl.imsglobal.org/spec/lti/claim/message_type": "LtiResourceLinkRequest",
  "https://purl.imsglobal.org/spec/lti/claim/version": "1.3.0",
  "https://purl.imsglobal.org/spec/lti/claim/resource_link": {
    "id": "8aa641d1-b4d4-4fea-8a9b-e9fedfb62b1e",
    "description": "<p>Assignment Description</p>",
    "title": "Test LTI 1.3 Assignment Name"
  },
  "https://purl.imsglobal.org/spec/lti-ags/claim/endpoint": {
    "lineitem": "https://canvas.home.russfeld.me/api/lti/courses/3/line_items/1",
    "scope": [
      "https://purl.imsglobal.org/spec/lti-ags/scope/lineitem",
      "https://purl.imsglobal.org/spec/lti-ags/scope/lineitem.readonly",
      "https://purl.imsglobal.org/spec/lti-ags/scope/result.readonly",
      "https://purl.imsglobal.org/spec/lti-ags/scope/score",
      "https://canvas.instructure.com/lti-ags/progress/scope/show"
    ],
    "lineitems": "http://canvas.home.russfeld.me/api/lti/courses/3/line_items"
  },
  "aud": "10000000000002",
  "azp": "10000000000002",
  "https://purl.imsglobal.org/spec/lti/claim/deployment_id": "5:d3a2504bba5184799a38f141e8df2335cfa8206d",
  "exp": 1749672776,
  "iat": 1749669176,
  "iss": "https://canvas.home.russfeld.me",
  "nonce": "pSESxuF1KbfCqvRl5u9HW",
  "sub": "aac22713-28b3-4397-9ff9-a3d2880ece1a",
  "https://purl.imsglobal.org/spec/lti/claim/target_link_uri": "https://lpp.home.russfeld.me/lti/provider/launch13",
  "picture": "http://canvas.instructure.com/images/messages/avatar-50.png",
  "email": "canvasadmin@russfeld.me",
  "name": "canvasadmin@russfeld.me",
  "given_name": "canvasadmin@russfeld.me",
  "family_name": "",
  "https://purl.imsglobal.org/spec/lti/claim/lis": {
    "person_sourcedid": "$Person.sourcedId",
    "course_offering_sourcedid": "$CourseSection.sourcedId"
  },
  "https://purl.imsglobal.org/spec/lti/claim/context": {
    "id": "d3a2504bba5184799a38f141e8df2335cfa8206d",
    "label": "LTI13",
    "title": "LTI 1.3 Test Course",
    "type": [
      "http://purl.imsglobal.org/vocab/lis/v2/course#CourseOffering"
    ]
  },
  "https://purl.imsglobal.org/spec/lti/claim/tool_platform": {
    "guid": "zOUAtkfS3gI8nh5IskzlgAro1oCx3rx6SGGahiLL:canvas-lms",
    "name": "ALT+CS Lab",
    "version": "cloud",
    "product_family_code": "canvas"
  },
  "https://purl.imsglobal.org/spec/lti/claim/launch_presentation": {
    "document_target": "iframe",
    "return_url": "https://canvas.home.russfeld.me/courses/3/assignments",
    "locale": "en"
  },
  "https://purl.imsglobal.org/spec/lti/claim/platformnotificationservice": {
    "service_versions": [
      "1.0"
    ],
    "platform_notification_service_url": "https://canvas.home.russfeld.me/api/lti/notice-handlers/5",
    "scope": [
      "https://purl.imsglobal.org/spec/lti/scope/noticehandlers"
    ],
    "notice_types_supported": [
      "LtiHelloWorldNotice",
      "LtiAssetProcessorSubmissionNotice",
      "LtiContextCopyNotice"
    ]
  },
  "locale": "en",
  "https://purl.imsglobal.org/spec/lti/claim/roles": [
    "http://purl.imsglobal.org/vocab/lis/v2/institution/person#Administrator",
    "http://purl.imsglobal.org/vocab/lis/v2/system/person#SysAdmin",
    "http://purl.imsglobal.org/vocab/lis/v2/system/person#User"
  ],
  "https://purl.imsglobal.org/spec/lti/claim/custom": {
    "custom1": "value1",
    "custom2": "value2"
  },
  "https://purl.imsglobal.org/spec/lti-nrps/claim/namesroleservice": {
    "context_memberships_url": "https://canvas.home.russfeld.me/api/lti/courses/3/names_and_roles",
    "service_versions": [
      "2.0"
    ]
  },
  "https://purl.imsglobal.org/spec/lti/claim/lti11_legacy_user_id": "535fa085f22b4655f48cd5a36a9215f64c062838",
  "https://purl.imsglobal.org/spec/lti/claim/lti1p1": {
    "resource_link_id": "6a8aaca162bfc4393804afd4cd53cd94413c48bb",
    "user_id": "535fa085f22b4655f48cd5a36a9215f64c062838"
  },
  "https://purl.imsglobal.org/spec/lti/claim/eulaservice": {
    "url": "http://canvas.home.russfeld.me/api/lti/asset_processor_eulas/5",
    "scope": [
      "https://purl.imsglobal.org/spec/lti/scope/eula/user",
      "https://purl.imsglobal.org/spec/lti/scope/eula/deployment"
    ]
  },
  "https://www.instructure.com/placement": null
}
```

### Decoded JWT in Redirect Message from Canvas - Teacher Account

```json
{
  "https://purl.imsglobal.org/spec/lti/claim/message_type": "LtiResourceLinkRequest",
  "https://purl.imsglobal.org/spec/lti/claim/version": "1.3.0",
  "https://purl.imsglobal.org/spec/lti/claim/resource_link": {
    "id": "8aa641d1-b4d4-4fea-8a9b-e9fedfb62b1e",
    "description": "<p>Assignment Description</p>",
    "title": "Test LTI 1.3 Assignment Name"
  },
  "https://purl.imsglobal.org/spec/lti-ags/claim/endpoint": {
    "lineitem": "https://canvas.home.russfeld.me/api/lti/courses/3/line_items/1",
    "scope": [
      "https://purl.imsglobal.org/spec/lti-ags/scope/lineitem",
      "https://purl.imsglobal.org/spec/lti-ags/scope/lineitem.readonly",
      "https://purl.imsglobal.org/spec/lti-ags/scope/result.readonly",
      "https://purl.imsglobal.org/spec/lti-ags/scope/score",
      "https://canvas.instructure.com/lti-ags/progress/scope/show"
    ],
    "lineitems": "http://canvas.home.russfeld.me/api/lti/courses/3/line_items"
  },
  "aud": "10000000000002",
  "azp": "10000000000002",
  "https://purl.imsglobal.org/spec/lti/claim/deployment_id": "7:d3a2504bba5184799a38f141e8df2335cfa8206d",
  "exp": 1749761809,
  "iat": 1749758209,
  "iss": "https://canvas.home.russfeld.me",
  "nonce": "BPpEE7xw1ie5ny_o-VA5G",
  "sub": "e77934e7-4e98-4055-b4b4-3a8431e4f22a",
  "https://purl.imsglobal.org/spec/lti/claim/target_link_uri": "https://lpp.home.russfeld.me/lti/provider/launch13",
  "picture": "https://canvas.home.russfeld.me/images/thumbnails/2/GJhBgjcBm2BG6aFOlLDZpjEMDRzB5jgUBJYuVqJu",
  "email": "canvasteacher@russfeld.me",
  "name": "TeacherFirst TeacherLast",
  "given_name": "TeacherFirst",
  "family_name": "TeacherLast",
  "https://purl.imsglobal.org/spec/lti/claim/lis": {
    "person_sourcedid": "7858675309",
    "course_offering_sourcedid": "$CourseSection.sourcedId"
  },
  "https://purl.imsglobal.org/spec/lti/claim/context": {
    "id": "d3a2504bba5184799a38f141e8df2335cfa8206d",
    "label": "LTI13",
    "title": "LTI 1.3 Test Course",
    "type": [
      "http://purl.imsglobal.org/vocab/lis/v2/course#CourseOffering"
    ]
  },
  "https://purl.imsglobal.org/spec/lti/claim/tool_platform": {
    "guid": "zOUAtkfS3gI8nh5IskzlgAro1oCx3rx6SGGahiLL:canvas-lms",
    "name": "ALT+CS Lab",
    "version": "cloud",
    "product_family_code": "canvas"
  },
  "https://purl.imsglobal.org/spec/lti/claim/launch_presentation": {
    "document_target": "iframe",
    "return_url": "https://canvas.home.russfeld.me/courses/3/assignments",
    "locale": "en"
  },
  "https://purl.imsglobal.org/spec/lti/claim/platformnotificationservice": {
    "service_versions": [
      "1.0"
    ],
    "platform_notification_service_url": "https://canvas.home.russfeld.me/api/lti/notice-handlers/7",
    "scope": [
      "https://purl.imsglobal.org/spec/lti/scope/noticehandlers"
    ],
    "notice_types_supported": [
      "LtiHelloWorldNotice",
      "LtiAssetProcessorSubmissionNotice",
      "LtiContextCopyNotice"
    ]
  },
  "locale": "en",
  "https://purl.imsglobal.org/spec/lti/claim/roles": [
    "http://purl.imsglobal.org/vocab/lis/v2/institution/person#Instructor",
    "http://purl.imsglobal.org/vocab/lis/v2/membership#Instructor",
    "http://purl.imsglobal.org/vocab/lis/v2/system/person#User"
  ],
  "https://purl.imsglobal.org/spec/lti/claim/custom": {
    "custom1": "value1",
    "custom2": "value2"
  },
  "https://purl.imsglobal.org/spec/lti-nrps/claim/namesroleservice": {
    "context_memberships_url": "https://canvas.home.russfeld.me/api/lti/courses/3/names_and_roles",
    "service_versions": [
      "2.0"
    ]
  },
  "https://purl.imsglobal.org/spec/lti/claim/lti11_legacy_user_id": "c0ddd6c90cbe1ef0f32fbce5c3bf654204be186c",
  "https://purl.imsglobal.org/spec/lti/claim/lti1p1": {
    "resource_link_id": "6a8aaca162bfc4393804afd4cd53cd94413c48bb",
    "user_id": "c0ddd6c90cbe1ef0f32fbce5c3bf654204be186c",
    "oauth_consumer_key": "thisisasupersecretkey",
    "oauth_consumer_key_sign": "FPR9uW9niYZZTkodpKrJCfjktJ51YJhc6m44c4kzKNk="
  },
  "https://purl.imsglobal.org/spec/lti/claim/eulaservice": {
    "url": "http://canvas.home.russfeld.me/api/lti/asset_processor_eulas/7",
    "scope": [
      "https://purl.imsglobal.org/spec/lti/scope/eula/user",
      "https://purl.imsglobal.org/spec/lti/scope/eula/deployment"
    ]
  },
  "https://www.instructure.com/placement": null
}
```

### Decoded JWT in Redirect Message from Canvas - Student Account

```json
{
  "https://purl.imsglobal.org/spec/lti/claim/message_type": "LtiResourceLinkRequest",
  "https://purl.imsglobal.org/spec/lti/claim/version": "1.3.0",
  "https://purl.imsglobal.org/spec/lti/claim/resource_link": {
    "id": "8aa641d1-b4d4-4fea-8a9b-e9fedfb62b1e",
    "description": "<p>Assignment Description</p>",
    "title": "Test LTI 1.3 Assignment Name"
  },
  "https://purl.imsglobal.org/spec/lti-ags/claim/endpoint": {
    "lineitem": "https://canvas.home.russfeld.me/api/lti/courses/3/line_items/1",
    "scope": [
      "https://purl.imsglobal.org/spec/lti-ags/scope/lineitem",
      "https://purl.imsglobal.org/spec/lti-ags/scope/lineitem.readonly",
      "https://purl.imsglobal.org/spec/lti-ags/scope/result.readonly",
      "https://purl.imsglobal.org/spec/lti-ags/scope/score",
      "https://canvas.instructure.com/lti-ags/progress/scope/show"
    ],
    "lineitems": "http://canvas.home.russfeld.me/api/lti/courses/3/line_items"
  },
  "aud": "10000000000002",
  "azp": "10000000000002",
  "https://purl.imsglobal.org/spec/lti/claim/deployment_id": "7:d3a2504bba5184799a38f141e8df2335cfa8206d",
  "exp": 1749761684,
  "iat": 1749758084,
  "iss": "https://canvas.home.russfeld.me",
  "nonce": "8TY2f22B2yrw20r9fipF2",
  "sub": "848b3a11-c7b6-4c05-9fb3-782a0c34ee43",
  "https://purl.imsglobal.org/spec/lti/claim/target_link_uri": "https://lpp.home.russfeld.me/lti/provider/launch13",
  "picture": "https://canvas.home.russfeld.me/images/thumbnails/3/fnQIzMRWPAny4JOWMUvz8FiHsvP5Tyk4CRBKmMhm",
  "email": "canvasstudent@russfeld.me",
  "name": "StudentFirst StudentLast",
  "given_name": "StudentFirst",
  "family_name": "StudentLast",
  "https://purl.imsglobal.org/spec/lti/claim/lis": {
    "person_sourcedid": "835203884",
    "course_offering_sourcedid": "$CourseSection.sourcedId"
  },
  "https://purl.imsglobal.org/spec/lti/claim/context": {
    "id": "d3a2504bba5184799a38f141e8df2335cfa8206d",
    "label": "LTI13",
    "title": "LTI 1.3 Test Course",
    "type": [
      "http://purl.imsglobal.org/vocab/lis/v2/course#CourseOffering"
    ]
  },
  "https://purl.imsglobal.org/spec/lti/claim/tool_platform": {
    "guid": "zOUAtkfS3gI8nh5IskzlgAro1oCx3rx6SGGahiLL:canvas-lms",
    "name": "ALT+CS Lab",
    "version": "cloud",
    "product_family_code": "canvas"
  },
  "https://purl.imsglobal.org/spec/lti/claim/launch_presentation": {
    "document_target": "iframe",
    "return_url": "https://canvas.home.russfeld.me/courses/3/assignments",
    "locale": "en"
  },
  "https://purl.imsglobal.org/spec/lti/claim/platformnotificationservice": {
    "service_versions": [
      "1.0"
    ],
    "platform_notification_service_url": "https://canvas.home.russfeld.me/api/lti/notice-handlers/7",
    "scope": [
      "https://purl.imsglobal.org/spec/lti/scope/noticehandlers"
    ],
    "notice_types_supported": [
      "LtiHelloWorldNotice",
      "LtiAssetProcessorSubmissionNotice",
      "LtiContextCopyNotice"
    ]
  },
  "locale": "en",
  "https://purl.imsglobal.org/spec/lti/claim/roles": [
    "http://purl.imsglobal.org/vocab/lis/v2/institution/person#Student",
    "http://purl.imsglobal.org/vocab/lis/v2/membership#Learner",
    "http://purl.imsglobal.org/vocab/lis/v2/system/person#User"
  ],
  "https://purl.imsglobal.org/spec/lti/claim/custom": {
    "custom1": "value1",
    "custom2": "value2"
  },
  "https://purl.imsglobal.org/spec/lti-nrps/claim/namesroleservice": {
    "context_memberships_url": "https://canvas.home.russfeld.me/api/lti/courses/3/names_and_roles",
    "service_versions": [
      "2.0"
    ]
  },
  "https://purl.imsglobal.org/spec/lti/claim/lti11_legacy_user_id": "86157096483e6b3a50bfedc6bac902c0b20a824f",
  "https://purl.imsglobal.org/spec/lti/claim/lti1p1": {
    "resource_link_id": "6a8aaca162bfc4393804afd4cd53cd94413c48bb",
    "user_id": "86157096483e6b3a50bfedc6bac902c0b20a824f",
    "oauth_consumer_key": "thisisasupersecretkey",
    "oauth_consumer_key_sign": "byxEShzri7Vts17LMSxuG5tNrdr32iAFoBlx5HIStcA="
  },
  "https://purl.imsglobal.org/spec/lti/claim/eulaservice": {
    "url": "http://canvas.home.russfeld.me/api/lti/asset_processor_eulas/7",
    "scope": [
      "https://purl.imsglobal.org/spec/lti/scope/eula/user",
      "https://purl.imsglobal.org/spec/lti/scope/eula/deployment"
    ]
  },
  "https://www.instructure.com/placement": null
}
```

### Decoded JWT in Redirect Message from Canvas - Student Account (All LTI Advatage Features Disabled)

```json
{
  "https://purl.imsglobal.org/spec/lti/claim/message_type": "LtiResourceLinkRequest",
  "https://purl.imsglobal.org/spec/lti/claim/version": "1.3.0",
  "https://purl.imsglobal.org/spec/lti/claim/resource_link": {
    "id": "8aa641d1-b4d4-4fea-8a9b-e9fedfb62b1e",
    "description": "<p>Assignment Description</p>",
    "title": "Test LTI 1.3 Assignment Name"
  },
  "aud": "10000000000002",
  "azp": "10000000000002",
  "https://purl.imsglobal.org/spec/lti/claim/deployment_id": "7:d3a2504bba5184799a38f141e8df2335cfa8206d",
  "exp": 1749763062,
  "iat": 1749759462,
  "iss": "https://canvas.home.russfeld.me",
  "nonce": "2yf7hJ1T81gldh6tX2JVG",
  "sub": "848b3a11-c7b6-4c05-9fb3-782a0c34ee43",
  "https://purl.imsglobal.org/spec/lti/claim/target_link_uri": "https://lpp.home.russfeld.me/lti/provider/launch13",
  "picture": "https://canvas.home.russfeld.me/images/thumbnails/3/fnQIzMRWPAny4JOWMUvz8FiHsvP5Tyk4CRBKmMhm",
  "email": "canvasstudent@russfeld.me",
  "name": "StudentFirst StudentLast",
  "given_name": "StudentFirst",
  "family_name": "StudentLast",
  "https://purl.imsglobal.org/spec/lti/claim/lis": {
    "person_sourcedid": "835203884",
    "course_offering_sourcedid": "$CourseSection.sourcedId"
  },
  "https://purl.imsglobal.org/spec/lti/claim/context": {
    "id": "d3a2504bba5184799a38f141e8df2335cfa8206d",
    "label": "LTI13",
    "title": "LTI 1.3 Test Course",
    "type": [
      "http://purl.imsglobal.org/vocab/lis/v2/course#CourseOffering"
    ]
  },
  "https://purl.imsglobal.org/spec/lti/claim/tool_platform": {
    "guid": "zOUAtkfS3gI8nh5IskzlgAro1oCx3rx6SGGahiLL:canvas-lms",
    "name": "ALT+CS Lab",
    "version": "cloud",
    "product_family_code": "canvas"
  },
  "https://purl.imsglobal.org/spec/lti/claim/launch_presentation": {
    "document_target": "iframe",
    "return_url": "https://canvas.home.russfeld.me/courses/3/assignments",
    "locale": "en"
  },
  "locale": "en",
  "https://purl.imsglobal.org/spec/lti/claim/roles": [
    "http://purl.imsglobal.org/vocab/lis/v2/institution/person#Student",
    "http://purl.imsglobal.org/vocab/lis/v2/membership#Learner",
    "http://purl.imsglobal.org/vocab/lis/v2/system/person#User"
  ],
  "https://purl.imsglobal.org/spec/lti/claim/custom": {
    "custom1": "value1",
    "custom2": "value2"
  },
  "https://purl.imsglobal.org/spec/lti/claim/lti11_legacy_user_id": "86157096483e6b3a50bfedc6bac902c0b20a824f",
  "https://purl.imsglobal.org/spec/lti/claim/lti1p1": {
    "resource_link_id": "6a8aaca162bfc4393804afd4cd53cd94413c48bb",
    "user_id": "86157096483e6b3a50bfedc6bac902c0b20a824f",
    "oauth_consumer_key": "thisisasupersecretkey",
    "oauth_consumer_key_sign": "Qu2E9ixZ8J1nu6T7jsE5V8H4J7FZwXjasizBVOnXaL8="
  },
  "https://purl.imsglobal.org/spec/lti/claim/eulaservice": {
    "url": "http://canvas.home.russfeld.me/api/lti/asset_processor_eulas/7",
    "scope": [
      "https://purl.imsglobal.org/spec/lti/scope/eula/user",
      "https://purl.imsglobal.org/spec/lti/scope/eula/deployment"
    ]
  },
  "https://www.instructure.com/placement": null
}
```

## Helpful References:

* https://www.imsglobal.org/spec/lti/v1p3
* https://www.imsglobal.org/spec/security/v1p0/ 
* https://openid.net/specs/openid-connect-core-1_0.html 
* https://github.com/Cvmcosta/ltijs - reference implementation