<template>
  <main class="download-shell">
    <section v-if="payload" class="download-panel">
      <form class="download-form" @submit.prevent="submit">
        <div class="download-form__scroll">
          <section v-if="isConfigReady" class="config-summary" aria-label="aria2 RPC settings">
            <div class="config-summary__content">
              <p class="download-eyebrow">aria2 RPC</p>
              <strong>{{ rpcSummary }}</strong>
              <span>{{ directorySummary }}</span>
              <p class="config-help">Change settings in Pasty external settings.</p>
            </div>
            <div class="config-actions">
              <button class="submit-button" type="submit" :disabled="isSubmitting || !isConfigReady">
                {{ isSubmitting ? "Submitting..." : "Submit to aria2" }}
              </button>
              <button class="help-button" type="button" title="Open help" aria-label="Open help" @click="openHelp">
                ?
              </button>
            </div>
          </section>

          <section v-else class="config-missing" aria-label="aria2 RPC settings missing">
            <div class="config-summary__content">
              <p class="download-eyebrow">aria2 RPC</p>
              <strong>Failed to read aria2 RPC settings.</strong>
              <span>Please configure them in Pasty external settings first.</span>
            </div>
            <div class="config-actions">
              <button class="submit-button" type="submit" :disabled="isSubmitting || !isConfigReady">
                {{ isSubmitting ? "Submitting..." : "Submit to aria2" }}
              </button>
              <button class="help-button" type="button" title="Open help" aria-label="Open help" @click="openHelp">
                ?
              </button>
            </div>
          </section>

          <section class="resource-list" aria-label="Detected download links">
            <article
              v-for="(resource, index) in resources"
              :key="resource.id || `${resource.type}-${index}`"
              class="resource-card"
            >
              <span class="resource-index">{{ index + 1 }}</span>
              <div class="resource-main">
                <strong>{{ resource.displayName || resource.uri }}</strong>
                <span class="resource-uri">{{ resource.original || resource.uri }}</span>
              </div>
            </article>
          </section>
        </div>

      </form>
    </section>

    <div v-else class="empty-state">
      <p class="empty-state__title">No download link detected</p>
      <p class="empty-state__body">Copy a supported download URL or torrent file reference.</p>
    </div>
  </main>
</template>

<script setup>
import { computed, onMounted, onUnmounted, reactive, ref, watch } from "vue";
import { usePluginAttachmentSession } from "./composables/usePluginAttachmentSession";

const { payload, session, invokeAction } = usePluginAttachmentSession();

const form = reactive({
  rpcProtocol: "",
  rpcHost: "",
  rpcPort: "",
  rpcSecret: "",
  dir: ""
});
const isSubmitting = ref(false);
const hasRuntimeConfig = ref(false);
const hasError = ref(false);
let submitTimeoutID = null;

const resources = computed(() => Array.isArray(payload.value?.resources)
  ? payload.value.resources
  : []);

const rpcSummary = computed(() => `${form.rpcProtocol}://${form.rpcHost}:${form.rpcPort}`);
const directorySummary = computed(() => form.dir ? `Save to ${form.dir}` : "Use aria2 default directory");
const isConfigReady = computed(() => (hasRuntimeConfig.value || Boolean(payload.value?.defaults?.configReady)) && hasCompleteConfig());
watch(
  () => payload.value?.defaults,
  (defaults) => {
    if (!defaults) {
      return;
    }
    form.rpcProtocol = defaults.rpcProtocol || form.rpcProtocol;
    form.rpcHost = defaults.rpcHost || form.rpcHost;
    form.rpcPort = Number(defaults.rpcPort) || form.rpcPort;
    form.rpcSecret = defaults.rpcSecret || form.rpcSecret;
    form.dir = defaults.dir || form.dir;
    hasRuntimeConfig.value = Boolean(defaults.configReady) && hasCompleteConfig();
  },
  { immediate: true }
);

function hasCompleteConfig() {
  return Boolean(form.rpcHost) &&
    Number.isInteger(Number(form.rpcPort)) &&
    Number(form.rpcPort) >= 1 &&
    Number(form.rpcPort) <= 65535;
}

