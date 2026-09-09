const SECRET_KEYS = new Set([
  "password",
  "securitytoken",
  "clientsecret",
  "accesstoken",
  "secret",
  "token",
]);

export function maskConfig(config: Record<string, unknown>) {
  const next: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(config)) {
    if (SECRET_KEYS.has(key.toLowerCase()) && typeof value === "string" && value.length > 0) {
      next[key] = "••••••••";
      next[`${key}Set`] = true;
    } else {
      next[key] = value;
    }
  }
  return next;
}

export function mergeConfig(
  existing: Record<string, unknown>,
  incoming: Record<string, unknown>,
) {
  const next = { ...existing };
  for (const [key, value] of Object.entries(incoming)) {
    if (key.endsWith("Set")) continue;
    if (typeof value === "string" && /^•+$/.test(value)) continue;
    next[key] = value;
  }
  return next;
}
