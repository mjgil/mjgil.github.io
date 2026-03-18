import path from "node:path";
import { fileURLToPath } from "node:url";
import { readdir } from "node:fs/promises";
import {
  APP_TITLE,
  CITIES,
  MODELS,
  FORECAST_DAILY_VARIABLES,
  FORECAST_ENDPOINT,
  FORECAST_HOURLY_VARIABLES,
  HISTORY_DAILY_VARIABLES,
  HISTORY_ENDPOINT,
  OUTLOOK_ENDPOINT,
  OUTLOOK_MONTHLY_VARIABLES
} from "./lib/config.mjs";
import {
  addDays,
  addMonths,
  average,
  comparePayloadHash,
  contiguousRanges,
  currentLocalHourKey,
  ensureDir,
  enumerateDates,
  exists,
  fetchJson,
  hashObject,
  localDateString,
  localMonthKey,
  monthKeyFromDate,
  monthLabel,
  pickSeries,
  readJson,
  round,
  writeJson,
  writeJsonIfChanged
} from "./lib/utils.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APP_DIR = path.resolve(__dirname, "..");
const DATA_DIR = path.join(APP_DIR, "data");
const mode = process.argv[2] ?? "all";
const generatedAt = new Date().toISOString();

function buildForecastUrl(city) {
  const params = new URLSearchParams({
    latitude: String(city.latitude),
    longitude: String(city.longitude),
    models: MODELS.map((model) => model.id).join(","),
    hourly: FORECAST_HOURLY_VARIABLES.join(","),
    daily: FORECAST_DAILY_VARIABLES.join(","),
    timezone: "auto",
    forecast_days: "7"
  });
  return `${FORECAST_ENDPOINT}?${params.toString()}`;
}

function buildHistoryUrl(city, startDate, endDate) {
  const params = new URLSearchParams({
    latitude: String(city.latitude),
    longitude: String(city.longitude),
    start_date: startDate,
    end_date: endDate,
    daily: HISTORY_DAILY_VARIABLES.join(","),
    timezone: "auto"
  });
  return `${HISTORY_ENDPOINT}?${params.toString()}`;
}

function buildOutlookUrl(city) {
  const params = new URLSearchParams({
    latitude: String(city.latitude),
    longitude: String(city.longitude),
    monthly: OUTLOOK_MONTHLY_VARIABLES.join(","),
    timezone: "auto"
  });
  return `${OUTLOOK_ENDPOINT}?${params.toString()}`;
}

function transformForecast(city, raw) {
  const hourKey = currentLocalHourKey(raw.utc_offset_seconds);
  const currentIndex = Math.max(
    0,
    raw.hourly.time.findIndex((entry) => entry >= hourKey)
  );

  const hourly = raw.hourly.time.map((time, index) => ({
    time,
    models: Object.fromEntries(
      MODELS.map((model) => [
        model.id,
        {
          temperature: pickSeries(raw.hourly, "temperature_2m", model.id)[index],
          apparentTemperature: pickSeries(raw.hourly, "apparent_temperature", model.id)[index],
          precipitationProbability: pickSeries(raw.hourly, "precipitation_probability", model.id)[index],
          precipitation: pickSeries(raw.hourly, "precipitation", model.id)[index],
          weatherCode: pickSeries(raw.hourly, "weather_code", model.id)[index],
          windSpeed: pickSeries(raw.hourly, "wind_speed_10m", model.id)[index]
        }
      ])
    )
  }));

  const daily = raw.daily.time.map((date, index) => ({
    date,
    models: Object.fromEntries(
      MODELS.map((model) => [
        model.id,
        {
          temperatureMax: pickSeries(raw.daily, "temperature_2m_max", model.id)[index],
          temperatureMin: pickSeries(raw.daily, "temperature_2m_min", model.id)[index],
          precipitationProbabilityMax: pickSeries(raw.daily, "precipitation_probability_max", model.id)[index],
          precipitationSum: pickSeries(raw.daily, "precipitation_sum", model.id)[index],
          weatherCode: pickSeries(raw.daily, "weather_code", model.id)[index],
          windSpeedMax: pickSeries(raw.daily, "wind_speed_10m_max", model.id)[index]
        }
      ])
    )
  }));

  const currentHour = hourly[currentIndex] ?? hourly[0];
  const next24 = hourly.slice(currentIndex, currentIndex + 24);
  const perModelRisk = MODELS.map((model) => {
    const maxRainChance = Math.max(...next24.map((entry) => entry.models[model.id].precipitationProbability ?? 0));
    const peakMoment = next24.find((entry) => entry.models[model.id].precipitationProbability === maxRainChance)?.time ?? currentHour.time;
    const totalPrecipitation = round(
      next24.reduce((sum, entry) => sum + (entry.models[model.id].precipitation ?? 0), 0),
      1
    );

    return {
      modelId: model.id,
      maxRainChance,
      peakMoment,
      totalPrecipitation
    };
  });

  const maxRainValues = perModelRisk.map((entry) => entry.maxRainChance);
  const summary = {
    next24Hours: {
      perModel: Object.fromEntries(perModelRisk.map((entry) => [entry.modelId, entry])),
      prepareForRainChance: Math.max(...maxRainValues),
      consensusRainChance: Math.round(average(maxRainValues)),
      spreadRainChance: Math.max(...maxRainValues) - Math.min(...maxRainValues)
    },
    nextSevenDaysPeakRainChance: Math.max(
      ...daily.flatMap((day) => MODELS.map((model) => day.models[model.id].precipitationProbabilityMax ?? 0))
    )
  };

  const normalized = {
    city,
    models: MODELS,
    meta: {
      title: APP_TITLE,
      fetchedAt: generatedAt,
      timezone: raw.timezone,
      timezoneAbbreviation: raw.timezone_abbreviation,
      utcOffsetSeconds: raw.utc_offset_seconds,
      currentIndex
    },
    current: {
      time: currentHour.time,
      models: currentHour.models
    },
    hourly,
    daily,
    summary
  };

  normalized.meta.contentHash = hashObject({
    city: normalized.city,
    current: normalized.current,
    hourly: normalized.hourly,
    daily: normalized.daily,
    summary: normalized.summary
  });

  return normalized;
}

