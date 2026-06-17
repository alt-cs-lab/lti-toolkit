// Type declarations for lti-toolkit
//
// Hand-maintained — keep in sync with the JSDoc on the `LtiToolkit` function in index.js
// and the callback shapes enforced at runtime by src/lib/callback-validation.js.

// ─── Shared data shapes ───────────────────────────────────────────────────────

/** A grade/score object posted to a Tool Provider via AGS or LTI 1.0 Basic Outcomes */
export interface GradeScore {
  userId: string;
  scoreGiven: number;
  scoreMaximum: number;
  activityProgress: string;
  gradingProgress: string;
  timestamp: string;
}

/** An AGS line item, as returned by getLineItem / getLineItems */
export interface LineItem {
  label: string;
  scoreMaximum: number;
  resourceKey: string;
  gradebookKey: string;
}

/** An AGS result, as returned by getResults */
export interface Result {
  userId: string;
  resultScore: number;
  resultMaximum: number;
  comment?: string;
}

/** Form data returned by all generateLTI1x…FormData methods. Render as a hidden-field POST form. */
export interface LaunchFormData {
  /** The URL the form should POST to */
  action: string;
  /** Hidden form field names and values */
  fields: Record<string, string>;
}

// ─── Model data interfaces ────────────────────────────────────────────────────

/**
 * Plain-object shape of an LTI Consumer record.
 * This is what `consumerInstance.toJSON()` returns.
 * Note: fields stored as JSON strings in the database (e.g. redirect_urls, scopes, claims)
 * are returned as strings here, not parsed arrays.
 */
