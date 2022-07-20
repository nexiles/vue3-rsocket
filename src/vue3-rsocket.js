/*
 * MIT License
 *
 * Copyright (c) 2022 nexiles GmbH
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

import RSocketWebSocketClient from "rsocket-websocket-client";
import {
    APPLICATION_JSON,
    BufferEncoders,
    encodeBearerAuthMetadata,
    encodeCompositeMetadata,
    encodeRoute,
    encodeSimpleAuthMetadata,
    JsonSerializer,
    MESSAGE_RSOCKET_AUTHENTICATION,
    MESSAGE_RSOCKET_COMPOSITE_METADATA,
    MESSAGE_RSOCKET_ROUTING,
    RSocketClient,
} from "rsocket-core/build";
import { authentication } from "./auth";

const JAVA_MAX_SAFE_INTEGER = 2147483647;

let isConnected = false;
let _rsClient;
let _rsConnection;
let _url;
let _authFn;
let _debug;
let _vueInstance;

/**
 * encode the auth and route metadata as required by the protocol spec
 * @param auth
 * @param route
 * @param customMetadata
 * @returns {*}
 * @private
 */
function _encodeMetaData(auth, route, customMetadata) {
    const metadata = [];

    if (auth) {
        if (auth.authType === authentication.BEARER) {
            metadata.push([
                MESSAGE_RSOCKET_AUTHENTICATION,
                encodeBearerAuthMetadata(auth.value),
            ]);
        } else if (auth.authType === authentication.BASIC) {
            const user = auth.value;
            metadata.push([
                MESSAGE_RSOCKET_AUTHENTICATION,
                encodeSimpleAuthMetadata(user.username, user.password),
            ]);
        }
    }

    if (route) metadata.push([MESSAGE_RSOCKET_ROUTING, encodeRoute(route)]);

    if (customMetadata)
        metadata.push([
            APPLICATION_JSON,
            Buffer.from(JsonSerializer.serialize(customMetadata)),
        ]);

    return encodeCompositeMetadata(metadata);
}

/**
 * Setup the rsocket websocket client connection to the server
 * @param {string} url The URL of the server
 * @param {() => Auth} authFn Function used to generate the Auth-object used to authenticate to the server
 * @param {boolean} debug Enable debug mode
 * @returns {Promise<{install: install}>} Return install function required for Vue
 */
async function createRSocket({
    url = "wss://localhost:7000",
    authFn = () => {},
    debug = false,
}) {
    _url = url;
    _authFn = authFn;
    _debug = debug;
    const options = {
        setup: {
            // ms btw sending keepalive to server
            keepAlive: 60000,
            // ms timeout if no keepalive response
            lifetime: 180000,
            // format of `data`
            dataMimeType: "application/json",
            // format of `metadata`
            metadataMimeType: MESSAGE_RSOCKET_COMPOSITE_METADATA.string,
            // payload
            payload: {
                data: undefined,
                metadata: _encodeMetaData(await authFn()),
            },
        },
        transport: new RSocketWebSocketClient({ url }, BufferEncoders),
    };

    function install(app) {
        if (install.installed) return;
        install.installed = true;

        app.config.globalProperties.$rs_subscriptions = new Map();

        _vueInstance = app;
        _rsClient = new RSocketClient(options);
    }

    return {
        install,
    };
}

/**
 * Connect to the RSocket server and subscribe to the connection status
 * @param {(status) => {}} onStateChange Function executed on a connection state change
 * @returns {Promise<*>} connection
 */
async function connect(onStateChange = (status) => {}) {
    if (_rsConnection) throw new Error(`Already connected to: ${_url}`);

    try {
        if (_debug) console.log(`Connecting to: ${_url}`);
        _rsConnection = await _rsClient.connect();
    } catch (e) {
        throw new Error("Unable to connect to RSocket server");
    }

    try {
        _rsConnection.connectionStatus().subscribe((status) => {
            if (_debug) console.log(`RSocket connection status: ${status.kind}`);
            onStateChange(status);

            isConnected = status.kind === "CONNECTED";
        });
    } catch (e) {
        throw new Error("Unable to subscribe to connectionStatus");
    }

    return _rsConnection;
}

/**
 * Subscribe to a given route.
 * @param {string} route Route to subscribe to.
 * @param {function} onMessage Callback to execute on every message.
 * @param {object?} customMetadata Provide custom metadata to a subscription
 * @returns {Promise<void>}
 */
async function subscribe(route, onMessage, customMetadata = {}) {
    if (!_rsConnection) throw new Error("Could not subscribe. No connection found");

    if (!isConnected) throw new Error("Could not subscribe. Not connected");

    if (typeof onMessage !== "function")
        throw new Error("Invalid parameter. onNext is not a function");

    if (_debug) console.log(`Subscribing to route: ${route}`);
    await _rsConnection
        .requestStream({
            metadata: _encodeMetaData(await _authFn(), route, customMetadata),
        })
        .subscribe({
            onComplete: (socket) => console.log({ socket }),
            onError: (error) => console.error({ error }),
            onNext: (value) => {
                const data = JSON.parse(value.data);
                const metadata = JSON.parse(value.metadata);

                if (_debug)
                    console.log(
                        `Receiving message on route "${route}"
          data: ${JSON.stringify(data)}
          metadata: ${JSON.stringify(metadata)}`
                    );
                onMessage(data, metadata);
            },
            onSubscribe: (sub) => {
                if (_vueInstance.config.globalProperties.$rs_subscriptions.has(route)) {
                    console.warn(
                        `Multiple subscription for route: ${route}, closing new subscription`
                    );
                    sub.cancel();
                    return;
                }

                if (_debug) console.log(`Add "${route}" to subscribed routes`);
                _vueInstance.config.globalProperties.$rs_subscriptions.set(route, sub);
                sub.request(JAVA_MAX_SAFE_INTEGER);
            },
        });
}

/**
 * Cancel the subscription to a given route.
 * @param {string} route Route to unsubscribe from.
 */
function unsubscribe(route) {
    if (!_vueInstance.config.globalProperties.$rs_subscriptions?.has(route)) {
        if (_debug) console.log(`No subscription for route: ${route}`);
        return;
    }

    if (_debug) console.log(`Canceling subscription to route: ${route}`);
    _vueInstance.config.globalProperties.$rs_subscriptions.get(route).cancel();

    if (_debug) console.log(`Remove "${route}" from subscribed routes`);
    _vueInstance.config.globalProperties.$rs_subscriptions.delete(route);
}

/**
 * Expose functions to interact with a rsocket server
 * @returns {{subscribe: ((function(string, Function, Object=): Promise<void>)|*), unsubscribe: unsubscribe, isConnected: boolean, connect: (function(function(status): {}=): *)}}
 */
function useRSocket() {
    return {
        isConnected,
        connect,
        subscribe,
        unsubscribe,
    };
}

export { createRSocket, useRSocket };
