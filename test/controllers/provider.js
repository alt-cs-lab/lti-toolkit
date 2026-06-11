/**
 * @file /controllers/provider.js tests
 * @author Russell Feldhausen <russfeld@ksu.edu>
 */

// Load Libraries
import { should, expect } from "chai";
import sinon from "sinon";

// Load module under test
import ProviderController from "../../src/controllers/provider.js";

// Modify Object.prototype for BDD style assertions
should();

describe("/controllers/provider.js", () => {
  const database = {
    transaction: async (callback) => await callback(),
  };

  it("should create a ProviderController instance with the correct properties", async () => {
    // Create stubs for dependencies
    const models = { Provider: {}, ProviderKey: {} };

    // Call the function under test
    const controller = new ProviderController(models, database);

    // Assertions
    expect(controller).to.be.an.instanceOf(ProviderController);
  });

  // Test getAll
  it("should return all providers from the database", async () => {
    // Create stubs for dependencies
    const providers = [
      { id: 1, name: "Provider 1" },
      { id: 2, name: "Provider 2" },
    ];
    const models = { Provider: { findAll: sinon.stub().resolves(providers) } };

    // Call the function under test
    const controller = new ProviderController(models, database);
    const result = await controller.getAll();

    // Assertions
    expect(models.Provider.findAll.calledOnce).to.be.true;
    expect(result).to.deep.equal(providers);
  });

  // Test getById
  it("should return a provider by ID from the database", async () => {
    // Create stubs for dependencies
    const provider = { id: 1, name: "Provider 1" };
    const models = { Provider: { findByPk: sinon.stub().resolves(provider) } };

    // Call the function under test
    const controller = new ProviderController(models, database);
    const result = await controller.getById(1);

    // Assertions
    expect(models.Provider.findByPk.calledOnceWith(1)).to.be.true;
    expect(result).to.deep.equal(provider);
  });

  // Test getByKey
  it("should return a provider by key from the database", async () => {
    // Create stubs for dependencies
    const provider = { id: 1, name: "Provider 1", key: "test-key" };
    const models = { Provider: { findOne: sinon.stub().resolves(provider) } };

    // Call the function under test
    const controller = new ProviderController(models, database);
    const result = await controller.getByKey("test-key");

    // Assertions
    expect(models.Provider.findOne.calledOnceWith({ where: { key: "test-key" } })).to.be.true;
    expect(result).to.deep.equal(provider);
  });

  // Test getSecret
  it("should return the secret for an LTI provider", async () => {
    // Create stubs for dependencies
    const provider = { id: 1, name: "Provider 1", key: "test-key" };
    const providerKey = { key: "test-key", secret: "test-secret" };
    const models = {
      Provider: { findByPk: sinon.stub().resolves(provider) },
      ProviderKey: { findOne: sinon.stub().resolves(providerKey) },
    };

    // Call the function under test
    const controller = new ProviderController(models, database);
    const result = await controller.getSecret(1);

    // Assertions
    expect(models.Provider.findByPk.calledOnceWith(1)).to.be.true;
    expect(models.ProviderKey.findOne.calledOnceWith({ attributes: ["key", "secret"], where: { key: "test-key" } })).to
      .be.true;
    expect(result).to.deep.equal(providerKey);
  });

  it("should return null if the provider does not exist when getting the secret", async () => {
    // Create stubs for dependencies
    const models = { Provider: { findByPk: sinon.stub().resolves(null) } };

    // Call the function under test
    const controller = new ProviderController(models, database);
    const result = await controller.getSecret(1);

    // Assertions
    expect(models.Provider.findByPk.calledOnceWith(1)).to.be.true;
    expect(result).to.be.null;
  });

  it("should return null if the provider key does not exist when getting the secret", async () => {
    // Create stubs for dependencies
    const provider = { id: 1, name: "Provider 1", key: "test-key" };
    const models = {
      Provider: { findByPk: sinon.stub().resolves(provider) },
      ProviderKey: { findOne: sinon.stub().resolves(null) },
    };

    // Call the function under test
    const controller = new ProviderController(models, database);
    const result = await controller.getSecret(1);

    // Assertions
    expect(models.Provider.findByPk.calledOnceWith(1)).to.be.true;
    expect(models.ProviderKey.findOne.calledOnceWith({ attributes: ["key", "secret"], where: { key: "test-key" } })).to
      .be.true;
    expect(result).to.be.null;
  });

  const updatedProvider = {
    name: "Updated Provider",
    lti13: false,
    key: "updated-key",
    launch_url: "https://example.com/launch",
    domain: "example.com",
    custom: { custom1: "value1", custom2: "value2" },
    use_section: false,
    keyset_url: "https://example.com/keys",
    auth_url: "https://example.com/auth",
    redirect_urls: ["https://example.com/redirect"],
    scopes: ["scope1", "scope2"],
    claims: ["claim1", "claim2"],
  };

  // Test updateProvider
  it("should update a provider in the database", async () => {
    // Create stubs for dependencies
    const update = sinon.stub().resolves([1]);
    const provider = { id: 1, name: "Provider 1", key: "test-key", update: update };
    const models = {
      Provider: { findByPk: sinon.stub().resolves(provider) },
      ProviderKey: { update: sinon.stub().resolves([1]) },
    };

    // Call the function under test
    const controller = new ProviderController(models, database);
    const result = await controller.updateProvider(1, { ...updatedProvider });

    // Assertions
    expect(models.Provider.findByPk.calledOnceWith(1)).to.be.true;
    expect(update.calledOnceWith(updatedProvider)).to.be.true;
    // expect(
    //   models.ProviderKey.update.calledOnceWith(
    //     { key: "updated-key", secret: "updated-secret" },
    //     { where: { key: "test-key" }, transaction: sinon.match.any },
    //   ),
    // ).to.be.true;
    expect(result).to.deep.equal(provider);
  });

  // Provider update should not change the secret if the key is not updated and no new secret is provided
  it("should not update the provider secret if the key is not updated", async () => {
    // Create stubs for dependencies
    const update = sinon.stub().resolves([1]);
    const provider = { id: 1, name: "Provider 1", key: "test-key", update: update };
    const models = {
      Provider: { findByPk: sinon.stub().resolves(provider) },
      ProviderKey: { update: sinon.stub().resolves([1]) },
    };

    // Call the function under test
    const controller = new ProviderController(models, database);
    const result = await controller.updateProvider(1, { ...updatedProvider, key: "test-key" });

    // Assertions
    expect(models.Provider.findByPk.calledOnceWith(1)).to.be.true;
    expect(update.calledOnceWith({ ...updatedProvider, key: "test-key" })).to.be.true;
    expect(models.ProviderKey.update.notCalled).to.be.true;
    expect(result).to.deep.equal(provider);
  });

  it("should return null if the provider to update does not exist", async () => {
    // Create stubs for dependencies
    const models = { Provider: { findByPk: sinon.stub().resolves(null) } };

    // Call the function under test
    const controller = new ProviderController(models, database);
    const result = await controller.updateProvider(1, updatedProvider);

    // Assertions
    expect(models.Provider.findByPk.calledOnceWith(1)).to.be.true;
    expect(result).to.be.null;
  });

  // Create provider test
  const newProvider = {
    name: "New Provider",
    lti13: false,
    key: "new-key",
    launch_url: "https://example.com/launch",
    domain: "example.com",
    custom: { custom1: "value1", custom2: "value2" },
    use_section: false,
    keyset_url: "https://example.com/keys",
    auth_url: "https://example.com/auth",
    redirect_urls: ["https://example.com/redirect"],
    scopes: ["scope1", "scope2"],
    claims: ["claim1", "claim2"],
  };
  it("should create a new provider in the database", async () => {
    // Create stubs for dependencies
    const create = sinon.stub().resolves({ id: 1, ...newProvider });
    const models = {
      Provider: { create: create },
      ProviderKey: { create: sinon.stub().resolves({ key: "new-key", secret: "new-secret" }) },
    };

    // Call the function under test
    const controller = new ProviderController(models, database);
    const result = await controller.createProvider({ ...newProvider, secret: "new-secret" });

    // Assertions
    expect(create.calledOnceWith(newProvider)).to.be.true;
    expect(
      models.ProviderKey.create.calledOnceWith(
        { key: "new-key", secret: "new-secret", public: sinon.match.string, private: sinon.match.string },
        { transaction: sinon.match.any },
      ),
    ).to.be.true;
    expect(result).to.deep.equal({ id: 1, ...newProvider });

    // Additional assertions for generated keys can be added here if needed
    // Assertions
    // Check that the generated key is a valid RSA keypair (public and secret)
    const generatedPublicKey = models.ProviderKey.create.firstCall.args[0].public;
    const generatedSecret = models.ProviderKey.create.firstCall.args[0].private;
    // Check that the generated keys are in the expected format
    expect(generatedPublicKey).to.be.a("string");
    expect(generatedSecret).to.be.a("string");
    expect(generatedPublicKey).to.include("BEGIN PUBLIC KEY");
    expect(generatedSecret).to.include("BEGIN RSA PRIVATE KEY");
  });

  // Delete provider test
  it("should delete a provider from the database", async () => {
    // Create stubs for dependencies
    const destroy = sinon.stub().resolves(1);
    const provider = { id: 1, name: "Provider 1", key: "test-key", destroy: destroy };
    const models = {
      Provider: { findByPk: sinon.stub().resolves(provider) },
      ProviderKey: { destroy: sinon.stub().resolves(1) },
    };

    // Call the function under test
    const controller = new ProviderController(models, database);
    const result = await controller.deleteProvider(1);

    // Assertions
    expect(models.Provider.findByPk.calledOnceWith(1)).to.be.true;
    expect(models.ProviderKey.destroy.calledOnceWith({ where: { key: "test-key" }, transaction: sinon.match.any })).to
      .be.true;
    expect(destroy.calledOnceWith({ transaction: sinon.match.any })).to.be.true;
    expect(result).to.be.true;
  });

  // Delete provider should return null if provider does not exist
  it("should return null if the provider to delete does not exist", async () => {
    // Create stubs for dependencies
    const models = { Provider: { findByPk: sinon.stub().resolves(null) } };

    // Call the function under test
    const controller = new ProviderController(models, database);
    const result = await controller.deleteProvider(1);

    // Assertions
    expect(models.Provider.findByPk.calledOnceWith(1)).to.be.true;
    expect(result).to.be.null;
  });
});
