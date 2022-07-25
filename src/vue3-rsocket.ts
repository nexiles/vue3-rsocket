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
import { AuthenticationType } from "./classes/Authentication";
import { Buffer } from "buffer";
import RSocketSetup from "./classes/RSocketSetup";
import RSocketConnectionStatus from "./classes/RSocketConnectionStatus";
import RSocketMessage from "./classes/RSocketMessage";
import RequestStreamInformation from "./classes/RequestStreamInformation";
import { ISubscription } from "rsocket-types/ReactiveStreamTypes";
import OnMessage from "./types/OnMessage";
import OnConnectionStatusChange from "./types/OnConnectionStatusChange";

class Vue3Rsocket {
    private rSocketConnectionStatus: RSocketConnectionStatus = undefined;
    private rsSetup: RSocketSetup;
    private rsClient: RSocketClient<string, Buffer>;
    private rsConnection: ReactiveSocket<string, Buffer>;

    // eslint-disable-next-line no-unused-vars,@typescript-eslint/no-unused-vars
    private vueInstance;

    private requestedStreams = new Map<string, ISubscription>();
    private stagedRequestedStreams = new Map<string, RequestStreamInformation>();

    public async install(Vue, rsSetup: RSocketSetup) {
        this.rsSetup = rsSetup;
        const rsocketClientOptions = {
            setup: {
                keepAlive: rsSetup.keepAlive,
                lifetime: rsSetup.lifetime,
                dataMimeType: rsSetup.dataMimeType,
                metadataMimeType: rsSetup.metadataMimeType,
                payload: {
                    data: rsSetup.payLoadData,
                    metadata: Vue3Rsocket.encodeMetaData(
                        await rsSetup.auth(),
                        undefined,
                        undefined
                    ),
                },
            },
            transport: new RSocketWebSocketClient(
                { url: rsSetup.url, debug: rsSetup.debug },
                BufferEncoders
            ),
        };

        this.vueInstance = Vue;
        this.rsClient = new RSocketClient(rsocketClientOptions);

        Vue.$rs = this;

        Vue.provide("vue3-rsocket", Vue.$rs);
        Vue.provide("rs", Vue.$rs);
        Vue.config.globalProperties.$rs = Vue.$rs;

        Vue.config.globalProperties.$rs.requestedStreams = this.requestedStreams;

        await this.connect(undefined);
    }

    private static encodeMetaData(auth, route: string, customMetadata) {
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

    private isDebug() {
        return this.rsSetup.debug;
    }

    private debugLog(message: string) {
        if (this.isDebug()) this.rsSetup.logger(message);
    }

    private debugLogConnectionStatus() {
        if (this.rSocketConnectionStatus.isError())
            this.debugLog(
                `RSocket connection status: ${this.rSocketConnectionStatus.getKind()} - ${
                    this.rSocketConnectionStatus.error?.message
                }`
            );
        else
            this.debugLog(
                `RSocket connection status: ${this.rSocketConnectionStatus.getKind()}`
            );
    }

    private noClientPresent(): boolean {
        return !this.rsClient;
    }

    private noConnectionCreated(): boolean {
        return !this.rsConnection;
    }

    private connected(): boolean {
        return this.rSocketConnectionStatus && this.rSocketConnectionStatus.isConnected();
    }

    private notConnected(): boolean {
        return !this.connected();
    }

    private static invalidFunction(fn): boolean {
        return fn && typeof fn !== "function";
    }

    public async connect(onConnectionStatusChange: OnConnectionStatusChange) {
        console.log(JSON.stringify(this.rsSetup));
        console.log(this.rsClient);

        if (this.noClientPresent()) throw new Error(`RSocket client not already created`);

        if (this.connected()) {
            this.debugLog(`Already connected to: ${this.rsSetup.url}`);
            return;
        }

        try {
            this.debugLog(`Connecting to: ${this.rsSetup.url}`);
            this.rsConnection = await this.rsClient.connect();
        } catch (e) {
            throw new Error(`Unable to connect to RSocket server: ${this.rsSetup.url}`);
        }

        if (Vue3Rsocket.invalidFunction(onConnectionStatusChange))
            throw new Error(
                "Invalid parameter. 'onConnectionStatusChange' is not a function"
            );

        try {
            this.rsConnection
                .connectionStatus()
                .subscribe((connectionStatus: ConnectionStatus) => {
                    this.rSocketConnectionStatus = new RSocketConnectionStatus(
                        connectionStatus
                    );
                    this.debugLogConnectionStatus();
                    if (onConnectionStatusChange)
                        onConnectionStatusChange(this.rSocketConnectionStatus);

                    // Handle staged ones
                    this.handleStagedRequestedStreams();
                });
        } catch (e) {
            throw new Error("Unable to subscribe to connectionStatus");
        }

        return this.rsConnection;
    }

    private stageRequestedStream(route: string, rsi: RequestStreamInformation) {
        this.stagedRequestedStreams.set(route, rsi);
    }

    private handleStagedRequestedStreams(): void {
        this.stagedRequestedStreams.forEach((value, key, map) => {
            const route = key;
            this.requestStream(route, value);
            map.delete(route);
        });
    }

    public async requestStream(route: string, rsi: RequestStreamInformation) {
        if (this.noConnectionCreated())
            throw new Error("Could not 'requestStream'. No RSocket connection found");

        if (this.notConnected()) {
            this.debugLog(
                "Could not 'requestStream'. RSocket not connected - Try to connect now.."
            );
            this.stageRequestedStream(route, rsi);
            await this.connect(undefined);
        }

        if (Vue3Rsocket.invalidFunction(rsi.onMessage))
            throw new Error("Invalid parameter. 'onMessage' is not a function");

        this.debugLog(`requestStream on route: "${route}"`);

        this.rsConnection
            .requestStream({
                data: rsi.data,
                metadata: await Vue3Rsocket.encodeMetaData(
                    await this.rsSetup.auth(),
                    route,
                    rsi.metaData
                ),
            })
            .subscribe({
                onComplete: () => {
                    this.debugLog(`'requestStream' for : "${route}" completed`);
                },
                onError: (error) => {
                    console.log(
                        `'requestStream' for : "${route}" error: ${error.message}`
                    );
                },
                onNext: (messageData) => {
                    const message = new RSocketMessage(messageData);

                    this.debugLog(
                        `Received message on route "${route}" data: ${message.data} metadata: ${message.metaData}`
                    );

                    rsi.onMessage(message);
                },
                onSubscribe: (sub) => {
                    if (this.requestedStreams.has(route)) {
                        console.warn(
                            `Multiple 'requestedStreams' for route: "${route}", closing new subscription`
                        );
                        sub.cancel();
                        return;
                    }

                    const requestAmount = rsi.amount;

                    this.debugLog(
                        `Add "${route}" to 'requestedStreams' - requesting next: ${requestAmount}`
                    );
                    this.requestedStreams.set(route, sub);
                    sub.request(requestAmount);
                },
            });
    }

    public async friendlyRequestStream(route: string, onMessage: OnMessage) {
        await this.requestStream(route, new RequestStreamInformation({ onMessage }));
    }

    public cancelRequestStream(route) {
        if (!this.requestedStreams.has(route)) {
            this.debugLog(`No subscription for route: "${route}"`);
            return;
        }

        this.debugLog(`Canceling and removing 'requestedStream' for route: "${route}"`);
        this.requestedStreams.get(route).cancel();
        this.requestedStreams.delete(route);
    }
}

export default new Vue3Rsocket();
