<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#073d58">
  <title>Pagham Beach Dashboard</title>

  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="style.css">
</head>

<body>
  <main class="dashboard">
    <div class="updated-panel" aria-live="polite">
      <span class="live-badge">Live</span>
      <strong id="last-updated">Loading…</strong>
      <small id="today-date"></small>
    </div>

    <section class="view view-current is-active" id="current-view" aria-label="Current conditions">
      <div class="cards">
      <article class="card windsurf-card">
        <div class="card-content">
          <div class="card-heading">
            <img class="small-icon" src="icons/windsurf.svg" alt="">
            <h2>Windsurf winds</h2>
          </div>

          <div class="windsurf-topline">
            <div class="windsurf-summary">
              <span class="condition-dot" id="condition-dot"></span>
              <strong id="windsurf-level">Loading</strong>
            </div>

            <div class="mini-data">
              <span><strong id="wind-speed">-- kt</strong><small>Wind</small></span>
              <span><strong id="wind-direction">--</strong><small>Dir</small></span>
              <span><strong id="wind-gusts">-- kt</strong><small>Gusts</small></span>
            </div>
          </div>

          <p id="windsurf-reason">Checking wind speed, gusts and direction.</p>

          <div class="windsurf-insights" aria-label="Windsurf learning details">
            <div class="windsurf-insight">
              <span>Best window</span>
              <strong id="best-windsurf-time">Checking</strong>
              <small id="best-windsurf-detail">Looking for a beginner-friendly window</small>
            </div>

            <div class="windsurf-insight wind-guide">
              <span>Beginner winds</span>
              <strong>6–12 kt</strong>
              <div class="range-track wind-range" aria-hidden="true">
                <i id="wind-range-marker"></i>
              </div>
              <small id="beginner-range-detail">Current wind: -- kt</small>
            </div>

            <div class="windsurf-insight gust-guide">
              <span>Gust explanation</span>
              <strong id="gust-warning">Checking</strong>
              <div class="range-track gust-range" aria-hidden="true">
                <i id="gust-range-marker"></i>
              </div>
              <small id="gust-detail">Comparing wind and gusts</small>
            </div>

            <div class="windsurf-insight direction-guide" id="shore-wind-insight">
              <span>Shore direction</span>
              <strong id="shore-wind-type">Checking</strong>
              <div class="shore-compass" aria-hidden="true">
                <em class="north">N</em>
                <em class="east">E</em>
                <em class="south">S</em>
                <em class="west">W</em>
                <i id="shore-wind-arrow"></i>
              </div>
            </div>
          </div>
        </div>
      </article>

      <article class="card tide-card">
        <img class="decorative-icon tide-wave" src="icons/tide-wave.png" alt="">
        <div class="card-content">
          <div class="card-heading">
            <img class="small-icon" src="icons/tide.svg" alt="">
            <h2>Tide</h2>
          </div>

          <div class="feature-value" id="tide-status">Loading</div>

          <div class="tide-times">
            <div>
              <span>Next high tide</span>
              <strong id="next-high-tide">--:--</strong>
            </div>
            <div>
              <span>Next low tide</span>
              <strong id="next-low-tide">--:--</strong>
            </div>
          </div>

          <div class="marine-safety-grid" aria-label="Wave and sea conditions">
            <div>
              <span>Wave height</span>
              <strong id="wave-height">-- m</strong>
            </div>
            <div>
              <span>Sea state</span>
              <strong id="sea-state">Checking</strong>
            </div>
            <div>
              <span>Chop</span>
              <strong id="chop-level">Checking</strong>
            </div>
            <div>
              <span>Wave period</span>
              <strong id="wave-period">-- s</strong>
            </div>
          </div>

          <p class="tide-safety-note" id="tide-safety-note">
            Check the tide direction, waves and local water movement before launching.
          </p>
        </div>
      </article>

      <article class="card temperature-card">
        <div class="card-content">
          <div class="card-heading">
            <img class="small-icon" src="icons/temperature.svg" alt="">
            <h2>Temperature</h2>
          </div>

          <div class="temperature-layout">
            <div class="weather-condition">
              <span class="weather-symbol" id="weather-symbol" aria-hidden="true">--</span>
              <strong id="weather-condition">Loading weather</strong>
            </div>

            <div class="temperature-grid">
              <div>
                <span>Air</span>
                <strong id="air-temperature">--°C</strong>
              </div>
              <div>
                <span>Sea</span>
                <strong id="sea-temperature">--°C</strong>
              </div>
            </div>

            <div class="rain-chance">
              <span>Rain chance</span>
              <strong id="rain-chance">--%</strong>
              <small id="rain-detail">Checking today's forecast</small>
            </div>
          </div>
        </div>
      </article>

      <article class="card pollution-card">
        <img class="decorative-icon buoy" src="icons/buoy.png" alt="">
        <div class="card-content">
          <div class="card-heading">
            <img class="small-icon" src="icons/pollution.svg" alt="">
            <h2>Pollution</h2>
          </div>

          <div class="status warning" id="pollution-status">Loading</div>

          <div class="pollution-checks" aria-label="Pollution check">
            <div>
              <span>EA warning</span>
              <strong id="ea-pollution-status">Checking</strong>
            </div>
          </div>

          <p id="pollution-detail" class="pollution-detail" aria-hidden="true"></p>
          <small class="card-note" id="pollution-updated" aria-hidden="true"></small>
        </div>
      </article>

      <article class="card sunset-card">
        <img class="decorative-icon sunset-art" src="icons/sunset-art.png" alt="">
        <div class="card-content">
          <div class="card-heading">
            <img class="small-icon" src="icons/sunset.svg" alt="">
            <h2>Sunset</h2>
          </div>

          <div class="sunset-time" id="sunset-time">--:--</div>
          <p id="daylight-remaining">Calculating daylight</p>
        </div>
      </article>
      </div>
    </section>

    <section class="view view-forecast" id="forecast-view" aria-label="Seven day windsurf forecast" aria-hidden="true">
      <article class="forecast-panel">
        <header class="forecast-heading">
          <div class="card-heading">
            <img class="small-icon" src="icons/windsurf.svg" alt="">
            <div>
              <h2>7 day windsurf forecast</h2>
              <p>Today and the next six days</p>
            </div>
          </div>
        </header>

        <div class="forecast-days" id="forecast-days" aria-live="polite">
          <p class="forecast-loading">Loading seven-day wind forecast…</p>
        </div>

        <footer class="forecast-legend" aria-label="Windsurf ratings">
          <span><i class="legend-good"></i>Beginner winds</span>
          <span><i class="legend-intermediate"></i>Intermediate winds</span>
          <span><i class="legend-advanced"></i>Advanced winds</span>
          <span><i class="legend-danger"></i>Offshore or high risk</span>
          <strong>Beginner range: 6–12 kt</strong>
        </footer>
      </article>
    </section>

    <button type="button" class="forecast-open-button" id="open-forecast" aria-controls="forecast-view">
      7 Day Forecast
    </button>

    <button type="button" class="forecast-back-button" id="back-to-dashboard" aria-controls="current-view">
      Back to dashboard
    </button>

    <footer>All data is advisory only. Check local conditions before entering the water.</footer>
  </main>

  <script src="script.js"></script>
</body>
</html>
