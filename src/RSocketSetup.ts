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

import Authentication from "./Authentication";
import { MESSAGE_RSOCKET_COMPOSITE_METADATA } from "rsocket-core";

/**
 * Create an RSocket setup object with common defaults.
 *
 * Set fields like e.g.: new RSocketSetup({ url: "wss://localhost:7000" });
 */
export default class RSocketSetup {
    url: string | undefined;
    authFn = () => Promise<Authentication>;

    dataMimeType = "application/json";
    keepAlive = 10000;
    lifetime = 180000;
    metadataMimeType = MESSAGE_RSOCKET_COMPOSITE_METADATA.string;

    payLoadData: string = undefined;

    debug = false;

    public constructor(init?: Partial<RSocketSetup>) {
        Object.assign(this, init);
    }

    auth() {
        return this.authFn;
    }
}