function validateForm() {
  if (!isConfigReady.value) {
    return "Failed to read aria2 RPC settings. Configure them in Pasty external settings first.";
  }
  if (!form.rpcHost) {
    return "Enter the aria2 RPC address.";
  }
  if (!Number.isInteger(Number(form.rpcPort)) || Number(form.rpcPort) < 1 || Number(form.rpcPort) > 65535) {
    return "Enter a valid aria2 RPC port.";
  }
  if (resources.value.length === 0) {
    return "No downloadable resource is available.";
  }
  return "";
}

function submit() {
  const validationError = validateForm();
  if (validationError) {
    hasError.value = true;
    return;
  }

  isSubmitting.value = true;
  hasError.value = false;
  clearSubmitTimeout();
  submitTimeoutID = window.setTimeout(() => {
    if (!isSubmitting.value) {
      return;
    }
    isSubmitting.value = false;
    hasError.value = true;
  }, 8000);
  invokeAction("submit-download", {
    rpcProtocol: form.rpcProtocol,
    rpcHost: form.rpcHost,
    rpcPort: Number(form.rpcPort),
    dir: form.dir
  });
}

function openHelp() {
  invokeAction("open-help", {});
}

function readConfig() {
  invokeAction("read-config", {});
}

function handleOperationResult(event) {
  const detail = event.detail ?? {};
  if (detail.actionID === "read-config") {
    applyRuntimeConfigResult(detail);
    return;
  }

  if (detail.actionID && detail.actionID !== "submit-download") {
    return;
  }

  isSubmitting.value = false;
  clearSubmitTimeout();
  hasError.value = detail.success === false;
}

function applyRuntimeConfigResult(detail) {
  if (detail.success === false) {
    hasRuntimeConfig.value = false;
    return;
  }

  const config = parseConfigMessage(detail.userMessage);
  if (!config) {
    hasRuntimeConfig.value = false;
    return;
  }

  form.rpcProtocol = config.rpcProtocol || form.rpcProtocol;
  form.rpcHost = config.rpcHost || form.rpcHost;
  form.rpcPort = Number(config.rpcPort) || form.rpcPort;
  form.rpcSecret = config.rpcSecret ?? form.rpcSecret;
  form.dir = config.dir || form.dir;
  hasRuntimeConfig.value = Boolean(config.configReady) && hasCompleteConfig();
}

function parseConfigMessage(value) {
  try {
    const parsed = JSON.parse(String(value || "{}"));
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function clearSubmitTimeout() {
  if (submitTimeoutID !== null) {
    window.clearTimeout(submitTimeoutID);
    submitTimeoutID = null;
  }
}

onMounted(() => {
  window.addEventListener("pasty-plugin-operation-result", handleOperationResult);
  window.requestAnimationFrame(readConfig);
});

onUnmounted(() => {
  clearSubmitTimeout();
  window.removeEventListener("pasty-plugin-operation-result", handleOperationResult);
});
</script>

<style scoped>
.download-shell {
  --panel-bg-top:      rgba(248, 250, 252, 0.96);
  --panel-bg-bottom:   rgba(241, 245, 249, 0.92);
  --surface-bg:        rgba(248, 250, 252, 0.78);
  --surface-bg-strong: rgba(255, 255, 255, 0.82);
  --surface-border:    rgba(148, 163, 184, 0.22);
  --shell-text:        #0f172a;
  --shell-text-muted:  #64748b;
  --shell-text-soft:   #475569;
  --accent:            #e2e8f0;
  --accent-strong:     #cbd5e1;
  --button-text:       #334155;
  --button-border:     rgba(203, 213, 225, 0.9);
  --button-shadow:     rgba(15, 23, 42, 0.12);

  height: 100%;
  overflow: hidden;
  overscroll-behavior: contain;
  background: transparent;
  color: var(--shell-text);
}

@media (prefers-color-scheme: dark) {
  .download-shell {
    --panel-bg-top:      rgba(30, 41, 59, 0.96);
    --panel-bg-bottom:   rgba(15, 23, 42, 0.92);
    --surface-bg:        rgba(30, 41, 59, 0.54);
    --surface-bg-strong: rgba(15, 23, 42, 0.72);
    --surface-border:    rgba(45, 212, 191, 0.2);
    --shell-text:        #e2e8f0;
    --shell-text-muted:  #94a3b8;
    --shell-text-soft:   #cbd5e1;
    --accent:            rgba(30, 41, 59, 0.9);
    --accent-strong:     rgba(15, 23, 42, 0.9);
    --button-text:       #cbd5e1;
    --button-border:     rgba(148, 163, 184, 0.26);
    --button-shadow:     rgba(0, 0, 0, 0.3);
  }
}

.download-panel {
  display: flex;
  flex-direction: column;
  gap: 8px;
  height: 100%;
  padding: 10px 12px 12px;
  border-radius: 18px;
  border: 1px solid var(--surface-border);
  background: linear-gradient(180deg, var(--panel-bg-top), var(--panel-bg-bottom));
  box-shadow: 0 10px 28px var(--button-shadow);
  overflow: hidden;
}

.help-button {
  flex: 0 0 auto;
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border: 1px solid var(--surface-border);
  border-radius: 999px;
  background: var(--surface-bg);
  color: var(--shell-text);
  font-size: 14px;
  font-weight: 800;
  cursor: pointer;
}

.help-button:hover {
  background: var(--surface-bg-strong);
  color: var(--shell-text);
}

.download-eyebrow {
  margin: 0;
  color: var(--shell-text-muted);
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
}

.download-title {
  margin: 3px 0 0;
  font-size: 17px;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--shell-text);
}

.download-form {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1 1 auto;
  min-height: 0;
}

.download-form__scroll {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  gap: 8px;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding-right: 2px;
}

.config-summary,
.config-missing {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  padding: 9px;
  border: 1px solid var(--surface-border);
  border-radius: 8px;
  background: var(--surface-bg);
}

.config-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 6px;
}