export interface ConsumerData {
  id: number;
  name: string;
  key: string;
  lti13: boolean;
  client_id?: string | null;
  platform_id?: string | null;
  deployment_id?: string | null;
  keyset_url?: string | null;
  token_url?: string | null;
  auth_url?: string | null;
  tc_product?: string | null;
  tc_version?: string | null;
  tc_guid?: string | null;
  tc_name?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Live Sequelize model instance for an LTI Consumer.
 * Extends ConsumerData so fields can be accessed directly (e.g. `consumer.name`).
 * Call `.toJSON()` to get a plain object safe for serialization.
 */
export interface ConsumerInstance extends ConsumerData {
  toJSON(): ConsumerData;
}

/** Plain-object shape of an LTI Consumer key record, as returned by getSecret / updateSecret */
export interface ConsumerKeyData {
  key: string;
  /** Decrypted shared secret */
  secret: string;
  toJSON(): { key: string; secret: string };
}

/**
 * Plain-object shape of an LTI Provider record.
 * This is what `providerInstance.toJSON()` returns.
 * Note: `custom`, `redirect_urls`, `scopes`, and `claims` are stored as JSON strings
 * in the database and are returned as strings here, not parsed objects/arrays.
 */
export interface ProviderData {
  id: number;
  name: string;
  key: string;
  lti13: boolean;
  launch_url: string;
  domain: string;
  custom?: string | null;
  use_section: boolean;
  client_id?: string | null;
  deployment_id?: string | null;
  keyset_url?: string | null;
  auth_url?: string | null;
  redirect_urls?: string | null;
  scopes?: string | null;
  claims?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Live Sequelize model instance for an LTI Provider.
 * Extends ProviderData so fields can be accessed directly (e.g. `provider.name`).
 * Call `.toJSON()` to get a plain object safe for serialization.
 */
export interface ProviderInstance extends ProviderData {
  toJSON(): ProviderData;
}

/** Plain-object shape of an LTI Provider key record, as returned by getSecret / updateSecret */
export interface ProviderKeyData {
  key: string;
  /** Decrypted shared secret */
  secret: string;
  toJSON(): { key: string; secret: string };
}

// ─── Registry controller interfaces ──────────────────────────────────────────

/** CRUD operations for LTI Consumer records (available as `lti.controllers.consumerRegistry`) */
export interface ConsumerRegistryController {
  getAll(): Promise<ConsumerInstance[]>;
  getById(id: number | string): Promise<ConsumerInstance | null>;
  getByKey(key: string): Promise<ConsumerInstance | null>;
  getByName(name: string): Promise<ConsumerInstance | null>;
  createConsumer(data: Partial<ConsumerData>): Promise<ConsumerInstance>;
  /** Returns the updated instance, or null if not found */
  updateConsumer(id: number | string, data: Partial<ConsumerData>): Promise<ConsumerInstance | null>;
  /** Returns true on success, or null if not found */
  deleteConsumer(id: number | string): Promise<true | null>;
  getSecret(id: number | string): Promise<ConsumerKeyData | null>;
  /**
   * Rotate the shared secret and RSA key pair for a consumer.
   * Omit `key` and `secret` to auto-generate new credentials.
   */
  updateSecret(id: number | string, key?: string | null, secret?: string | null): Promise<ConsumerKeyData | null>;
  getAllKeys(): Promise<Array<{ key: string; public: string }>>;
}

/** CRUD operations for LTI Provider records (available as `lti.controllers.providerRegistry`) */
export interface ProviderRegistryController {
  getAll(): Promise<ProviderInstance[]>;
  getById(id: number | string): Promise<ProviderInstance | null>;
  getByKey(key: string): Promise<ProviderInstance | null>;
  getByName(name: string): Promise<ProviderInstance | null>;
  createProvider(data: Partial<ProviderData>): Promise<ProviderInstance>;
  /** Returns the updated instance, or null if not found */
  updateProvider(id: number | string, data: Partial<ProviderData>): Promise<ProviderInstance | null>;
  /** Returns true on success, or null if not found */
  deleteProvider(id: number | string): Promise<true | null>;
  getSecret(id: number | string): Promise<ProviderKeyData | null>;
  /**
   * Rotate the shared secret and RSA key pair for a provider.
   * Omit `key` and `secret` to auto-generate new credentials.
   */
  updateSecret(id: number | string, key?: string | null, secret?: string | null): Promise<ProviderKeyData | null>;
  getAllKeys(): Promise<Array<{ key: string; public: string }>>;
}

// ─── LTI protocol controller interfaces ──────────────────────────────────────

/** Methods for acting as an LTI Tool Consumer (available as `lti.controllers.consumer`) */
export interface LTIConsumerController {
  /** Generate a signed LTI 1.0 launch form. Returns synchronously. */
  generateLTI10LaunchFormData(
    key: string,
    secret: string,
    url: string,
    ret_url: string,
    context: { key: string; label: string; name: string },
    resource: { key: string; name: string },
    user: { key: string; email: string; family_name: string; given_name: string; name: string; image?: string },
    manager: boolean,
    gradebook_key: string,
    custom?: Record<string, string> | null,
  ): LaunchFormData;

  /** Generate an LTI 1.3 OIDC login form to initiate a standard resource-link launch */
  generateLTI13LaunchFormData(
    key: string,
    client_id: string,
    deployment_id: string,
    url: string,
    ret_url: string,
    context: { key: string; label: string; name: string },
    resource: { key: string; name: string },
    user: { key: string; email: string; family_name?: string; given_name?: string; name?: string; image?: string },
    manager: boolean,
    gradebook_key: string,
    custom?: Record<string, string> | null,
  ): Promise<LaunchFormData>;

  /** Generate an LTI 1.3 OIDC login form to initiate a Deep Linking request */
  generateLTI13DeepLinkFormData(
    key: string,
    client_id: string,
    deployment_id: string,
    url: string,
    ret_url: string,
    context: { key: string; label?: string; name?: string },
    user: { key: string; email: string },
    settings?: Record<string, unknown>,
  ): Promise<LaunchFormData>;

