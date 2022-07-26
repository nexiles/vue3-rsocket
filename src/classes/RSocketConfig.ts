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

import { APPLICATION_JSON, MESSAGE_RSOCKET_COMPOSITE_METADATA } from "rsocket-core";
import AuthFunction from "../types/AuthFunction";
import LoggerFunction from "../types/LoggerFunction";
import OnConnectionStatusChange from "../types/OnConnectionStatusChange";
import Authentication from "./Authentication";

/**
 * Create an RSocket setup object with common defaults.
 *
 * Set fields like e.g.: new RSocketConfig({ url: "wss://localhost:7000" });
 */
export default class RSocketConfig {
    /**
     * The URL the RSocket server is reachable on
     */
    url: string;

    /**
     * The function to use to return an authentication object
     * @see Authentication
     */
    authFn: AuthFunction;

    /**
     * The function to call when the connection status changes
     */
    connectionStatusFn: OnConnectionStatusChange;

    dataMimeType = APPLICATION_JSON.string;
    keepAlive = 10000;
    lifetime = 180000;
    metadataMimeType = MESSAGE_RSOCKET_COMPOSITE_METADATA.string;

    payLoadData: string;

    /**
     * Enable debug logging
     */
    debug = false;

    /**
     * Function to use for debug logging.
     * Default to 'console.debug()'
     */
    loggerFn: LoggerFunction = console.debug;

    public constructor(init?: Partial<RSocketConfig>) {
        Object.assign(this, init);
    }

    /**
     * Get the asynchronous auth function
     */
    auth(): Promise<Authentication> {
        return this.authFn();
    }
}
