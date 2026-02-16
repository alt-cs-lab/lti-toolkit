/**
 * @file /controllers/consumer.js tests
 * @author Russell Feldhausen <russfeld@ksu.edu>
 */

// Load Libraries
import { should, expect } from "chai";
import sinon from "sinon";

// Load module under test
import ConsumerController from "../../src/controllers/consumer.js";

// Modify Object.prototype for BDD style assertions
should();

describe("/controllers/consumer.js", () => {
  const transaction = async (callback) => await callback();

  it("should create a ConsumerController instance with the correct properties", async () => {
    // Create mock dependencies
    const models = { Consumer: {}, ConsumerKey: {} };

    // Create instance of ConsumerController
    const controller = new ConsumerController(models, transaction);

    // Assertions
    expect(controller).to.be.an.instanceOf(ConsumerController);
  });

  // Fixture for testing getAll, getById, and getByKey methods
  const consumerFixtures = [
    { id: 1, key: "test-key", name: "Test Consumer" },
    { id: 2, key: "another-key", name: "Another Consumer" },
  ]; // Use the first consumer for getById and getByKey tests

  it("getAll should return all consumers from the database", async () => {
    // Create mock dependencies
    const models = { Consumer: { findAll: sinon.stub().resolves(consumerFixtures) } };

    // Create instance of ConsumerController
    const controller = new ConsumerController(models, transaction);

    // Call method under test
    const result = await controller.getAll();

    // Assertions
    expect(models.Consumer.findAll.calledOnce).to.be.true;
    expect(result).to.deep.equal(consumerFixtures);
  });

  it("getById should return a consumer by ID from the database", async () => {
    // Create mock dependencies
    const models = { Consumer: { findByPk: sinon.stub().resolves(consumerFixtures[0]) } };

    // Create instance of ConsumerController
    const controller = new ConsumerController(models, transaction);

    // Call method under test
    const result = await controller.getById(1);

    // Assertions
    expect(models.Consumer.findByPk.calledOnceWith(1)).to.be.true;
    expect(result).to.deep.equal(consumerFixtures[0]);
  });

  it("getByKey should return a consumer by key from the database", async () => {
    // Create mock dependencies
    const models = { Consumer: { findOne: sinon.stub().resolves(consumerFixtures[0]) } };

    // Create instance of ConsumerController
    const controller = new ConsumerController(models, transaction);

    // Call method under test
    const result = await controller.getByKey("test-key");

    // Assertions
    expect(models.Consumer.findOne.calledOnceWith({ where: { key: "test-key" } })).to.be.true;
    expect(result).to.deep.equal(consumerFixtures[0]);
  });

  // Fixture for testing create method with all fields provided
  const fullConsumerData = {
    name: "Full Consumer",
    key: "full-key",
    lti13: true,
    client_id: "full-client-id",
    platform_id: "full-platform-id",
    deployment_id: "full-deployment-id",
    keyset_url: "http://example.com/keys",
    token_url: "http://example.com/token",
    auth_url: "http://example.com/auth",
  };
  const fullCreatedConsumer = {
    id: 3,
    ...fullConsumerData,
  };

  it("create should create a new consumer with all fields in the database", async () => {
    // Create mock dependencies
    const models = {
      Consumer: { create: sinon.stub().resolves(fullCreatedConsumer) },
      ConsumerKey: { create: sinon.stub().resolves({}) },
    };

    // Create instance of ConsumerController
    const controller = new ConsumerController(models, transaction);

    // Call method under test
    const result = await controller.createConsumer(fullConsumerData);

    // Assertions
    expect(models.Consumer.create.calledOnceWith(fullConsumerData)).to.be.true;
    expect(result).to.deep.equal(fullCreatedConsumer);
    // A secret should be randomly generated if not provided, so we just check that it exists and is a string
    const secret = models.ConsumerKey.create.firstCall.args[0].secret;
    expect(secret).to.be.a("string");
    expect(secret).to.have.lengthOf.at.least(10); // Check that the generated secret is of a reasonable length
  });

  // Test that create method generates keys and uses provided secret when creating a new consumer
  it("create should generate keys for new consumers", async () => {
    // Create mock dependencies
    const models = {
      Consumer: { create: sinon.stub().resolves({ id: 4, ...fullConsumerData }) },
      ConsumerKey: { create: sinon.stub().resolves({}) },
    };

    // Create instance of ConsumerController
    const controller = new ConsumerController(models, transaction);

    // Call method under test
    await controller.createConsumer({ secret: "thisisasecret", ...fullConsumerData });

    // Assertions
    expect(models.ConsumerKey.create.calledOnce).to.be.true;
    // Check that the generated key is a valid RSA keypair (public and secret)
    const generatedPublicKey = models.ConsumerKey.create.firstCall.args[0].public;
    const generatedSecret = models.ConsumerKey.create.firstCall.args[0].private;
    const secret = models.ConsumerKey.create.firstCall.args[0].secret;
    expect(secret).to.equal("thisisasecret"); // Ensure provided secret is used
    // Check that the generated keys are in the expected format
    expect(generatedPublicKey).to.be.a("string");
    expect(generatedSecret).to.be.a("string");
    expect(generatedPublicKey).to.include("BEGIN PUBLIC KEY");
    expect(generatedSecret).to.include("BEGIN RSA PRIVATE KEY");
  });

  // Tests for updating a consumer
  const updateConsumerData = {
    name: "Full Consumer",
    lti13: true,
    client_id: "full-client-id",
    platform_id: "full-platform-id",
    deployment_id: "full-deployment-id",
    keyset_url: "http://example.com/keys",
    token_url: "http://example.com/token",
    auth_url: "http://example.com/auth",
  };

  it("update should update an existing consumer in the database", async () => {
    // Create mock dependencies
    const update = sinon.stub().resolves([1]);
    const mockConsumer = { id: 3, update: update };
    const models = { Consumer: { findByPk: sinon.stub().resolves(mockConsumer) } };

    // Create instance of ConsumerController
    const controller = new ConsumerController(models, transaction);

    // Call method under test
    const result = await controller.updateConsumer(3, updateConsumerData);

    // Assertions
    expect(models.Consumer.findByPk.calledOnceWith(3)).to.be.true;
    expect(update.calledOnceWith(updateConsumerData)).to.be.true;
    expect(result).to.deep.equal(mockConsumer);
  });

  it("update should not change the key of an existing consumer in the database", async () => {
    // Create mock dependencies
    const update = sinon.stub().resolves([1]);
    const mockConsumer = { id: 3, update: update };
    const models = { Consumer: { findByPk: sinon.stub().resolves(mockConsumer) } };

    // Create instance of ConsumerController
    const controller = new ConsumerController(models, transaction);

    // Call method under test with an attempt to change the key
    const result = await controller.updateConsumer(3, { ...updateConsumerData, key: "new-key" });

    // Assertions
    expect(models.Consumer.findByPk.calledOnceWith(3)).to.be.true;
    expect(update.calledOnceWith({ ...updateConsumerData })).to.be.true; // Ensure the key is not present in the update call
    expect(update.calledOnceWith({ ...updateConsumerData, key: "new-key" })).to.be.false; // Ensure the key is not present in the update call
    expect(result).to.deep.equal(mockConsumer);
  });

  it("update should return null if the consumer to update does not exist", async () => {
    // Create mock dependencies
    const models = { Consumer: { findByPk: sinon.stub().resolves(null) } };

    // Create instance of ConsumerController
    const controller = new ConsumerController(models, transaction);

    // Call method under test
    const result = await controller.updateConsumer(999, updateConsumerData);

    // Assertions
    expect(models.Consumer.findByPk.calledOnceWith(999)).to.be.true;
    expect(result).to.be.null;
  });

  // Tests for deleting a consumer
  it("delete should delete an existing consumer from the database", async () => {
    // Create mock dependencies
    const destroy = sinon.stub().resolves();
    const mockConsumer = { id: 3, key: "test-key", destroy: destroy };
    const models = {
      Consumer: { findByPk: sinon.stub().resolves(mockConsumer) },
      ConsumerKey: { destroy: sinon.stub().resolves() },
    };

    // Create instance of ConsumerController
    const controller = new ConsumerController(models, transaction);

    // Call method under test
    const result = await controller.deleteConsumer(3);

    // Assertions
    expect(models.Consumer.findByPk.calledOnceWith(3)).to.be.true;
    expect(models.ConsumerKey.destroy.calledOnceWith({ where: { key: "test-key" }, transaction: sinon.match.any })).to
      .be.true;
    expect(destroy.calledOnceWith({ transaction: sinon.match.any })).to.be.true;
    expect(result).to.be.true;
  });

  it("delete should return null if the consumer to delete does not exist", async () => {
    // Create mock dependencies
    const models = { Consumer: { findByPk: sinon.stub().resolves(null) } };

    // Create instance of ConsumerController
    const controller = new ConsumerController(models, transaction);

    // Call method under test
    const result = await controller.deleteConsumer(999);

    // Assertions
    expect(models.Consumer.findByPk.calledOnceWith(999)).to.be.true;
    expect(result).to.be.null;
  });

  // Test get secret
  it("getSecret should return the secret for a consumer", async () => {
    // Create mock dependencies
    const models = {
      Consumer: { findByPk: sinon.stub().resolves({ id: 3, key: "test-key" }) },
      ConsumerKey: { findOne: sinon.stub().resolves({ secret: "test-secret" }) },
    };

    // Create instance of ConsumerController
    const controller = new ConsumerController(models, transaction);

    // Call method under test
    const result = await controller.getSecret(3);

    // Assertions
    expect(models.Consumer.findByPk.calledOnceWith(3)).to.be.true;
    expect(models.ConsumerKey.findOne.calledOnceWith({ attributes: sinon.match.any, where: { key: "test-key" } })).to.be
      .true;
    expect(result).to.deep.equal({ secret: "test-secret" });
  });

  it("getSecret should return null if the consumer does not exist", async () => {
    // Create mock dependencies
    const models = { Consumer: { findByPk: sinon.stub().resolves(null) }, ConsumerKey: { findOne: sinon.stub() } };

    // Create instance of ConsumerController
    const controller = new ConsumerController(models, transaction);

    // Call method under test
    const result = await controller.getSecret(999);

    // Assertions
    expect(models.Consumer.findByPk.calledOnceWith(999)).to.be.true;
    expect(models.ConsumerKey.findOne.notCalled).to.be.true; // Ensure we don't attempt to find the secret if the consumer doesn't exist
    expect(result).to.be.null;
  });

  it("getSecret should return null if the consumer key does not exist", async () => {
    // Create mock dependencies
    const models = {
      Consumer: { findByPk: sinon.stub().resolves({ id: 3, key: "test-key" }) },
      ConsumerKey: { findOne: sinon.stub().resolves(null) },
    };

    // Create instance of ConsumerController
    const controller = new ConsumerController(models, transaction);

    // Call method under test
    const result = await controller.getSecret(3);

    // Assertions
    expect(models.Consumer.findByPk.calledOnceWith(3)).to.be.true;
    expect(models.ConsumerKey.findOne.calledOnceWith({ attributes: sinon.match.any, where: { key: "test-key" } })).to.be
      .true;
    expect(result).to.be.null;
  });

  // Test update secret
  it("updateSecret should update the secret for a consumer", async () => {
    // Create mock dependencies
    const save = sinon.stub().resolves();
    const destroy = sinon.stub().resolves();
    const create = sinon.stub().resolves({ secret: "new-secret" });
    const mockConsumer = { id: 3, key: "test-key", save: save };
    const models = {
      Consumer: { findByPk: sinon.stub().resolves(mockConsumer) },
      ConsumerKey: { destroy: destroy, create: create },
    };

    // Create instance of ConsumerController
    const controller = new ConsumerController(models, transaction);

    // Call method under test
    await controller.updateSecret(3, "new-key", "new-secret");

    // Assertions
    expect(models.Consumer.findByPk.calledOnceWith(3)).to.be.true;
    expect(save.calledOnce).to.be.true; // Ensure the consumer is saved after updating the key
    expect(destroy.calledOnceWith({ where: { key: "test-key" }, transaction: sinon.match.any })).to.be.true;
    expect(create.calledOnce).to.be.true;
    const generatedPublicKey = create.firstCall.args[0].public;
    const generatedSecret = create.firstCall.args[0].private;
    const key = create.firstCall.args[0].key;
    const secret = create.firstCall.args[0].secret;
    expect(key).to.equal("new-key"); // Ensure provided key is used
    expect(secret).to.equal("new-secret"); // Ensure provided secret is used
    // Check that the generated keys are in the expected format
    expect(generatedPublicKey).to.be.a("string");
    expect(generatedSecret).to.be.a("string");
    expect(generatedPublicKey).to.include("BEGIN PUBLIC KEY");
    expect(generatedSecret).to.include("BEGIN RSA PRIVATE KEY");
  });

  it("updateSecret should return null if the consumer to update does not exist", async () => {
    // Create mock dependencies
    const models = {
      Consumer: { findByPk: sinon.stub().resolves(null) },
      ConsumerKey: { destroy: sinon.stub(), create: sinon.stub() },
    };

    // Create instance of ConsumerController
    const controller = new ConsumerController(models, transaction);

    // Call method under test
    const result = await controller.updateSecret(999, "new-key", "new-secret");

    // Assertions
    expect(models.Consumer.findByPk.calledOnceWith(999)).to.be.true;
    expect(result).to.be.null;
  });

  it("updateSecret should generate new keys if key and secret are not provided", async () => {
    // Create mock dependencies
    const save = sinon.stub().resolves();
    const destroy = sinon.stub().resolves();
    const create = sinon.stub().resolves({ secret: "new-secret" });
    const mockConsumer = { id: 3, key: "test-key", save: save };
    const models = {
      Consumer: { findByPk: sinon.stub().resolves(mockConsumer) },
      ConsumerKey: { destroy: destroy, create: create },
    };

    // Create instance of ConsumerController
    const controller = new ConsumerController(models, transaction);

    // Call method under test without providing key and secret
    await controller.updateSecret(3);

    // Assertions
    expect(models.Consumer.findByPk.calledOnceWith(3)).to.be.true;
    expect(save.calledOnce).to.be.true; // Ensure the consumer is saved after updating the key
    expect(destroy.calledOnceWith({ where: { key: "test-key" }, transaction: sinon.match.any })).to.be.true;
    expect(create.calledOnce).to.be.true;
    const generatedPublicKey = create.firstCall.args[0].public;
    const generatedSecret = create.firstCall.args[0].private;
    const key = create.firstCall.args[0].key;
    const secret = create.firstCall.args[0].secret;
    expect(key).to.be.a("string");
    expect(secret).to.be.a("string");
    expect(key).to.have.lengthOf.at.least(10); // Check that the generated key is of a reasonable length
    expect(secret).to.have.lengthOf.at.least(10); // Check that the generated secret is of a reasonable length
    // Check that the generated keys are in the expected format
    expect(generatedPublicKey).to.be.a("string");
    expect(generatedSecret).to.be.a("string");
    expect(generatedPublicKey).to.include("BEGIN PUBLIC KEY");
    expect(generatedSecret).to.include("BEGIN RSA PRIVATE KEY");
  });

  it("getAllKeys should return all consumer keys from the database", async () => {
    // Create mock dependencies
    const consumerKeys = [
      { key: "key1", public: "public-key-1" },
      { key: "key2", public: "public-key-2" },
    ];
    const models = { ConsumerKey: { findAll: sinon.stub().resolves(consumerKeys) } };

    // Create instance of ConsumerController
    const controller = new ConsumerController(models, transaction);

    // Call method under test
    const result = await controller.getAllKeys();

    // Assertions
    expect(models.ConsumerKey.findAll.calledOnce).to.be.true;
    expect(models.ConsumerKey.findAll.calledWith({ attributes: ["key", "public"] })).to.be.true;
    expect(result).to.deep.equal(consumerKeys);
  });
});