  /**
   * Register an LTI 1.0 Tool Provider by parsing its XML configuration.
   * Returns the created Provider record.
   */
  lti10configxml(data: { xml?: string; url?: string; key: string; secret: string }): Promise<ProviderInstance>;

  /**
   * Register an LTI 1.3 Tool Provider via Dynamic Registration.
   * Fetches the tool's OpenID configuration and stores it as a Provider record.
   * Returns the HTML response from the tool's registration endpoint.
   */
  lti13dynamicregistration(url: string): Promise<string>;
}

/** Methods for acting as an LTI Tool Provider (available as `lti.controllers.provider`) */
export interface LTIProviderController {
  /**
   * Post a grade back to the LTI Consumer.
   * Works for both LTI 1.0 Basic Outcomes and LTI 1.3 AGS.
   * Returns true on success.
   */
  postGrade(
    consumer_key: string,
    grade_url: string,
    lms_grade_id: string,
    score: number,
    user_lis13_id: string,
    debug?: { user?: string; user_id?: string; assignment?: string; assignment_id?: string },
    activityProgress?: string,
    gradingProgress?: string,
  ): Promise<boolean>;

  /** Fetch a single AGS line item from the consumer (LTI 1.3 only) */
  getLineItem(consumer_key: string, lineitem_url: string): Promise<LineItem | null>;

  /** Fetch all AGS line items for a context from the consumer (LTI 1.3 only) */
  getLineItems(
    consumer_key: string,
    lineitems_url: string,
    resource_link_id?: string | null,
  ): Promise<LineItem[]>;

  /** Read a grade from the consumer via LTI 1.0 Basic Outcomes. Returns score (0.0–1.0) or null. */
  readGrade(consumer_key: string, grade_url: string, lms_grade_id: string): Promise<number | null>;

  /** Delete a grade from the consumer via LTI 1.0 Basic Outcomes. Returns true on success. */
  deleteGrade(consumer_key: string, grade_url: string, lms_grade_id: string): Promise<boolean>;

  /** Fetch AGS submission results for a line item from the consumer (LTI 1.3 only) */
  getResults(consumer_key: string, results_url: string, user_id?: string | null): Promise<Result[]>;

