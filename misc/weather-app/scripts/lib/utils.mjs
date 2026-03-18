import { createHash } from "node:crypto";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";

export async function ensureDir(path) {
  await mkdir(path, { recursive: true });
}

export async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

export async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

export async function writeJson(path, data) {
  await writeFile(path, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

export async function writeJsonIfChanged(path, data, contentHash) {
  if (await exists(path)) {
    const previous = await readJson(path);
    const previousHash = previous?.meta?.contentHash ?? previous?.contentHash;
    if (previousHash && previousHash === contentHash) {
      return previous;
    }
  }
  await writeJson(path, data);
  return data;
}

export function hashObject(data) {
  return createHash("sha256").update(JSON.stringify(data)).digest("hex");
}

export function comparePayloadHash(previous, next) {
  return previous?.meta?.contentHash === hashObject(next);
}

export function pad2(value) {
  return String(value).padStart(2, "0");
}

export function formatDateUTC(date) {
  return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}`;
}

export function addDays(dateString, delta) {
  const date = new Date(`${dateString}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + delta);
  return formatDateUTC(date);
}

export function enumerateDates(startDate, endDate) {
  const dates = [];
  let cursor = startDate;
  while (cursor <= endDate) {
    dates.push(cursor);
    cursor = addDays(cursor, 1);
  }
  return dates;
}

export function contiguousRanges(dateStrings) {
  if (!dateStrings.length) return [];
  const ranges = [];
  let start = dateStrings[0];
  let previous = dateStrings[0];
  for (const current of dateStrings.slice(1)) {
    if (current !== addDays(previous, 1)) {
      ranges.push({ start, end: previous });
      start = current;
    }
    previous = current;
  }
  ranges.push({ start, end: previous });
  return ranges;
}

export function localDateString(timezone, date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function localMonthKey(timezone, date = new Date()) {
  return localDateString(timezone, date).slice(0, 7);
}

export function addMonths(monthKey, delta) {
  const [year, month] = monthKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1 + delta, 1));
  return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}`;
}

export function monthKeyFromDate(dateString) {
  return dateString.slice(0, 7);
}

export function monthLabel(monthKey) {
  const [year, month] = monthKey.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC"
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

export function currentLocalHourKey(offsetSeconds) {
  const shifted = new Date(Date.now() + offsetSeconds * 1000);
  return `${shifted.getUTCFullYear()}-${pad2(shifted.getUTCMonth() + 1)}-${pad2(shifted.getUTCDate())}T${pad2(shifted.getUTCHours())}:00`;
}

export function average(values) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function round(value, precision = 1) {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

export async function fetchJson(url) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "mjgil-weather-app/1.0 (+https://mjgil.github.io/misc/weather-app/)"
    }
  });
  if (!response.ok) {
    throw new Error(`Request failed ${response.status} for ${url}`);
  }
  return response.json();
}

export function pickSeries(container, field, modelId) {
  return container[`${field}_${modelId}`] ?? container[field] ?? [];
}
