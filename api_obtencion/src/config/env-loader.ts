import * as fs from 'fs';

function parseLine(line: string): [string, string] | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) return null;

  const separator = trimmed.indexOf('=');
  if (separator <= 0) return null;

  const key = trimmed.slice(0, separator).trim();
  let value = trimmed.slice(separator + 1).trim();

  if (value.length >= 2 && value.startsWith('"') && value.endsWith('"')) {
    value = value.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, '\\');
  } else if (value.length >= 2 && value.startsWith("'") && value.endsWith("'")) {
    value = value.slice(1, -1);
  }

  return [key, value];
}

export function loadEnvironmentFile(filePath: string): Record<string, string> {
  if (!fs.existsSync(filePath)) return {};

  const values: Record<string, string> = {};
  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const parsed = parseLine(line);
    if (parsed) values[parsed[0]] = parsed[1];
  }
  return values;
}

export function loadRequiredEnvironment(filePath: string): Record<string, string> {
  const values = loadEnvironmentFile(filePath);
  const required = ['ORACLE_HOST', 'ORACLE_USER', 'ORACLE_PASSWORD'];
  const missing = required.filter((key) => !values[key] && !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Variables de entorno obligatorias ausentes: ${missing.join(', ')}`);
  }

  return values;
}