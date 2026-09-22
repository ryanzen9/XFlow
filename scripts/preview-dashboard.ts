// Local UI preview only. The extension build never includes the mock storage script.
const storageMock = `(() => {
  const listeners = new Set();
  const read = () => JSON.parse(localStorage.getItem('xflow-dashboard-preview') || '{}');
  globalThis.chrome = {
    storage: {
      local: {
        get: async (keys) => {
          const data = read();
          if (keys === null) return data;
          if (Array.isArray(keys)) return Object.fromEntries(keys.map(key => [key, data[key]]));
          return { ...keys, ...data };
        },
        set: async (patch) => {
          const previous = read();
          localStorage.setItem('xflow-dashboard-preview', JSON.stringify({ ...previous, ...patch }));
          const changes = Object.fromEntries(Object.entries(patch).map(([key, newValue]) => [key, { oldValue: previous[key], newValue }]));
          listeners.forEach(listener => listener(changes, 'local'));
        },
        remove: async (key) => {
          const previous = read();
          const oldValue = previous[key];
          delete previous[key];
          localStorage.setItem('xflow-dashboard-preview', JSON.stringify(previous));
          listeners.forEach(listener => listener({ [key]: { oldValue, newValue: undefined } }, 'local'));
        }
      },
      onChanged: { addListener: fn => listeners.add(fn), removeListener: fn => listeners.delete(fn) }
    },
    permissions: { contains: async () => true, request: async () => true },
    runtime: {
      id: 'dashboard-preview',
      openOptionsPage: async () => { location.href = '/dashboard.html'; },
      sendMessage: async (message) => {
        const providers = {
          openrouter: { id: 'openrouter', label: 'OpenRouter', shortLabel: 'OpenRouter', modelId: 'typesafe/jev-1.13', keyUrl: 'https://openrouter.ai/settings/keys', keyPlaceholder: 'sk-or-v1-…' },
          'vercel-ai-gateway': { id: 'vercel-ai-gateway', label: 'Vercel AI Gateway', shortLabel: 'Vercel', modelId: 'typesafe-ai/jev', keyUrl: 'https://vercel.com/ai-gateway', keyPlaceholder: '输入 AI Gateway API Key' },
          typesafe: { id: 'typesafe', label: 'TypeSafe 官方', shortLabel: 'TypeSafe', modelId: 'jev-latest', keyUrl: 'https://console.typesafe.ai', keyPlaceholder: '输入 TypeSafe API Key' }
        };
        const data = read();
        const secrets = data.providerSecrets || {};
        const active = data.activeProvider || 'openrouter';
        if (message.type === 'GET_STATUS') {
          return {
            ok: true,
            configured: Boolean(secrets[active]),
            enabled: data.enabled !== false,
            commentsEnabled: data.commentsEnabled === true,
            activeProvider: active,
            providerName: providers[active].label,
            modelId: providers[active].modelId
          };
        }
        if (message.type === 'CLEAR_ACTIVITY_DATA') {
          await globalThis.chrome.storage.local.set({ activityData: { schemaVersion: 1, clearedAt: Date.now(), events: [] } });
          return { ok: true, cleared: true };
        }
        if (message.type === 'MARK_ACTIVITY_STATUS') {
          const activity = data.activityData || { schemaVersion: 1, clearedAt: 0, events: [] };
          activity.events = activity.events.map(event => event.id === message.eventId ? { ...event, status: 'incorrect', updatedAt: Date.now() } : event);
          await globalThis.chrome.storage.local.set({ activityData: activity });
          return { ok: true, updated: true };
        }
        if (message.type === 'SAVE_PROVIDER_KEY') secrets[message.providerId] = message.apiKey;
        if (message.type === 'CLEAR_PROVIDER_KEY') secrets[message.providerId] = '';
        if (message.type === 'SAVE_PROVIDER_KEY' || message.type === 'CLEAR_PROVIDER_KEY') {
          await globalThis.chrome.storage.local.set({ providerSecrets: secrets });
        }
        return {
          ok: true,
          providerSummaries: Object.values(providers).map(provider => ({
            ...provider,
            configured: Boolean(secrets[provider.id]),
            keyHint: secrets[provider.id] ? '•••• ' + secrets[provider.id].slice(-4) : '',
            active: provider.id === active
          }))
        };
      }
    }
  };
})();`;

const allowedFiles = new Set([
  "dashboard.html",
  "dashboard.js",
  "dashboard.css",
  "popup.html",
  "popup.js",
  "popup.css",
  "content.js",
  "content.css",
]);
const server = Bun.serve({
  hostname: "127.0.0.1",
  port: Number(Bun.env.DASHBOARD_PREVIEW_PORT || 43992),
  async fetch(request) {
    const path = new URL(request.url).pathname;
    if (path === "/favicon.ico") return new Response(null, { status: 204 });
    if (path === "/__preview__/storage.js")
      return new Response(storageMock, { headers: { "Content-Type": "text/javascript" } });
    const name = path === "/" ? "dashboard.html" : path.slice(1);
    if (!allowedFiles.has(name)) return new Response("Not found", { status: 404 });
    const file = Bun.file(new URL(`../dist/${name}`, import.meta.url));
    if (!(await file.exists())) return new Response("Run bun run build first.", { status: 404 });
    if (name.endsWith(".html"))
      return new Response(
        (await file.text()).replace("<head>", '<head><script src="/__preview__/storage.js"></script>'),
        { headers: { "Content-Type": "text/html" } },
      );
    return new Response(file);
  },
});
console.log(`Dashboard preview (mock storage, no API requests): ${server.url}`);
