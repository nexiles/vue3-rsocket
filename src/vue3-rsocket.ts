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
import RSocketConfig from "./classes/RSocketConfig";
import RSocketConnectionStatus from "./classes/RSocketConnectionStatus";
import RSocketMessage from "./classes/RSocketMessage";
import RequestStreamInformation from "./classes/RequestStreamInformation";
import { ISubscription } from "rsocket-types/ReactiveStreamTypes";
import OnMessage from "./types/OnMessage";
import OnConnectionStatusChange from "./types/OnConnectionStatusChange";

class Vue3Rsocket {
    private rsConnectionStatus: RSocketConnectionStatus = undefined;
    private rsConfig: RSocketConfig;
    private rsClient: RSocketClient<string, Buffer>;
    private rsConnection: ReactiveSocket<string, Buffer>;

    private requestedStreams = new Map<string, ISubscription>();
    private stagedRequestedStreams = new Map<string, RequestStreamInformation>();

    public async install(Vue, rsConfig: RSocketConfig) {
        this.rsConfig = rsConfig;
        const rsocketClientOptions = {
            setup: {
                keepAlive: rsConfig.keepAlive,
                lifetime: rsConfig.lifetime,
                dataMimeType: rsConfig.dataMimeType,
                metadataMimeType: rsConfig.metadataMimeType,
                payload: {
                    data: rsConfig.payLoadData,
                    metadata: Vue3Rsocket.encodeMetaData(
                        await rsConfig.auth(),
                        undefined,
                        undefined
                    ),
                },
            },
            transport: new RSocketWebSocketClient(
                { url: rsConfig.url, debug: rsConfig.debug },
                BufferEncoders
            ),
        };

        this.rsClient = new RSocketClient(rsocketClientOptions);

        Vue.$rs = this;

        Vue.provide("vue3-rsocket", Vue.$rs);
        Vue.provide("rs", Vue.$rs);
        Vue.config.globalProperties.$rs = Vue.$rs;

        Vue.config.globalProperties.$rs.requestedStreams = this.requestedStreams;

        await this.connect(rsConfig.connectionStatusFn);
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
        return this.rsConfig.debug;
    }

    private debugLog(message: string) {
        if (this.isDebug()) this.rsConfig.loggerFn(message);
    }

    private debugLogConnectionStatus() {
        if (this.rsConnectionStatus.isError())
            this.debugLog(
                `RSocket connection status: ${this.rsConnectionStatus.getKind()} - ${
                    this.rsConnectionStatus.error?.message
                }`
            );
        else
            this.debugLog(
                `RSocket connection status: ${this.rsConnectionStatus.getKind()}`
            );
    }

    private noClientPresent(): boolean {
        return !this.rsClient;
    }

    private noConnectionCreated(): boolean {
        return !this.rsConnection;
    }

    private connected(): boolean {
        return this.rsConnectionStatus && this.rsConnectionStatus.isConnected();
    }

    private notConnected(): boolean {
        return !this.connected();
    }

    private static invalidFunction(fn): boolean {
        return fn && typeof fn !== "function";
    }

    public async connect(onConnectionStatusChange: OnConnectionStatusChange) {
        if (this.noClientPresent()) throw new Error(`RSocket client not created`);

        if (this.connected()) {
            this.debugLog(`Already connected to: ${this.rsConfig.url}`);
            return;
        }

        try {
            this.debugLog(`Connecting to: ${this.rsConfig.url}`);
            this.rsConnection = await this.rsClient.connect();
        } catch (e) {
            throw new Error(`Unable to connect to RSocket server: ${this.rsConfig.url}`);
        }

        if (Vue3Rsocket.invalidFunction(onConnectionStatusChange))
            throw new Error(
                "Invalid parameter. 'onConnectionStatusChange' is not a function"
            );

        try {
            this.rsConnection
                .connectionStatus()
                .subscribe((connectionStatus: ConnectionStatus) => {
                    this.rsConnectionStatus = new RSocketConnectionStatus(
                        connectionStatus
                    );
                    this.debugLogConnectionStatus();
                    if (onConnectionStatusChange)
                        onConnectionStatusChange(this.rsConnectionStatus);

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

    private async handleStagedRequestedStreams() {
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

        const encodedMetadata = await Vue3Rsocket.encodeMetaData(
            await this.rsConfig.auth(),
            route,
            rsi.metaData
        );

        const onMessage = rsi.onMessage;

        this.rsConnection
            .requestStream({
                data: rsi.data,
                metadata: encodedMetadata,
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
                    if (onMessage) onMessage(message);
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
