import type { PluginDetectorHandler } from "@clipbus/plugin-sdk/runtime";
import { SETTINGS_PREFIX } from "../../shared/constants";
import type { PublicRpcConfig, RpcConfig } from "./types";

type DetectorContext = NonNullable<Parameters<PluginDetectorHandler["detect"]>[1]>;
type HostClient = NonNullable<DetectorContext["host"]>;
type SettingsClient = HostClient["settings"];
type SettingName = "rpcProtocol" | "rpcHost" | "rpcPort" | "rpcSecret" | "dir";

const RUNTIME_SETTING_NAMES: SettingName[] = ["rpcProtocol", "rpcHost", "rpcPort", "rpcSecret", "dir"];
const PUBLIC_SETTING_NAMES: SettingName[] = ["rpcProtocol", "rpcHost", "rpcPort", "dir"];

export const DEFAULT_RPC_CONFIG: RpcConfig = {
  rpcProtocol: "http",
  rpcHost: "",
  rpcPort: "",
  rpcSecret: "",
  dir: "",
  configReady: false
};

export function hasCompleteRpcConfig(config: Pick<RpcConfig, "rpcHost" | "rpcPort">): boolean {
  const port = Number(config.rpcPort);
  return Boolean(String(config.rpcHost || "").trim()) &&
    Number.isInteger(port) &&
    port >= 1 &&
    port <= 65535;
}

export function normalizeRpcConfig(config: Partial<RpcConfig> = {}): RpcConfig {
  const rpcProtocol = String(config.rpcProtocol || "").toLowerCase() === "https" ? "https" : "http";
  const rpcHost = String(config.rpcHost || "").trim();
  const rpcPort = Number(config.rpcPort) || "";
  const rpcSecret = String(config.rpcSecret ?? "");
  const dir = String(config.dir || "").trim();

  return {
    rpcProtocol,
    rpcHost,
    rpcPort,
    rpcSecret,
    dir,
    configReady: hasCompleteRpcConfig({ rpcHost, rpcPort })
  };
}

export function toPublicRpcConfig(config: RpcConfig): PublicRpcConfig {
  return {
    rpcProtocol: config.rpcProtocol,
    rpcHost: config.rpcHost,
    rpcPort: config.rpcPort,
    dir: config.dir,
    configReady: config.configReady
  };
}

function settingValue(settings: Record<string, unknown>, key: string): unknown {
  const fullKey = `${SETTINGS_PREFIX}${key}`;
  return settings[fullKey] ?? settings[key];
}

function unwrapSettingResponse(response: unknown): unknown {
  if (response && typeof response === "object" && "value" in response) {
    return (response as { value: unknown }).value;
  }
  return response;
}

function unwrapSettingsResponse(response: unknown): Record<string, unknown> {
  if (
    response &&
    typeof response === "object" &&
    "settings" in response &&
    response.settings &&
    typeof response.settings === "object" &&
    !Array.isArray(response.settings)
  ) {
    return response.settings as Record<string, unknown>;
  }
  return {};
}

async function readSettingValue(settings: SettingsClient | undefined, key: SettingName): Promise<unknown> {
  const fullKey = `${SETTINGS_PREFIX}${key}`;

  try {
    return unwrapSettingResponse(await settings?.get({ key: fullKey })) ?? null;
  } catch {
    return null;
  }
}

async function readConfigViaGet(settings: SettingsClient, keys: SettingName[]): Promise<RpcConfig> {
  const values = await Promise.all(keys.map(async (key) => [key, await readSettingValue(settings, key)] as const));
  const config = Object.fromEntries(values) as Partial<Record<SettingName, unknown>>;

  return normalizeRpcConfig(config as Partial<RpcConfig>);
}

async function readConfigViaGetAll(settings: SettingsClient, keys: SettingName[]): Promise<RpcConfig> {
  const response = await settings.getAll();
  const values = unwrapSettingsResponse(response);
  const config = Object.fromEntries(keys.map((key) => [key, settingValue(values, key)])) as Partial<Record<SettingName, unknown>>;

  return normalizeRpcConfig(config as Partial<RpcConfig>);
}

async function readRpcConfigFromSettings(settings: SettingsClient | undefined, keys: SettingName[]): Promise<RpcConfig> {
  if (!settings) {
    return normalizeRpcConfig(DEFAULT_RPC_CONFIG);
  }

  try {
    const config = await readConfigViaGet(settings, keys);
    if (config.configReady) {
      return config;
    }
  } catch {
    // Fall back to getAll when single setting reads are unavailable or incomplete.
  }

  try {
    return await readConfigViaGetAll(settings, keys);
  } catch {
    return normalizeRpcConfig(DEFAULT_RPC_CONFIG);
  }
}

export async function readExternalRpcConfig(host: HostClient | undefined): Promise<RpcConfig> {
  return readRpcConfigFromSettings(host?.settings, RUNTIME_SETTING_NAMES);
}

export async function readPublicRpcConfigFromSettings(settings: SettingsClient | undefined): Promise<PublicRpcConfig> {
  return toPublicRpcConfig(await readRpcConfigFromSettings(settings, PUBLIC_SETTING_NAMES));
}