async function writeVersionedForecast(city, normalized) {
  const latestDir = path.join(DATA_DIR, "forecast", "latest");
  const versionsDir = path.join(DATA_DIR, "forecast", "versions", city.id);
  await ensureDir(latestDir);
  await ensureDir(versionsDir);

  const latestPath = path.join(latestDir, `${city.id}.json`);
  const latestExists = await exists(latestPath);
  if (latestExists) {
    const previous = await readJson(latestPath);
    if (comparePayloadHash(previous, {
      city: normalized.city,
      current: normalized.current,
      hourly: normalized.hourly,
      daily: normalized.daily,
      summary: normalized.summary
    })) {
      return previous;
    }
  }

  await writeJson(latestPath, normalized);
  const stamp = generatedAt.replace(/[:.]/g, "-");
  await writeJson(path.join(versionsDir, `${stamp}.json`), normalized);
  return normalized;
}

async function generateForecasts() {
  const results = [];
  for (const city of CITIES) {
    const raw = await fetchJson(buildForecastUrl(city));
    const normalized = transformForecast(city, raw);
    const written = await writeVersionedForecast(city, normalized);
    results.push(written);
  }
  return results;
}

function transformHistoryRange(city, raw) {
  return raw.daily.time.map((date, index) => ({
    cityId: city.id,
    cityName: city.name,
    date,
    temperatureMax: raw.daily.temperature_2m_max[index],
    temperatureMin: raw.daily.temperature_2m_min[index],
    precipitationSum: raw.daily.precipitation_sum[index],
    rainSum: raw.daily.rain_sum[index],
    precipitationHours: raw.daily.precipitation_hours[index],
    weatherCode: raw.daily.weather_code[index],
    fetchedAt: generatedAt
  }));
}

async function readRollingDates(city) {
  const cityDir = path.join(DATA_DIR, "history", "daily", city.id);
  await ensureDir(cityDir);
  const filenames = await readdir(cityDir);
  return new Set(
    filenames
      .filter((filename) => filename.endsWith(".json"))
      .map((filename) => filename.replace(/\.json$/, ""))
  );
}

async function generateHistory() {
  const rollingPaths = [];

  for (const city of CITIES) {
    const todayLocal = localDateString(city.timezone);
    const endDate = addDays(todayLocal, -2);
    const startDate = addDays(endDate, -29);
    const desiredDates = enumerateDates(startDate, endDate);
    const existingDates = await readRollingDates(city);
    const missingDates = desiredDates.filter((date) => !existingDates.has(date));
    const cityDir = path.join(DATA_DIR, "history", "daily", city.id);
    await ensureDir(cityDir);

    for (const range of contiguousRanges(missingDates)) {
      const raw = await fetchJson(buildHistoryUrl(city, range.start, range.end));
      for (const entry of transformHistoryRange(city, raw)) {
        await writeJson(path.join(cityDir, `${entry.date}.json`), entry);
      }
    }

    const days = [];
    for (const date of desiredDates) {
      days.push(await readJson(path.join(cityDir, `${date}.json`)));
    }

    const totalPrecipitation = round(days.reduce((sum, day) => sum + day.precipitationSum, 0), 1);
    const rainyDays = days.filter((day) => day.precipitationSum >= 0.5).length;
    const wettestDay = days.reduce((best, day) => (day.precipitationSum > best.precipitationSum ? day : best), days[0]);

    const rolling = {
      city,
      meta: {
        fetchedAt: generatedAt,
        startDate,
        endDate
      },
      summary: {
        averageHigh: round(average(days.map((day) => day.temperatureMax)), 1),
        averageLow: round(average(days.map((day) => day.temperatureMin)), 1),
        totalPrecipitation,
        rainyDays,
        wettestDay: {
          date: wettestDay.date,
          precipitationSum: wettestDay.precipitationSum
        }
      },
      days
    };

    const targetPath = path.join(DATA_DIR, "history", "rolling-30", `${city.id}.json`);
    await writeJson(targetPath, rolling);
    rollingPaths.push(targetPath);
  }

  return rollingPaths;
}

