// Firefox exposes promise APIs under browser; modern Chromium exposes them under chrome.
export const api = globalThis.browser ?? globalThis.chrome;
