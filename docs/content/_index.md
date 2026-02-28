+++
archetype = "home"
title = "LTI-Toolkit"
+++

This project is yet another toolkit for developing [LTI (Learning Tools Interoperability)](https://www.1edtech.org/standards/lti) applications. It can act both as an LTI Tool Provider (a service integrated with a learning management system) using either LTI 1.0 or LTI 1.3, and it can also act as an LTI Tool Consumer (a learning management system) using LTI 1.0. 

**Features**
 - Act as an LTI 1.0 and LTI 1.3 Tool Provider (Learning Tool) connected to Canvas LMS
 - Act as an LTI 1.0 Tool Consumer (LMS) connected to other LTI 1.0 Tool Providers
 - Receive Grades from LTI 1.0 Tool Provider
 - Pass Simple Grades to LTI 1.0 or LTI 1.3 Tool Consumer
 - Supports all Canvas privacy levels in LTI Launch Requests to LTI 1.0 Tool Providers
 - Supports test students from Canvas in LTI 1.0 and LTI 1.3 Launch Requests
 - Handles LTI 1.3 Dynamic Registration and Deep Linking as a Tool Provider
 - Provides LTI 1.0 XML Configuration as a Tool Provider

**Limitations**
 - Does not fully support LTI 1.3 AGS (Advanced Grade Service)
 - Only supports JWKS keyset URLs for LTI 1.3 connections, not manually entered keys. (This best supports the typical Canvas use-case)
 - Does not cache authentication keys received from LTI Consumers (LMSs) via LTI 1.3 - it will always request a new key (this is simple but inefficient)
 - LTI 1.3 is not implemented within the LTI Tool Consumer features (therefore, it can only connect to other LTI Tool Providers using LTI 1.0 at this time)
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

A minimal configuration example as an LTI 1.0 tool provider:

```js
// Import LTI Toolkit
import LTIToolkit from "lti-toolkit"

// Import your own LTI Launch Handler Function
import LTILaunch from "../routes/lti-launch.js";

// Initialize LTI Toolkit
const lti = await LTIToolkit({
  // Domain name for this application
  domain_name: "https://app.domain.tld",
  // Admin email address for this application
  admin_email: "admin@domain.tld",
  // Logging Level
  // One of error warn info http verbose lti debug sql silly
  log_level: "lti",
  // LTI Tool Provider Configuration
  provider: {
    // Incoming LTI Launch Handler Function
    handleLaunch: LTILaunch,
    // LTI 1.0 Consumer Key and Shared Secret 
    // for single LTI 1.0 Consumer setup
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

  // REQUIRED
  // Admin Email
  // Email address for system administrator
  admin_email: "administrator@app.domain.tld",

  // OPTIONAL 
  // Logging Level for built-in Winston instance
  // One of error warn info http verbose lti debug sql silly
  // Default: info (or error in testing)
  log_level: "info",
  // -OR-
  // Logger Object
  // An external instance of Winston (or similar) for unified logging
  // Must have the following log levels: error warn info http verbose lti debug sql silly
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
    // All other consumers will be removed from the database on launch
    // LTI 1.0 Key
    key: "your_lti_key",
    // LTI 1.0 Secret
    secret: "your_lti_secret"

    // OPTIONAL Information for XML Configuration
    // All of the options below are only used for automatic
    // XML configuration of the tool within an LMS
    // Title
    title: "LTI Toolkit",
    // Description
    description: "LTI Toolkit for LTI Tool Providers",
    // Launch URL
    launch_url: domain_name + "/lti/provider/launch10",
    // Icon Url
    icon_url: "https://placehold.co/64x64.png",
    // Custom Parameters
    // Example shown below; names must begin with "custom_"
    custom_params: {
      custom_name: "custom_value",
    }
    // Unique Tool ID
    tool_id: "lti_toolkit",
    // Privacy Level
    // For Canvas, one of "public" or "anonymous"
    privacy_level: "public"
    // Boolean to show LTI Tool in course navigation menu in Canvas
    navigation: true

    // OPTIONAL Information for LTI 1.3 DeepLinking
    // User-provided function to handle LTI Deeplink Requests
    // Params: LTI Deeplink Data, LTI Consumer Sequelize Object, and Express request
    // Return: URL string to redirect browser to after successful launch
    handleDeeplink: LTIDeeplinkHandler
  }

  // OPTIONAL
  // LTI Tool Consumer Configuration
  consumer: {
    // REQUIRED
    // LTI Grade Handler
    // User-provided async function to receive LTI Grades
    // Params: LTI Provider Key, Context Key, Resource Key, User Key, Gradebook Key, Score, Express Request Object
    // Function should resolve when grade is posted, no return needed
    postProviderGrade: LTIGradeHandler,

    // REQUIRED
    // LTI Tool Consumer Deployment Name
    // Name of the LTI deployment
    deployment_name: "LTI Toolkit Testing Application",

    // REQUIRED
    // LTI Tool Consumer Deployment ID
    // Unique ID of the LTI Deployment
    deployment_id: "lti-toolkit-testing-app",

    // OPTIONAL
    // LTI Product Name
    // Unique name identifying the LTI product
    product_name: "lti-toolkit",

    // OPTIONAL
    // LTI Product Version
    // Version of the LTI product (e.g. "1.0.0" or "cloud")
    product_version: "cloud",

    // OPTIONAL
    // LTI Consumer Route Prefix
    // Prefix of routes for LTI consumer functions
    route_prefix: "/lti/consumer",
  }

  // OPTIONAL
  // Test Mode Flag
  // Indicates if the application is running in test mode
  // Useful for unit testing only
  // Default: false
  test: false
}
```

## Usage

The initialized LTI Toolkit is a complex object containing the following items:

```js
{
  // Express routers for handling incoming routes
  routers: {
    // LTI Tool Provider router
    // Returned if provider is configured
    provider: {
      // LTI 1.0 and 1.3 Launch and Deeplink Target
      "/launch",
      // LTI 1.0 Configuration XML
      "/config.xml",
      // LTI 1.3 OAuth Login Target
      "/login",
      // LTI 1.3 Keyset Target
      "/jwks",
      // LTI 1.3 Dynamic Registration Target
      "/register",
    },
    // LTI Tool Consumer Router
    // Returned if consumer is configured
    consumer: {
      // LTI 1.0 Basic Outcomes Target
      "/grade"
    }
  },
  // Controller Interfaces
  controllers: {
    // LTI Provider Controller Instance
    // Returned if consumer is configured
    // (As an LMS Consumer, you are talking to Providers)
    provider: {
      // Get All Providers
      getAll(),
      // Get a Provider by Database ID
      getById(id),
      // Get a Provider by Key
      getByKey(key),
      // Get the secrets for a Provider by ID
      getSecret(id),
      // Update a Provider
      updateProvider(id, data),
      // Create a new Provider
      createProvider(data),
      // Delete a Provider
      deleteProvider(id)
    },
    // LTI Consumer Controller Instance
    // Returned if provider is configured
    // (As an LMS Provider, you are talking to Consumers)
    consumer: {
      // Get all Consumers
      getAll(),
      // Get a Consumer by Database ID
      getById(id),
      // Get a Consumer by Key
      getByKey(key)
      // Create a new Consumer
      createConsumer(data),
      // Update a Consumer
      updateConsumer(id, data),
      // Delete a Consumer
      deleteConsumer(id),
      // Get the secrets for a Consumer by ID
      getSecret(id),
      // Update the secrets for a Consumer
      updateSecret(id)
    }
  },
  // LTI Specific Controllers
  lti: {
    // LTI Consumer Controller
    // Contains methods for acting as an LTI Consumer
    consumer: {
      // Generate an LTI 1.0 Launch Form
      generateLTI10LaunchFormData(
        // LTI Consumer Key
        key,
        // LTI Consumer Secret
        secret,
        // LTI Launch URL
        url,
        // Return URL back to the LTI Consumer
        ret_url,
        // LTI Context (Course)
        context: {
          key,
          label,
          name
        }
        // LTI Resource (Assignment)
        resource: {
          key,
          name
        }
        // LTI User
        user: {
          key,
          email,
          family_name,
          given_name,
          name,
          image
        }
        // Boolean: True if user is LTI Course Manager (Instructor), False Otherwise
        manager,
        // Gradebook ID for Basic Outcomes
        gradebook_key,
        // LTI 1.0 Custom Variables
        custom: {
          // custom variable names and values
        }
      ),
      // Handle a Basic Outcomes Request
      // NOT MEANT FOR EXTERNAL USE
      // (This is called from the LTI Consumer Router)
      basicOutcomesHandler(req),
      // Handle a Basic Outcomes Replace Result Request
      // NOT MEANT FOR EXTERNAL USE
      // (This is called from the basicOutcomesHandler function)
      replaceResultRequest(request, providerKey, url, message_id, req),
    },
    // LTI Provider Controller
    // Contains methods for acting as an LTI Provider
    provider: {
      // Post a Grade to an LTI Consumer
      postGrade(
        // LTI Consumer Key
        consumer_key,
        // LTI Grade URL from the original launch
        grade_url,
        // LMS Grade ID for LTI 1.0 Basic Outcomes
        lms_grade_id,
        // User Score (float between 0.0 and 1.0)
        score,
        // User's LTI 1.3 ID (for LTI 1.3 AGS)
        user_lis13_id,
        // Debugging data
        debug: {
          user,
          user_id,
          assignment,
          assignment_id
        }
      ),
      // Create a Deeplink Response
      createDeepLink(
        // Express response object
        res,
        // LTI Consumer
        consumer,
        // Return URL to send data to
        return_url,
        // ID of the resource to be created
        // This will be sent back as a custom variable
        // with name "custom_id"
        id,
        // Title of the resource
        title
      )
    }
  }
  // Test Utilities
  // Returned if test mode is configured
  test: {
    // Utility function to initialize expiration of logins and nonces
    initializeExpiration,
  }
}
```


## Dependencies

Care has been taken to minimize the amount of dependencies but balanced against simplifying the code and using reasonable libraries where appropriate. The core dependencies are listed below:

* [Node.js 22 LTS](https://nodejs.org/en/blog/release/v22.11.0) - developed and tested using Node 22 LTS
* [express](https://www.npmjs.com/package/express) - core web framework for handling routing and parsing
* [express-xml-bodyparser](https://www.npmjs.com/package/express-xml-bodyparser) - parse incoming XML bodies (LTI 1.0 Basic Outcomes)
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

{{% notice warning "Known Vulnerabilities" %}}

As of February 28th, 2026, the following vulnerabilities in these libraries are known:

* `umzug 3.8.2` currently depends on a vulnerable version of `ajv` through a chain of dependencies. `umzug` has not had a new release in a couple of years, and I suspect it is on the shelf while Sequelize 7.0 is developed. [GitHub Discussion](https://github.com/sequelize/umzug/issues/715).  
* `mocha 11.7.5` currently depends on vulnerable versions of `diff` and `serialize-javascript`. `mocha 12.0` is in active beta and is only used for unit testing in this project, so it is not a release dependency.
* `sqlite3 5.1.7` has been abandoned and depends on an old version of `tar`, but it currently is the default engine for `sequelize 6`. `sequelize 7` is under active development and includes a newly rewritten engine for SQLite. This issue can be mitigated in the meantime by using a different database engine (e.g. PostgreSQL) instead of SQLite. 

{{% /notice %}}

## Documentation

This documentation site provides many useful guides for using this tool!

* [Examples]({{% relref "00-general/00-examples" %}}) - detailed example projects
* [Database]({{% relref "00-general/01-database" %}}) - detailed database schema
* [Dev Setup]({{% relref "01-setup" %}}) - setting up a development environment
* [Installing Canvas]({{% relref "01-setup/01-canvas" %}}) - guide for setting up Canvas in Docker with Traefik
* [LTI Docs]({{% relref "02-lti" %}}) - detailed LTI protocol examples and diagrams
