---
name: call_webhook
description: Make an HTTP request to any external API or webhook endpoint. Supports GET, POST, PUT, and PATCH with custom headers and JSON body.
inputs:
  url:
    type: string
    description: The full URL of the webhook or API endpoint
    required: true
  method:
    type: string
    description: HTTP method - GET, POST, PUT, or PATCH (default POST)
    required: false
  payload:
    type: object
    description: JSON body to send with the request (for POST/PUT/PATCH)
    required: false
  headers:
    type: object
    description: Additional HTTP headers as key-value pairs (e.g. Authorization)
    required: false
when_to_use: When you need to trigger a Zapier/Make webhook, call a REST API, post data to an external system, or interact with any HTTP endpoint. No API key required (unless the target endpoint needs one - pass it via headers).
---

# call_webhook

Generic HTTP client for calling any external API or webhook. Returns the response status and body.

## Notes

- Timeout: 30 seconds
- Response body capped at 2000 characters
- Always sends Content-Type: application/json
