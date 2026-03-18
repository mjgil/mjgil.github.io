export const APP_TITLE = "Rain Split";

export const CITIES = [
  {
    id: "commerce-ca",
    name: "Commerce, CA",
    region: "California",
    country: "United States",
    latitude: 34.0006,
    longitude: -118.1598,
    timezone: "America/Los_Angeles"
  },
  {
    id: "philadelphia-pa",
    name: "Philadelphia, PA",
    region: "Pennsylvania",
    country: "United States",
    latitude: 39.9526,
    longitude: -75.1652,
    timezone: "America/New_York"
  },
  {
    id: "gilbert-az",
    name: "Gilbert, AZ",
    region: "Arizona",
    country: "United States",
    latitude: 33.3528,
    longitude: -111.789,
    timezone: "America/Phoenix"
  },
  {
    id: "miami-fl",
    name: "Miami, FL",
    region: "Florida",
    country: "United States",
    latitude: 25.7617,
    longitude: -80.1918,
    timezone: "America/New_York"
  },
  {
    id: "new-york-ny",
    name: "New York, NY",
    region: "New York",
    country: "United States",
    latitude: 40.7128,
    longitude: -74.006,
    timezone: "America/New_York"
  },
  {
    id: "washington-dc",
    name: "Washington, D.C.",
    region: "District of Columbia",
    country: "United States",
    latitude: 38.9072,
    longitude: -77.0369,
    timezone: "America/New_York"
  },
  {
    id: "paris-fr",
    name: "Paris, France",
    region: "Ile-de-France",
    country: "France",
    latitude: 48.8566,
    longitude: 2.3522,
    timezone: "Europe/Paris"
  }
];

export const MODELS = [
  {
    id: "ecmwf_ifs025",
    label: "ECMWF IFS",
    source: "ECMWF",
    accent: "#0d5c63"
  },
  {
    id: "gfs_seamless",
    label: "NOAA GFS",
    source: "NOAA",
    accent: "#e36414"
  },
  {
    id: "gem_seamless",
    label: "GEM Canada",
    source: "Environment Canada",
    accent: "#6b8f71"
  }
];

export const FORECAST_ENDPOINT = "https://api.open-meteo.com/v1/forecast";
export const HISTORY_ENDPOINT = "https://archive-api.open-meteo.com/v1/archive";
export const OUTLOOK_ENDPOINT = "https://seasonal-api.open-meteo.com/v1/seasonal";

export const FORECAST_HOURLY_VARIABLES = [
  "temperature_2m",
  "apparent_temperature",
  "precipitation_probability",
  "precipitation",
  "weather_code",
  "wind_speed_10m"
];

export const FORECAST_DAILY_VARIABLES = [
  "temperature_2m_max",
  "temperature_2m_min",
  "precipitation_probability_max",
  "precipitation_sum",
  "weather_code",
  "wind_speed_10m_max"
];

export const HISTORY_DAILY_VARIABLES = [
  "temperature_2m_max",
  "temperature_2m_min",
  "precipitation_sum",
  "rain_sum",
  "precipitation_hours",
  "weather_code"
];

export const OUTLOOK_MONTHLY_VARIABLES = [
  "temperature_2m_mean",
  "temperature_2m_anomaly",
  "precipitation_mean",
  "precipitation_anomaly"
];
