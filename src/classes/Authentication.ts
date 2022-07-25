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

/**
 * Authentication wrapper class
 */
export default class Authentication {
    authType: AuthenticationType;
    authData: unknown;

    constructor(authType: AuthenticationType, authData: Auth) {
        this.authType = authType;
        this.authData = authData;
    }

    /**
     * Create Authentication by passing required data for authentication.
     * @see UserAuth
     * @see BearerAuth
     * @param authData the data required for authentication.
     */
    static create(authData: Auth) {
        return new Authentication(authData.getType(), authData);
    }
}

/**
 * Helper interface for easy Authentication creation
 * @see Authentication
 */
interface Auth {
    /**
     * Get the authentication type:
     * @see AuthenticationType
     */
    getType(): AuthenticationType;

    /**
     * Helper to return as Authentication
     * @see Authentication
     */
    asAuthentication(): Authentication;
}

/**
 * UserAuth wrapper class. Used for:
 * @see Authentication
 */
export class UserAuth implements Auth {
    private username: string;
    private password: string;

    constructor(username: string, password: string) {
        this.username = username;
        this.password = password;
    }

    getType(): AuthenticationType {
        return AuthenticationType.BASIC;
    }

    asAuthentication(): Authentication {
        return Authentication.create(this);
    }
}

/**
 * Bearer auth wrapper class. Used for:
 * @see Authentication
 */
export class BearerAuth implements Auth {
    private value: string;

    constructor(value: string) {
        this.value = value;
    }

    getType(): AuthenticationType {
        return AuthenticationType.BEARER;
    }

    asAuthentication(): Authentication {
        return Authentication.create(this);
    }
}
