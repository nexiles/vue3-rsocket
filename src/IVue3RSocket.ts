/* eslint-disable */
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

import RSocketConfig from "./classes/RSocketConfig";
import OnMessage from "./types/OnMessage";
import { RequestStreamInformation } from "./classes/RequestStreamInformation";

export default interface IVue3RSocket {
    /**
     * Install RSocket plugin on existing Vue instance.
     *
     * Then available via:
     * ```ts
     * import { inject } from "vue";
     * const rs = inject("vue3-rsocket");
     * ```
     * @param Vue the existing vue instance to install this plugin on.
     * @param rsConfig the RSocket setup configuration.
     */
    install(Vue, rsConfig: RSocketConfig): Promise<void>;

    /**
     * RSocket requestStream operation.
     * @link https://rsocket.io/about/protocol#stream-sequences-request-stream
     * @param route the route to request the stream on.
     * @param onMessage the function to call when a message was received.
     * @param requestStreamInformation optional data to set up request.
     */
    requestStream(
        route: string,
        onMessage: OnMessage,
        requestStreamInformation?: RequestStreamInformation
    ): Promise<void>;

    /**
     * Cancel a requested stream for given route.
     * @param route the route to cancel an already requested stream for.
     */
    cancelRequestStream(route: string): void;
}
