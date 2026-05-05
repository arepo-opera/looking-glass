import { writeSync } from "fs";
import type { LogFormat } from "./config";

const RESET = "\x1b[0m";
const DIM_ITALIC = "\x1b[2;3m";
const AMBER = "\x1b[38;5;214m";

const MONTHS = [
  "JAN", "FEB", "MAR", "APR", "MAY", "JUN",
  "JUL", "AUG", "SEP", "OCT", "NOV", "DEC",
];

export const RULE_LINE = "═".repeat(44);

export function utcStamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const day = pad(d.getUTCDate());
  const mon = MONTHS[d.getUTCMonth()];
  const yr = String(d.getUTCFullYear()).slice(-2);
  const time = `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
  return `${day}${mon}${yr} ${time}UTC`;
}

let format: LogFormat = "pretty";

export function setLogFormat(fmt: LogFormat): void {
  format = fmt;
}

function writeLine(s: string): void {
  writeSync(1, s);
}

function emitJson(level: string, msg: string): void {
  writeLine(JSON.stringify({ ts: new Date().toISOString(), level, msg }) + "\n");
}

export const log = {
  system(msg: string): void {
    if (format === "json") emitJson("system", msg);
    else writeLine(`${DIM_ITALIC}${utcStamp()}  ${msg}${RESET}\n`);
  },
  data(msg: string): void {
    if (format === "json") emitJson("data", msg);
    else writeLine(`${AMBER}${utcStamp()}  ${msg}${RESET}\n`);
  },
  rule(): void {
    if (format === "json") return; // skip decorative rules in json mode
    writeLine(`${AMBER}${RULE_LINE}${RESET}\n`);
  },
  raw(s: string): void {
    if (format === "json") {
      // strip ANSI before re-emitting as a json record
      emitJson("raw", s.replace(/\x1b\[[0-9;]*m/g, ""));
    } else {
      writeLine(s + "\n");
    }
  },
  blank(): void {
    if (format === "json") return;
    writeLine("\n");
  },
};
