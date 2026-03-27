const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

const normalizeUrl = (value: string) => value.trim().replace(/\/+$/, "");

const isLocalHostname = (hostname: string) => LOCAL_HOSTNAMES.has(hostname.toLowerCase());

const canUseLocalTarget = () => {
  if (typeof window === "undefined") {
    return true;
  }

  return isLocalHostname(window.location.hostname || "localhost");
};

const isUsableVoiceTarget = (value: string) => {
  try {
    const parsed = new URL(value);
    return !isLocalHostname(parsed.hostname) || canUseLocalTarget();
  } catch (error) {
    console.warn("Invalid NEXT_PUBLIC_VOICE_BACKEND_URL.", error);
    return false;
  }
};

const deriveHttpBaseUrl = (value: string) => {
  const parsed = new URL(value);
  const protocol =
    parsed.protocol === "wss:" ? "https:" : parsed.protocol === "ws:" ? "http:" : parsed.protocol;

  return `${protocol}//${parsed.host}`;
};

export const getBackendBaseUrl = () => {
  const configuredBaseUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
  if (configuredBaseUrl) {
    return normalizeUrl(configuredBaseUrl);
  }

  const configuredVoiceUrl = process.env.NEXT_PUBLIC_VOICE_BACKEND_URL;
  if (configuredVoiceUrl && isUsableVoiceTarget(configuredVoiceUrl)) {
    return deriveHttpBaseUrl(configuredVoiceUrl);
  }

  if (typeof window !== "undefined") {
    const protocol = window.location.protocol === "https:" ? "https:" : "http:";
    return `${protocol}//${window.location.hostname || "localhost"}:8001`;
  }

  return "";
};

export const getVoiceBackendUrl = () => {
  const configuredVoiceUrl = process.env.NEXT_PUBLIC_VOICE_BACKEND_URL;
  if (configuredVoiceUrl && isUsableVoiceTarget(configuredVoiceUrl)) {
    return normalizeUrl(configuredVoiceUrl);
  }

  const backendBaseUrl = getBackendBaseUrl();
  if (backendBaseUrl) {
    const parsed = new URL(backendBaseUrl);
    const protocol = parsed.protocol === "https:" ? "wss:" : "ws:";
    return `${protocol}//${parsed.host}/ws/severus`;
  }

  if (typeof window !== "undefined") {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${protocol}//${window.location.hostname || "localhost"}:8001/ws/severus`;
  }

  return "";
};
