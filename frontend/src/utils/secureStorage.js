/**
 * Secure session-scoped storage for sensitive data (API keys).
 * Uses sessionStorage (cleared on tab close) instead of localStorage.
 */
const KEYS = {
  SANCTIONS_API_KEY: "rudrik_sanctions_api_key",
  DIGILOCKER_API_KEY: "rudrik_digilocker_api_key",
};

export function getSecureItem(key) {
  return sessionStorage.getItem(key);
}

export function setSecureItem(key, value) {
  sessionStorage.setItem(key, value);
}

export function removeSecureItem(key) {
  sessionStorage.removeItem(key);
}

export { KEYS };
