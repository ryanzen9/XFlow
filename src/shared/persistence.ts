import { normalizeSettings, type AppSettings } from "./strategy";
import { PROVIDER_SECRETS_KEY, normalizeProviderSecrets } from "./providers";

export const CONFIG_SCHEMA_VERSION = 2;
export const CONFIG_VERSION_KEY = "configVersion";
export const CONFIG_UPDATED_AT_KEY = "configUpdatedAt";
export const S3_SYNC_KEY = "s3Sync";

export interface ConfigurationDocument {
  schemaVersion: number;
  configVersion: number;
  updatedAt: string;
  config: AppSettings;
}

export interface S3SyncSettings {
  autoSyncEnabled: boolean;
  endpoint: string;
  region: string;
  bucket: string;
  objectKey: string;
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken: string;
}

export const DEFAULT_S3_SYNC_SETTINGS: S3SyncSettings = {
  autoSyncEnabled: false,
  endpoint: "",
  region: "us-east-1",
  bucket: "",
  objectKey: "xfilter/config.json",
  accessKeyId: "",
  secretAccessKey: "",
  sessionToken: "",
};

function positiveInteger(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0 ? value : fallback;
}

function timestamp(value: unknown): string {
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) return new Date(0).toISOString();
  return new Date(value).toISOString();
}

export function normalizeS3SyncSettings(value: unknown): S3SyncSettings {
  const input = value && typeof value === "object" ? (value as Partial<S3SyncSettings>) : {};
  return {
    autoSyncEnabled: input.autoSyncEnabled === true,
    endpoint: typeof input.endpoint === "string" ? input.endpoint.trim().replace(/\/+$/, "") : "",
    region:
      typeof input.region === "string" && input.region.trim() ? input.region.trim() : DEFAULT_S3_SYNC_SETTINGS.region,
    bucket: typeof input.bucket === "string" ? input.bucket.trim() : "",
    objectKey:
      typeof input.objectKey === "string" && input.objectKey.trim()
        ? input.objectKey.trim().replace(/^\/+/, "")
        : DEFAULT_S3_SYNC_SETTINGS.objectKey,
    accessKeyId: typeof input.accessKeyId === "string" ? input.accessKeyId.trim() : "",
    secretAccessKey: typeof input.secretAccessKey === "string" ? input.secretAccessKey : "",
    sessionToken: typeof input.sessionToken === "string" ? input.sessionToken.trim() : "",
  };
}

export async function readConfigurationDocument(): Promise<ConfigurationDocument> {
  const stored = await chrome.storage.local.get(null);
  return {
    schemaVersion: CONFIG_SCHEMA_VERSION,
    configVersion: positiveInteger(stored[CONFIG_VERSION_KEY], 1),
    updatedAt: timestamp(stored[CONFIG_UPDATED_AT_KEY]),
    config: normalizeSettings(stored),
  };
}

export function normalizeConfigurationDocument(value: unknown): ConfigurationDocument {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("配置文档必须是 JSON 对象。");
  const input = value as Partial<ConfigurationDocument>;
  if (input.schemaVersion !== 1 && input.schemaVersion !== CONFIG_SCHEMA_VERSION) {
    throw new Error(`仅支持 schemaVersion 1 或 ${CONFIG_SCHEMA_VERSION}。`);
  }
  if (!input.config || typeof input.config !== "object" || Array.isArray(input.config))
    throw new Error("config 必须是 JSON 对象。");
  if (!Array.isArray((input.config as Partial<AppSettings>).strategies))
    throw new Error("config.strategies 必须是数组。");
  return {
    schemaVersion: CONFIG_SCHEMA_VERSION,
    configVersion: positiveInteger(input.configVersion, 1),
    updatedAt: timestamp(input.updatedAt),
    config: normalizeSettings(input.config as unknown as Record<string, unknown>),
  };
}

export function normalizeEditableConfig(value: unknown): AppSettings {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("配置必须是 JSON 对象。");
  const input = value as Record<string, unknown>;
  if (!Array.isArray(input.strategies)) throw new Error("strategies 必须是数组。");
  return normalizeSettings(input);
}

export async function writeVersionedSettings(patch: Partial<AppSettings>): Promise<ConfigurationDocument> {
  const current = await chrome.storage.local.get([CONFIG_VERSION_KEY]);
  const configVersion = positiveInteger(current[CONFIG_VERSION_KEY], 0) + 1;
  const updatedAt = new Date().toISOString();
  await chrome.storage.local.set({ ...patch, [CONFIG_VERSION_KEY]: configVersion, [CONFIG_UPDATED_AT_KEY]: updatedAt });
  return readConfigurationDocument();
}

export async function applyEditedConfiguration(value: unknown): Promise<ConfigurationDocument> {
  return writeVersionedSettings(normalizeEditableConfig(value));
}

export async function migrateLegacyOpenRouterKey(apiKey: string): Promise<void> {
  const normalizedKey = apiKey.trim();
  if (!normalizedKey) return;
  const stored = await chrome.storage.local.get([PROVIDER_SECRETS_KEY]);
  const secrets = normalizeProviderSecrets(stored[PROVIDER_SECRETS_KEY]);
  if (!secrets.openrouter) {
    await chrome.storage.local.set({ [PROVIDER_SECRETS_KEY]: { ...secrets, openrouter: normalizedKey } });
  }
}

export async function applyRemoteConfiguration(document: ConfigurationDocument): Promise<ConfigurationDocument> {
  const normalized = normalizeConfigurationDocument(document);
  const legacyConfig = document.config as unknown as Record<string, unknown>;
  const legacyApiKey = typeof legacyConfig.apiKey === "string" ? legacyConfig.apiKey.trim() : "";
  await migrateLegacyOpenRouterKey(legacyApiKey);
  await chrome.storage.local.set({
    ...normalized.config,
    [CONFIG_VERSION_KEY]: normalized.configVersion,
    [CONFIG_UPDATED_AT_KEY]: normalized.updatedAt,
  });
  return readConfigurationDocument();
}

export async function readS3SyncSettings(): Promise<S3SyncSettings> {
  const stored = await chrome.storage.local.get([S3_SYNC_KEY]);
  return normalizeS3SyncSettings(stored[S3_SYNC_KEY]);
}

export async function saveS3SyncSettings(settings: S3SyncSettings): Promise<S3SyncSettings> {
  const normalized = normalizeS3SyncSettings(settings);
  await chrome.storage.local.set({ [S3_SYNC_KEY]: normalized });
  return normalized;
}
