import {
  applyRemoteConfiguration,
  migrateLegacyOpenRouterKey,
  normalizeConfigurationDocument,
  readConfigurationDocument,
  type ConfigurationDocument,
  type S3SyncSettings,
} from "./persistence";
import { mergeActivityData } from "./activity";

export type SyncDirection = "pushed" | "pulled" | "equal";

export interface SyncResult {
  direction: SyncDirection;
  localVersion: number;
  remoteVersion: number;
  document: ConfigurationDocument;
}

export interface SyncOptions {
  allowPermissionRequest?: boolean;
}

const encoder = new TextEncoder();

function bytesToHex(value: ArrayBuffer): string {
  return [...new Uint8Array(value)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function sha256(value: string): Promise<string> {
  return bytesToHex(await crypto.subtle.digest("SHA-256", encoder.encode(value)));
}

async function hmac(key: BufferSource, value: string): Promise<ArrayBuffer> {
  const imported = await crypto.subtle.importKey("raw", key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return crypto.subtle.sign("HMAC", imported, encoder.encode(value));
}

function encodePathPart(value: string): string {
  return encodeURIComponent(value).replace(
    /[!'()*]/g,
    (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

function objectUrl(settings: S3SyncSettings): URL {
  const url = new URL(settings.endpoint);
  if (url.search || url.hash) throw new Error("S3 Endpoint 不能包含查询参数或锚点。");
  const base = url.pathname.replace(/\/+$/, "");
  const objectPath = settings.objectKey.split("/").filter(Boolean).map(encodePathPart).join("/");
  url.pathname = `${base}/${encodePathPart(settings.bucket)}/${objectPath}`;
  return url;
}

function permissionOrigin(url: URL): string {
  return `${url.protocol}//${url.hostname}/*`;
}

export function validateS3Settings(settings: S3SyncSettings): string | null {
  if (
    !settings.endpoint ||
    !settings.bucket ||
    !settings.objectKey ||
    !settings.region ||
    !settings.accessKeyId ||
    !settings.secretAccessKey
  ) {
    return "请填写 Endpoint、Region、Bucket、Object Key、Access Key ID 和 Secret Access Key。";
  }
  try {
    const url = objectUrl(settings);
    const localHttp = url.protocol === "http:" && (url.hostname === "localhost" || url.hostname === "127.0.0.1");
    if (url.protocol !== "https:" && !localHttp) return "S3 Endpoint 必须使用 HTTPS；仅本机调试允许 HTTP。";
  } catch {
    return "S3 Endpoint 不是有效 URL。";
  }
  return null;
}

export function isS3Configured(settings: S3SyncSettings): boolean {
  return validateS3Settings(settings) === null;
}

export async function hasS3HostPermission(settings: S3SyncSettings): Promise<boolean> {
  const validationError = validateS3Settings(settings);
  if (validationError) return false;
  if (!chrome.permissions?.contains) return true;
  return chrome.permissions.contains({ origins: [permissionOrigin(objectUrl(settings))] });
}

export async function requestS3HostPermission(settings: S3SyncSettings): Promise<void> {
  const validationError = validateS3Settings(settings);
  if (validationError) throw new Error(validationError);
  const origin = permissionOrigin(objectUrl(settings));
  if (chrome.permissions?.contains && (await chrome.permissions.contains({ origins: [origin] }))) return;
  if (!chrome.permissions?.request) return;
  const granted = await chrome.permissions.request({ origins: [origin] });
  if (!granted) throw new Error("未授予 S3 Endpoint 的访问权限。");
}

async function ensureHostPermission(settings: S3SyncSettings, allowRequest: boolean): Promise<void> {
  if (await hasS3HostPermission(settings)) return;
  if (!allowRequest) throw new Error("S3 Endpoint 访问权限尚未授予，请在数据页重新保存同步配置。");
  await requestS3HostPermission(settings);
}

async function signedRequest(
  settings: S3SyncSettings,
  method: "GET" | "PUT",
  body: string,
  allowPermissionRequest: boolean,
): Promise<Response> {
  const url = objectUrl(settings);
  await ensureHostPermission(settings, allowPermissionRequest);
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);
  const payloadHash = await sha256(body);
  const headers: Record<string, string> = {
    "x-amz-content-sha256": payloadHash,
    "x-amz-date": amzDate,
  };
  if (settings.sessionToken) headers["x-amz-security-token"] = settings.sessionToken;
  if (method === "PUT") headers["content-type"] = "application/json; charset=utf-8";

  const canonicalHeaderEntries = [
    ["host", url.host],
    ["x-amz-content-sha256", payloadHash],
    ["x-amz-date", amzDate],
    ...(settings.sessionToken ? [["x-amz-security-token", settings.sessionToken]] : []),
  ];
  const canonicalHeaders = canonicalHeaderEntries.map(([key, value]) => `${key}:${value}\n`).join("");
  const signedHeaders = canonicalHeaderEntries.map(([key]) => key).join(";");
  const canonicalRequest = [method, url.pathname, "", canonicalHeaders, signedHeaders, payloadHash].join("\n");
  const scope = `${dateStamp}/${settings.region}/s3/aws4_request`;
  const stringToSign = ["AWS4-HMAC-SHA256", amzDate, scope, await sha256(canonicalRequest)].join("\n");
  const dateKey = await hmac(encoder.encode(`AWS4${settings.secretAccessKey}`), dateStamp);
  const regionKey = await hmac(dateKey, settings.region);
  const serviceKey = await hmac(regionKey, "s3");
  const signingKey = await hmac(serviceKey, "aws4_request");
  const signature = bytesToHex(await hmac(signingKey, stringToSign));
  headers.authorization = `AWS4-HMAC-SHA256 Credential=${settings.accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  return fetch(url, method === "PUT" ? { method, headers, body } : { method, headers });
}

async function push(
  settings: S3SyncSettings,
  document: ConfigurationDocument,
  allowPermissionRequest: boolean,
): Promise<void> {
  const response = await signedRequest(
    settings,
    "PUT",
    `${JSON.stringify(document, null, 2)}\n`,
    allowPermissionRequest,
  );
  if (!response.ok) throw new Error(`S3 推送失败：HTTP ${response.status}`);
}

async function readRemote(
  settings: S3SyncSettings,
  allowPermissionRequest: boolean,
): Promise<{ document: ConfigurationDocument; legacy: boolean; legacyApiKey: string } | null> {
  const response = await signedRequest(settings, "GET", "", allowPermissionRequest);
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`S3 拉取失败：HTTP ${response.status}`);
  try {
    const raw = (await response.json()) as {
      schemaVersion?: unknown;
      config?: { apiKey?: unknown };
    };
    return {
      document: normalizeConfigurationDocument(raw),
      legacy: raw.schemaVersion !== 3 || typeof raw.config?.apiKey === "string",
      legacyApiKey: typeof raw.config?.apiKey === "string" ? raw.config.apiKey : "",
    };
  } catch (error) {
    throw new Error(error instanceof Error ? `远程配置无效：${error.message}` : "远程配置不是有效 JSON。", {
      cause: error,
    });
  }
}

export async function synchronizeWithS3(settings: S3SyncSettings, options: SyncOptions = {}): Promise<SyncResult> {
  const validationError = validateS3Settings(settings);
  if (validationError) throw new Error(validationError);
  const allowPermissionRequest = options.allowPermissionRequest !== false;
  const local = await readConfigurationDocument();
  const remoteResult = await readRemote(settings, allowPermissionRequest);
  if (remoteResult?.legacyApiKey) await migrateLegacyOpenRouterKey(remoteResult.legacyApiKey);
  if (!remoteResult) {
    await push(settings, local, allowPermissionRequest);
    return {
      direction: "pushed",
      localVersion: local.configVersion,
      remoteVersion: local.configVersion,
      document: local,
    };
  }
  const remote = remoteResult.document;
  const activity = mergeActivityData(local.activity, remote.activity);
  const localActivityChanged = JSON.stringify(activity) !== JSON.stringify(local.activity);
  const remoteActivityChanged = JSON.stringify(activity) !== JSON.stringify(remote.activity);

  if (local.configVersion > remote.configVersion) {
    const document = { ...local, activity };
    if (localActivityChanged) await applyRemoteConfiguration(document);
    await push(settings, document, allowPermissionRequest);
    return {
      direction: "pushed",
      localVersion: document.configVersion,
      remoteVersion: document.configVersion,
      document,
    };
  }

  if (remote.configVersion > local.configVersion) {
    const applied = await applyRemoteConfiguration({ ...remote, activity });
    if (remoteResult.legacy || remoteActivityChanged) await push(settings, applied, allowPermissionRequest);
    return {
      direction: "pulled",
      localVersion: applied.configVersion,
      remoteVersion: remote.configVersion,
      document: applied,
    };
  }
  if (localActivityChanged || remoteActivityChanged) {
    const merged = await applyRemoteConfiguration({ ...local, activity });
    await push(settings, merged, allowPermissionRequest);
    return {
      direction: "pushed",
      localVersion: merged.configVersion,
      remoteVersion: merged.configVersion,
      document: merged,
    };
  }
  if (remoteResult.legacy) {
    await push(settings, local, allowPermissionRequest);
    return {
      direction: "pushed",
      localVersion: local.configVersion,
      remoteVersion: local.configVersion,
      document: local,
    };
  }
  return {
    direction: "equal",
    localVersion: local.configVersion,
    remoteVersion: remote.configVersion,
    document: local,
  };
}
