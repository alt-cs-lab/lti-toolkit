---
title: "Developing"
pre: "0. "
weight: 5
---

This guide covers setting up a development environment for the LTI Toolkit library and its example applications using the provided Dev Container. All development is expected to happen inside the container — a bare local Node.js installation is not documented or recommended.

## Requirements

The following must be in place on the host machine before opening the Dev Container:

* [Docker Engine](https://docs.docker.com/engine/install/) (or Docker Desktop) — the local user should be in the `docker` group
* [VS Code](https://code.visualstudio.com/) with the [Dev Containers extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers), or any other editor that supports the Dev Containers spec
* A Traefik reverse proxy attached to an external Docker network named `traefik`, with a world-routable DNS name and TLS certificates configured via Let's Encrypt
  * See [Traefik documentation](https://doc.traefik.io/traefik/) for setup instructions
  * A world-routable domain is required because LTI launches from Canvas (and most other LMS systems) will not reach `localhost` or private IPs — see the [Canvas Installation]({{%relref "01-canvas"%}}) page for more context on this requirement
  * Options for a world-routable endpoint include a home server with port forwarding and dynamic DNS, a cloud VM, or a tunnel service such as [ngrok](https://ngrok.com/) or [Cloudflare Tunnel](https://www.cloudflare.com/products/tunnel/)

## 1. Clone the Repository

```bash {title="terminal"}
$ git clone git@github.com:alt-cs-lab/lti-toolkit.git
$ cd lti-toolkit
```

## 2. Configure the Dev Container

Two files need to be customized before opening the container.

### compose.yml

`.devcontainer/compose.yml` contains the Traefik routing labels. Replace the domain names with your own subdomains. The provider example listens on port `3000` and the consumer example on port `3001`.

```diff {title=".devcontainer/compose.yml"}
      # Routing Rule
-     - "traefik.http.routers.ltitool.rule=Host(`ltitool.home.russfeld.me`)"
+     - "traefik.http.routers.ltitool.rule=Host(`ltitool.yourdomain.tld`)"
      ...
      # Routing Rule
-     - "traefik.http.routers.ltilms.rule=Host(`ltilms.home.russfeld.me`)"
+     - "traefik.http.routers.ltilms.rule=Host(`ltilms.yourdomain.tld`)"
```

The router names (`ltitool`, `ltilms`) can also be changed if they conflict with existing Traefik routes.

### devcontainer.json

`.devcontainer/devcontainer.json` includes a `mounts` entry that bind-mounts the host's GPG keyring into the container, enabling GPG-signed commits from inside VS Code. Update the source path to match your host username:

```diff {title=".devcontainer/devcontainer.json"}
-  "mounts": ["source=/home/youboon2/.gnupg,target=/home/node/.gnupg,type=bind,consistency=cached"]
+  "mounts": ["source=/home/YOUR_USERNAME/.gnupg,target=/home/node/.gnupg,type=bind,consistency=cached"]
```

If you do not use GPG-signed commits, remove the `mounts` line entirely.

## 3. Open in the Dev Container

In VS Code, open the repository folder and when prompted, click **Reopen in Container** (or run **Dev Containers: Reopen in Container** from the command palette). On first open, Docker will build the container image and run `npm install` automatically via the `postCreateCommand`.

The container image is based on `javascript-node:24-trixie` and includes:
* Node.js 24
* Go (required by Hugo)
* Hugo `0.148.1` (for the documentation site)
* VS Code extensions: SQLite Viewer, Draw.io Integration

## 4. Configure the Example Applications

Each example app has its own environment file. Copy the example and fill in your values.

### Tool Provider (`examples/provider`)

```bash {title="terminal"}
$ cp examples/provider/.env.example examples/provider/.env
```

Key values to set:

| Variable | Description |
|---|---|
| `SESSION_SECRET` | Any random string for Express session signing |
| `DOMAIN_NAME` | Full URL of the provider (e.g. `https://ltitool.yourdomain.tld`) |
| `ADMIN_EMAIL` | Contact email shown in LTI config XML |
| `LTI_ENCRYPTION_KEY` | 64-character hex key — generate with `openssl rand -hex 32` |
| `LTI_CONSUMER_KEY` | LTI 1.0 shared key seeded at startup (can be any string) |
| `LTI_CONSUMER_SECRET` | LTI 1.0 shared secret seeded at startup (can be any string) |
| `ADMIN_PASSWORD` | Password for HTTP Basic Auth on admin routes |
| `LTI_13_LMS_DOMAIN` | Base URL of your LMS (e.g. `https://canvas.instructure.com`) |
| `LOG_LEVEL` | Logging verbosity — `lti` is recommended for development |

### Tool Consumer (`examples/consumer`)

```bash {title="terminal"}
$ cp examples/consumer/.env.example examples/consumer/.env
```

Key values to set:

| Variable | Description |
|---|---|
| `SESSION_SECRET` | Any random string for Express session signing |
| `DOMAIN_NAME` | Full URL of the consumer (e.g. `https://ltilms.yourdomain.tld`) |
| `ADMIN_EMAIL` | Contact email |
| `LTI_ENCRYPTION_KEY` | 64-character hex key — generate with `openssl rand -hex 32` |
| `ADMIN_PASSWORD` | Password for HTTP Basic Auth on admin routes |
| `DEPLOYMENT_NAME` | Human-readable name for this LMS deployment |
| `DEPLOYMENT_ID` | Identifier string for this deployment |

## 5. Install Example Dependencies

The root `npm install` (run automatically on container creation) only installs library dependencies. Each example app needs its own install:

```bash {title="terminal"}
$ cd examples/provider && npm install
$ cd ../consumer && npm install
```

## 6. Run the Example Applications

Each example has a `dev` script that uses `nodemon` for automatic reloading on file changes.

```bash {title="terminal"}
# In one terminal
$ cd examples/provider && npm run dev

# In a second terminal
$ cd examples/consumer && npm run dev
```

* Provider is available at `http://localhost:3000` inside the container and at `https://ltitool.yourdomain.tld` externally via Traefik
* Consumer is available at `http://localhost:3001` inside the container and at `https://ltilms.yourdomain.tld` externally via Traefik

The SQLite database for each app is created automatically on first run in the app's root directory (`examples/provider/database.sqlite`, `examples/consumer/database.sqlite`). To reset all state, stop the server and delete the file.

## 7. Run the Library Tests

From the repository root:

```bash {title="terminal"}
# Run tests only
$ npm test

# Run tests with coverage report (output written to docs/static/coverage/)
$ npm run cov
```

The test suite requires 100% code coverage to pass. Coverage reports are generated as HTML in `docs/static/coverage/` and can be browsed at `/coverage/` on the running documentation site.

## 8. Run the Documentation Site

Hugo is installed in the container. From the `docs/` directory:

```bash {title="terminal"}
$ cd docs
$ hugo server --bind 0.0.0.0
```

The `--bind 0.0.0.0` flag is needed to make the server reachable via VS Code's port forwarding. VS Code will prompt to forward port `1313` — open the forwarded URL in your browser to browse the docs locally. The site hot-reloads on file changes.

## 9. Linting and Formatting

```bash {title="terminal"}
# Auto-fix lint issues
$ npm run lint

# Auto-format with Prettier
$ npm run format
```

Both are run automatically as part of the `preversion` hook when cutting a release, but can be run at any time during development.

## Project Structure Summary

| Path | Contents |
|---|---|
| `src/` | Library source code |
| `test/` | Unit tests (mirrors `src/` structure) |
| `examples/provider/` | Tool Provider example app |
| `examples/consumer/` | Tool Consumer example app |
| `docs/` | Hugo documentation site |
| `docs/content/` | Documentation markdown files |
| `docs/static/coverage/` | Generated coverage report (gitignored until release) |
| `index.js` | Library entry point |
| `index.d.ts` | TypeScript type declarations |
