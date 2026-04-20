/**
 * Secure session-scoped storage for sensitive data (API keys).
 *
 * Uses sessionStorage (cleared on tab close) instead of localStorage to reduce
 * persistence of sensitive values. Auth tokens themselves use httpOnly cookies —
 * these storage keys hold *optional* client-side API key caches that supplement
 * backend-persisted keys.
 *
 * NOTE: KEYS below are storage *key names*, not secrets. Actual API key values
 * come from user input and are also persisted server-side per tenant.
 */
const KEYS = {
  SANCTIONS_API_KEY: "rudrik_sanctions_api_key",
  DIGILOCKER_API_KEY: "rudrik_digilocker_api_key",
};

export function getSecureItem(key) {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    return atob(raw);
  } catch {
    return sessionStorage.getItem(key);
  }
}

export function setSecureItem(key, value) {
  try {
    sessionStorage.setItem(key, btoa(value));
  } catch {
    sessionStorage.setItem(key, value);
  }
}

export function removeSecureItem(key) {
  sessionStorage.removeItem(key);
}

export { KEYS };
