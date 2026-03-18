# Weather App

Static weather comparison app for `mjgil.github.io/misc/weather-app/`.

## Local data generation

```bash
cd /home/m/git/mjgil.github.io/misc/weather-app
npm run build:data
```

## What gets generated

- `data/forecast/latest/*.json`
- `data/forecast/versions/*/*.json`
- `data/history/daily/*/*.json`
- `data/history/rolling-30/*.json`
- `data/outlook/*.json`
- `data/manifest.json`

## Deployment model

The app is fully static. GitHub Actions hydrates the current deployed weather data, refreshes the relevant datasets on a schedule, and deploys the whole site as a GitHub Pages artifact without committing generated JSON back into git.