function describeTemperatureSignal(anomaly) {
  if (anomaly >= 0.8) return "warmer than normal";
  if (anomaly <= -0.8) return "cooler than normal";
  return "near normal";
}

function describePrecipitationSignal(mean, anomaly) {
  if (!mean) return "near normal";
  const ratio = anomaly / mean;
  if (ratio >= 0.12) return "wetter than normal";
  if (ratio <= -0.12) return "drier than normal";
  return "near normal";
}

async function generateOutlooks() {
  for (const city of CITIES) {
    const raw = await fetchJson(buildOutlookUrl(city));
    const months = raw.monthly.time.map((date, index) => ({
      monthKey: monthKeyFromDate(date),
      label: monthLabel(monthKeyFromDate(date)),
      temperatureMean: raw.monthly.temperature_2m_mean[index],
      temperatureAnomaly: raw.monthly.temperature_2m_anomaly[index],
      precipitationMean: raw.monthly.precipitation_mean[index],
      precipitationAnomaly: raw.monthly.precipitation_anomaly[index]
    }));

    const currentMonth = localMonthKey(city.timezone);
    const nextMonth = addMonths(currentMonth, 1);
    const currentMonthEntry = months.find((month) => month.monthKey === currentMonth) ?? null;
    const nextMonthEntry = months.find((month) => month.monthKey === nextMonth) ?? months[1] ?? null;

    const normalized = {
      city,
      meta: {
        fetchedAt: generatedAt
      },
      currentMonth: currentMonthEntry,
      nextMonth: nextMonthEntry
        ? {
            ...nextMonthEntry,
            simpleOutlook: {
              temperature: describeTemperatureSignal(nextMonthEntry.temperatureAnomaly),
              precipitation: describePrecipitationSignal(nextMonthEntry.precipitationMean, nextMonthEntry.precipitationAnomaly)
            }
          }
        : null
    };
    normalized.meta.contentHash = hashObject({
      city,
      currentMonth: normalized.currentMonth,
      nextMonth: normalized.nextMonth
    });

    const targetPath = path.join(DATA_DIR, "outlook", `${city.id}.json`);
    await writeJsonIfChanged(targetPath, normalized, normalized.meta.contentHash);
  }
}

async function buildManifest() {
  const cities = [];
  for (const city of CITIES) {
    const forecastPath = path.join(DATA_DIR, "forecast", "latest", `${city.id}.json`);
    if (!(await exists(forecastPath))) continue;
    const forecast = await readJson(forecastPath);
    const historyPath = path.join(DATA_DIR, "history", "rolling-30", `${city.id}.json`);
    const outlookPath = path.join(DATA_DIR, "outlook", `${city.id}.json`);
    const history = (await exists(historyPath)) ? await readJson(historyPath) : null;
    const outlook = (await exists(outlookPath)) ? await readJson(outlookPath) : null;

    cities.push({
      id: city.id,
      name: city.name,
      region: city.region,
      country: city.country,
      summary: {
        updatedAt: forecast.meta.fetchedAt,
        currentTime: forecast.current.time,
        prepareForRainChance: forecast.summary.next24Hours.prepareForRainChance,
        consensusRainChance: forecast.summary.next24Hours.consensusRainChance,
        spreadRainChance: forecast.summary.next24Hours.spreadRainChance,
        currentTemperatureRange: {
          min: Math.min(...MODELS.map((model) => forecast.current.models[model.id].temperature)),
          max: Math.max(...MODELS.map((model) => forecast.current.models[model.id].temperature))
        },
        historyTotalPrecipitation: history?.summary?.totalPrecipitation ?? null,
        nextMonthSignal: outlook?.nextMonth?.simpleOutlook ?? null
      }
    });
  }

  const manifest = {
    title: APP_TITLE,
    generatedAt,
    models: MODELS,
    cities
  };
  manifest.contentHash = hashObject({
    title: APP_TITLE,
    models: MODELS,
    cities
  });

  await writeJsonIfChanged(path.join(DATA_DIR, "manifest.json"), manifest, manifest.contentHash);
}

async function main() {
  await ensureDir(DATA_DIR);

  if (mode === "forecast" || mode === "all") {
    await generateForecasts();
  }

  if (mode === "history" || mode === "all") {
    await generateHistory();
  }

  if (mode === "outlook" || mode === "all") {
    await generateOutlooks();
  }

  if (mode === "manifest" || mode === "all" || mode === "forecast" || mode === "history" || mode === "outlook") {
    await buildManifest();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
