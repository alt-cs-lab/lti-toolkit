# LTI Toolkit

A toolkit for building [LTI (Learning Tools Interoperability)](https://www.1edtech.org/standards/lti) applications in Node.js. It can act as an LTI Tool Provider (a service integrated with a learning management system) using either LTI 1.0 or LTI 1.3, and as an LTI Tool Consumer (a learning management system) using LTI 1.0 or LTI 1.3.

## Features

- Act as an LTI 1.0 and LTI 1.3 Tool Provider (Learning Tool) connected to Canvas LMS
- Act as an LTI 1.0 and LTI 1.3 Tool Consumer (LMS) connected to other LTI Tool Providers
- Receive grades from LTI 1.0 and LTI 1.3 Tool Providers
- Pass grades to LTI 1.0 or LTI 1.3 Tool Consumers via Basic Outcomes or AGS
- Handle LTI 1.3 Dynamic Registration and Deep Linking as a Tool Provider
- Initiate LTI 1.3 Deep Linking requests and process Deep Link responses as a Tool Consumer
- Provide LTI 1.0 XML Configuration as a Tool Provider
- Support all Canvas privacy levels in LTI 1.0 and LTI 1.3 launch requests
- Support Canvas test students in LTI 1.0 and LTI 1.3 launch requests
- Encrypt LTI consumer/provider secrets and private keys at rest using AES-256-GCM

## Limitations

- Does not fully support all features of LTI 1.3 AGS (Advanced Grade Service) or DR (Dynamic Registration) but does enough to work with Canvas in most cases
- Only supports JWKS keyset URLs for LTI 1.3 connections, not manually entered keys
- Does not cache authentication keys received from LTI Consumers via LTI 1.3 — always requests a fresh key (simple but inefficient)
- Not currently tested or certified against the [1EdTech LTI Certification Tool](https://build.1edtech.org/)
- Not currently tested against LTI Tool Consumers other than [Instructure Canvas](https://www.instructure.com/)

## Installation

The package can be installed directly from GitHub:

```bash
npm install github:alt-cs-lab/lti-toolkit
```

## Quick Start

```js
import LTIToolkit from "lti-toolkit";

const lti = await LTIToolkit({
  domain_name: "https://app.domain.tld",
  admin_email: "admin@domain.tld",
  encryption_key: "your_64_character_hex_encryption_key",
  provider: {
    handleLaunch: async (launchData, consumer, req) => {
      req.session.ltiLaunchData = launchData;
      return "/app";
    },
  },
});

// Mount LTI routes in your Express app
app.use("/lti/provider", lti.routers.provider);
```

TypeScript users: type declarations are published alongside the library (`index.d.ts`), so editors get autocomplete and type-checking even though the library itself is plain JavaScript.

## Documentation

Full documentation is available in the `docs/` directory and covers:

- Configuration reference
- Full API reference
- Example applications (Tool Provider and Tool Consumer)
- LTI protocol deep-dives (launch data, deep linking, registration)
- Database schema
- Dev environment setup

## License

See [LICENSE](LICENSE) for details.
