+++
archetype = "home"
title = "LTI-Toolkit"
+++

This project is yet another toolkit for developing [LTI (Learning Tools Interoperability)](https://www.1edtech.org/standards/lti) applications. It can act both as an LTI Tool Provider (a service integrated with a learning management system) using either LTI 1.0 or LTI 1.3, and it can also act as an LTI Tool Consumer (a learning management system) using LTI 1.0. 

**Features**
 - Act as an LTI 1.0 and LTI 1.3 Tool Provider (Learning Tool) connected to Canvas LMS
 - Act as an LTI 1.0 and LTI 1.3 Tool Consumer (LMS) connected to other LTI Tool Providers
 - Receive Grades from LTI 1.0 and LTI 1.3 Tool Providers
 - Pass Simple Grades to LTI 1.0 or LTI 1.3 Tool Consumer
 - Supports all Canvas privacy levels in LTI Launch Requests to LTI 1.0 and LTI 1.3 Tool Providers
 - Supports test students from Canvas in LTI 1.0 and LTI 1.3 Launch Requests
 - Handles LTI 1.3 Dynamic Registration and Deep Linking as a Tool Provider
 - Initiates LTI 1.3 Deep Linking requests and processes Deep Link responses as a Tool Consumer
 - Provides LTI 1.0 XML Configuration as a Tool Provider
 - Encrypts LTI consumer/provider secrets and private keys at rest using AES-256-GCM

**Limitations**
 - Does not fully support all features of LTI 1.3 AGS (Advanced Grade Service) or DR (Dynamic Registration) but does enough to work with Canvas in most cases.
 - Only supports JWKS keyset URLs for LTI 1.3 connections, not manually entered keys. (This best supports the typical Canvas use-case)
 - Does not cache authentication keys received from LTI Consumers (LMSs) via LTI 1.3 - it will always request a new key (this is simple but inefficient)
 - Not currently tested or certified against the [1EdTech LTI Certification Tool](https://build.1edtech.org/)
 - Not currently tested against LTI Tool Consumers other than [Instructure Canvas](https://www.instructure.com/solutions/learning-management/k12)
 - Does not currently send errors back to LTI Tool Provider when grades are received but cannot be posted

## Getting Started

The package is currently not published to NPM but can be installed directly from GitHub:

```bash
npm install github:alt-cs-lab/lti-toolkit
```

See the [Examples]({{% relref "00-general/00-examples" %}}) section for detailed example projects using this tool.

TypeScript users: type declarations are published alongside the library (`index.d.ts`), covering the full configuration object, all callback signatures, and all four controller interfaces (`ConsumerRegistryController`, `ProviderRegistryController`, `LTIConsumerController`, `LTIProviderController`) with typed return shapes for each method.

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
  // Encryption key used to encrypt secrets and private keys at rest
  // 64-character hex string (32 bytes), e.g. from `openssl rand -hex 32`
  encryption_key: "your_64_character_hex_encryption_key",
  // Logging Level
  // One of error warn info http verbose lti debug sql silly
  log_level: "lti",
  // LTI Tool Provider Configuration
  provider: {
    // Incoming LTI Launch Handler Function
    handleLaunch: LTILaunch,
  }
});

// Create an LTI 1.0 consumer on startup if one doesn't already exist
const existing = await lti.controllers.consumerRegistry.getByKey("your_lti_key");
if (!existing) {
  await lti.controllers.consumerRegistry.createConsumer({
    name: "My LMS",
    key: "your_lti_key",
    secret: "your_lti_secret",
    lti13: false,
  });
}
```

The LTI Toolkit library is initialized by providing a configuration options object with the following options:

```js
{
  // REQUIRED
  // Domain Name
  // The public-facing URL for this application, including scheme and host.
  // Must be the URL the LMS uses to reach this app (i.e. the URL after any
  // reverse proxy). LTI 1.0 OAuth signatures are verified against this value,
  // so it must exactly match the URL the LMS signed.
  // Must use HTTPS for most LMS integrations.
  domain_name: "https://app.domain.tld",

  // REQUIRED
  // Admin Email
  // Email address for system administrator
  admin_email: "administrator@app.domain.tld",

  // REQUIRED
  // Encryption Key
  // 64-character hex string (32 bytes) used as the AES-256-GCM key to
  // encrypt LTI consumer/provider secrets and private keys at rest.
  // Generate one with: openssl rand -hex 32
  encryption_key: "your_64_character_hex_encryption_key",

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
  // Any Sequelize-supported dialect works here (Postgres, MySQL, MariaDB, etc.) -
  // db_storage is only a convenience default for SQLite. This is also how an
  // application can share a single Sequelize instance with this library, so its
  // own models can form direct relationships with this library's models (e.g.
  // Course.belongsTo(lti.models.Consumer)) - see "Sharing a Database" below.
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
    // A non-string (or empty string) return value throws a descriptive error
    handleLaunch: LTILaunchHandler

    // OPTIONAL Information for XML Configuration
    // All of the options below are only used for automatic
    // XML configuration of the tool within an LMS
    // Title
    title: "LTI Toolkit",
    // Description
    description: "LTI Toolkit for LTI Tool Providers",
    // Route Prefix
    route_prefix: "/lti/provider",
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
    // A non-string (or empty string) return value throws a descriptive error
    handleDeeplink: LTIDeeplinkHandler
  }

  // OPTIONAL
  // LTI Tool Consumer Configuration
  consumer: {
    // REQUIRED
    // LTI Grade Handler
    // User-provided async function to receive LTI Grades
    // Params: LTI Provider Key, Context Key, Resource Key, Gradebook Key, AGS Grade Score Object, Express Request Object
    // The Grade Score Object contains: userId, scoreGiven, scoreMaximum, activityProgress, gradingProgress, timestamp
    // Function must return: { success: boolean, message: string }
    // An incorrectly-shaped return value (e.g. a missing/non-boolean success field) throws a descriptive error
    postProviderGrade: LTIGradeHandler,

    // OPTIONAL
    // LTI 1.0 Read Grade Handler
    // User-provided async function to return a previously submitted grade (LTI 1.0 readResult)
    // Params: Provider Key, Context Key, Resource Key, User Key, Gradebook Key, Express Request Object
    // Function must return: { score: number } (0.0 - 1.0) or null if no grade on file
    // An incorrectly-shaped non-null return value (e.g. a missing/non-number score field) throws a descriptive error
    readProviderGrade: LTIReadGradeHandler,

    // OPTIONAL
    // LTI 1.0 Delete Grade Handler
    // User-provided async function to delete a previously submitted grade (LTI 1.0 deleteResult)
    // Params: Provider Key, Context Key, Resource Key, User Key, Gradebook Key, Express Request Object
    // Function must return: { success: boolean, message: string }
    // An incorrectly-shaped return value (e.g. a missing/non-boolean success field) throws a descriptive error
    deleteProviderGrade: LTIDeleteGradeHandler,

    // OPTIONAL
    // LTI 1.3 AGS Get Line Item Handler
    // User-provided async function to return metadata for a single gradebook line item
    // Params: Provider Key, Context Key, Resource Key, Gradebook Key, Express Request Object
    // Function must return: { label: string, scoreMaximum: number } or null if not found
    // An incorrectly-shaped non-null return value throws a descriptive error
    getProviderLineItem: LTIGetLineItemHandler,

    // OPTIONAL
    // LTI 1.3 AGS Get Line Items Handler
    // User-provided async function to return all line items for a context
    // Each unique (resourceKey, gradebookKey) pair should be returned as a separate entry
    // Params: Provider Key, Context Key, Resource Link ID (optional filter, may be null), Express Request Object
    // Function must return: [{ resourceKey, gradebookKey, label, scoreMaximum }] or null if context not found
    // An incorrectly-shaped non-null return value throws a descriptive error
    getProviderLineItems: LTIGetLineItemsHandler,

    // OPTIONAL
    // LTI 1.3 AGS Get Results Handler
    // User-provided async function to return result status for users who have submitted grades for a line item
    // Params: Provider Key, Context Key, Resource Key, Gradebook Key, User ID (optional filter, may be null), Express Request Object
    // Function must return: [{ userId, resultScore, resultMaximum, comment }] or null if assignment not found
    // An incorrectly-shaped non-null return value throws a descriptive error
    getProviderResults: LTIGetResultsHandler,

    // OPTIONAL
    // LTI 1.3 Deep Link Response Handler
    // User-provided async function called after a Tool Provider completes a Deep Link selection
    // Params: content_items (array of deep-linked items), context (object stored at deep link initiation)
    // Function must return: URL string to redirect the browser to after processing
    // A non-string (or empty string) return value throws a descriptive error
    handleDeeplink: LTIDeeplinkResponseHandler,

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

### Sharing a Database

The library is built on [Sequelize](https://sequelize.org/), which supports SQLite, Postgres, MySQL, MariaDB, and others. The built-in `db_storage` option is only a convenience default for a local SQLite database — any other dialect is supported by constructing your own `Sequelize` instance and passing it as `config.database`:

```js
import { Sequelize } from "sequelize";

const sequelizeInstance = new Sequelize({
  dialect: "postgres",
  host: "localhost",
  username: "lti",
  password: "lti",
  database: "lti_toolkit",
});

const lti = await LTIToolkit({
  // ... other config ...
  database: sequelizeInstance,
});
```

Passing your own instance also lets your application **share a single database connection with this library**, so your own models can form direct relationships with the library's models. For example, a `Course` model in your application could reference the library's `Consumer` model:

```js
const lti = await LTIToolkit({ /* ... */ database: sequelizeInstance });

// lti.models.Consumer / lti.models.Provider are the same Sequelize Model
// classes the library uses internally, defined on your shared instance.
Course.belongsTo(lti.models.Consumer);
```

If your application has its own migrations that need to reference tables this library creates (e.g. a foreign key to `lti_consumers` or `lti_providers`), run them only **after** `await LTIToolkit(...)` resolves — that's when this library's own migrations are guaranteed to have completed:

```js
const lti = await LTIToolkit({ /* ... */ database: sequelizeInstance });

// Now safe to run your own migrations that reference lti_consumers/lti_providers
await myAppUmzug.up();
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
      "/grade",
      // LTI 1.3 OIDC Login Target (incoming launches from Tool Providers)
      "/login",
      // LTI 1.3 Keyset Target (public JWKS for Tool Providers to verify tokens)
      "/jwks",
      // LTI 1.3 Token Endpoint (issues AGS access tokens to Tool Providers)
      "/token",
      // LTI 1.3 AGS Line Items Collection (GET — all line items for a context)
      "/ags/:context_key/line_items",
      // LTI 1.3 AGS Line Item (GET — single line item)
      "/ags/:context_key/:resource_key/:gradebook_key",
      // LTI 1.3 AGS Results (GET — submission results for a line item)
      "/ags/:context_key/:resource_key/:gradebook_key/results",
      // LTI 1.3 AGS Score (POST — grade passback from Tool Provider)
      "/ags/:context_key/:resource_key/:gradebook_key/scores",
      // LTI 1.3 OpenID Configuration (for Dynamic Registration)
      "/openid-configuration",
      // LTI 1.3 Dynamic Registration Target
      "/register",
      // LTI 1.3 Deep Link Response Target
      "/deeplink/:token",
    }
  },
  // Controller Interfaces
  controllers: {
    // Provider Registry Controller Instance
    // Returned if consumer is configured
    // (As an LMS Consumer, you are talking to Providers)
    // CRUD operations on registered Provider records
    providerRegistry: {
      // Get All Providers
      getAll(),
      // Get a Provider by Database ID
      getById(id),
      // Get a Provider by Key
      getByKey(key),
      // Get a Provider by name
      getByName(name)
      // Create a new Provider
      createProvider(data),
      // Update a Provider
      updateProvider(id, data),
      // Delete a Provider
      deleteProvider(id)
      // Get the secrets for a Provider by ID
      getSecret(id),
      // Rotate the secret/key pair for a Provider
      // key and secret are optional — omit both to auto-generate new credentials
      updateSecret(id, key, secret)
      // Get all public JWKS keys
      getAllKeys()
    },
    // Consumer Registry Controller Instance
    // Returned if provider is configured
    // (As an LMS Provider, you are talking to Consumers)
    // CRUD operations on registered Consumer records
    consumerRegistry: {
      // Get all Consumers
      getAll(),
      // Get a Consumer by Database ID
      getById(id),
      // Get a Consumer by Key
      getByKey(key)
      // Get a Consumer by name
      getByName(name)
      // Create a new Consumer
      createConsumer(data),
      // Update a Consumer
      updateConsumer(id, data),
      // Delete a Consumer
      deleteConsumer(id),
      // Get the secrets for a Consumer by ID
      getSecret(id),
      // Rotate the secret/key pair for a Consumer
      // key and secret are optional — omit both to auto-generate new credentials
      updateSecret(id, key, secret)
      // Get all public JWKS keys
      getAllKeys()
    },
    // LTI Consumer Controller
    // Returned if consumer is configured
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
      // Generate an LTI 1.3 Launch Form
      generateLTI13LaunchFormData(
        // LTI Consumer Key
        key,
        // LTI Client ID
        client_id,
        // LTI Deployment ID
        deployment_id,
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
      // Initiate an LTI 1.3 Deep Link request to a Tool Provider
      generateLTI13DeepLinkFormData(
        // LTI Provider Key
        key,
        // LTI Client ID
        client_id,
        // LTI Deployment ID
        deployment_id,
        // LTI Provider Launch URL
        url,
        // Return URL back to the LTI Consumer after Deep Link response
        ret_url,
        // LTI Context (Course)
        context: {
          key,
          label,
          name
        }
        // LTI User
        user: {
          key,
          email
        }
        // LTI 1.3 Deep Link Settings (optional)
        // Overrides defaults: accept_types defaults to ["ltiResourceLink"], accept_multiple to false
        settings: {}
      ),
      // Register an LTI 1.0 Tool Provider via XML
      lti10configxml(
        data: {
          xml,  // one of xml or url must be provided
          url,  // one of xml or url must be provided
          key,
          secret,
        }
      )
      // Register an LTI 1.3 Tool Provider via Dynamic Registration
      lti13dynamicregistration(url)
    },
    // LTI Provider Controller
    // Returned if provider is configured
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
        // Debugging data (optional)
        debug: {
          user,
          user_id,
          assignment,
          assignment_id
        },
        // Activity Progress for LTI 1.3 AGS (optional, default: "Submitted")
        // One of: "Initialized", "Started", "InProgress", "Submitted", "Completed"
        activityProgress,
        // Grading Progress for LTI 1.3 AGS (optional, default: "FullyGraded")
        // One of: "FullyGraded", "Pending", "PendingManual", "Failed", "NotReady"
        gradingProgress,
      ),
      // Get a Single Line Item from an LTI Consumer via AGS (LTI 1.3 only)
      // Returns the line item object from the LMS
      getLineItem(
        // LTI Consumer Key
        consumer_key,
        // Line item URL (from launchData.outcome_url)
        lineitem_url,
      ),
      // Get All Line Items from an LTI Consumer via AGS (LTI 1.3 only)
      // Returns an array of line item objects from the LMS
      getLineItems(
        // LTI Consumer Key
        consumer_key,
        // Line items collection URL (from launchData.outcome_lineitems)
        lineitems_url,
        // Optional resource link ID filter (default: null)
        resource_link_id,
      ),
      // Read a Grade from an LTI Consumer via LTI 1.0 Basic Outcomes
      // Returns the current score (float 0.0–1.0), or null if no grade is on file
      readGrade(
        // LTI Consumer Key
        consumer_key,
        // Grade passback URL (from launchData.outcome_url)
        grade_url,
        // LMS Grade ID / sourcedId (from launchData.outcome_id)
        lms_grade_id,
      ),
      // Delete a Grade from an LTI Consumer via LTI 1.0 Basic Outcomes
      // Returns true on success
      deleteGrade(
        // LTI Consumer Key
        consumer_key,
        // Grade passback URL (from launchData.outcome_url)
        grade_url,
        // LMS Grade ID / sourcedId (from launchData.outcome_id)
        lms_grade_id,
      ),
      // Get AGS Results for a Line Item from an LTI Consumer (LTI 1.3 only)
      // Returns an array of result objects from the LMS
      getResults(
        // LTI Consumer Key
        consumer_key,
        // Results URL (append "/results" to launchData.outcome_url)
        results_url,
        // Optional user ID filter (default: null)
        user_id,
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
  },
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

* [Node.js 24 LTS](https://nodejs.org/en/blog/release/v24.13.0) - developed and tested using Node 24 LTS
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

As of May 28th, 2026, the following vulnerabilities in these libraries are known:

* `mocha 11.7.6` currently depends on vulnerable versions of `diff` and `serialize-javascript`. `mocha 12.0` is in active beta and is only used for unit testing in this project, so it is not a release dependency.
* `sequelize 6.37.8` uses an out of date version of `uuid`. See https://github.com/sequelize/sequelize/issues/18224 for discussion and resolution. `sequelize 7` is under active development and this library will migrate to that version in the future.

{{% /notice %}}

## Documentation

This documentation site provides many useful guides for using this tool!

* [Examples]({{% relref "00-general/00-examples" %}}) - detailed example projects
* [Database]({{% relref "00-general/01-database" %}}) - detailed database schema
* [Dev Setup]({{% relref "01-setup" %}}) - setting up a development environment
* [Installing Canvas]({{% relref "01-setup/01-canvas" %}}) - guide for setting up Canvas in Docker with Traefik
* [LTI Docs]({{% relref "02-lti" %}}) - detailed LTI protocol examples and diagrams
