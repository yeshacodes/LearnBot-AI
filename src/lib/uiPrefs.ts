export function getBool(key: string, defaultValue: boolean): boolean {
  if (typeof window === "undefined") return defaultValue;
  const raw = window.localStorage.getItem(key);
  if (raw === null) return defaultValue;
  return raw === "true";
}

export function setBool(key: string, value: boolean): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, String(value));
  window.dispatchEvent(new CustomEvent("ui-prefs-changed", { detail: { key, value } }));
}
