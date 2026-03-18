import path from "node:path";
import { fileURLToPath } from "node:url";
import { CITIES } from "./lib/config.mjs";
import { ensureDir, writeJson } from "./lib/utils.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APP_DIR = path.resolve(__dirname, "..");
const DATA_DIR = path.join(APP_DIR, "data");
const baseUrl =
  process.env.WEATHER_APP_DATA_BASE_URL ??
  "https://mjgil.github.io/misc/weather-app/data";

async function fetchOptionalJson(relativePath) {
  const url = `${baseUrl.replace(/\/$/, "")}/${relativePath}`;
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    return null;
  }
  return response.json();
}

async function hydrateCity(city) {
  const forecast = await fetchOptionalJson(`forecast/latest/${city.id}.json`);
  if (forecast) {
    await ensureDir(path.join(DATA_DIR, "forecast", "latest"));
    await writeJson(path.join(DATA_DIR, "forecast", "latest", `${city.id}.json`), forecast);
  }

  const history = await fetchOptionalJson(`history/rolling-30/${city.id}.json`);
  if (history) {
    await ensureDir(path.join(DATA_DIR, "history", "rolling-30"));
    await ensureDir(path.join(DATA_DIR, "history", "daily", city.id));
    await writeJson(path.join(DATA_DIR, "history", "rolling-30", `${city.id}.json`), history);
    for (const day of history.days ?? []) {
      await writeJson(path.join(DATA_DIR, "history", "daily", city.id, `${day.date}.json`), day);
    }
  }

  const outlook = await fetchOptionalJson(`outlook/${city.id}.json`);
  if (outlook) {
    await ensureDir(path.join(DATA_DIR, "outlook"));
    await writeJson(path.join(DATA_DIR, "outlook", `${city.id}.json`), outlook);
  }
}

async function main() {
  await ensureDir(DATA_DIR);
  await Promise.all(CITIES.map((city) => hydrateCity(city)));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
