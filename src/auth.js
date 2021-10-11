/*
 * Copyright (c) 2021 nexiles GmbH.  All rights reserved.
 */

export const authentication = {
  BASIC: "basic",
  BEARER: "bearer",
};

export class Auth {
  constructor(authType, value) {
    this.authType = authType;
    this.value = value;
  }
}
