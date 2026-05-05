import { writeSync } from "fs";

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

// fs.writeSync to fd 1 (stdout) is a single, atomic syscall. This avoids the
// interleaving we'd see if we used process.stdout.write from multiple
// concurrent async tasks (the scheduler firing while a banner is printing).
function writeLine(s: string): void {
  writeSync(1, s);
}

export const log = {
  system(msg: string): void {
    writeLine(`${DIM_ITALIC}${utcStamp()}  ${msg}${RESET}\n`);
  },
  data(msg: string): void {
    writeLine(`${AMBER}${utcStamp()}  ${msg}${RESET}\n`);
  },
  rule(): void {
    writeLine(`${AMBER}${RULE_LINE}${RESET}\n`);
  },
  raw(s: string): void {
    writeLine(s + "\n");
  },
  blank(): void {
    writeLine("\n");
  },
  banner(lines: string[]): void {
    writeLine(lines.join("\n") + "\n");
  },
};
