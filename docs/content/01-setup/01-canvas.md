---
title: "Installing Canvas"
pre: "1. "
weight: 10
---

## References

* https://github.com/instructure/canvas-lms/wiki/Quick-Start
* https://github.com/instructure/canvas-lms/blob/master/doc/docker/developing_with_docker.md

## Requirements

This was configured for my local development machine. It has the following already installed/configured:

* Ubuntu 24.04 LTS
* Docker: https://docs.docker.com/engine/install/ubuntu/
  * The local user account was already added to the `docker` group
* A working Traefik proxy configured for `home.russfeld.me` with Let's Encrypt SSL certificates enabled: https://traefik.io/traefik/
* A world-routable DNS name `home.russfeld.me` directed to the IP address of the system
  * Since this is running at home, it is port-forwarded through my local router and I use a Dynamic DNS system to keep this up to date
  * A world-routable DNS name is required when testing some external LTI tools - `localhost` **will not** work
  * Other options might be [ngrok](https://ngrok.com/) or another VPN

There may have been other tools installed earlier that I did not account for here.

## Steps

1. Clone Repository

```bash {title="terminal"}
$ git clone git@github.com:instructure/canvas-lms.git
```

2. Modify Setup Script

The setup script insists that Docker Compose be installed separately; it is now part of the default Docker installation on Ubuntu and does not appear as a separate item on my system. So, it can be removed from the setup script.

```diff {title="script/common/os/linux/dev_setup.sh"}
#!/bin/bash
source script/common/utils/common.sh
source script/common/os/linux/impl.sh
source script/common/utils/dory_setup.sh
- dependencies='docker,docker-compose 1.20.0'
+ dependencies='docker'
DOCKER_COMMAND="docker compose"

message "It looks like you're using Linux. Let's set that up."
```

3. Export Environment Settings

My development environment seems to require these settings:

```bash {title="terminal"}
$ export DOCKER_BUILDKIT=0
$ export COMPOSE_DOCKER_CLI_BUILD=0
```

4. Set Gemfile Permissions

There are several file permission errors that will crop up during the build. The best fix is to give Canvas user permission to all files in the build folder via `setfacl`:

```bash {title="terminal"}
$ setfacl -Rm u:9999:rwX,g:9999:rwX .
$ setfacl -dRm u:9999:rwX,g:9999:rwX .
```

**Discussion:**

* https://github.com/instructure/canvas-lms/issues/1221
* https://github.com/instructure/canvas-lms/issues/1649 _(I used this solution)_
* https://github.com/instructure/canvas-lms/issues/2199 

5. Run Setup Script

```bash {title="terminal"}
$ ./script/docker_dev_setup.sh
```

Setup options:

* Would you like to skip dory? **yes** _(we will use Traefik)_
* OK to run 'cp docker-compose/config/*.yml config/'? **yes** _(you may not want to do this a second time if you've made edits)_
* Do you want to drop and create new or migrate existing? **drop** _(you may want to use **migrate** on future runs)_
* What email address will the site administrator account use? **canvasadmin@russfeld.me**
* What password will the site administrator use? **[random password here]**
* What do you want users to see as the account name? This should probably be the name of your organization. **ALT+CS Lab**
* To help our developers better serve you, Instructure would like to collect some usage data about your Canvas installation. You can change this setting at any time. **3. Opt out completely**

6. Notes from the end of the installation process:

```txt
  Running Canvas:

    docker compose up -d
    open http://canvas.docker

  Running the tests:

    docker compose run --rm web bundle exec rspec

   Running Selenium tests:

    add docker-compose/selenium.override.yml in the .env file
      echo ':docker-compose/selenium.override.yml' >> .env

    build the selenium container
      docker compose up -d selenium-hub

    run selenium
      docker compose run --rm web bundle exec rspec spec/selenium

    Virtual network remote desktop sharing to selenium container
      for Firefox:
        $ open vnc://secret:secret@seleniumff.docker
      for chrome:
        $ open vnc://secret:secret@seleniumch.docker:5901

  I'm stuck. Where can I go for help?

    FAQ:           https://github.com/instructure/canvas-lms/wiki/FAQ
    Dev & Friends: http://instructure.github.io/
    Canvas Guides: https://guides.instructure.com/
    Vimeo channel: https://vimeo.com/canvaslms
    API docs:      https://canvas.instructure.com/doc/api/index.html
    Mailing list:  http://groups.google.com/group/canvas-lms-users
    IRC:           https://web.libera.chat/#canvas-lms

    Please do not open a GitHub issue until you have tried asking for help on
    the mailing list or IRC - GitHub issues are for verified bugs only.
    Thanks and good luck!
  

  \o/ Success!
```

7. Edit Configuration Files

**Domain Configuration**

```yml {title="config/domain.yml"}
production:
  domain: "canvas.home.russfeld.me"

test:
  domain: localhost

development:
  domain: "canvas.home.russfeld.me"
```

**Email Configuration**

```yml {title="config/outgoing_mail.yml"}
production: &production
  address: mailcatcher
  port: 1025
  domain: canvas.home.russfeld.me
  outgoing_address: canvas@russfeld.me
  default_name: ALT+CS Lab Canvas

development:
  <<: *production
```

**Security Configuration**

```yml {title="config/security.yml"}
production: &default
  encryption_key: <%= ENV["ENCRYPTION_KEY"] %>
  lti_iss: 'https://canvas.home.russfeld.me'

development:
  <<: *default

test:
  <<: *default
```

8. Enable Mailcatcher

Enable the Mailcatcher service by adding it to the .env file:

```env {title=".env"}
COMPOSE_FILE=docker-compose.yml:docker-compose.override.yml:docker-compose/mailcatcher.override.yml
```

**Discussion**

* https://github.com/instructure/canvas-lms/blob/master/doc/docker/developing_with_docker.md#mail-catcher

9. Update Docker Compose Files

This will set the Traefik tags for each container and other options. 

**Main Docker Compose**

```diff {title="docker-compose.override.yml"}
web:
    <<: *BASE
    environment:
      <<: *BASE-ENV
-     VIRTUAL_HOST: .canvas.docker
+     VIRTUAL_HOST: .canvas.home.russfeld.me
      HTTPS_METHOD: noredirect
      # AR_QUERY_TRACE: 'true'
      # AR_QUERY_TRACE_TYPE: 'all' # 'all', 'write', or 'read'
      # AR_QUERY_TRACE_LINES: 10
      # DISABLE_N_PLUS_ONE_DETECTION: 'false'
+   # @russfeld
+   networks:
+     - traefik
+     - default
+   labels:
+     # +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
+     # Traefik Labels - see https://doc.traefik.io/traefik/routing/providers/docker/
+     # Traefik Enable
+     - "traefik.enable=true"
+     # Docker Network
+     - "traefik.docker.network=traefik"
+     # Routing Rule
+     - "traefik.http.routers.canvas.rule=Host(`canvas.home.russfeld.me`)"
+     # Enable TLS
+     - "traefik.http.routers.canvas.tls=true"
+     # TLS Certificate Resolver
+     - "traefik.http.routers.canvas.tls.certresolver=letsencrypt"
+     # +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

+#Bottom of the file
+networks:
+ traefik:
+   external: true
```

**Mailcatcher Docker Compose**

```diff {title="docker-compose/mailcatcher.override.yml"}
services:
  web:
    links:
      - mailcatcher

  mailcatcher:
    image: instructure/mailcatcher
    environment:
-     VIRTUAL_HOST: mail.canvas.docker
+     VIRTUAL_HOST: mail.home.russfeld.me
      VIRTUAL_PORT: 8080
+   # @russfeld
+   networks:
+     - traefik
+     - default
+   labels:
+     # +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
+     # Traefik Labels - see https://doc.traefik.io/traefik/routing/providers/docker/
+     # Traefik Enable
+     - "traefik.enable=true"
+     # Docker Network
+     - "traefik.docker.network=traefik"
+     # Routing Rule
+     - "traefik.http.routers.mailcatcher.rule=Host(`mail.home.russfeld.me`)"
+     # Change Port
+     - "traefik.http.services.mailcatcher.loadbalancer.server.port=8080"
+     # Enable TLS
+     - "traefik.http.routers.mailcatcher.tls=true"
+     # TLS Certificate Resolver
+     - "traefik.http.routers.mailcatcher.tls.certresolver=letsencrypt"
+     # +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

+#Bottom of the file
+networks:
+ traefik:
+   external: true
```

10. Start the Server

```bash {title="terminal"}
$ docker compose up -d
```