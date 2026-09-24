import manifestJson from "../manifest.json";
import packageJson from "../package.json";

/**
 * Single source of truth for the extension manifest.
 *
 * `manifest.json` is the production manifest: it must only declare the
 * permissions the shipped feature set needs. Development-only origins are
 * injected by `createManifest({ dev: true })` and never written to the release
 * package. `scripts/manifest.test.ts` asserts both halves of that contract.
 */
export interface ExtensionManifest {
  manifest_version: number;
  default_locale: string;
  name: string;
  version: string;
  description: string;
  minimum_chrome_version: string;
  permissions: string[];
  optional_host_permissions: string[];
  host_permissions: string[];
  options_ui: { page: string; open_in_tab: boolean };
  icons: Record<string, string>;
  background: { service_worker: string; type: "module" };
  action: { default_title: string; default_popup: string; default_icon: Record<string, string> };
  content_scripts: Array<{ matches: string[]; js: string[]; css: string[]; run_at: string }>;
}

export interface LocaleCatalog {
  [key: string]: { message: string; description?: string };
}

/** Shared shape for every manifest, archive and bundle check in `scripts/`. */
export interface ValidationIssue {
  code: string;
  detail: string;
}

export const ICON_SIZES = [16, 32, 48, 128] as const;

/** Permissions the production feature set actually uses. */
export const PRODUCTION_PERMISSIONS = ["alarms", "storage"] as const;
export const PRODUCTION_HOST_PERMISSIONS = [
  "https://ai-gateway.vercel.sh/*",
  "https://api.typesafe.ai/*",
  "https://openrouter.ai/*",
] as const;
/** S3 decision (PR 9, phase 0): keep user-defined endpoints behind an explicit request. */
export const PRODUCTION_OPTIONAL_HOST_PERMISSIONS = ["https://*/*"] as const;
export const PRODUCTION_CONTENT_MATCHES = ["https://twitter.com/*", "https://x.com/*"] as const;

/** Injected by `bun run build:dev` so local http S3 endpoints stay testable. */
export const DEV_OPTIONAL_HOST_PERMISSIONS = ["http://localhost/*", "http://127.0.0.1/*"] as const;

/** Origins that must never reach a release package. */
export const FORBIDDEN_RELEASE_TOKENS = ["localhost", "127.0.0.1", "0.0.0.0"] as const;

export const DEFAULT_LOCALE = "en";
export const LOCALES = ["en", "zh_CN"] as const;

/**
 * Lowest Chrome version that supports everything in the shipped bundles.
 * `dashboard.css` / `popup.css` resolve the palette through `light-dark()`
 * (Chrome 123); `color-mix()` (111), `toSorted` (110), `:has()` (105) and
 * `Array.prototype.findLast` (97) are all older. `URL.canParse` is guarded by
 * a `typeof` check. Re-derive this value whenever a runtime feature changes.
 */
export const MINIMUM_CHROME_VERSION = "123";

/** Chrome Web Store limits for the resolved manifest strings. */
const NAME_MAX_LENGTH = 45;
const DESCRIPTION_MAX_LENGTH = 132;

const sourceManifest = manifestJson as ExtensionManifest;

export const packageMetadata = packageJson as { name: string; version: string };

export function createManifest(options: { dev?: boolean } = {}): ExtensionManifest {
  const { dev = false } = options;
  return {
    ...sourceManifest,
    optional_host_permissions: dev
      ? [...sourceManifest.optional_host_permissions, ...DEV_OPTIONAL_HOST_PERMISSIONS]
      : [...sourceManifest.optional_host_permissions],
  };
}

export function readLocaleCatalog(locale: string): Promise<LocaleCatalog> {
  return Bun.file(new URL(`../_locales/${locale}/messages.json`, import.meta.url)).json() as Promise<LocaleCatalog>;
}

export function readPngDimensions(bytes: Uint8Array): { width: number; height: number } | null {
  const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (bytes.byteLength < 24 || !signature.every((byte, index) => bytes[index] === byte)) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return { width: view.getUint32(16), height: view.getUint32(20) };
}

/** Returns `path = value` for every manifest string that leaks a development origin. */
export function findForbiddenReleaseEntries(value: unknown): string[] {
  const found: string[] = [];
  const visit = (node: unknown, path: string): void => {
    if (typeof node === "string") {
      if (FORBIDDEN_RELEASE_TOKENS.some((token) => node.includes(token))) found.push(`${path} = ${node}`);
      return;
    }
    if (Array.isArray(node)) {
      node.forEach((item, index) => visit(item, `${path}[${index}]`));
      return;
    }
    if (node && typeof node === "object") {
      for (const [key, item] of Object.entries(node)) visit(item, path ? `${path}.${key}` : key);
    }
  };
  visit(value, "");
  return found;
}

export function messageReferenceKeys(value: unknown): string[] {
  const pattern = /__MSG_([A-Za-z0-9_]+)__/g;
  const keys = new Set<string>();
  const visit = (node: unknown): void => {
    if (typeof node === "string") {
      for (const match of node.matchAll(pattern)) if (match[1]) keys.add(match[1]);
      return;
    }
    if (Array.isArray(node)) {
      for (const item of node) visit(item);
      return;
    }
    if (node && typeof node === "object") for (const item of Object.values(node)) visit(item);
  };
  visit(value);
  return [...keys].toSorted();
}

