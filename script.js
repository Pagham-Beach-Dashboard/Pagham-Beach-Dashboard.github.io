const PAGHAM = {
  latitude: 50.769,
  longitude: -0.744,
  timezone: "Europe/London"
}

function getBackgroundForHour(hour) {
  if (hour >= 5 && hour < 9) return "morning.png"
  if (hour >= 9 && hour < 17) return "day.png"
  if (hour >= 17 && hour < 21) return "sunset.png"
  return "night.png"
}

function updateBackground() {
  const file = getBackgroundForHour(new Date().getHours())
  document.body.style.backgroundImage = `url("images/${file}")`
}

async function fetchJson(url) {
  const response = await fetch(url, { cache: "no-store" })

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`)
  }

  return response.json()
}

function fetchJsonp(url, timeout = 10000) {
  return new Promise((resolve, reject) => {
    const callbackName = `paghamJsonp_${Date.now()}_${Math.random().toString(36).slice(2)}`
    const separator = url.includes("?") ? "&" : "?"
    const script = document.createElement("script")

    const timer = window.setTimeout(() => {
      cleanUp()
      reject(new Error("JSONP request timed out"))
    }, timeout)

    function cleanUp() {
      window.clearTimeout(timer)
      delete window[callbackName]
      script.remove()
    }

    window[callbackName] = data => {
      cleanUp()
      resolve(data)
    }

    script.onerror = () => {
      cleanUp()
      reject(new Error("JSONP request failed"))
    }

    script.src = `${url}${separator}callback=${callbackName}&_=${Date.now()}`
    document.body.appendChild(script)
  })
}

async function loadWeather() {
  const url =
    "https://api.open-meteo.com/v1/forecast" +
    `?latitude=${PAGHAM.latitude}` +
    `&longitude=${PAGHAM.longitude}` +
    "&current=temperature_2m,weather_code,wind_speed_10m,wind_gusts_10m,wind_direction_10m" +
    "&hourly=wind_speed_10m,wind_gusts_10m,wind_direction_10m,precipitation_probability" +
    "&daily=sunset" +
    "&forecast_days=2" +
    "&wind_speed_unit=kn" +
    `&timezone=${encodeURIComponent(PAGHAM.timezone)}`

  const data = await fetchJson(url)
  const current = data.current

  document.getElementById("air-temperature").textContent = `${Math.round(current.temperature_2m)}°C`

  updateWeatherCondition(current.weather_code)
  updateWindsurfLevel(
    current.wind_speed_10m,
    current.wind_gusts_10m,
    current.wind_direction_10m
  )
  updateHourlyWeather(data.hourly)
  updateSunset(data.daily.sunset[0])
}

function updateWeatherCondition(code) {
  const conditions = {
    0: ["☀", "Clear"],
    1: ["🌤", "Mainly clear"],
    2: ["⛅", "Partly cloudy"],
    3: ["☁", "Overcast"],
    45: ["🌫", "Foggy"],
    48: ["🌫", "Foggy"],
    51: ["🌦", "Light drizzle"],
    53: ["🌦", "Drizzle"],
    55: ["🌧", "Heavy drizzle"],
    56: ["🌧", "Freezing drizzle"],
    57: ["🌧", "Freezing drizzle"],
    61: ["🌦", "Light rain"],
    63: ["🌧", "Rain"],
    65: ["🌧", "Heavy rain"],
    66: ["🌧", "Freezing rain"],
    67: ["🌧", "Freezing rain"],
    71: ["🌨", "Light snow"],
    73: ["🌨", "Snow"],
    75: ["❄", "Heavy snow"],
    77: ["🌨", "Snow grains"],
    80: ["🌦", "Light showers"],
    81: ["🌧", "Showers"],
    82: ["🌧", "Heavy showers"],
    85: ["🌨", "Snow showers"],
    86: ["🌨", "Heavy snow showers"],
    95: ["⛈", "Thunderstorms"],
    96: ["⛈", "Thunderstorms"],
    99: ["⛈", "Severe thunderstorms"]
  }

  const [symbol, label] = conditions[code] || ["🌤", "Current conditions"]
  document.getElementById("weather-symbol").textContent = symbol
  document.getElementById("weather-condition").textContent = label
}

function updateHourlyWeather(hourly) {
  const times = hourly?.time || []
  const winds = hourly?.wind_speed_10m || []
  const gusts = hourly?.wind_gusts_10m || []
  const directions = hourly?.wind_direction_10m || []
  const rain = hourly?.precipitation_probability || []
  const now = new Date()

  let start = times.findIndex(time => new Date(time) >= now)
  if (start < 0) start = 0

  const nextForecast = times
    .slice(start, start + 12)
    .map((time, index) => {
      const sourceIndex = start + index
      return {
        time: new Date(time),
        wind: Number(winds[sourceIndex]),
        gusts: Number(gusts[sourceIndex]),
        direction: Number(directions[sourceIndex])
      }
    })
    .filter(item =>
      Number.isFinite(item.time.getTime()) &&
      Number.isFinite(item.wind)
    )

  updateBestWindsurfWindow(nextForecast)

  const today = now.toDateString()
  const remainingTodayRain = times
    .map((time, index) => ({
      time: new Date(time),
      chance: Number(rain[index])
    }))
    .filter(item =>
      item.time >= now &&
      item.time.toDateString() === today &&
      Number.isFinite(item.chance)
    )

  const maximum = remainingTodayRain.length
    ? Math.max(...remainingTodayRain.map(item => item.chance))
    : null

  updateRainChance(maximum)
}

function normaliseDegrees(degrees) {
  return ((Number(degrees) % 360) + 360) % 360
}

function angleDifference(a, b) {
  return Math.abs(((normaliseDegrees(a) - normaliseDegrees(b) + 540) % 360) - 180)
}

function getPaghamShoreWind(direction) {
  if (!Number.isFinite(direction)) {
    return {
      label: "Unavailable",
      category: "unknown",
      status: "warning",
      description: "Wind direction unavailable"
    }
  }

  // Pagham East Beach faces approximately south-southeast.
  // Weather direction is where the wind comes FROM.
  const difference = angleDifference(direction, 157.5)

  if (difference <= 30) {
    return {
      label: "Onshore",
      category: "onshore",
      status: "good",
      description: "Blowing towards the beach"
    }
  }

  if (difference <= 65) {
    return {
      label: "Cross-onshore",
      category: "cross-onshore",
      status: "good",
      description: "Blowing diagonally towards the beach"
    }
  }

  if (difference <= 115) {
    return {
      label: "Cross-shore",
      category: "cross-shore",
      status: "warning",
      description: "Blowing mostly along the beach"
    }
  }

  if (difference <= 150) {
    return {
      label: "Cross-offshore",
      category: "cross-offshore",
      status: "warning",
      description: "Blowing diagonally out to sea"
    }
  }

  return {
    label: "Offshore",
    category: "offshore",
    status: "danger",
    description: "Blowing out to sea"
  }
}

function assessWindsurfConditions(wind, gusts, direction) {
  const speed = Number(wind)
  const gustSpeed = Number.isFinite(Number(gusts)) ? Number(gusts) : speed
  const gustGap = Math.max(0, gustSpeed - speed)
  const shoreWind = getPaghamShoreWind(Number(direction))

  if (!Number.isFinite(speed)) {
    return {
      level: "Unavailable",
      status: "danger",
      reason: "Wind data could not be loaded.",
      beginnerFriendly: false,
      shoreWind,
      gustGap
    }
  }

  let level
  let status
  let reason

  if (speed < 6) {
    level = "No wind"
    status = "good"
    reason = "Too little wind for normal windsurfing, although it may suit basic sail handling close to shore."
  } else if (speed < 12 && gustGap <= 5) {
    level = "Beginner winds"
    status = "good"
    reason = "Suitable for beginner practice with supervision."
  } else if (speed < 20 && gustGap <= 8) {
    level = "Intermediate winds"
    status = "intermediate"
    reason = "More demanding conditions requiring confident turning, uphauling and sail control."
  } else {
    level = "Advanced winds"
    status = "advanced"
    reason = "Strong or very gusty conditions suited to experienced windsurfers with appropriate equipment."
  }

  if (shoreWind.category === "cross-offshore") {
    if (level === "Beginner winds" || level === "No wind") {
      level = "Intermediate winds"
      status = "intermediate"
    }
    reason = "Cross-offshore wind can make returning to the beach more difficult."
  }

  if (shoreWind.category === "offshore") {
    level = "Advanced winds"
    status = "danger"
    reason = "Offshore wind can carry you away from the beach and is unsuitable for learners."
  }

  const beginnerFriendly =
    speed >= 6 &&
    speed < 12 &&
    gustGap <= 5 &&
    shoreWind.category !== "offshore" &&
    shoreWind.category !== "cross-offshore"

  return {
    level,
    status,
    reason,
    beginnerFriendly,
    shoreWind,
    gustGap
  }
}

function updateBestWindsurfWindow(forecast) {
  const timeElement = document.getElementById("best-windsurf-time")
  const detailElement = document.getElementById("best-windsurf-detail")
  const insight = timeElement.closest(".windsurf-insight")

  insight.classList.remove("good", "warning", "danger")

  if (forecast.length < 2) {
    timeElement.textContent = "Unavailable"
    detailElement.textContent = "Hourly wind forecast could not be loaded"
    insight.classList.add("warning")
    return
  }

  const assessed = forecast.map(item => ({
    ...item,
    assessment: assessWindsurfConditions(item.wind, item.gusts, item.direction)
  }))

  const runs = []
  let activeRun = []

  for (const item of assessed) {
    if (item.assessment.beginnerFriendly) {
      activeRun.push(item)
    } else {
      if (activeRun.length) runs.push(activeRun)
      activeRun = []
    }
  }

  if (activeRun.length) runs.push(activeRun)

  const best = runs
    .slice()
    .sort((a, b) => {
      if (b.length !== a.length) return b.length - a.length
      return averageGustGap(a) - averageGustGap(b)
    })[0]

  if (best && best.length >= 2) {
    const start = best[0].time
    const end = new Date(best[best.length - 1].time.getTime() + 60 * 60 * 1000)
    const winds = best.map(item => item.wind)
    const maxGust = Math.max(...best.map(item =>
      Number.isFinite(item.gusts) ? item.gusts : item.wind
    ))

    timeElement.textContent = `${formatHour(start)}–${formatHour(end)}`
    detailElement.textContent =
      `${Math.round(Math.min(...winds))}–${Math.round(Math.max(...winds))} kt, gusts to ${Math.round(maxGust)} kt`
    insight.classList.add("good")
    return
  }

  if (best && best.length === 1) {
    const item = best[0]
    timeElement.textContent = `Around ${formatHour(item.time)}`
    detailElement.textContent = `A short beginner window at about ${Math.round(item.wind)} kt`
    insight.classList.add("warning")
    return
  }

  timeElement.textContent = "No beginner window"
  detailElement.textContent = diagnoseNoBeginnerWindow(assessed)
  insight.classList.add("warning")
}

function averageGustGap(items) {
  const gaps = items
    .map(item => Number.isFinite(item.gusts) ? item.gusts - item.wind : 0)
    .filter(Number.isFinite)

  return gaps.length
    ? gaps.reduce((total, value) => total + value, 0) / gaps.length
    : 0
}

function diagnoseNoBeginnerWindow(forecast) {
  const winds = forecast.map(item => item.wind).filter(Number.isFinite)
  const assessments = forecast.map(item =>
    item.assessment || assessWindsurfConditions(item.wind, item.gusts, item.direction)
  )

  if (!winds.length) return "Wind forecast unavailable"
  if (assessments.every(item => item.shoreWind.category === "offshore")) {
    return "Wind stays offshore at Pagham"
  }
  if (assessments.some(item => item.shoreWind.category === "offshore")) {
    return "Some forecast periods are offshore"
  }
  if (assessments.some(item => item.shoreWind.category === "cross-offshore")) {
    return "Wind is cross-offshore for part of the forecast"
  }
  if (Math.max(...winds) < 6) return "No usable wind forecast"
  if (Math.min(...winds) >= 12) return "Wind stays above the beginner range"
  if (Math.max(...assessments.map(item => item.gustGap)) > 5) {
    return "Gusts stay too strong for steady beginner practice"
  }
  return "Conditions move in and out of the beginner range"
}

function formatHour(date) {
  return date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit"
  })
}

function drawWindTrend(values) {
  const line = document.getElementById("wind-trend-line")
  const label = document.getElementById("wind-trend-label")

  if (!line || !label) return

  if (values.length < 2) {
    line.setAttribute("points", "")
    label.textContent = "Trend unavailable"
    return
  }

  const width = 600
  const top = 7
  const bottom = 38
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = Math.max(1, max - min)

  const points = values.map((value, index) => {
    const x = index * (width / (values.length - 1))
    const y = bottom - ((value - min) / range) * (bottom - top)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(" ")

  line.setAttribute("points", points)

  const change = values[values.length - 1] - values[0]
  const peak = Math.max(...values)
  const low = Math.min(...values)

  if (change >= 2) label.textContent = `Building to ${Math.round(values[values.length - 1])} kt`
  else if (change <= -2) label.textContent = `Dropping to ${Math.round(values[values.length - 1])} kt`
  else if (peak - low >= 5) label.textContent = "Up and down"
  else label.textContent = "Mostly steady"
}
function updateRainChance(chance) {
  const value = document.getElementById("rain-chance")
  const detail = document.getElementById("rain-detail")

  if (!Number.isFinite(chance)) {
    value.textContent = "--%"
    detail.textContent = "Rain forecast unavailable"
    return
  }

  value.textContent = `${Math.round(chance)}%`

  if (chance < 20) detail.textContent = "No rain expected today"
  else if (chance < 50) detail.textContent = "A small chance of rain today"
  else if (chance < 75) detail.textContent = "Rain is possible later today"
  else detail.textContent = "Rain is likely today"
}

async function loadMarineAndTides() {
  const url =
    "https://marine-api.open-meteo.com/v1/marine" +
    `?latitude=${PAGHAM.latitude}` +
    `&longitude=${PAGHAM.longitude}` +
    "&current=sea_surface_temperature,sea_level_height_msl,wave_height,wave_direction,wave_period,wind_wave_height,wind_wave_period,swell_wave_height" +
    "&minutely_15=sea_level_height_msl" +
    "&forecast_days=3" +
    `&timezone=${encodeURIComponent(PAGHAM.timezone)}`

  const data = await fetchJson(url)
  const seaTemperature = data.current?.sea_surface_temperature

  document.getElementById("sea-temperature").textContent = Number.isFinite(seaTemperature)
    ? `${Math.round(seaTemperature)}°C`
    : "Unavailable"

  updateMarineSafety({
    waveHeight: Number(data.current?.wave_height),
    waveDirection: Number(data.current?.wave_direction),
    wavePeriod: Number(data.current?.wave_period),
    windWaveHeight: Number(data.current?.wind_wave_height),
    windWavePeriod: Number(data.current?.wind_wave_period),
    swellWaveHeight: Number(data.current?.swell_wave_height)
  })

  const times = data.minutely_15?.time ?? []
  const heights = data.minutely_15?.sea_level_height_msl ?? []

  if (times.length < 5 || heights.length !== times.length) {
    throw new Error("Tide forecast data was incomplete")
  }

  updateTideDisplay(times, heights)
}

function getSeaState(waveHeight) {
  if (!Number.isFinite(waveHeight)) return "Unavailable"
  if (waveHeight < 0.5) return "Smooth"
  if (waveHeight < 1.25) return "Slight"
  if (waveHeight < 2.5) return "Moderate"
  if (waveHeight < 4) return "Rough"
  return "Very rough"
}

function getChopLevel({ waveHeight, wavePeriod, windWaveHeight, windWavePeriod }) {
  if (!Number.isFinite(waveHeight) || waveHeight <= 0) return "Unavailable"

  const windWaveShare = Number.isFinite(windWaveHeight)
    ? Math.max(0, Math.min(1, windWaveHeight / waveHeight))
    : null

  const effectivePeriod = Number.isFinite(windWavePeriod)
    ? windWavePeriod
    : wavePeriod

  if (
    (windWaveShare !== null && windWaveShare >= 0.65 && effectivePeriod < 5) ||
    (effectivePeriod < 4 && waveHeight >= 0.4)
  ) return "Choppy"

  if (
    (windWaveShare !== null && windWaveShare >= 0.4) ||
    effectivePeriod < 6
  ) return "Some chop"

  return "Cleaner waves"
}

function updateMarineSafety(values) {
  const waveHeight = document.getElementById("wave-height")
  const seaState = document.getElementById("sea-state")
  const chop = document.getElementById("chop-level")
  const period = document.getElementById("wave-period")

  waveHeight.textContent = Number.isFinite(values.waveHeight)
    ? `${values.waveHeight.toFixed(1)} m`
    : "-- m"

  seaState.textContent = getSeaState(values.waveHeight)
  chop.textContent = getChopLevel(values)
  period.textContent = Number.isFinite(values.wavePeriod)
    ? `${Math.round(values.wavePeriod)} s`
    : "-- s"
}

function updateTideDisplay(times, heights) {
  const points = times
    .map((time, index) => ({
      time: new Date(time),
      height: Number(heights[index])
    }))
    .filter(point =>
      Number.isFinite(point.time.getTime()) &&
      Number.isFinite(point.height)
    )

  if (points.length < 5) {
    throw new Error("Not enough valid tide points")
  }

  const now = new Date()
  const currentIndex = findNearestFutureIndex(points, now)

  const isRising = currentIndex < points.length - 1
    ? points[currentIndex + 1].height >= points[currentIndex].height
    : points[currentIndex].height >= points[currentIndex - 1].height

  const events = findTideEvents(points)
  const nextHigh = events.find(event => event.type === "high" && event.time > now)
  const nextLow = events.find(event => event.type === "low" && event.time > now)

  document.getElementById("tide-status").textContent = isRising ? "Rising" : "Falling"
  document.getElementById("next-high-tide").textContent = nextHigh ? formatTideTime(nextHigh.time) : "--:--"
  document.getElementById("next-low-tide").textContent = nextLow ? formatTideTime(nextLow.time) : "--:--"
  document.querySelector(".tide-card").classList.toggle("rising", isRising)

  const nextTurn = isRising ? nextHigh : nextLow
  const safetyNote = document.getElementById("tide-safety-note")
  if (safetyNote) {
    if (nextTurn) {
      const minutes = Math.max(0, Math.round((nextTurn.time - now) / 60000))
      const hoursPart = Math.floor(minutes / 60)
      const minutesPart = minutes % 60
      const timeText = hoursPart
        ? `${hoursPart} hr ${minutesPart} min`
        : `${minutesPart} min`

      safetyNote.textContent = isRising
        ? `Tide is rising, with high water in about ${timeText}. Allow for a shrinking beach and changing water movement.`
        : `Tide is falling, with low water in about ${timeText}. Allow for increasing distance from the beach and changing water movement.`
    } else {
      safetyNote.textContent = `Tide is ${isRising ? "rising" : "falling"}. Check local water movement before launching.`
    }
  }
}

function findNearestFutureIndex(points, now) {
  const futureIndex = points.findIndex(point => point.time >= now)
  return futureIndex === -1 ? points.length - 1 : Math.max(0, futureIndex)
}

function findTideEvents(points) {
  const events = []

  for (let index = 1; index < points.length - 1; index += 1) {
    const previous = points[index - 1]
    const current = points[index]
    const next = points[index + 1]

    if (current.height >= previous.height && current.height > next.height) {
      events.push({ type: "high", time: current.time, height: current.height })
    }

    if (current.height <= previous.height && current.height < next.height) {
      events.push({ type: "low", time: current.time, height: current.height })
    }
  }

  return removeDuplicateEvents(events)
}

function removeDuplicateEvents(events) {
  const filtered = []

  for (const event of events) {
    const previous = filtered[filtered.length - 1]

    if (
      previous &&
      previous.type === event.type &&
      event.time - previous.time < 90 * 60 * 1000
    ) {
      const shouldReplace = event.type === "high"
        ? event.height > previous.height
        : event.height < previous.height

      if (shouldReplace) filtered[filtered.length - 1] = event
      continue
    }

    filtered.push(event)
  }

  return filtered
}

function formatTideTime(date) {
  return date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit"
  })
}

async function loadPollutionRisk() {
  try {
    const ea = await loadEnvironmentAgencyPollution()
    updateCombinedPollutionDisplay(ea)
  } catch (error) {
    console.error("Pollution error:", error)
    showPollutionUnavailable()
  }
}
async function loadEnvironmentAgencyPollution() {
  const endpoint =
    "https://environment.data.gov.uk/doc/bathing-water-quality/advice-against-bathing/bathing-water/ukj2402-15800/situations.json" +
    "?_view=situation-details"

  const data = await fetchJsonp(endpoint)
  const items = getEldaItems(data)

  if (!items.length) {
    return {
      level: "clear",
      label: "Clear",
      detail: "",
      updated: null
    }
  }

  return parseEnvironmentAgencySituation(items[0])
}

function parseEnvironmentAgencySituation(situation) {
  const typeText = firstText(
    situation.type?.label,
    situation.type?.name,
    situation.riskLevel?.name,
    situation.riskLevel?.label,
    situation.incidentType?.label,
    situation.label,
    situation.name
  ).toLowerCase()

  const expiry = parseDateValue(firstText(
    situation.expiresAt,
    situation.expectedEndOfIncident,
    situation.endOfIncident,
    situation.expectedEndOfSuspension,
    situation.endOfSuspension
  ))

  const updatedTime = parseDateValue(firstText(
    situation.predictedAt,
    situation.predictedOn,
    situation.recordDateTime,
    situation.recordDate
  ))

  if (typeText.includes("risk")) {
    return {
      level: "danger",
      label: "Increased risk",
      detail: expiry
        ? `EA temporary pollution risk forecast until ${formatForecastExpiry(expiry)}.`
        : "EA temporary pollution risk forecast for Pagham.",
      updated: updatedTime
    }
  }

  if (typeText.includes("suspension")) {
    return {
      level: "danger",
      label: "Do not swim",
      detail: "Environment Agency monitoring is currently suspended at this bathing water.",
      updated: updatedTime
    }
  }

  return {
    level: "danger",
    label: "EA alert",
    detail: expiry
      ? `Environment Agency pollution alert active until ${formatForecastExpiry(expiry)}.`
      : "Environment Agency pollution alert active for Pagham.",
    updated: updatedTime
  }
}

function updateCombinedPollutionDisplay(ea) {
  const status = document.getElementById("pollution-status")
  const detail = document.getElementById("pollution-detail")
  const updated = document.getElementById("pollution-updated")
  const eaStatus = document.getElementById("ea-pollution-status")

  setSmallPollutionStatus(eaStatus, ea)

  if (ea.level === "danger") {
    status.textContent = "EA warning"
    status.className = "status danger"
  } else if (ea.level === "unknown") {
    status.textContent = "Could not check"
    status.className = "status warning"
  } else {
    status.textContent = "No EA warning"
    status.className = "status good"
  }

  if (detail) detail.textContent = ""
  if (updated) updated.textContent = ""
}
function setSmallPollutionStatus(element, check) {
  element.textContent = check.label
  element.classList.remove("good", "warning", "danger")

  if (check.level === "danger") element.classList.add("danger")
  else if (check.level === "unknown") element.classList.add("warning")
  else element.classList.add("good")
}

function getEldaItems(data) {
  if (Array.isArray(data?.result?.items)) return data.result.items
  if (Array.isArray(data?.items)) return data.items
  if (Array.isArray(data?.result?.item)) return data.result.item
  if (Array.isArray(data?.item)) return data.item
  return []
}

function firstText(...values) {
  for (const value of values) {
    const text = findNestedText(value)
    if (text) return text
  }

  return ""
}

function findNestedText(value, depth = 0) {
  if (depth > 5) return ""

  if (typeof value === "string") return value
  if (typeof value === "number") return String(value)

  if (value && typeof value === "object") {
    if (typeof value._value === "string") return value._value
    if (typeof value.value === "string") return value.value
    if (typeof value.label === "string") return value.label
    if (typeof value.name === "string") return value.name
    if (typeof value.notation === "string") return value.notation

    for (const item of Object.values(value)) {
      const result = findNestedText(item, depth + 1)
      if (result) return result
    }
  }

  return ""
}

function parseDateValue(value) {
  const text = String(value || "")
  if (!text) return null

  const date = new Date(text)
  return Number.isFinite(date.getTime()) ? date : null
}

function formatForecastExpiry(date) {
  return date.toLocaleString("en-GB", {
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit"
  })
}

function formatForecastUpdated(date) {
  return date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit"
  })
}


function showPollutionUnavailable() {
  const status = document.getElementById("pollution-status")
  status.textContent = "Could not check"
  status.className = "status warning"

  const eaStatus = document.getElementById("ea-pollution-status")

  if (eaStatus) {
    eaStatus.textContent = "Unavailable"
    eaStatus.classList.remove("good", "danger")
    eaStatus.classList.add("warning")
  }

  const detail = document.getElementById("pollution-detail")
  const updated = document.getElementById("pollution-updated")

  if (detail) detail.textContent = ""
  if (updated) updated.textContent = ""
}
function updateWindsurfLevel(wind, gusts, direction) {
  const assessment = assessWindsurfConditions(wind, gusts, direction)
  const compassDirection = degreesToCompass(direction)
  const levelElement = document.getElementById("windsurf-level")
  const dot = document.getElementById("condition-dot")

  levelElement.textContent = assessment.level
  document.getElementById("windsurf-reason").textContent = assessment.reason
  document.getElementById("wind-speed").textContent = `${Math.round(wind)} kt`
  document.getElementById("wind-gusts").textContent = `${Math.round(gusts)} kt`
  document.getElementById("wind-direction").textContent = compassDirection

  const colours = {
    good: "#1d833f",
    intermediate: "#d39216",
    advanced: "#ef6a2e",
    danger: "#bd2c24"
  }

  levelElement.style.color = colours[assessment.status]
  dot.style.background = colours[assessment.status]
  dot.classList.add("active")

  updateBeginnerRangeGuide(wind)
  updateGustWarning(wind, gusts)
  updateShoreWindGuide(direction)
}

function updateBeginnerRangeGuide(wind) {
  const detail = document.getElementById("beginner-range-detail")
  const marker = document.getElementById("wind-range-marker")

  if (!Number.isFinite(wind)) {
    detail.textContent = "Current wind unavailable"
    marker.style.left = "0%"
    return
  }

  const cappedWind = Math.max(0, Math.min(30, wind))
  marker.style.left = `${(cappedWind / 30) * 100}%`
  detail.textContent = `Current wind: ${Math.round(wind)} kt`
}

function updateGustWarning(wind, gusts) {
  const warning = document.getElementById("gust-warning")
  const detail = document.getElementById("gust-detail")
  const insight = warning.closest(".windsurf-insight")
  const difference = Number.isFinite(gusts) ? Math.max(0, gusts - wind) : null
  const ratio = wind > 0 && Number.isFinite(gusts) ? gusts / wind : 0

  insight.classList.remove("good", "warning", "danger")

  if (!Number.isFinite(difference)) {
    warning.textContent = "Unavailable"
    detail.textContent = "Gust data could not be loaded"
    updateGustRangeGuide(0)
    insight.classList.add("warning")
    return
  }

  updateGustRangeGuide(difference)

  if (difference <= 4) {
    warning.textContent = "Steady"
    detail.textContent = `Gusts are +${Math.round(difference)} kt. Sudden pulls should be easier to manage.`
    insight.classList.add("good")
  } else if (difference <= 8 && ratio < 1.8) {
    warning.textContent = "Gusty"
    detail.textContent = `Gusts are +${Math.round(difference)} kt. Expect stronger bursts on the sail.`
    insight.classList.add("warning")
  } else {
    warning.textContent = "Very gusty"
    detail.textContent = `Gusts are +${Math.round(difference)} kt and may pull the sail suddenly.`
    insight.classList.add("danger")
  }
}

function updateGustRangeGuide(difference) {
  const marker = document.getElementById("gust-range-marker")
  const cappedDifference = Math.max(0, Math.min(14, difference))
  marker.style.left = `${(cappedDifference / 14) * 100}%`
}

function updateShoreWindGuide(direction) {
  const type = document.getElementById("shore-wind-type")
  const arrow = document.getElementById("shore-wind-arrow")
  const insight = document.getElementById("shore-wind-insight")

  if (!type || !arrow || !insight) return

  insight.classList.remove("good", "warning", "danger")

  if (!Number.isFinite(direction)) {
    type.textContent = "Unavailable"
    arrow.style.transform = "translate(0,-50%) rotate(0deg)"
    insight.classList.add("warning")
    return
  }

  const compass = degreesToCompass(direction)
  const guide = getPaghamShoreWind(direction)

  type.textContent = `${guide.label} · ${compass}`
  arrow.setAttribute("title", guide.description)

  // Open-Meteo gives the direction the wind comes from.
  // Add 180 degrees so the arrow shows where it is blowing towards.
  arrow.style.transform = `translate(0,-50%) rotate(${normaliseDegrees(direction + 90)}deg)`
  insight.classList.add(guide.status)
}

function degreesToCompass(degrees) {
  if (!Number.isFinite(Number(degrees))) return "--"

  const directions = [
    "N", "NNE", "NE", "ENE",
    "E", "ESE", "SE", "SSE",
    "S", "SSW", "SW", "WSW",
    "W", "WNW", "NW", "NNW"
  ]

  return directions[Math.round(normaliseDegrees(degrees) / 22.5) % 16]
}

function updateSunset(value) {
  const sunset = new Date(value)
  const now = new Date()

  document.getElementById("sunset-time").textContent = sunset.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit"
  })

  const remaining = sunset - now

  if (remaining <= 0) {
    document.getElementById("daylight-remaining").textContent = "Sunset has passed"
    return
  }

  const hours = Math.floor(remaining / 3600000)
  const minutes = Math.floor((remaining % 3600000) / 60000)

  document.getElementById("daylight-remaining").textContent =
    `${hours} hr ${minutes} min of daylight remaining`
}

function updateClock() {
  const now = new Date()

  document.getElementById("last-updated").textContent = now.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit"
  })

  document.getElementById("today-date").textContent =
    `${now.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric"
    })} · just now`
}

function showTideUnavailable() {
  document.getElementById("tide-status").textContent = "Unavailable"
  document.getElementById("next-high-tide").textContent = "--:--"
  document.getElementById("next-low-tide").textContent = "--:--"
}

function animateRefresh() {
  document.querySelectorAll(".card").forEach(card => {
    card.classList.remove("data-refreshed")
    void card.offsetWidth
    card.classList.add("data-refreshed")
  })
}

async function refreshDashboard() {
  const results = await Promise.allSettled([
    loadWeather(),
    loadMarineAndTides(),
    loadPollutionRisk()
  ])

  if (results[0].status === "rejected") {
    console.error("Weather error:", results[0].reason)
    document.getElementById("windsurf-level").textContent = "Unavailable"
    document.getElementById("windsurf-reason").textContent = "Weather data could not be loaded."
    document.getElementById("air-temperature").textContent = "Unavailable"
    document.getElementById("weather-condition").textContent = "Weather unavailable"
    document.getElementById("weather-symbol").textContent = "--"
    document.getElementById("best-windsurf-time").textContent = "Unavailable"
    document.getElementById("best-windsurf-detail").textContent = "Hourly wind forecast could not be loaded"
    document.getElementById("gust-warning").textContent = "Unavailable"
    document.getElementById("gust-detail").textContent = "Gust data could not be loaded"
    const shoreType = document.getElementById("shore-wind-type")
    if (shoreType) shoreType.textContent = "Unavailable"
    updateRainChance(null)
  }

  if (results[1].status === "rejected") {
    console.error("Marine or tide error:", results[1].reason)
    document.getElementById("sea-temperature").textContent = "Unavailable"
    showTideUnavailable()
  }

  if (results[2].status === "rejected") {
    console.error("Pollution-risk error:", results[2].reason)
    showPollutionUnavailable()
  }

  updateClock()
  updateBackground()
  animateRefresh()
}

updateBackground()
refreshDashboard()

setInterval(refreshDashboard, 30 * 60 * 1000)
setInterval(updateBackground, 10 * 60 * 1000)
