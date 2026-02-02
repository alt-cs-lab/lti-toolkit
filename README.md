# LTI Toolkit

A toolkit for building LTI (Learning Tools Interoperability) applications.

Limitations

- Only supports JWKS keyset URLs for LTI 1.3, not manually entered keys
- Does not cache keys received from LTI Consumers via LTI 1.3 - will always request the key (inefficient)
- LTI 1.3 is not implemented for LTI Tool Providers
- LTI 1.0 connections to LTI Tool Providers don't currently support custom variables
- Supports all Canvas privacy levels for connections to Tool Consumers
- Supports test students in LTI 1.0 Launch Requests
