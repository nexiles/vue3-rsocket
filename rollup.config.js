/* eslint-disable */
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

import dts from "rollup-plugin-dts";
import typescript from "@rollup/plugin-typescript";
import { terser } from "rollup-plugin-terser";

const input = "src/index.ts";
const outDir = `dist/`;
const name = require("./package.json").name;

export default (args) => {
    const dev = !!args.dev;
    console.log("Development build: %s", dev);
    delete args.dev;

    return [
        {
            input: input,
            output: [
                {
                    file: `${outDir}${name}.js`,
                    format: "esm",
                    sourcemap: dev,
                },
            ],
            plugins: [typescript(), dev ? null : terser()],
            external: ["vue", "rsocket-core", "rsocket-websocket-client", "buffer"],
        },
        {
            input: input,
            plugins: [dts()],
            output: {
                file: `${outDir}${name}.d.ts`,
                format: "esm",
            },
        },
    ];
};