  /**
   * Send a Deep Link response back to the consumer.
   * Renders a self-submitting form directly to the Express response.
   * `res` is the Express Response object; `consumer` is the stored consumer session object.
   */
  createDeepLink(
    res: unknown,
    consumer: unknown,
    return_url: string,
    id: string,
    title: string,
  ): Promise<void>;
}

// ─── Callback types ───────────────────────────────────────────────────────────

export type PostProviderGradeCallback = (
  consumerKey: string,
  contextKey: string,
  resourceKey: string,
  gradebookKey: string,
  score: GradeScore,
  // The Express request object for the incoming grade passback
  req: unknown,
) => Promise<{ success: boolean; message: string }>;

export type ReadProviderGradeCallback = (
  consumerKey: string,
  contextKey: string,
  resourceKey: string,
  userKey: string,
  gradebookKey: string,
  req: unknown,
) => Promise<{ score: number } | null | undefined>;

export type DeleteProviderGradeCallback = (
  consumerKey: string,
  contextKey: string,
  resourceKey: string,
  userKey: string,
  gradebookKey: string,
  req: unknown,
) => Promise<{ success: boolean; message: string }>;

export type GetProviderLineItemCallback = (
  consumerKey: string,
  contextKey: string,
  resourceKey: string,
  gradebookKey: string,
  req: unknown,
) => Promise<Pick<LineItem, "label" | "scoreMaximum"> | null | undefined>;

export type GetProviderLineItemsCallback = (
  consumerKey: string,
  contextKey: string,
  resourceLinkId: string | null,
  req: unknown,
) => Promise<LineItem[] | null | undefined>;

export type GetProviderResultsCallback = (
  consumerKey: string,
  contextKey: string,
  resourceKey: string,
  gradebookKey: string,
  userId: string | null,
  req: unknown,
) => Promise<Result[] | null | undefined>;

/**
 * User-provided function to handle LTI Launches (provider side).
 * Must return a URL string to redirect the browser to after a successful launch.
 */
export type HandleLaunchCallback = (launchData: unknown, consumer: unknown, req: unknown) => Promise<string>;

/**
 * User-provided function to handle LTI 1.3 Deep Linking requests (provider side).
 * Must return a URL string to redirect the browser to after a successful deeplink.
 */
export type HandleDeeplinkCallback = (launchData: unknown, consumer: unknown, req: unknown) => Promise<string>;

/**
 * User-provided function to handle LTI 1.3 Deep Linking responses (consumer side).
 * Receives the content items selected by the user and the context stored when the request was initiated.
 * Must return a URL string to redirect the browser to after processing the response.
 */
export type HandleDeeplinkResponseCallback = (
  content_items: object[],
  context: object,
) => Promise<string>;

// ─── Configuration interfaces ─────────────────────────────────────────────────

export interface ProviderConfig {
  handleLaunch: HandleLaunchCallback;
  title?: string;
  description?: string;
  route_prefix?: string;
  icon_url?: string;
  custom_params?: Record<string, string>;
  tool_id?: string;
  privacy_level?: string;
  navigation?: boolean;
  handleDeeplink?: HandleDeeplinkCallback;
}

export interface ConsumerConfig {
  postProviderGrade: PostProviderGradeCallback;
  readProviderGrade?: ReadProviderGradeCallback;
  deleteProviderGrade?: DeleteProviderGradeCallback;
  getProviderLineItem?: GetProviderLineItemCallback;
  getProviderLineItems?: GetProviderLineItemsCallback;
  getProviderResults?: GetProviderResultsCallback;
  handleDeeplink?: HandleDeeplinkResponseCallback;
  product_name?: string;
  product_version?: string;
  deployment_name?: string;
  deployment_id?: string;
  route_prefix?: string;
}

export interface LtiToolkitConfig {
  domain_name: string;
  admin_email: string;
  /** 64-character hex string (32 bytes) used as the AES-256-GCM key for at-rest encryption */
  encryption_key: string;
  logger?: unknown;
  log_level?: string;
  database?: unknown;
  db_storage?: string;
  provider?: ProviderConfig;
  consumer?: ConsumerConfig;
  test?: boolean;
}

// ─── Return type ──────────────────────────────────────────────────────────────

export interface LtiToolkitInstance {
  routers: {
    /** LTI Tool Provider router — present when `provider` is configured */
    provider?: unknown;
    /** LTI Tool Consumer router — present when `consumer` is configured */
    consumer?: unknown;
  };
  controllers: {
    /**
     * CRUD operations on registered Consumer records.
     * Present when `provider` is configured (as a provider you are talking to consumers).
     */
    consumerRegistry?: ConsumerRegistryController;
    /**
     * CRUD operations on registered Provider records.
     * Present when `consumer` is configured (as a consumer you are talking to providers).
     */
    providerRegistry?: ProviderRegistryController;
    /**
     * Methods for acting as an LTI Tool Consumer (launching providers, registering tools).
     * Present when `consumer` is configured.
     */
    consumer?: LTIConsumerController;
    /**
     * Methods for acting as an LTI Tool Provider (posting grades, reading AGS data).
     * Present when `provider` is configured.
     */
    provider?: LTIProviderController;
  };
  models: {
    /** Sequelize Model class for LTI Consumer records */
    Consumer: unknown;
    /** Sequelize Model class for LTI Provider records */
    Provider: unknown;
  };
  /** Test utilities — only present when `config.test` is true */
  test?: {
    initializeExpiration(): Promise<void>;
  };
}

export default function LtiToolkit(config: LtiToolkitConfig): Promise<LtiToolkitInstance>;