.config-summary__content {
  display: grid;
  gap: 2px;
  min-width: 0;
}

.config-summary strong,
.config-summary span,
.config-missing strong,
.config-missing span {
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.config-summary strong,
.config-missing strong {
  color: var(--shell-text);
  font-size: 12px;
}

.config-summary span,
.config-missing span {
  color: var(--shell-text-muted);
  font-size: 11px;
}

.config-help {
  margin: 0;
  color: var(--shell-text-muted);
  font-size: 11px;
  line-height: 1.35;
}

.resource-list {
  display: grid;
  gap: 7px;
  flex: 0 0 auto;
  padding: 8px;
  border: 1px solid var(--surface-border);
  border-radius: 9px;
  background: var(--surface-bg);
}

.resource-card {
  display: grid;
  grid-template-columns: 24px minmax(0, 1fr);
  align-items: center;
  gap: 9px;
  min-width: 0;
  padding: 8px;
  border: 1px solid var(--surface-border);
  border-radius: 8px;
  background: var(--surface-bg-strong);
}

.resource-index {
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  border-radius: 999px;
  background: var(--accent);
  color: var(--button-text);
  font-size: 12px;
  font-weight: 800;
}

.resource-main {
  display: grid;
  gap: 2px;
  min-width: 0;
}

.resource-main strong,
.resource-main span {
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.resource-main strong {
  color: var(--shell-text);
  font-size: 12px;
}

.resource-main span {
  color: var(--shell-text-muted);
  font-size: 11px;
}

.resource-uri {
  direction: ltr;
}

.submit-button {
  height: 30px;
  min-width: 108px;
  border: 0;
  border-radius: 8px;
  background: linear-gradient(180deg, var(--accent), var(--accent-strong));
  color: var(--button-text);
  padding: 0 10px;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0;
  box-shadow: 0 8px 16px var(--accent-shadow);
  cursor: pointer;
}

.submit-button:hover:not(:disabled) {
  background: linear-gradient(
    180deg,
    color-mix(in srgb, var(--accent) 84%, #ffffff),
    var(--accent-strong)
  );
  box-shadow: 0 10px 20px var(--accent-shadow);
}

.submit-button:active:not(:disabled) {
  transform: translateY(1px);
  box-shadow: 0 5px 12px var(--accent-shadow);
}

.submit-button:disabled {
  opacity: 0.68;
}

.empty-state {
  height: 100%;
  display: grid;
  place-items: center;
  padding: 16px;
  text-align: center;
}

.empty-state__title {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
}

.empty-state__body {
  margin: 8px 0 0;
  color: var(--shell-text-muted);
  font-size: 13px;
  line-height: 1.45;
}
</style>