function resolveMessage(value: string, catalog: LocaleCatalog): string | null {
  const match = /^__MSG_([A-Za-z0-9_]+)__$/.exec(value);
  if (!match?.[1]) return value;
  return catalog[match[1]]?.message ?? null;
}

function sortedEquals(left: readonly string[], right: readonly string[]): boolean {
  return Array.from(left).toSorted().join("|") === Array.from(right).toSorted().join("|");
}

/**
 * Structural, permission and localization assertions for a manifest that is
 * about to be shipped. Pure: filesystem checks (icon pixels, locale parity)
 * live in `scripts/manifest.test.ts`.
 */
export function validateManifest(manifest: ExtensionManifest, defaultCatalog: LocaleCatalog): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const report = (code: string, detail: string) => issues.push({ code, detail });

  if (manifest.manifest_version !== 3) report("manifest-version", `expected 3, received ${manifest.manifest_version}`);
  if (manifest.version !== packageMetadata.version) {
    report("version-mismatch", `manifest.json ${manifest.version} != package.json ${packageMetadata.version}`);
  }
  if (manifest.default_locale !== DEFAULT_LOCALE) {
    report("default-locale", `expected ${DEFAULT_LOCALE}, received ${manifest.default_locale}`);
  }
  if (manifest.minimum_chrome_version !== MINIMUM_CHROME_VERSION) {
    report("minimum-chrome-version", `expected ${MINIMUM_CHROME_VERSION}, received ${manifest.minimum_chrome_version}`);
  }

  for (const entry of findForbiddenReleaseEntries(manifest)) report("forbidden-origin", entry);

  if (!sortedEquals(manifest.permissions, PRODUCTION_PERMISSIONS)) {
    report("permissions", `expected ${PRODUCTION_PERMISSIONS.join(", ")}, received ${manifest.permissions.join(", ")}`);
  }
  if (!sortedEquals(manifest.host_permissions, PRODUCTION_HOST_PERMISSIONS)) {
    report("host-permissions", `received ${manifest.host_permissions.join(", ")}`);
  }
  if (!sortedEquals(manifest.optional_host_permissions, PRODUCTION_OPTIONAL_HOST_PERMISSIONS)) {
    report("optional-host-permissions", `received ${manifest.optional_host_permissions.join(", ")}`);
  }

  const declaredIcons = Object.keys(manifest.icons).toSorted((left, right) => Number(left) - Number(right));
  if (!sortedEquals(declaredIcons, ICON_SIZES.map(String))) report("icons", `received ${declaredIcons.join(", ")}`);
  const actionIcons = Object.keys(manifest.action.default_icon).toSorted((left, right) => Number(left) - Number(right));
  if (!sortedEquals(actionIcons, ICON_SIZES.map(String))) {
    report("action-icons", `received ${actionIcons.join(", ")}`);
  }
  for (const size of ICON_SIZES) {
    const key = String(size);
    if (manifest.icons[key] !== `icons/icon-${key}.png`) report("icon-path", `icons.${key} = ${manifest.icons[key]}`);
    if (manifest.action.default_icon[key] !== manifest.icons[key]) {
      report("action-icon-path", `action.default_icon.${key} = ${manifest.action.default_icon[key]}`);
    }
  }

  for (const script of manifest.content_scripts) {
    if (!sortedEquals(script.matches, PRODUCTION_CONTENT_MATCHES)) {
      report("content-matches", `received ${script.matches.join(", ")}`);
    }
  }

  for (const key of messageReferenceKeys(manifest)) {
    if (!defaultCatalog[key]?.message) report("missing-message", `__MSG_${key}__ is not defined in ${DEFAULT_LOCALE}`);
  }
  const resolvedName = resolveMessage(manifest.name, defaultCatalog);
  const resolvedDescription = resolveMessage(manifest.description, defaultCatalog);
  if (resolvedName === null) report("missing-message", `name ${manifest.name} cannot be resolved`);
  else if (resolvedName.length > NAME_MAX_LENGTH) report("name-length", `${resolvedName.length} > ${NAME_MAX_LENGTH}`);
  if (resolvedDescription === null) report("missing-message", `description ${manifest.description} cannot be resolved`);
  else if (resolvedDescription.length > DESCRIPTION_MAX_LENGTH) {
    report("description-length", `${resolvedDescription.length} > ${DESCRIPTION_MAX_LENGTH}`);
  }

  return issues;
}

export function compareLocaleCatalogs(reference: LocaleCatalog, candidate: LocaleCatalog) {
  const referenceKeys = Object.keys(reference);
  const candidateKeys = Object.keys(candidate);
  return {
    missing: referenceKeys.filter((key) => !candidateKeys.includes(key)),
    extra: candidateKeys.filter((key) => !referenceKeys.includes(key)),
    empty: candidateKeys.filter((key) => !candidate[key]?.message),
  };
}
