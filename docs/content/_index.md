+++
archetype = "home"
title = "LTI-Toolkit"
+++

This project is yet another toolkit for developing [LTI (Learning Tools Interoperability)](https://www.1edtech.org/standards/lti) applications. It can act both as an LTI Tool Provider (a service integrated with a learning management system) using either LTI 1.0 or LTI 1.3, and it can also act as an LTI Tool Consumer (a learning management system) using LTI 1.0. 

**Limitations**
 - Only supports JWKS keyset URLs for LTI 1.3 connections, not manually entered keys. (This best supports the typical Canvas use-case)
 - Does not cache authentication keys received from LTI Consumers (LMSs) via LTI 1.3 - it will always request a new key (this is simple but inefficient)
 - LTI 1.3 is not implemeneted iwthin the LTI Tool Consumer features (therefore, it can only connect to other LTI Tool Providers using LTI 1.0 at this time)
 - LTI 1.0 connections to external LTI Tool Providers don't currently support custom variables
 - Does not support anonymous students or test students in LTI Launch Requests (requires Public privacy level)
 - Not currently tested or certified against the [1EdTech LTI Certification Tool](https://build.1edtech.org/)
 - Not currently tested against LTI Tool Consumers other than [Instructure Canvas](https://www.instructure.com/solutions/learning-management/k12)
 - Does not currently send errors back to LTI Tool Provider when grades are received but cannot be posted

## Getting Started

The package is currently not published to NPM but can be installed directly from GitHub:

```bash
npm install github:alt-cs-lab/lti-toolkit
```

See the [Examples]({{% relref "00-general/00-examples" %}}) section for detailed example projects using this tool.

## Configuration

A minimal configuration example for LTI 1.0:

```js
// Import LTI Toolkit
import LTIToolkit from "lti-toolkit"

// LTI Launch Handler Function
import LTILaunch from "../routes/lti-launch.js";

// Initialize LTI Toolkit
const lti = await LTIToolkit({
  // Domain name for this application
  domain_name: "https://app.domain.tld",
  // Logging Level
  // One of error warn info http verbose lti debug sql silly
  log_level: "lti",
  // LTI Tool Provider Configuration
  provider: {
    // Incoming LTI Launch Handler Function
    handleLaunch: LTILaunch,
    // LTI 1.0 Consumer Key and Shared Secret 
    // for single LTI consumer setup
    key: "your_lti_key",
    secret: "your_lti_secret"
  }
});
```

The LTI Toolkit library is initialized by providing a configuration options object with the following options:

```js
{
  // REQUIRED
  // Domain Name
  // The fully qualified domain name for the application
  // Must use HTTPS for most other LTI apps to work
  domain_name: "https://app.domain.tld",

  // OPTIONAL 
  // Logging Level for built-in Winston instance
  // One of error warn info http verbose lti debug sql silly
  // Default: info (or error in testing)
  log_level: "info",
  // -OR-
  // Logger Object
  // An external instance of Winston (or similar) for unified logging
  // Default: built-in Winston instance
  logger: winston_instance,

  // OPTIONAL
  // Database Storage Filename
  // A filename for the built-in SQLite database
  // Use ":memory:" to create an in-memory database
  // Default: lti-toolkit.db
  db_storage: "lti-toolkit.db",
  // -OR-
  // Database Object
  // An external instance of Sequelize ORM for a database
  // Default: built-in Sequelize instance using SQLite
  database: sequelize_instance

  // REQUIRED
  // One or both of provider or consumer must be configured

  // OPTIONAL
  // LTI Tool Provider Configuration
  provider: {
    // REQUIRED
    // LTI Launch Handler
    // User-provided function to handle LTI Launches
    // Params: LTI Launch Data, LTI Consumer Sequelize Object, and Express request
    // Return: URL string to redirect browser to after successful launch
    handleLaunch: LTILaunchHandler

    // OPTIONAL Single LTI 1.0 Consumer Setup
    // Both key and secret must be provided
    // Will configure a simple LTI 1.0 Consumer on launch
    // LTI 1.0 Key
    key: "your_lti_key",
    // LTI 1.0 Secret
    secret: "your_lti_secret"
  }

  // OPTIONAL
  // LTI Tool Consumer Configuration
  consumer: {
    // REQUIRED
    // LTI Grade Handler
    // User-provided async function to receive LTI Grades
    // Params: SectionKey, LessonKey, UserKey, AssignmentKey, Score
    // Function should resolve when grade is posted 
    postProviderGrade: LTIGradeHandler,

    // REQUIRED
    // LTI Tool Consumer Admin Email
    // Email address for system administrator
    admin_email: "administrator@app.domain.tld",

    // REQUIRED
    // LTI Tool Consumer Deployment Name
    // Name of the LTI deployment
    deployment_name: "LTI Toolkit Testing Application",

    // REQUIRED
    // LTI Tool Consumer Deployment ID
    // Unique ID of the LTI Deployment
    deployment_id: "lti-toolkit-testing-app",
  }

  // OPTIONAL
  // Test Mode Flag
  // Indicates if the application is running in test mode
  // Useful for unit testing only
  // Default: false
  test: false
}
```

## Dependencies

Care has been taken to minimize the amount of dependencies but balanced against simplifying the code and using reasonable libraries where appropriate. The core dependencies are listed below:

* [Node.js 22 LTS](https://nodejs.org/en/blog/release/v22.11.0) - developed and tested using Node 22 LTS
* [express](https://www.npmjs.com/package/express) - core web framework for handling routing and parsing
* [jsonwebtoken](https://www.npmjs.com/package/jsonwebtoken) - used to decode LTI 1.3 authentication tokens
* [jwks-rsa](https://www.npmjs.com/package/jwks-rsa) - used to request and decode JWKS signing keys for LTI 1.3
* [ky](https://www.npmjs.com/package/ky) - simple HTTP client for sending requests back to the LTI 1.3 Tool Consumer (LMS)
* [nanoid](https://www.npmjs.com/package/nanoid) - library used to generate unique string identifiers
* [nunjucks](https://www.npmjs.com/package/nunjucks) - template library used to render forms as part of the LTI 1.3 authentication process
* [sequelize](https://www.npmjs.com/package/sequelize) - object-relational mapper (ORM) for interfacing with databases
* [sqlite3](https://www.npmjs.com/package/sqlite3) - default file-based database engine
* [umzug](https://www.npmjs.com/package/umzug) - database migration and seeding tool
* [winston](https://www.npmjs.com/package/winston) - logging library
* [xml2js](https://www.npmjs.com/package/xml2js) - XML parser for LTI 1.0 connections

## Documentation

This documentation site provides many useful guides for using this tool!

* [Examples]({{% relref "00-general/00-examples" %}}) - detailed example projects
* [Database]({{% relref "00-general/01-database" %}}) - detailed database schema
* [Dev Setup]({{% relref "01-setup" %}}) - setting up a development environment
* [Installing Canvas]({{% relref "01-setup/01-canvas" %}}) - guide for setting up Canvas in Docker with Traefik
* [LTI Docs]({{% relref "02-lti" %}}) - detailed LTI protocol examples and diagrams
