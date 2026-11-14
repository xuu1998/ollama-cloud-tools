# Changelog

## [1.0.3]

### Fixed

- Added the explicit `clef:27b` decision model and the `clef:27b-cloud` routing label to model discovery, request validation and usage profiles.
- Preserved the 27B size in direct cloud requests and the mapped model name when proxying another gateway.
- Updated the primary request example and live smoke script to use `clef:27b`; existing Clef aliases remain compatible.

## [1.0.2]

### Fixed

- Declared `new_api` upstream support so the plugin can be bound in a New API channel's upstream task-plugin selector.
- Gateway forwarding uses the plugin's own route prefix, an upstream new-api token, and the mapped cloud model name.
- HTTP base URLs are accepted for New API gateways while direct Ollama access continues to require HTTPS.

## [1.0.1]

### Added

- Built-in Ollama icon metadata and a light/dark SVG sidecar with its source license.
- Actual host SVG validation in the local verification script.

## [1.0.0]

### Added

- Ollama Cloud native web search and web fetch endpoints.
- Clef cloud System One decisions with choice, noul and score questions.
- The client model alias `clef:cloud`, normalized to `clef` for direct cloud requests.
- Input validation, ordered JSON, synchronous task completion, and host-owned usage billing.
- Portable hook fixtures, Node.js contract tests, a real host checker, and an opt-in gateway smoke script.
- English and Simplified Chinese installation guides.
