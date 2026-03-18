const state = {
  manifest: null,
  selectedCityId: null,
  activeTab: "compare",
  cache: new Map(),
  requestToken: 0
};

const WEATHER_CODES = {
  0: { icon: "Clear", label: "Clear sky" },
  1: { icon: "Mostly clear", label: "Mostly clear" },
  2: { icon: "Partly cloudy", label: "Partly cloudy" },
  3: { icon: "Overcast", label: "Overcast" },
  45: { icon: "Fog", label: "Fog" },
  48: { icon: "Rime fog", label: "Rime fog" },
  51: { icon: "Light drizzle", label: "Light drizzle" },
  53: { icon: "Drizzle", label: "Drizzle" },
  55: { icon: "Dense drizzle", label: "Dense drizzle" },
  61: { icon: "Light rain", label: "Light rain" },
  63: { icon: "Rain", label: "Rain" },
  65: { icon: "Heavy rain", label: "Heavy rain" },
  71: { icon: "Light snow", label: "Light snow" },
  73: { icon: "Snow", label: "Snow" },
  75: { icon: "Heavy snow", label: "Heavy snow" },
  80: { icon: "Rain showers", label: "Rain showers" },
  81: { icon: "Rain showers", label: "Rain showers" },
  82: { icon: "Heavy showers", label: "Heavy showers" },
  95: { icon: "Storm", label: "Thunderstorm" }
};

const modelAccent = {};

function formatPercent(value) {
  return `${Math.round(value)}%`;
}

function toFahrenheit(value) {
  return value * 9 / 5 + 32;
}

function formatTemp(value) {
  return `${Math.round(toFahrenheit(value))}°F`;
}

function formatTempDelta(value) {
  const converted = value * 9 / 5;
  const prefix = converted > 0 ? "+" : "";
  return `${prefix}${converted.toFixed(1)}°F`;
}

function formatMm(value) {
  return `${value.toFixed(1)} mm`;
}

function riskClass(value) {
  if (value >= 70) return "high";
  if (value >= 35) return "medium";
  return "low";
}

function aggregateValues(values) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function aggregateHourlyPoint(hour) {
  const modelEntries = state.manifest.models.map((model) => hour.models[model.id]);
  return {
    temperature: aggregateValues(modelEntries.map((entry) => entry.temperature)),
    precipitationProbability: aggregateValues(modelEntries.map((entry) => entry.precipitationProbability)),
    precipitation: aggregateValues(modelEntries.map((entry) => entry.precipitation))
  };
}

function aggregateDailyPoint(day) {
  const modelEntries = state.manifest.models.map((model) => day.models[model.id]);
  return {
    temperatureMax: aggregateValues(modelEntries.map((entry) => entry.temperatureMax)),
    temperatureMin: aggregateValues(modelEntries.map((entry) => entry.temperatureMin)),
    precipitationProbabilityMax: aggregateValues(modelEntries.map((entry) => entry.precipitationProbabilityMax)),
    precipitationSum: aggregateValues(modelEntries.map((entry) => entry.precipitationSum))
  };
}

function codeLabel(code) {
  return WEATHER_CODES[code]?.label ?? "Unknown";
}

function codeIcon(code) {
  return WEATHER_CODES[code]?.icon ?? "Weather";
}

