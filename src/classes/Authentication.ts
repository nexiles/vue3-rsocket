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

/* eslint-disable no-unused-vars */

/**
 * The authentication type to use
 */
export enum AuthenticationType {
    BASIC,
    BEARER,
}

export default class Authentication {
    authType: AuthenticationType;
    authData: any;

    constructor(authType: AuthenticationType, authData: any) {
        this.authType = authType;
        this.authData = authData;
    }
}

export class UserAuth {
    private username: string;
    private password: string;

    constructor(username: string, password: string) {
        this.username = username;
        this.password = password;
    }
}

export class BearerAuth {
    private value: string;

    constructor(value: string) {
        this.value = value;
    }
}

export function createBasicAuth(username: string, password: string): Authentication {
    return new Authentication(AuthenticationType.BASIC, new UserAuth(username, password));
}

export function createBearerAuth(value: string): Authentication {
    return new Authentication(AuthenticationType.BEARER, new BearerAuth(value));
}
