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

import { ConnectionStatus } from "rsocket-types";

/**
 * Wrapper class to hold data received when an RSocket connection status changes.
 */
export default class RSocketConnectionStatus {
    status: ConnectionStatus;
    connected: boolean;
    error: Error;

    constructor(status: ConnectionStatus) {
        this.status = status;
        this.connected = status.kind === "CONNECTED";
        this.error = status.kind === "ERROR" ? status.error : undefined;
    }

    /**
     * Get ki
     */
    getKind(): string {
        return this.status.kind;
    }

    /**
     * True if an Error is available, false when not.
     */
    isError(): boolean {
        return this.error !== undefined;
    }

    /**
     * True if the RSocket connection is established.
     */
    isConnected(): boolean {
        return this.connected;
    }
}