async function loadJson(path) {
  const response = await fetch(path, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Failed to load ${path}`);
  }
  return response.json();
}

function byId(id) {
  return document.getElementById(id);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function renderCityList() {
  const container = byId("city-list");
  container.innerHTML = state.manifest.cities
    .map((city) => {
      const summary = city.summary;
      const activeClass = city.id === state.selectedCityId ? "is-active" : "";
      const signal = summary.nextMonthSignal
        ? `${summary.nextMonthSignal.temperature} / ${summary.nextMonthSignal.precipitation}`
        : "Outlook pending";
      return `
        <button class="city-button ${activeClass}" data-city="${city.id}">
          <div class="city-name-row">
            <strong>${escapeHtml(city.name)}</strong>
            <span class="city-temp">${formatTemp(summary.currentTemperatureRange.min)} to ${formatTemp(summary.currentTemperatureRange.max)}</span>
          </div>
          <div class="city-stats">
            <div class="stat-chip">
              <span class="label">Prepare</span>
              <span class="value">${formatPercent(summary.prepareForRainChance)}</span>
            </div>
            <div class="stat-chip">
              <span class="label">Consensus</span>
              <span class="value">${formatPercent(summary.consensusRainChance)}</span>
            </div>
            <div class="stat-chip">
              <span class="label">Spread</span>
              <span class="value">${formatPercent(summary.spreadRainChance)}</span>
            </div>
          </div>
          <p class="lede" style="margin:0.75rem 0 0;font-size:0.9rem;">${escapeHtml(signal)}</p>
        </button>
      `;
    })
    .join("");

  container.querySelectorAll("[data-city]").forEach((button) => {
    button.addEventListener("click", () => selectCity(button.dataset.city));
  });
}

function renderHero(payload) {
  const { forecast, history, outlook } = payload;
  const summary = forecast.summary.next24Hours;
  const nextMonth = outlook?.nextMonth;
  byId("hero").classList.remove("skeleton");
  byId("hero").innerHTML = `
    <div class="hero-copy">
      <p class="eyebrow">${escapeHtml(forecast.city.region)} · ${escapeHtml(forecast.city.country)}</p>
      <h2>${escapeHtml(forecast.city.name)}</h2>
      <p>
        Updated ${new Date(forecast.meta.fetchedAt).toLocaleString()}. The strongest rain case in the next
        24 hours is <strong>${formatPercent(summary.prepareForRainChance)}</strong>, while the three-model
        consensus is <strong>${formatPercent(summary.consensusRainChance)}</strong>.
      </p>
      <p>
        Last 30 days delivered <strong>${formatMm(history.summary.totalPrecipitation)}</strong> across
        <strong>${history.summary.rainyDays}</strong> rainy days. Next month currently reads
        <strong>${escapeHtml(nextMonth?.simpleOutlook.temperature ?? "pending")}</strong> and
        <strong>${escapeHtml(nextMonth?.simpleOutlook.precipitation ?? "pending")}</strong>.
      </p>
    </div>
    <div class="hero-grid">
      <div class="hero-metric">
        <span class="metric-label">Prepare-for</span>
        <div class="metric-value">${formatPercent(summary.prepareForRainChance)}</div>
        <div class="metric-note">Highest next-24h rain probability across the three models.</div>
      </div>
      <div class="hero-metric">
        <span class="metric-label">Consensus</span>
        <div class="metric-value">${formatPercent(summary.consensusRainChance)}</div>
        <div class="metric-note">Average of each model's next-24h peak probability.</div>
      </div>
      <div class="hero-metric">
        <span class="metric-label">Spread</span>
        <div class="metric-value">${formatPercent(summary.spreadRainChance)}</div>
        <div class="metric-note">Disagreement width between the wettest and driest next-24h model.</div>
      </div>
      <div class="hero-metric">
        <span class="metric-label">Wettest day</span>
        <div class="metric-value">${formatMm(history.summary.wettestDay.precipitationSum)}</div>
        <div class="metric-note">${history.summary.wettestDay.date} in the rolling 30-day window.</div>
      </div>
    </div>
  `;
}

function modelMeta(id) {
  return state.manifest.models.find((model) => model.id === id);
}

function renderCompare(payload) {
  const { forecast } = payload;
  const summary = forecast.summary.next24Hours.perModel;
  const current = forecast.current.models;
  const aggregateCurrent = aggregateValues(state.manifest.models.map((model) => current[model.id].temperature));
  const aggregateCurrentRain = aggregateValues(
    state.manifest.models.map((model) => current[model.id].precipitationProbability)
  );
  const aggregatePeak = aggregateValues(state.manifest.models.map((model) => summary[model.id].maxRainChance));
  const aggregateTotal = aggregateValues(state.manifest.models.map((model) => summary[model.id].totalPrecipitation));

  const aggregateCard = `
    <article class="panel-card model-card" style="--accent:#18476b">
      <div class="model-header">
        <div>
          <h3>Aggregate</h3>
          <div class="model-source">Average across all three sources</div>
        </div>
        <span class="risk-pill ${riskClass(aggregatePeak)}">${formatPercent(aggregatePeak)}</span>
      </div>
      <div class="model-metrics">
        <div class="mini-metric">
          <span>Current</span>
          <strong>${formatTemp(aggregateCurrent)}</strong>
          <small>Average temperature</small>
        </div>
        <div class="mini-metric">
          <span>Current rain</span>
          <strong>${formatPercent(aggregateCurrentRain)}</strong>
          <small>Average current probability</small>
        </div>
        <div class="mini-metric">
          <span>Next 24h peak</span>
          <strong>${formatPercent(aggregatePeak)}</strong>
          <small>Average of each model's peak</small>
        </div>
        <div class="mini-metric">
          <span>Next 24h total</span>
          <strong>${formatMm(aggregateTotal)}</strong>
          <small>Average accumulated precipitation</small>
        </div>
      </div>
    </article>
  `;

  const cards = state.manifest.models
    .map((model) => {
      const currentWeather = current[model.id];
      const next24 = summary[model.id];
      return `
        <article class="panel-card model-card" style="--accent:${model.accent}">
          <div class="model-header">
            <div>
              <h3>${escapeHtml(model.label)}</h3>
              <div class="model-source">${escapeHtml(model.source)}</div>
            </div>
            <span class="risk-pill ${riskClass(next24.maxRainChance)}">${formatPercent(next24.maxRainChance)}</span>
          </div>
          <div class="model-metrics">
            <div class="mini-metric">
              <span>Current</span>
              <strong>${formatTemp(currentWeather.temperature)}</strong>
              <small>${escapeHtml(codeIcon(currentWeather.weatherCode))}</small>
            </div>
            <div class="mini-metric">
              <span>Current rain</span>
              <strong>${formatPercent(currentWeather.precipitationProbability)}</strong>
              <small>${escapeHtml(codeLabel(currentWeather.weatherCode))}</small>
            </div>
            <div class="mini-metric">
              <span>Next 24h peak</span>
              <strong>${formatPercent(next24.maxRainChance)}</strong>
              <small>${next24.peakMoment}</small>
            </div>
            <div class="mini-metric">
              <span>Next 24h total</span>
              <strong>${formatMm(next24.totalPrecipitation)}</strong>
              <small>Accumulated precipitation</small>
            </div>
          </div>
        </article>
      `;
    })
    .join("");

  const rows = forecast.daily
    .map((day) => {
      const aggregate = aggregateDailyPoint(day);
      const modelCells = state.manifest.models
        .map((model) => {
          const info = day.models[model.id];
          return `
            <td>
              <span class="risk-pill ${riskClass(info.precipitationProbabilityMax)}">${formatPercent(info.precipitationProbabilityMax)}</span>
              <div style="margin-top:0.35rem;color:var(--muted);">${formatMm(info.precipitationSum)}</div>
            </td>
          `;
        })
        .join("");
      return `
        <tr>
          <td>
            <strong>${new Date(`${day.date}T00:00:00`).toLocaleDateString(undefined, { weekday: "short" })}</strong>
            <div style="color:var(--muted);">${day.date}</div>
          </td>
          <td>
            <span class="risk-pill ${riskClass(aggregate.precipitationProbabilityMax)}">${formatPercent(aggregate.precipitationProbabilityMax)}</span>
            <div style="margin-top:0.35rem;color:var(--muted);">${formatMm(aggregate.precipitationSum)}</div>
          </td>
          ${modelCells}
        </tr>
      `;
    })
    .join("");

  byId("panel-compare").innerHTML = `
    <div class="cards-4">${aggregateCard}${cards}</div>
    <article class="panel-card rain-matrix">
      <h3>7-Day Rain Probability Matrix</h3>
      <p class="lede" style="margin-top:0.35rem;">This is where disagreement becomes useful. Compare each day across all three models before deciding what to prepare for.</p>
      <table>
        <thead>
          <tr>
            <th>Day</th>
            <th>Aggregate</th>
            ${state.manifest.models.map((model) => `<th>${escapeHtml(model.label)}</th>`).join("")}
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </article>
  `;
}

function sparkline(values, color) {
  const width = 240;
  const height = 64;
  const step = width / Math.max(values.length - 1, 1);
  const path = values
    .map((value, index) => {
      const x = index * step;
      const y = height - (value / 100) * (height - 8) - 4;
      return `${index === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
  return `
    <svg class="sparkline" viewBox="0 0 ${width} ${height}" aria-hidden="true">
      <path d="${path}" fill="none" stroke="${color}" stroke-width="3" stroke-linecap="round"></path>
      <line x1="0" y1="${height - 4}" x2="${width}" y2="${height - 4}" stroke="rgba(24,35,47,0.1)"></line>
    </svg>
  `;
}

function renderHourly(payload) {
  const { forecast } = payload;
  const start = forecast.meta.currentIndex;
  const hours = forecast.hourly.slice(start, start + 24);
  const aggregateHours = hours.map(aggregateHourlyPoint);

  const aggregatePeak = Math.max(...aggregateHours.map((hour) => hour.precipitationProbability));
  const aggregatePeakHour = hours[aggregateHours.findIndex((hour) => hour.precipitationProbability === aggregatePeak)]?.time ?? hours[0].time;
  const aggregateTotal = aggregateValues(
    state.manifest.models.map((model) =>
      hours.reduce((sum, hour) => sum + (hour.models[model.id].precipitation ?? 0), 0)
    )
  );

  const aggregateCard = `
    <article class="panel-card model-card" style="--accent:#18476b">
      <div class="model-header">
        <div>
          <h3>Aggregate</h3>
          <div class="model-source">Average hourly view across all three sources</div>
        </div>
        <span class="risk-pill ${riskClass(aggregatePeak)}">${formatPercent(aggregatePeak)}</span>
      </div>
      ${sparkline(aggregateHours.map((hour) => hour.precipitationProbability), "#18476b")}
      <p class="lede" style="margin:0.35rem 0 0;">Average hourly peak arrives around <strong>${aggregatePeakHour.slice(11)}</strong>, with about <strong>${formatMm(aggregateTotal)}</strong> total precipitation across the next 24 hours.</p>
    </article>
  `;

  const cards = state.manifest.models
    .map((model) => {
      const values = hours.map((hour) => hour.models[model.id].precipitationProbability ?? 0);
      const peak = Math.max(...values);
      const peakHour = hours[values.indexOf(peak)]?.time ?? hours[0].time;
      return `
        <article class="panel-card model-card" style="--accent:${model.accent}">
          <div class="model-header">
            <div>
              <h3>${escapeHtml(model.label)}</h3>
              <div class="model-source">${escapeHtml(model.source)}</div>
            </div>
            <span class="risk-pill ${riskClass(peak)}">${formatPercent(peak)}</span>
          </div>
          ${sparkline(values, model.accent)}
          <p class="lede" style="margin:0.35rem 0 0;">Peak hourly rain risk arrives around <strong>${peakHour.slice(11)}</strong>.</p>
        </article>
      `;
    })
    .join("");

  const rows = hours
    .map((hour) => {
      const aggregate = aggregateHourlyPoint(hour);
      const cells = state.manifest.models
        .map((model) => {
          const item = hour.models[model.id];
          return `
            <td>
              <strong>${formatPercent(item.precipitationProbability)}</strong>
              <div style="color:var(--muted);">${formatTemp(item.temperature)} · ${formatMm(item.precipitation)}</div>
            </td>
          `;
        })
        .join("");
      return `
        <tr>
          <td><strong>${hour.time.slice(11)}</strong><div style="color:var(--muted);">${hour.time.slice(0, 10)}</div></td>
          <td>
            <strong>${formatPercent(aggregate.precipitationProbability)}</strong>
            <div style="color:var(--muted);">${formatTemp(aggregate.temperature)} · ${formatMm(aggregate.precipitation)}</div>
          </td>
          ${cells}
        </tr>
      `;
    })
    .join("");

  byId("panel-hourly").innerHTML = `
    <div class="cards-4">${aggregateCard}${cards}</div>
    <article class="panel-card hourly-table">
      <h3>Next 24 Hours</h3>
      <table>
        <thead>
          <tr>
            <th>Time</th>
            <th>Aggregate</th>
            ${state.manifest.models.map((model) => `<th>${escapeHtml(model.label)}</th>`).join("")}
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </article>
  `;
}

function renderDaily(payload) {
  const { forecast } = payload;
  const cards = forecast.daily
    .map((day) => {
      const aggregate = aggregateDailyPoint(day);
      const rows = state.manifest.models
        .map((model) => {
          const info = day.models[model.id];
          return `
            <div class="model-row">
              <div>
                <strong>${escapeHtml(model.label)}</strong>
                <div><small>${escapeHtml(codeIcon(info.weatherCode))} · ${escapeHtml(codeLabel(info.weatherCode))}</small></div>
              </div>
              <div style="text-align:right;">
                <div><strong>${formatPercent(info.precipitationProbabilityMax)}</strong></div>
                <div><small>${formatTemp(info.temperatureMax)} / ${formatTemp(info.temperatureMin)} · ${formatMm(info.precipitationSum)}</small></div>
              </div>
            </div>
          `;
        })
        .join("");
      return `
        <article class="panel-card day-card">
          <div class="day-title">
            <strong>${new Date(`${day.date}T00:00:00`).toLocaleDateString(undefined, { weekday: "long" })}</strong>
            <span>${day.date}</span>
          </div>
          <div class="model-row">
            <div>
              <strong>Aggregate</strong>
              <div><small>Average across all three sources</small></div>
            </div>
            <div style="text-align:right;">
              <div><strong>${formatPercent(aggregate.precipitationProbabilityMax)}</strong></div>
              <div><small>${formatTemp(aggregate.temperatureMax)} / ${formatTemp(aggregate.temperatureMin)} · ${formatMm(aggregate.precipitationSum)}</small></div>
            </div>
          </div>
          ${rows}
        </article>
      `;
    })
    .join("");

  byId("panel-daily").innerHTML = `
    <div class="day-card-grid">${cards}</div>
  `;
}

function renderMonth(payload) {
  const { history, outlook } = payload;
  const wettest = [...history.days]
    .sort((a, b) => b.precipitationSum - a.precipitationSum)
    .slice(0, 6)
    .map(
      (day) => `
        <div class="history-row">
          <div>
            <strong>${day.date}</strong>
            <div style="color:var(--muted);">${escapeHtml(codeLabel(day.weatherCode))}</div>
          </div>
          <div style="text-align:right;">
            <strong>${formatMm(day.precipitationSum)}</strong>
            <div style="color:var(--muted);">${formatTemp(day.temperatureMax)} / ${formatTemp(day.temperatureMin)}</div>
          </div>
        </div>
      `
    )
    .join("");

  const nextMonth = outlook.nextMonth;
  const currentMonth = outlook.currentMonth;

  byId("panel-month").innerHTML = `
    <div class="month-layout">
      <article class="panel-card">
        <h3>Past 30 Days</h3>
        <div class="cards-4" style="margin-top:1rem;">
          <div class="mini-metric">
            <span>Total precip</span>
            <strong>${formatMm(history.summary.totalPrecipitation)}</strong>
          </div>
          <div class="mini-metric">
            <span>Rainy days</span>
            <strong>${history.summary.rainyDays}</strong>
          </div>
          <div class="mini-metric">
            <span>Avg high</span>
            <strong>${formatTemp(history.summary.averageHigh)}</strong>
          </div>
          <div class="mini-metric">
            <span>Avg low</span>
            <strong>${formatTemp(history.summary.averageLow)}</strong>
          </div>
        </div>
        <div class="history-list">${wettest}</div>
      </article>
      <article class="panel-card">
        <h3>Simple Outlook</h3>
        <p class="lede" style="margin-top:0.35rem;">This is deliberately qualitative. Next-month weather is a probabilistic outlook, not a precise day-by-day promise.</p>
        ${
          currentMonth
            ? `<p><span class="outlook-badge">Current month context: ${escapeHtml(currentMonth.label)}</span></p>`
            : ""
        }
        ${
          nextMonth
            ? `
              <div class="cards-2" style="margin-top:0.75rem;">
                <div class="hero-metric">
                  <span class="metric-label">${escapeHtml(nextMonth.label)}</span>
                  <div class="metric-value">${escapeHtml(nextMonth.simpleOutlook.temperature)}</div>
                  <div class="metric-note">Mean temperature anomaly: ${formatTempDelta(nextMonth.temperatureAnomaly)}</div>
                </div>
                <div class="hero-metric">
                  <span class="metric-label">Precipitation</span>
                  <div class="metric-value">${escapeHtml(nextMonth.simpleOutlook.precipitation)}</div>
                  <div class="metric-note">Monthly anomaly: ${formatMm(nextMonth.precipitationAnomaly)}</div>
                </div>
              </div>
              <div class="panel-card" style="padding:1rem;margin-top:1rem;background:rgba(255,255,255,0.65);box-shadow:none;">
                <strong>Reading:</strong> if the short-range models disagree and the monthly outlook also leans wetter than normal, bias your planning toward the higher rain scenario.
              </div>
            `
            : "<p>Outlook data is not available yet.</p>"
        }
      </article>
    </div>
  `;
}

async function loadCityPayload(cityId) {
  if (state.cache.has(cityId)) {
    return state.cache.get(cityId);
  }

  const [forecast, history, outlook] = await Promise.all([
    loadJson(`./data/forecast/latest/${cityId}.json`),
    loadJson(`./data/history/rolling-30/${cityId}.json`),
    loadJson(`./data/outlook/${cityId}.json`)
  ]);

  const payload = { forecast, history, outlook };
  state.cache.set(cityId, payload);
  return payload;
}

async function selectCity(cityId) {
  const requestToken = ++state.requestToken;
  state.selectedCityId = cityId;
  history.replaceState(null, "", `#${cityId}`);
  renderCityList();
  const payload = await loadCityPayload(cityId);
  if (requestToken !== state.requestToken) return;
  renderHero(payload);
  renderCompare(payload);
  renderHourly(payload);
  renderDaily(payload);
  renderMonth(payload);
}

function activateTab(tabName) {
  state.activeTab = tabName;
  document.querySelectorAll(".tab").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.tab === tabName);
  });
  ["compare", "hourly", "daily", "month"].forEach((name) => {
    byId(`panel-${name}`).classList.toggle("is-hidden", name !== tabName);
  });
}

