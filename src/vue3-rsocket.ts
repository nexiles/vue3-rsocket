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
    MESSAGE_RSOCKET_ROUTING,
    RSocketClient,
} from "rsocket-core";
import { ConnectionStatus, ReactiveSocket } from "rsocket-types";
import { AuthenticationType } from "./Authentication";
import { Buffer } from "buffer";
import RSocketSetup from "./RSocketSetup";
import RSocketConnectionStatus from "./RSocketConnectionStatus";

const JAVA_MAX_SAFE_INTEGER = 2147483647;

let _rSocketConnectionStatus: RSocketConnectionStatus = undefined;
let _rsSetup: RSocketSetup;
let _rsClient: RSocketClient<any, Buffer>;
let _rsConnection: ReactiveSocket<any, Buffer>;
let _vueInstance;

/**
 * encode the auth and route metadata as required by the protocol spec
 * @param auth
 * @param route
 * @param customMetadata
 * @returns {*}
 * @private
 */
function _encodeMetaData(auth, route: string, customMetadata) {
    const metadata = [];

    if (auth) {
        const authType = auth.authType;

        if (authType === AuthenticationType.BEARER) {
            const bearerToken = auth.authData.value;
            metadata.push([
                MESSAGE_RSOCKET_AUTHENTICATION,
                encodeBearerAuthMetadata(bearerToken),
            ]);
        } else if (authType === AuthenticationType.BASIC) {
            const user = auth.authData;
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

function isDebug() {
    return _rsSetup.debug;
}

/**
 * Setup the rsocket websocket client connection to the server
 * @returns {Promise<{install: install}>} Return install function required for Vue
 */
async function createRSocket(setup) {
    _rsSetup = setup;
    const options = {
        setup: {
            keepAlive: setup.keepAlive,
            lifetime: setup.lifetime,
            dataMimeType: setup.dataMimeType,
            metadataMimeType: setup.metadataMimeType,
            payload: {
                data: setup.payLoadData,
                metadata: await _encodeMetaData(await setup.auth(), undefined, undefined),
            },
        },
        transport: new RSocketWebSocketClient(
            { url: setup.url, debug: setup.debug },
            BufferEncoders
        ),
    };

    function install(app) {
        app.config.globalProperties.$rs_subscriptions = new Map();

        _vueInstance = app;
        _rsClient = new RSocketClient(options);
    }

    return {
        install,
    };
}

type onConnectionStatusChange = (status: RSocketConnectionStatus) => void;

/**
 * Connect to the RSocket server and subscribe to the connection status
 * @param {(RSocketConnectionStatus) => {}} onConnectionStatusChange Function executed when a connection status changes
 * @returns {Promise<*>} connection
 */
async function connect(onConnectionStatusChange) {
    if (_rsConnection) throw new Error(`Already connected to: ${_rsSetup.url}`);

    try {
        if (isDebug()) console.log(`Connecting to: ${_rsSetup.url}`);
        _rsConnection = await _rsClient.connect();
    } catch (e) {
        throw new Error("Unable to connect to RSocket server");
    }

    try {
        _rsConnection
            .connectionStatus()
            .subscribe((connectionStatus: ConnectionStatus) => {
                _rSocketConnectionStatus = new RSocketConnectionStatus(connectionStatus);
                if (isDebug())
                    console.log(
                        `RSocket connection status: ${_rSocketConnectionStatus.getKind()}`
                    );

                onConnectionStatusChange(_rSocketConnectionStatus);
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

    if (!_rSocketConnectionStatus.isConnected())
        throw new Error("Could not subscribe. Not connected");

    if (typeof onMessage !== "function")
        throw new Error("Invalid parameter. onMessage is not a function");

    if (isDebug()) console.log(`Subscribing to route: ${route}`);
    _rsConnection
        .requestStream({
            metadata: await _encodeMetaData(await _rsSetup.auth(), route, customMetadata),
        })
        .subscribe({
            onComplete: () => {
                if (isDebug()) console.log("Subscription completed");
            },
            onError: (error) => {
                console.log(error.message);
            },
            onNext: (value) => {
                const data = JSON.parse(value.data);
                const metadata = value.metadata
                    ? JSON.parse(value.metadata.toString())
                    : undefined;

                if (isDebug()) {
                    const prettyData = JSON.stringify(data);
                    const prettyMetadata = JSON.stringify(metadata);
                    console.log(
                        `Receiving message on route "${route}" data: ${prettyData} metadata: ${prettyMetadata}`
                    );
                }
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

                if (isDebug()) console.log(`Add "${route}" to subscribed routes`);
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
        if (isDebug()) console.log(`No subscription for route: ${route}`);
        return;
    }

    if (isDebug()) console.log(`Canceling subscription to route: ${route}`);
    _vueInstance.config.globalProperties.$rs_subscriptions.get(route).cancel();

    if (isDebug()) console.log(`Remove "${route}" from subscribed routes`);
    _vueInstance.config.globalProperties.$rs_subscriptions.delete(route);
}

/**
 * Expose functions to interact with a rsocket server
 * @returns {{subscribe: ((function(string, Function, Object=): Promise<void>)|*), unsubscribe: unsubscribe, isConnected: boolean, connect: (function(function(status): {}=): *)}}
 */
function useRSocket() {
    return {
        connect,
        subscribe,
        unsubscribe,
    };
}

export { createRSocket, useRSocket };
