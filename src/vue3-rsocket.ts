// noinspection JSUnusedGlobalSymbols

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
import {
    RequestStreamInformation,
    StagedRequestStreamInformation,
} from "./classes/RequestStreamInformation";
import { ISubscription } from "rsocket-types/ReactiveStreamTypes";
import OnMessage from "./types/OnMessage";
import OnConnectionStatusChange from "./types/OnConnectionStatusChange";
import { FunctionHelper } from "./utils/Helpers";

class Vue3Rsocket {
    private rsConnectionStatus: RSocketConnectionStatus = undefined;
    private rsConfig: RSocketConfig;
    private rsClient: RSocketClient<string, Buffer>;
    private rsConnection: ReactiveSocket<string, Buffer>;

    private requestedStreams = new Map<string, ISubscription>();
    private stagedRequestedStreams = new Map<string, StagedRequestStreamInformation>();

    public async install(Vue, rsConfig: RSocketConfig) {
        this.rsConfig = rsConfig.validated();
        const rsocketClientOptions = {
            setup: {
                keepAlive: rsConfig.keepAlive,
                lifetime: rsConfig.lifetime,
                dataMimeType: rsConfig.dataMimeType,
                metadataMimeType: rsConfig.metadataMimeType,
                payload: {
                    data: rsConfig.payLoadData,
                    metadata: this.encodeMetaData(
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
        Vue.config.globalProperties.$rs = Vue.$rs;

        Vue.config.globalProperties.$rs.requestedStreams = this.requestedStreams;

        this.debugLog("Installed 'vue3-rsocket' plugin");

        await this.connect(rsConfig.connectionStatusFn);
    }

    private encodeMetaData(auth, route: string, customMetadata) {
        const metadata = [];

        if (auth) {
            const authType = auth.authType;
            this.debugLog(`Using 'authType': ${AuthenticationType[authType]}`);

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
        } else this.debugLog("No 'auth' object provided");

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

    private async connect(onConnectionStatusChange: OnConnectionStatusChange) {
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

        if (FunctionHelper.invalidFunction(onConnectionStatusChange))
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

    private stageRequestedStream(route: string, rsi: StagedRequestStreamInformation) {
        this.stagedRequestedStreams.set(route, rsi);
    }

    private async handleStagedRequestedStreams() {
        this.stagedRequestedStreams.forEach((value, key, map) => {
            const route = key;
            const srsi = value;
            this.requestStream(route, srsi.onMessage, srsi as RequestStreamInformation);
            map.delete(route);
        });
    }

    private debugLogReceivedMessage(
        route: string,
        message: RSocketMessage<unknown, unknown>
    ) {
        this.debugLog(
            `Received message on route "${route}" metadata: ${message.metaData} data: ${
                this.rsConfig.dataIsJSON()
                    ? JSON.stringify(message.getDataAsJson(), null, 2)
                    : message.data
            }`
        );
    }

    public async requestStream(
        route: string,
        onMessage: OnMessage,
        requestStreamInformation?: RequestStreamInformation
    ) {
        if (this.noConnectionCreated())
            throw new Error("Could not 'requestStream'. No RSocket connection found");

        if (FunctionHelper.invalidFunction(onMessage))
            throw new Error("Invalid parameter. 'onMessage' is not a function");

        const rsi = requestStreamInformation
            ? requestStreamInformation
            : new RequestStreamInformation();

        if (this.notConnected()) {
            this.debugLog(
                "Could not 'requestStream'. RSocket not connected - Try to connect now.."
            );
            const srsi = rsi as StagedRequestStreamInformation;
            srsi.onMessage = onMessage;
            this.stageRequestedStream(route, srsi);
            await this.connect(undefined);
        }

        this.debugLog(`requestStream on route: "${route}"`);

        const encodedMetadata = this.encodeMetaData(
            await this.rsConfig.auth(),
            route,
            rsi.metaData
        );

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
                    console.error(
                        `'requestStream' for : "${route}" error: ${error.message}`
                    );
                },
                onNext: (messageData) => {
                    const message = new RSocketMessage(messageData);
                    this.debugLogReceivedMessage(route, message);
                    if (onMessage) onMessage(message);
                },
                onSubscribe: (sub) => {
                    if (this.requestedStreams.has(route)) {
                        console.warn(
                            `Multiple 'requestedStreams' for route: "${route}", closing existing subscription`
                        );
                        this.cancelAndRemoveRequestedStream(route);
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

    private cancelAndRemoveRequestedStream(route: string) {
        this.requestedStreams.get(route).cancel();
        this.requestedStreams.delete(route);
    }

    public cancelRequestStream(route: string) {
        if (!this.requestedStreams.has(route)) {
            this.debugLog(`No subscription for route: "${route}"`);
            return;
        }

        this.debugLog(`Canceling and removing 'requestedStream' for route: "${route}"`);
        this.cancelAndRemoveRequestedStream(route);
    }
}

export default new Vue3Rsocket();
