# vue3-rsocket

## What is RSocket?

Check out the official docs: [RSocket Docs](https://rsocket.io/docs/)

> Most interesting:
>>Network communication is asynchronous. The RSocket protocol embraces
>>this and models all communication as multiplexed streams of messages
>>over a single network connection, and never synchronously blocks while
>>waiting for a response

This library for **vue3** enables to easily subscribe to a RSocket server and react on incoming messages.

## Motivation

The goal of this library is to wrap the functionality of [rsocket-js](https://github.com/rsocket/rsocket-js) in an easy-to-use plugin for Vue 3.
An example implementation of RSocket using a SpringCloud Gateway can be found [here](https://github.com/nexiles/spring-cloud-gateway-rsocket-websocket).

## Example
>TODO: Add an example project using this library

## Installation
```shell
yarn add vue3-rsocket
```
or
```shell
npm install --save vue3-rsocket
```

## Setup

### [Vue 3]((https://v3.vuejs.org/))
>TODO: Add setup instructions for vue3 project

### [Quasar](https://quasar.dev/)

#### JWT
```javascript
import { boot } from "quasar/wrappers";
import { createRSocket, useRSocket, Auth, authentication } from "vue3-rsocket";

export default boot(async ({ app }) => {

  const rSocket = await createRSocket({
    // Set the URL of the RSocket server.
    // "WS" and "WSS" are the supported protcols
    url: `ws://localhost:8070/server/rsocket`,

    // Function returning an Auth object.
    authFn: async () =>
      new Auth(
        authentication.BEARER,
        token
      ),

    debug: true
  });

  app.use(rSocket);

  const rs = useRSocket();
  await rs.connect();
});
```

#### Basic auth

```javascript
import { boot } from "quasar/wrappers";
import { createRSocket, useRSocket, Auth, authentication, User } from "vue3-rsocket";

export default boot(async ({ app }) => {

  const rSocket = await createRSocket({
    url: `ws://localhost:8070/server/rsocket`,

    authFn: async () =>
      new Auth(
        authentication.BASIC,
        new User("username", "password")
      ),

    debug: true
  });

  app.use(rSocket);

  const rs = useRSocket();
  await rs.connect();
});
```

## Usage
> _Only one active subscription per route is allowed._
 ```javascript
<script>
import { onBeforeUnmount } from "vue";
import { useRSocket } from "vue3-rsocket";

export default {
  setup() {
    const rs = useRSocket();

    rs.subscribe("route", (data) => {
      console.log(data);
    });

    rs.subscribe(
      "routeWithMetadata",
      (data) => {
        console.log(data)
      },
      { key: "value" }
    );

    // Unsubschribe before component is destroyed.
    onBeforeUnmount(() => {
      rs.unsubscribe("route");
      rs.unsubscribe("routeWithMetadata");
    });
  },
};
</script>
```
## Next up

- [ ] Add dependabot
- [ ] Add Vue setup example
- [ ] Add full example project with front and backend
- [ ] Expose more configuration parameters
- [ ] Implement local subscriptions
- [ ] Implement more than the *request/stream* interaction model

## Disclaimer

We are pretty new to RSocket and library publishing, so this code or the bundling process might not be optimized, suggestions are welcome.

## Contributing

Every contribution is highly appreciated!