async function init() {
  byId("panel-compare").innerHTML = byId("loading-panel").innerHTML;
  byId("panel-hourly").innerHTML = byId("loading-panel").innerHTML;
  byId("panel-daily").innerHTML = byId("loading-panel").innerHTML;
  byId("panel-month").innerHTML = byId("loading-panel").innerHTML;

  state.manifest = await loadJson("./data/manifest.json");
  state.manifest.models.forEach((model) => {
    modelAccent[model.id] = model.accent;
  });
  byId("manifest-stamp").textContent = `Snapshot board refreshed ${new Date(state.manifest.generatedAt).toLocaleString()}`;

  renderCityList();
  document.querySelectorAll(".tab").forEach((button) => {
    button.addEventListener("click", () => activateTab(button.dataset.tab));
  });

  const firstCity = location.hash.replace("#", "") || state.manifest.cities[0]?.id;
  await selectCity(firstCity);
  activateTab(state.activeTab);
}

init().catch((error) => {
  console.error(error);
  byId("hero").classList.remove("skeleton");
  byId("hero").innerHTML = `
    <div class="hero-copy">
      <p class="eyebrow">Load failure</p>
      <h2>Weather data is missing</h2>
      <p>The app shell loaded, but the generated JSON files are not available yet.</p>
      <p style="color:var(--danger);">${escapeHtml(error.message)}</p>
    </div>
  `;
});
