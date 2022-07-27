# CHANGELOG

## 0.3.0 -- 2022-07-27

### :warning: Usage updated
1. `Vue3RSocket` is now a named export
2. `friendlyRequestStream` replaced through `requestStream` with optionals

- build: do not wrap everything in generated js
- build: create minified js upon production build
- feat: `requestStream` now takes optional parameters
- fix: correctly handle when route is/was already subscribed
- build: clean up dependencies

## 0.2.2 -- 2022-07-26

- fix: validation of asynchronous function

## 0.2.1 -- 2022-07-26

- feat: increase debug verbosity
- feat: validate provided config
- fix: auth function asynchronicity

## 0.2.0 -- 2022-07-25

:warning: The usage of this library changed completely, see updated usage
examples in `README.md` :warning:

- feat/build/docs: use TypeScript
- feat: simplify usage
- feat: prepare for missing operations
- fix: fix 'requestStream' lifecycle

## 0.1.2 -- 2022-03-24
- build: update dependencies

## 0.1.1 -- 2022-01-11

- infra: add dependabot
- infra: add GitHub actions for npm publishing
- feat: update copyright notice
- docs: Add CHANGELOG
- docs: Set licence to MIT
- feat: Initial commit
