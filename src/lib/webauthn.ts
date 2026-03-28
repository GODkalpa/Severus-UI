export function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

export function base64ToBuffer(base64: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const base64Url = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const binary = window.atob(base64Url);
  const buffer = new ArrayBuffer(binary.length);
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return buffer;
}

export function recursiveBase64ToBuffer(obj: any): any {
  if (typeof obj !== "object" || obj === null) return obj;
  if (Array.isArray(obj)) return obj.map(recursiveBase64ToBuffer);

  const newObj: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === "string" && (key === "challenge" || key === "id" || key === "userHandle")) {
      newObj[key] = base64ToBuffer(value);
    } else if (key === "allowCredentials" && Array.isArray(value)) {
      newObj[key] = value.map((cred: any) => ({
        ...cred,
        id: base64ToBuffer(cred.id),
      }));
    } else {
      newObj[key] = recursiveBase64ToBuffer(value);
    }
  }
  return newObj;
}
