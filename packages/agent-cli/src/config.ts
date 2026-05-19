/**
 * Local config file management. ~/.opera-arepo/config.json stores the
 * agent_id + registration_token so commands don't need them re-supplied
 * each run. LLM API keys are NOT stored here — they're read from
 * environment variables each invocation.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync, chmodSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

export interface Config {
  agent_id: string;
  registration_token: string;
  base_url: string;
  registered_at: string;
  agent_name: string;
}

export function configDir(): string {
  return join(homedir(), ".opera-arepo");
}
export function configPath(): string {
  return join(configDir(), "config.json");
}

export function loadConfig(): Config | null {
  const p = configPath();
  if (!existsSync(p)) return null;
  try {
    const raw = readFileSync(p, "utf-8");
    const parsed = JSON.parse(raw) as Partial<Config>;
    if (
      !parsed.agent_id ||
      !parsed.registration_token ||
      !parsed.base_url ||
      !parsed.registered_at ||
      !parsed.agent_name
    ) {
      return null;
    }
    return parsed as Config;
  } catch {
    return null;
  }
}

export function saveConfig(c: Config): void {
  const dir = configDir();
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true, mode: 0o700 });
  }
  const p = configPath();
  writeFileSync(p, JSON.stringify(c, null, 2) + "\n", { mode: 0o600 });
  // mkdirSync ignores mode on existing dirs; re-apply for safety.
  try {
    chmodSync(p, 0o600);
  } catch {
    /* best-effort on platforms without POSIX perms */
  }
  void dirname; // tsc unused-warning silencer if needed
}

export function configExists(): boolean {
  return existsSync(configPath());
}
