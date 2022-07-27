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

import OnMessage from "../types/OnMessage";
import { JAVA_MAX_SAFE_INTEGER } from "../constants/MessageConstants";

/**
 * Wrapper class to set up stream request easily with appropriate defaults.
 *
 * Set fields like e.g.: new RequestStreamInformation({ amount: 10 });
 */
class RequestStreamInformation {
    data: string;
    metaData: unknown = {};
    amount: number = JAVA_MAX_SAFE_INTEGER;

    constructor(init?: Partial<RequestStreamInformation>) {
        Object.assign(this, init);
    }
}

class StagedRequestStreamInformation extends RequestStreamInformation {
    onMessage: OnMessage;
}

export { RequestStreamInformation, StagedRequestStreamInformation };
