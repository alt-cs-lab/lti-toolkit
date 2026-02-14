/**
 * @file /controllers/lti-register.js tests
 * @author Russell Feldhausen <russfeld@ksu.edu>
 */

// Load Libraries
import { should, expect, assert } from "chai";
import sinon from "sinon";

// Load module under test
import LTIRegistrationController from "../../src/controllers/lti-register.js";

// Utilities to stub
import LTI13Utils from "../../src/lib/lti13.js";

// Load logger
import configureLogger from "../../src/config/logger.js";

// Modify Object.prototype for BDD style assertions
should();

describe("/controllers/lti-register.js", () => {
  const logger = configureLogger("error");
  const domain_name = "http://localhost:3000";
  const admin_email = "admin@localhost.tld";

  it("should create an LTIRegistrationController instance with the correct properties", async () => {
    // Create mock dependencies
    const provider_config = { };
    const models = { };
    const consumer_controller = {};

    // Create instance
    const controller = new LTIRegistrationController(
      provider_config,
      models,
      logger,
      domain_name,
      admin_email,
      consumer_controller,
    );

    // Assert properties
    expect(controller).to.be.an.instanceOf(LTIRegistrationController);
  });

  it("should generate correct LTI 1.0 configuration XML", async () => {
    const provider_config = {
      title: "Test LTI Tool",
      description: "A test LTI tool for unit testing",
      icon_url: "http://localhost:3000/icon.png",
      custom_params: {
        custom_key1: "custom_value1",
        custom_key2: "custom_value2",
      },
      navigation: true,
      route_prefix: "/lti/provider",
      tool_id: "test-lti-tool",
      privacy_level: "public",
    };

    const controller = new LTIRegistrationController(
      provider_config,
      {},
      logger,
      domain_name,
      admin_email,
      {},
    );

    const configXML = await controller.getLTI10Config();

    // Assert XML contains required elements
    expect(configXML).to.include("<blti:title>Test LTI Tool</blti:title>");
    expect(configXML).to.include("<blti:description>A test LTI tool for unit testing</blti:description>");
    expect(configXML).to.include("<blti:icon>http://localhost:3000/icon.png</blti:icon>");
    expect(configXML).to.include('<lticm:property name="custom_key1">custom_value1</lticm:property>');
    expect(configXML).to.include('<lticm:property name="custom_key2">custom_value2</lticm:property>');
    // Launch URL
    expect(configXML).to.include(`<blti:launch_url>${domain_name}/lti/provider/launch</blti:launch_url>`);
    // Navigation options
    expect(configXML).to.include('<lticm:options name="course_navigation">');
    expect(configXML).to.include('<lticm:property name="default">disabled</lticm:property>');
    expect(configXML).to.include('<lticm:property name="enabled">true</lticm:property>');
    expect(configXML).to.include('<lticm:property name="windowTarget">_blank</lticm:property>');
    // Canvas extensions
    expect(configXML).to.include('<lticm:property name="tool_id">test-lti-tool</lticm:property>');
    expect(configXML).to.include('<lticm:property name="privacy_level">public</lticm:property>');
    expect(configXML).to.include(`<lticm:property name="domain">${domain_name.replace(/^https?:\/\//, "")}</lticm:property>`);
    
  });

  it("should handle a successful LTI 1.3 dynamic registration", async () => {
    assert.fail("Not implemented");
  });

  it("should handle a failed LTI 1.3 dynamic registration", async () => {
    assert.fail("Not implemented");
  });

  it("should handle errors during LTI 1.3 dynamic registration", async () => {
    assert.fail("Not implemented"); 
  });
  
});
