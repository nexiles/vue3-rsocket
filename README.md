# vue3-rsocket

## What is RSocket?

Check out the official docs: [RSocket Docs](https://rsocket.io/docs/)

> Most interesting:
>>Network communication is asynchronous. The RSocket protocol embraces
>>this and models all communication as multiplexed streams of messages
>>over a single network connection, and never synchronously blocks while
>>waiting for a response

This library for **vue3** enables to easily connect to an RSocket server and react on incoming messages.

Currently, only **requestStream** is supported. But this could be easily extended. Feel free to open a PR.

## Motivation

The goal of this library is to wrap the functionality of [rsocket-js](https://github.com/rsocket/rsocket-js)
in an easy-to-use plugin for Vue 3.

An example implementation of RSocket using a SpringCloud Gateway can be found
[here](https://github.com/nexiles/spring-cloud-gateway-rsocket-websocket).

## Example

:building_construction: Add an example project using this library

## :floppy_disk: Installation

```shell
yarn add vue3-rsocket
```
or
```shell
npm install --save vue3-rsocket
```

## :gear: Setup

For all possible configuration values have look at `src/classes/RSocketConfig.ts`.

### [Vue 3]((https://v3.vuejs.org/))

:building_construction: Add setup instructions for vue3 project

### [Quasar](https://quasar.dev/)

#### JWT

```javascript
import { boot } from "quasar/wrappers";
import { Vue3RSocket, BearerAuth, RSocketConfig } from "vue3-rsocket";

export default boot(async ({ app }) => {

  const rSocketConfig = new RSocketConfig({
    url: `ws://localhost:8070/server/rsocket`,
    authFn: async () => new BearerAuth(token).asAuthentication(),
    debug: true
  });

  await app.use(Vue3RSocket, rSocketConfig);
});
```

#### Basic auth

```javascript
import { boot } from "quasar/wrappers";
import { Vue3RSocket, UserAuth, RSocketConfig } from "vue3-rsocket";

export default boot(async ({ app }) => {

  const rSocketConfig = new RSocketConfig({
    url: `ws://localhost:8070/server/rsocket`,
    authFn: async () => new UserAuth("username", "password").asAuthentication(),
    debug: true
  })

  await app.use(Vue3RSocket, rSocketConfig);
});
```

## :envelope: Usage

 ```javascript
<script>
import { onBeforeUnmount, inject } from "vue";
import { RequestStreamInformation } from "vue3-rsocket";

export default {
  setup() {
    const rs = inject("vue3-rsocket");

    rs.requestStream("route", (data) => console.log(data));

    rs.requestStream(
      "routeWithMetadata",
      (data) => console.log(data),
      new RequestStreamInformation({
        data: "Hey",
        metaData: { requester: "Fred Flintstone" },
      })
    );

    // Unsubschribe before component is destroyed.
    onBeforeUnmount(() => {
      rs.cancelRequestStream("route");
      rs.cancelRequestStream("routeWithMetadata");
    });
  },
};
</script>
```

## Development

We currently use *Yarn v1* for this project (v1 to not break dependency updated provided by dependabot).

To build the project hit:

```shell
yarn && yarn build
```

all generated filed will then be located in `dist/`.

---

To build when something in `src/` changed, use:

```shell
yarn dev
```

and to test it in your desired project hit `yarn link {{absolute-path-to}}/vue3-rsocket`.

## Next up

- [x] Add dependabot
- [ ] Add Vue setup example
- [ ] Add full example project with front and backend
- [ ] Expose more configuration parameters
- [ ] Implement local subscriptions
- [ ] Implement more than the *request-stream* interaction model

## Disclaimer

We are pretty new to *RSocket* and library publishing, so this code or the bundling process might not be optimized,
suggestions are welcome. Also, we are pretty new to *TypeScript*, so this code might not be in the best shape possible.

## :handshake: Contributing

**Every contribution is highly appreciated!**
