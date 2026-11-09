// Devices run React Native's own `URL` polyfill
// (react-native/Libraries/Blob/URL.js), a regex-based implementation that
// behaves very differently from Node's WHATWG URL (e.g. its `.pathname`
// gains a trailing "/" with no query/fragment, and it mishandles "@"
// userinfo the same way browsers used to before URL parsers were hardened).
// Jest otherwise runs on Node's real URL, so a suite that never installs
// this would pass against code that's actually broken on-device. Import
// this file first, before EmbeddedComponent, so every `new URL(...)` call
// in the component under test sees what devices see.

(global as any).URL = require('react-native/Libraries/Blob/URL').URL;
