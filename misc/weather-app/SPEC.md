# Weather App Spec

## Scope

Build a static forecast comparison app at `misc/weather-app/` for seven fixed cities:

- Commerce, CA
- Philadelphia, PA
- Gilbert, AZ
- Miami, FL
- New York, NY
- Washington, D.C.
- Paris, France

The app compares three forecast models:

- `ecmwf_ifs025` (ECMWF IFS 0.25°)
- `gfs_seamless` (NOAA GFS Seamless)
- `gem_seamless` (Environment Canada GEM Seamless)

## User-facing views

### Overview

- One card per city.
- Current condition from each model.
- `Prepare-for` rain chance based on the highest next-24-hour probability across the three models.
- `Consensus` rain chance based on the average of each model's next-24-hour peak probability.
- `Spread` as max minus min next-24-hour peak rain probability.

### Compare

- Side-by-side model cards for the selected city.
- Current temperature, current weather code, next-24-hour peak rain chance, and next-24-hour total precipitation.
- Daily rain probability matrix for the next seven days.

### Hourly

- Next 24 hours in a shared comparison table.
- Mini sparklines for rain probability by model.
- Highlighted peak rain windows.

### 7-Day

- Daily cards for the next seven days.
- Each day shows all three models with weather code, high/low, rain probability, and precipitation sum.

### Month

- `Past month`: rolling last 30 complete local days from stored historical daily records.
- `Next month`: simple low-confidence outlook, not a precise forecast.
- Outlook language is intentionally qualitative:
  - warmer / cooler / near normal
  - wetter / drier / near normal

## Data model

### Forecast file

Path: `data/forecast/latest/{city}.json`

Contains:

- city metadata
- model metadata
- `current`
- `hourly`
- `daily`
- `summary`
- fetch metadata and content hash

### Forecast versions

Path: `data/forecast/versions/{city}/{timestamp}.json`

Stored only when the normalized payload changes.

### Historical daily files

Path: `data/history/daily/{city}/{yyyy-mm-dd}.json`

One file per city per local day.

### Rolling 30-day history file

Path: `data/history/rolling-30/{city}.json`

Contains:

- last 30 complete local days
- summary statistics
- wettest day
- rainy day count

### Outlook file

Path: `data/outlook/{city}.json`

Contains:

- current month outlook if available
- next month outlook
- qualitative simple-outlook labels

### Manifest

Path: `data/manifest.json`

Contains:

- app-level generated timestamp
- model list
- city list
- overview summary for each city

## Smart refresh strategy

### Hot forecasts

- Schedule: every 3 hours.
- Fetch hourly and 7-day forecast snapshots for all cities and all three models.
- Compare normalized content hash to the current `latest` file.
- Only write a new versioned snapshot when the content changes.
- Always rebuild `manifest.json` after the run.

### Cold history

- Schedule: once daily after the previous local day is complete for all cities.
- Do not refetch the full last month on each run.
- Determine which daily files are missing in the rolling 30-day window.
- Fetch only missing date ranges from the archive endpoint.
- Recompute rolling 30-day summaries from local daily files.

### Cold outlook

- Schedule: once daily.
- Fetch monthly outlook data separately from hot forecast data.
- Overwrite only when the normalized payload changes.

## Chosen implementation constraints

- Plain static HTML, CSS, and JavaScript.
- Node-based generation scripts with no external runtime dependencies.
- GitHub Pages is deployed from GitHub Actions artifacts instead of branch-published generated commits.
- Scheduled workflows hydrate the currently deployed weather data before regeneration so hot and cold runs can preserve state without polluting git history.
- Metric units for v1.
- No user-added city search in v1.
