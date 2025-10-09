let selectedCACertFile = null;
let selectedClientKeyFile = null;

// Sensor protocol to sensor mapping
const sensorProtocolMap = {
  I2C: ["BME680", "VEML7700"],
  ADC: ["Battery Voltage", "Rain Gauge"],
  RS232: ["Ultrasonic Sensor"],
  RS485: [],
  SPI: [],
};

// Track sensor presence and data
let sensorStatus = {
  I2C: { BME680: false, VEML7700: false },
  ADC: { "Battery Voltage": false, "Rain Gauge": false },
  RS232: { "Ultrasonic Sensor": false },
  RS485: {},
  SPI: {},
};

let sensorData = { I2C: {}, ADC: {}, RS232: {}, RS485: {}, SPI: {} };
let currentTemperature = null;
let currentHumidity   = null;
let currentPressure   = null;
let currentLight      = null;
let isConnected = false;
let currentBaud = 115200;
let currentPort = "";

/* ------------------------------------------------------------------ */
/*  MAIN UI UPDATE                                                    */
/* ------------------------------------------------------------------ */
function updateSensorUI() {
  const protocol = document.getElementById("sensor-select").value;
  const sensorListDiv = document.getElementById("sensor-list");
  const sensorDataDiv = document.getElementById("sensor-data");

  const thermometerContainer = document.getElementById("thermometer-container");
  const humidityCard = document.getElementById("humidity-card");
  const pressureCard = document.getElementById("pressure-card");
  const lightCard = document.getElementById("light-card");
  const batteryCard = document.getElementById("battery-card");
  const rainGaugeHourlyCard = document.getElementById("rain-gauge-hourly-card");
  const rainGaugeDailyCard = document.getElementById("rain-gauge-daily-card");
  const rainGaugeWeeklyCard = document.getElementById("rain-gauge-weekly-card");
  const calibrationSection = document.getElementById("calibration-section");

  const thermometerFill = document.getElementById("thermometer-fill");
  const thermometerBulb = document.getElementById("thermometer-bulb");
  const thermometerValue = document.getElementById("thermometer-value");

  const humidityValue = document.getElementById("humidity-value");
  const wavePath = document.getElementById("wavePath");
  const waveColor1 = document.getElementById("waveColor1");
  const waveColor2 = document.getElementById("waveColor2");

  const pressureValue = document.getElementById("pressure-value");
  const pressureBar = document.getElementById("pressure-bar");

  const lightValue = document.getElementById("light-value");
  const sunCircle = document.getElementById("sun-circle");
  const glowFilter = document.getElementById("glow");
  const sunGradient = document.getElementById("sunGradient");
  const sparkles = document.getElementById("sparkles");

  const batteryValue = document.getElementById("battery-value");
  const batteryFill = document.getElementById("battery-fill");
  const rainGaugeHourlyValue = document.getElementById("rain-gauge-hourly-value");
  const rainGaugeDailyValue = document.getElementById("rain-gauge-daily-value");
  const rainGaugeWeeklyValue = document.getElementById("rain-gauge-weekly-value");

  sensorListDiv.innerHTML = "";
  if (sensorDataDiv) sensorDataDiv.innerHTML = "";

  /* ---------- hide all cards by default ---------- */
  thermometerContainer.style.display = "none";
  humidityCard.style.display = "none";
  pressureCard.style.display = "none";
  lightCard.style.display = "none";
  batteryCard.style.display = "none";
  rainGaugeHourlyCard.style.display = "none";
  rainGaugeDailyCard.style.display = "none";
  rainGaugeWeeklyCard.style.display = "none";
  calibrationSection.style.display = "none";

  if (!protocol) {
    sensorListDiv.innerHTML = "<p>No protocol selected.</p>";
    if (sensorDataDiv) sensorDataDiv.innerHTML = "<p>No sensor data available.</p>";
    return;
  }

  /* ---------- sensor list ---------- */
  const sensors = sensorProtocolMap[protocol] || [];
  let listHtml = "<h4>Sensors</h4><ul>";
  sensors.forEach((s) => {
    const ok = sensorStatus[protocol][s];
    listHtml += `<li><i class="fas ${ok ? "fa-check text-success" : "fa-times text-error"}"></i> ${s}</li>`;
  });
  listHtml += "</ul>";
  sensorListDiv.innerHTML = sensors.length ? listHtml : "<p>No sensors available.</p>";

/* ---------- sensor data ---------- */
const data = sensorData[protocol];
let dataHtml = "<h4>Sensor Data</h4>";
let hasData = false;
for (const [k, v] of Object.entries(data)) {
  if (v !== null && v !== undefined && v !== "null" && v !== "") {
    // Include all valid sensor data for I2C, and specific data for ADC
    if (protocol === "I2C" || k.includes("Battery Voltage") || k.includes("Rainfall")) {
      dataHtml += `<div class="sensor-data-item"><strong>${k}:</strong> ${v}</div>`;
      hasData = true;
    }
  }
}
if (sensorDataDiv) sensorDataDiv.innerHTML = hasData ? dataHtml : "<p>No sensor data available.</p>";
  /* ---------- I2C-specific sensor cards ---------- */
  if (protocol === "I2C") {

    calibrationSection.style.display = "block";

    /* Temperature */
    if (currentTemperature !== null && !isNaN(parseFloat(currentTemperature))) {
      thermometerContainer.style.display = "block";
      const temp = parseFloat(currentTemperature);
      let color = temp < 18 ? "#3498db" : temp < 26 ? "#2ecc71" : temp < 32 ? "#f39c12" : "#e74c3c";
      const minT = -10, maxT = 50;
      const h = Math.min(Math.max((temp - minT) / (maxT - minT), 0), 1) * 160;

      thermometerFill.style.transition = "height .8s cubic-bezier(0.68,-0.55,0.27,1.55), y .8s cubic-bezier(0.68,-0.55,0.27,1.55)";
      thermometerBulb.style.transition = "fill .8s ease";
      thermometerContainer.style.setProperty("--glow", color);

      thermometerFill.setAttribute("y", 180 - h);
      thermometerFill.setAttribute("height", h);
      thermometerFill.setAttribute("fill", color);
      thermometerBulb.setAttribute("fill", color);

      thermometerValue.textContent = `${temp.toFixed(2)}°C`;
      thermometerContainer.classList.remove("shake");
      void thermometerContainer.offsetWidth;
      thermometerContainer.classList.add("shake");
    }

   /* Humidity */
if (currentHumidity !== null && !isNaN(parseFloat(currentHumidity))) {
  humidityCard.style.display = "block";
  const humidity = parseFloat(currentHumidity);
  humidityValue.textContent = `${humidity.toFixed(2)}%`;

  // Color interpolation based on humidity
  const t = Math.min(Math.max(humidity / 100, 0), 1);
  const lowColor = { r: 61, g: 142, b: 180 };
  const highColor = { r: 4, g: 116, b: 168 };
  const r = Math.round(lowColor.r + (highColor.r - lowColor.r) * t);
  const g = Math.round(lowColor.g + (highColor.g - lowColor.g) * t);
  const b = Math.round(lowColor.b + (highColor.b - lowColor.b) * t);
  const primaryColor = `rgb(${r}, ${g}, ${b})`;

  waveColor1.setAttribute("style", `stop-color: ${primaryColor}; stop-opacity: 0.5`);
  waveColor2.setAttribute("style", `stop-color: ${primaryColor}; stop-opacity: 1`);

  // Define continuous wave animation
  const waveAnimation = `
    @keyframes waveAnimation {
      0% { d: path("M 0 50 Q 25 45 50 50 T 100 50 V 100 H 0 Z"); }
      25% { d: path("M 0 50 Q 25 55 50 50 T 100 50 V 100 H 0 Z"); }
      50% { d: path("M 0 50 Q 25 45 50 50 T 100 50 V 100 H 0 Z"); }
      75% { d: path("M 0 50 Q 25 55 50 50 T 100 50 V 100 H 0 Z"); }
      100% { d: path("M 0 50 Q 25 45 50 50 T 100 50 V 100 H 0 Z"); }
    }
  `;

  // Insert or update the animation in the stylesheet
  let styleSheet = document.styleSheets[0];
  let existingRuleIndex = -1;
  for (let i = 0; i < styleSheet.cssRules.length; i++) {
    if (styleSheet.cssRules[i].name === "waveAnimation") {
      existingRuleIndex = i;
      break;
    }
  }
  if (existingRuleIndex !== -1) {
    styleSheet.deleteRule(existingRuleIndex);
  }
  styleSheet.insertRule(waveAnimation, styleSheet.cssRules.length);

  // Set wave height based on humidity
  const waveHeight = 100 - humidity;
  wavePath.setAttribute("d", `M 0 ${waveHeight} Q 25 ${waveHeight + 5} 50 ${waveHeight} T 100 ${waveHeight} V 100 H 0 Z`);

  // Apply and restart animation
  wavePath.style.animation = "waveAnimation 3s ease-in-out infinite";
  wavePath.style.animationPlayState = "running";
  wavePath.getBoundingClientRect(); // Force reflow to restart animation
} else {
  humidityCard.style.display = "none";
  humidityValue.textContent = "";
  waveColor1.setAttribute("style", `stop-color: #3d8eb4; stop-opacity: 0.5`);
  waveColor2.setAttribute("style", `stop-color: #0474a8; stop-opacity: 1`);
  wavePath.setAttribute("d", "M 0 50 Q 25 45 50 50 T 100 50 V 100 H 0 Z");

  // Apply continuous animation even when no data
  const waveAnimation = `
    @keyframes waveAnimation {
      0% { d: path("M 0 50 Q 25 45 50 50 T 100 50 V 100 H 0 Z"); }
      25% { d: path("M 0 50 Q 25 55 50 50 T 100 50 V 100 H 0 Z"); }
      50% { d: path("M 0 50 Q 25 45 50 50 T 100 50 V 100 H 0 Z"); }
      75% { d: path("M 0 50 Q 25 55 50 50 T 100 50 V 100 H 0 Z"); }
      100% { d: path("M 0 50 Q 25 45 50 50 T 100 50 V 100 H 0 Z"); }
    }
  `;

  let styleSheet = document.styleSheets[0];
  let existingRuleIndex = -1;
  for (let i = 0; i < styleSheet.cssRules.length; i++) {
    if (styleSheet.cssRules[i].name === "waveAnimation") {
      existingRuleIndex = i;
      break;
    }
  }
  if (existingRuleIndex !== -1) {
    styleSheet.deleteRule(existingRuleIndex);
  }
  styleSheet.insertRule(waveAnimation, styleSheet.cssRules.length);

  wavePath.style.animation = "waveAnimation 3s ease-in-out infinite";
  wavePath.style.animationPlayState = "running";
  wavePath.getBoundingClientRect(); // Force reflow to restart animation
}

    /* Pressure */
    if (currentPressure !== null && !isNaN(parseFloat(currentPressure))) {
      updatePressureCard(parseFloat(currentPressure));
    }

    /* ----------  show / update pressure card  ---------- */
    function updatePressureCard(hpa) {
      const card   = document.getElementById('pressure-card');
      const value  = document.getElementById('pressure-value');
      const needle = document.getElementById('pressureNeedle');

      if (hpa === null || isNaN(hpa)) {          // no data → hide
        card.style.display = 'none';
        return;
      }

      card.style.display = 'flex';               // show card
      value.textContent  = `${Number(hpa).toFixed(2)} hPa`;

      /* 300 hPa → 0° (left)   1100 hPa → 180° (right) */
      const minP = 300, maxP = 1100;
      const t    = Math.min(Math.max((hpa - minP) / (maxP - minP), 0), 1);
      /* 300 hPa → ‑90° (left)   1100 hPa → +90° (right) */
      const angle = (t * 180) - 90;          // ‑90° … +90°
      needle.style.transform = `translateX(-50%) rotate(${angle}deg)`;

      // optional tiny pulse on update (kept from your last code)
      needle.classList.remove('needle-update');
      void needle.offsetWidth;
      needle.classList.add('needle-update');
    }

    /* Light Intensity */
    if (currentLight !== null && !isNaN(parseFloat(currentLight))) {
      lightCard.style.display = "block";
      const light = parseFloat(currentLight);
      const maxLight = 120000;
      const brightness = Math.min(Math.max(light / maxLight, 0), 1);

      const sunSvg = document.getElementById("light-sun");
      const moonSvg = document.getElementById("light-moon");
      const sunCircle = document.getElementById("sun-circle");
      const sunGradient = document.getElementById("sunGradient");
      const sunGlow = document.getElementById("sunGlow");
      const moonShape = document.getElementById("moon-shape");
      const moonGradient = document.getElementById("moonGradient");
      const moonGlow = document.getElementById("moonGlow");
      const moonSparkles = document.getElementById("moon-sparkles");
      const sunRays = document.getElementById("sun-rays");

      // Toggle Sun/Moon based on light value
      if (light < 100) {
        // Show Moon
        sunSvg.style.display = "none";
        moonSvg.style.display = "block";
        // Moon color interpolation (dim to bright moonlight)
        const lowColor = { r: 230, g: 230, b: 250 }; // Lavender
        const highColor = { r: 70, g: 130, b: 180 }; // Steel Blue
        const t = light / 100; // Scale from 0 to 100 lux
        const r = Math.round(lowColor.r + (highColor.r - lowColor.r) * t);
        const g = Math.round(lowColor.g + (highColor.g - lowColor.g) * t);
        const b = Math.round(lowColor.b + (highColor.b - lowColor.b) * t);
        const moonColor = `rgb(${r}, ${g}, ${b})`;
        moonGradient.children[0].setAttribute("style", `stop-color:${moonColor}; stop-opacity:0.9`);
        moonGradient.children[1].setAttribute("style", `stop-color:${moonColor}; stop-opacity:0.6`);
        moonGradient.children[2].setAttribute("style", `stop-color:${moonColor}; stop-opacity:0.3`);
        moonGlow.setAttribute("stdDeviation", 4 + 2 * t); // Glow increases slightly with light
        moonSparkles.style.opacity = 0.5 + 0.5 * t; // Sparkles more visible at higher lux
      } else {
        // Show Sun
        sunSvg.style.display = "block";
        moonSvg.style.display = "none";
        // Sun color interpolation (yellow to orange-red)
        const lowColor = { r: 255, g: 235, b: 59 }; // Bright Yellow
        const highColor = { r: 255, g: 69, b: 0 }; // Orange-Red
        const t = Math.min((light - 100) / (maxLight - 100), 1); // Scale from 100 to maxLight
        const r = Math.round(lowColor.r + (highColor.r - lowColor.r) * t);
        const g = Math.round(lowColor.g + (highColor.g - lowColor.g) * t);
        const b = Math.round(lowColor.b + (highColor.b - lowColor.b) * t);
        const sunColor = `rgb(${r}, ${g}, ${b})`;
        sunGradient.children[0].setAttribute("style", `stop-color:${sunColor}; stop-opacity:1`);
        sunGradient.children[1].setAttribute("style", `stop-color:${sunColor}; stop-opacity:0.8`);
        sunGradient.children[2].setAttribute("style", `stop-color:${sunColor}; stop-opacity:0.4`);
        sunGlow.setAttribute("stdDeviation", 3 + 3 * brightness); // Glow increases with brightness
        sunCircle.setAttribute("r", 24 + 9 * brightness); // Sun size increases with brightness
        sunRays.style.opacity = 0.6 + 0.4 * brightness; // Rays more visible at higher brightness
        // Update ray color to darker shade based on sun color
        const rayR = Math.max(r - 50, 0); // Darken red component
        const rayG = Math.max(g - 50, 0); // Darken green component
        const rayB = Math.max(b - 50, 0); // Darken blue component
        const rayColor = `rgb(${rayR}, ${rayG}, ${rayB})`;
        const rays = sunRays.getElementsByClassName("sun-ray");
        for (let ray of rays) {
          ray.setAttribute("stroke", rayColor);
        }
      }

      lightValue.textContent = `${light.toFixed(2)} lux`;
    }
  } else if (protocol === "ADC") {

  /* Battery Voltage */
if (sensorData.ADC["Battery Voltage"] !== undefined && !isNaN(parseFloat(sensorData.ADC["Battery Voltage"].replace(" V", "")))) {
  batteryCard.style.display = "block";
  const voltage = parseFloat(sensorData.ADC["Battery Voltage"].replace(" V", ""));
  const maxVoltage = 4.2; // 100%
  const minVoltage = 3.0; // 0%

  let percentage;
  if (voltage >= maxVoltage) {
    percentage = 100.0;
  } else if (voltage <= minVoltage) {
    percentage = 0.0;
  } else {
    percentage = ((voltage - minVoltage) / (maxVoltage - minVoltage)) * 100.0;
  }

  const fillHeight = (percentage / 100) * 66; // Max height of fill is 66 (out of 70)

  batteryFill.style.transition = "height 0.8s ease, fill 0.8s ease";
  batteryFill.setAttribute("height", fillHeight);
  batteryFill.setAttribute("y", 20 + (66 - fillHeight)); // Start from top and grow downward

  let fillColor;
  if (percentage <= 50) {
    const t = percentage / 50;
    const r = Math.round(248 + (255 - 248) * t);
    const g = Math.round(113 + (235 - 113) * t);
    const b = Math.round(113 + (59 - 113) * t);
    fillColor = `rgb(${r}, ${g}, ${b})`;
  } else {
    const t = (percentage - 50) / 50;
    const r = Math.round(255 + (52 - 255) * t);
    const g = Math.round(235 + (211 - 235) * t);
    const b = Math.round(59 + (153 - 59) * t);
    fillColor = `rgb(${r}, ${g}, ${b})`;
  }
  batteryFill.setAttribute("fill", fillColor);
  batteryCard.style.setProperty("--glow", fillColor);

  batteryValue.textContent = `${voltage.toFixed(2)} V (${percentage.toFixed(0)}%)`;
  batteryCard.classList.remove("shake");
  void batteryCard.offsetWidth;
  batteryCard.classList.add("shake");
}

/* 🌧️ Hourly Rainfall Card */
if (
  sensorData.ADC["Rainfall Hourly"] !== undefined &&
  !isNaN(parseFloat(sensorData.ADC["Rainfall Hourly"].replace(" mm", "")))
) {
  rainGaugeHourlyCard.style.display = "block";
  const rainMm = parseFloat(sensorData.ADC["Rainfall Hourly"].replace(" mm", ""));
  rainGaugeHourlyValue.textContent = `${rainMm.toFixed(2)} mm`;

  // Dynamic color transition (light blue → deep blue)
  const maxMm = 25; // For hourly, reasonable max
  const t = Math.min(Math.max(rainMm / maxMm, 0), 1);
  const lowColor = { r: 30, g: 144, b: 255 };
  const highColor = { r: 0, g: 0, b: 139 };
  const r = Math.round(lowColor.r + (highColor.r - lowColor.r) * t);
  const g = Math.round(lowColor.g + (highColor.g - lowColor.g) * t);
  const b = Math.round(lowColor.b + (highColor.b - lowColor.b) * t);
  const primaryColor = `rgb(${r}, ${g}, ${b})`;
  const lightBlue = `rgb(${Math.min(r + 40, 255)}, ${Math.min(g + 40, 255)}, ${Math.min(b + 40, 255)})`;

  // ✅ Use an overlay div for raindrops
  let rainOverlay = document.getElementById("rain-hourly-overlay");
  if (!rainOverlay) {
    rainOverlay = document.createElement("div");
    rainOverlay.id = "rain-hourly-overlay";
    rainOverlay.style.position = "absolute";
    rainOverlay.style.inset = "0";
    rainOverlay.style.overflow = "hidden";
    rainOverlay.style.pointerEvents = "none";
    rainOverlay.style.zIndex = "1";
    rainGaugeHourlyCard.style.position = "relative";
    rainGaugeHourlyCard.appendChild(rainOverlay);
  }
  rainOverlay.innerHTML = "";

  // 🔹 Configure raindrop appearance based on rainfall intensity
  const baseDrops = 12;
  const extraDrops = Math.min(Math.floor(rainMm / 2), 40);
  const numDrops = baseDrops + extraDrops;

  const dropDuration = 2.5; // seconds
  const cardRect = rainGaugeHourlyCard.getBoundingClientRect();
  const width = cardRect.width;
  const height = cardRect.height;

  // Add CSS for animation if not already
  if (!document.getElementById("rainfall-style")) {
    const style = document.createElement("style");
    style.id = "rainfall-style";
    style.textContent = `
      @keyframes raindropFall {
        0% { transform: translateY(0); opacity: 1; }
        90% { opacity: 1; }
        100% { transform: translateY(var(--fallDistance)); opacity: 0; }
      }
    `;
    document.head.appendChild(style);
  }

  // 🔹 Create raindrops across the whole card
  for (let i = 0; i < numDrops; i++) {
    const drop = document.createElement("div");
    drop.className = "raindrop";
    const size = 4 + Math.random() * 2;
    drop.style.width = `${size}px`;
    drop.style.height = `${size * 1.6}px`;
    drop.style.background = `linear-gradient(${lightBlue}, ${primaryColor})`;
    drop.style.opacity = "0.8";
    drop.style.borderRadius = "50% / 60% 60% 40% 40%";
    drop.style.position = "absolute";

    const left = Math.random() * width;
    const startY = -Math.random() * height * 0.3;
    const fallDistance = `${height + 30}px`;
    const duration = (1.2 + Math.random() * 2).toFixed(2) + "s";
    const delay = (Math.random() * 2).toFixed(2) + "s";

    drop.style.left = `${left}px`;
    drop.style.top = `${startY}px`;
    drop.style.animation = `raindropFall ${duration} linear infinite`;
    drop.style.animationDelay = delay;
    drop.style.setProperty("--fallDistance", fallDistance);

    rainOverlay.appendChild(drop);
  }
} else {
  rainGaugeHourlyCard.style.display = "none";
}

/* 🌧️ Daily Rainfall Card */
if (
  sensorData.ADC["Rainfall Daily"] !== undefined &&
  !isNaN(parseFloat(sensorData.ADC["Rainfall Daily"].replace(" mm", "")))
) {
  rainGaugeDailyCard.style.display = "block";
  const rainMm = parseFloat(sensorData.ADC["Rainfall Daily"].replace(" mm", ""));
  rainGaugeDailyValue.textContent = `${rainMm.toFixed(2)} mm`;

  // Dynamic color transition (light blue → deep blue)
  const maxMm = 100; // Higher max for daily
  const t = Math.min(Math.max(rainMm / maxMm, 0), 1);
  const lowColor = { r: 30, g: 144, b: 255 };
  const highColor = { r: 0, g: 0, b: 139 };
  const r = Math.round(lowColor.r + (highColor.r - lowColor.r) * t);
  const g = Math.round(lowColor.g + (highColor.g - lowColor.g) * t);
  const b = Math.round(lowColor.b + (highColor.b - lowColor.b) * t);
  const primaryColor = `rgb(${r}, ${g}, ${b})`;
  const lightBlue = `rgb(${Math.min(r + 40, 255)}, ${Math.min(g + 40, 255)}, ${Math.min(b + 40, 255)})`;

  // ✅ Use an overlay div for raindrops
  let rainOverlay = document.getElementById("rain-daily-overlay");
  if (!rainOverlay) {
    rainOverlay = document.createElement("div");
    rainOverlay.id = "rain-daily-overlay";
    rainOverlay.style.position = "absolute";
    rainOverlay.style.inset = "0";
    rainOverlay.style.overflow = "hidden";
    rainOverlay.style.pointerEvents = "none";
    rainOverlay.style.zIndex = "1";
    rainGaugeDailyCard.style.position = "relative";
    rainGaugeDailyCard.appendChild(rainOverlay);
  }
  rainOverlay.innerHTML = "";

  // 🔹 Configure raindrop appearance based on rainfall intensity
  const baseDrops = 12;
  const extraDrops = Math.min(Math.floor(rainMm / 2), 40);
  const numDrops = baseDrops + extraDrops;

  const dropDuration = 2.5; // seconds
  const cardRect = rainGaugeDailyCard.getBoundingClientRect();
  const width = cardRect.width;
  const height = cardRect.height;

  // Add CSS for animation if not already (already checked above)

  // 🔹 Create raindrops across the whole card
  for (let i = 0; i < numDrops; i++) {
    const drop = document.createElement("div");
    drop.className = "raindrop";
    const size = 4 + Math.random() * 2;
    drop.style.width = `${size}px`;
    drop.style.height = `${size * 1.6}px`;
    drop.style.background = `linear-gradient(${lightBlue}, ${primaryColor})`;
    drop.style.opacity = "0.8";
    drop.style.borderRadius = "50% / 60% 60% 40% 40%";
    drop.style.position = "absolute";

    const left = Math.random() * width;
    const startY = -Math.random() * height * 0.3;
    const fallDistance = `${height + 30}px`;
    const duration = (1.2 + Math.random() * 2).toFixed(2) + "s";
    const delay = (Math.random() * 2).toFixed(2) + "s";

    drop.style.left = `${left}px`;
    drop.style.top = `${startY}px`;
    drop.style.animation = `raindropFall ${duration} linear infinite`;
    drop.style.animationDelay = delay;
    drop.style.setProperty("--fallDistance", fallDistance);

    rainOverlay.appendChild(drop);
  }
} else {
  rainGaugeDailyCard.style.display = "none";
}

/* 🌧️ Weekly Rainfall Card */
if (
  sensorData.ADC["Rainfall Weekly"] !== undefined &&
  !isNaN(parseFloat(sensorData.ADC["Rainfall Weekly"].replace(" mm", "")))
) {
  rainGaugeWeeklyCard.style.display = "block";
  const rainMm = parseFloat(sensorData.ADC["Rainfall Weekly"].replace(" mm", ""));
  rainGaugeWeeklyValue.textContent = `${rainMm.toFixed(2)} mm`;

  // Dynamic color transition (light blue → deep blue)
  const maxMm = 500; // Even higher max for weekly
  const t = Math.min(Math.max(rainMm / maxMm, 0), 1);
  const lowColor = { r: 30, g: 144, b: 255 };
  const highColor = { r: 0, g: 0, b: 139 };
  const r = Math.round(lowColor.r + (highColor.r - lowColor.r) * t);
  const g = Math.round(lowColor.g + (highColor.g - lowColor.g) * t);
  const b = Math.round(lowColor.b + (highColor.b - lowColor.b) * t);
  const primaryColor = `rgb(${r}, ${g}, ${b})`;
  const lightBlue = `rgb(${Math.min(r + 40, 255)}, ${Math.min(g + 40, 255)}, ${Math.min(b + 40, 255)})`;

  // ✅ Use an overlay div for raindrops
  let rainOverlay = document.getElementById("rain-weekly-overlay");
  if (!rainOverlay) {
    rainOverlay = document.createElement("div");
    rainOverlay.id = "rain-weekly-overlay";
    rainOverlay.style.position = "absolute";
    rainOverlay.style.inset = "0";
    rainOverlay.style.overflow = "hidden";
    rainOverlay.style.pointerEvents = "none";
    rainOverlay.style.zIndex = "1";
    rainGaugeWeeklyCard.style.position = "relative";
    rainGaugeWeeklyCard.appendChild(rainOverlay);
  }
  rainOverlay.innerHTML = "";

  // 🔹 Configure raindrop appearance based on rainfall intensity
  const baseDrops = 12;
  const extraDrops = Math.min(Math.floor(rainMm / 2), 40);
  const numDrops = baseDrops + extraDrops;

  const dropDuration = 2.5; // seconds
  const cardRect = rainGaugeWeeklyCard.getBoundingClientRect();
  const width = cardRect.width;
  const height = cardRect.height;

  // Add CSS for animation if not already (already checked above)

  // 🔹 Create raindrops across the whole card
  for (let i = 0; i < numDrops; i++) {
    const drop = document.createElement("div");
    drop.className = "raindrop";
    const size = 4 + Math.random() * 2;
    drop.style.width = `${size}px`;
    drop.style.height = `${size * 1.6}px`;
    drop.style.background = `linear-gradient(${lightBlue}, ${primaryColor})`;
    drop.style.opacity = "0.8";
    drop.style.borderRadius = "50% / 60% 60% 40% 40%";
    drop.style.position = "absolute";

    const left = Math.random() * width;
    const startY = -Math.random() * height * 0.3;
    const fallDistance = `${height + 30}px`;
    const duration = (1.2 + Math.random() * 2).toFixed(2) + "s";
    const delay = (Math.random() * 2).toFixed(2) + "s";

    drop.style.left = `${left}px`;
    drop.style.top = `${startY}px`;
    drop.style.animation = `raindropFall ${duration} linear infinite`;
    drop.style.animationDelay = delay;
    drop.style.setProperty("--fallDistance", fallDistance);

    rainOverlay.appendChild(drop);
  }
} else {
  rainGaugeWeeklyCard.style.display = "none";
}

  
/* ☀️ Light Card Reset (unchanged) */
if (sensorData.ADC["Light Intensity"] === undefined) {
  lightCard.style.display = "none";
  lightValue.textContent = "N/A";
  sunCircle.setAttribute("r", 20);
  glowFilter.setAttribute("stdDeviation", 5);
  sunGradient.children[0].setAttribute("style", "stop-color:#ffd700; stop-opacity:0.9");
  sunGradient.children[1].setAttribute("style", "stop-color:#ff8c00; stop-opacity:0.4");
  sunGradient.children[2].setAttribute("style", "stop-color:#ff4500; stop-opacity:0");
  lightCard.querySelector("rect").style.filter = "brightness(1)";
  sparkles.style.opacity = 0;
}
  }}
/* ------------------------------------------------------------------ */
/*  DATA PARSER                                                       */
/* ------------------------------------------------------------------ */
function parseSensorData(data) {
  const protocol = document.getElementById("sensor-select").value;
  if (!protocol) return;

  const lines = data.split("\n").map((line) => line.trim()).filter((line) => line);
  lines.forEach((line) => {
    // Handle calibration responses (only for I2C)
    if (protocol === "I2C") {
      if (line.startsWith("TEMP_CALIBRATION:")) {
        const val = parseFloat(line.split(":")[1].trim());
        if (!isNaN(val)) {
          document.getElementById("temp-offset").value = val;
          log(`Temperature calibration offset: ${val} °C`, "info");
        }
        return;
      } else if (line.startsWith("HUM_CALIBRATION:")) {
        const val = parseFloat(line.split(":")[1].trim());
        if (!isNaN(val)) {
          document.getElementById("hum-offset").value = val;
          log(`Humidity calibration offset: ${val} %`, "info");
        }
        return;
      } else if (line.startsWith("PRESS_CALIBRATION:")) {
        const val = parseFloat(line.split(":")[1].trim());
        if (!isNaN(val)) {
          document.getElementById("press-offset").value = val;
          log(`Pressure calibration offset: ${val} hPa`, "info");
        }
        return;
      }
    }

    // Handle individual sensor readings (e.g., "BME680 - Temperature: 26.96 °C")
    const sensorReading = line.match(/^(.+?)\s*-\s*(.+?):\s*(.+)$/);
    if (sensorReading) {
      const sensorName = sensorReading[1].trim();
      const param = sensorReading[2].trim();
      const value = sensorReading[3].trim();

      const sensors = sensorProtocolMap[protocol] || [];
      if (sensors.includes(sensorName)) {
        const ok = !(value === "null" || value === "" || isNaN(parseFloat(value.replace(/[^0-9.-]+/g, ""))));
        sensorStatus[protocol][sensorName] = ok;
        if (ok) sensorData[protocol][`${sensorName} ${param}`] = value;

        if (sensorName === "BME680") {
          if (param === "Temperature") currentTemperature = ok ? parseFloat(value.replace("°C", "").trim()) : null;
          else if (param === "Humidity") currentHumidity = ok ? parseFloat(value.replace("%", "").trim()) : null;
          else if (param === "Pressure") currentPressure = ok ? parseFloat(value.replace("hPa", "").trim()) : null;
        } else if (sensorName === "VEML7700" && param === "Light Intensity") {
          currentLight = ok ? parseFloat(value.replace("lux", "").trim()) : null;
        }
      }
      updateSensorUI();
      return;
    }

    // Handle JSON format (e.g., "Published to topic 'device/data': {...}")
    if (line.includes("Published to topic 'device/data'")) {
      // Robust extraction: find the position after the colon and take the rest as JSON string
      const colonIndex = line.indexOf(':');
      const jsonStr = colonIndex !== -1 ? line.substring(colonIndex + 1).trim() : '';
      if (jsonStr.startsWith('{')) {
        try {
          const json = JSON.parse(jsonStr);

          if (protocol === "I2C") {
            currentTemperature = json.CurrentTemperature;
            currentHumidity = json.CurrentHumidity;
            currentPressure = json.AtmPressure;
            currentLight = json.LightIntensity;

            sensorStatus.I2C.BME680 = currentTemperature !== undefined || currentHumidity !== undefined || currentPressure !== undefined;
            sensorStatus.I2C.VEML7700 = currentLight !== undefined;

            if (currentTemperature !== undefined) sensorData.I2C["BME680 Temperature"] = `${parseFloat(currentTemperature).toFixed(2)} °C`;
            if (currentHumidity !== undefined) sensorData.I2C["BME680 Humidity"] = `${parseFloat(currentHumidity).toFixed(2)} %`;
            if (currentPressure !== undefined) sensorData.I2C["BME680 Pressure"] = `${parseFloat(currentPressure).toFixed(2)} hPa`;
            if (currentLight !== undefined) sensorData.I2C["VEML7700 Light Intensity"] = `${parseFloat(currentLight).toFixed(2)} lux`;
          }

          if (protocol === "ADC") {
            if (json.BatteryVoltage !== undefined) {
              sensorStatus.ADC["Battery Voltage"] = true;
              sensorData.ADC["Battery Voltage"] = `${parseFloat(json.BatteryVoltage).toFixed(2)} V`;
            }
            if (json.RainfallHourly !== undefined || json.RainfallDaily !== undefined || json.RainfallWeekly !== undefined) {
              sensorStatus.ADC["Rain Gauge"] = true;
              if (json.RainfallHourly !== undefined) sensorData.ADC["Rainfall Hourly"] = `${(parseFloat(json.RainfallHourly) * 0.5).toFixed(2)} mm`;
              if (json.RainfallDaily !== undefined) sensorData.ADC["Rainfall Daily"] = `${(parseFloat(json.RainfallDaily) * 0.5).toFixed(2)} mm`;
              if (json.RainfallWeekly !== undefined) sensorData.ADC["Rainfall Weekly"] = `${(parseFloat(json.RainfallWeekly) * 0.5).toFixed(2)} mm`;
            }
          }
          updateSensorUI();
        } catch (e) {
          // Fallback: Use regex to extract values from malformed JSON string
          console.log("JSON parse failed, using regex fallback:", e);
          if (protocol === "ADC") {
            // Extract BatteryVoltage
            const batteryMatch = jsonStr.match(/"BatteryVoltage"\s*:\s*([\d.-]+)/);
            if (batteryMatch) {
              const voltage = parseFloat(batteryMatch[1]);
              if (!isNaN(voltage)) {
                sensorStatus.ADC["Battery Voltage"] = true;
                sensorData.ADC["Battery Voltage"] = `${voltage.toFixed(2)} V`;
              }
            }
            // Extract Rainfall values
            const rainfallMatches = jsonStr.match(/"Rainfall(?:Hourly|Daily|Weekly)"\s*:\s*([\d.-]+)/g);
            if (rainfallMatches && rainfallMatches.length > 0) {
              sensorStatus.ADC["Rain Gauge"] = true;
              // Parse each match to set Hourly, Daily, Weekly
              rainfallMatches.forEach(match => {
                const keyMatch = match.match(/"Rainfall(.*)"\s*:\s*([\d.-]+)/);
                if (keyMatch) {
                  const period = keyMatch[1];
                  const value = parseFloat(keyMatch[2]);
                  if (!isNaN(value)) {
                    const key = `Rainfall ${period}`;
                    sensorData.ADC[key] = `${(value * 0.5).toFixed(2)} mm`;
                  }
                }
              });
            }
          } else if (protocol === "I2C") {
            // Extract I2C values with regex if needed
            const tempMatch = jsonStr.match(/"CurrentTemperature"\s*:\s*([\d.-]+)/);
            if (tempMatch) currentTemperature = parseFloat(tempMatch[1]);
            const humMatch = jsonStr.match(/"CurrentHumidity"\s*:\s*([\d.-]+)/);
            if (humMatch) currentHumidity = parseFloat(humMatch[1]);
            const pressMatch = jsonStr.match(/"AtmPressure"\s*:\s*([\d.-]+)/);
            if (pressMatch) currentPressure = parseFloat(pressMatch[1]);
            const lightMatch = jsonStr.match(/"LightIntensity"\s*:\s*([\d.-]+)/);
            if (lightMatch) currentLight = parseFloat(lightMatch[1]);

            sensorStatus.I2C.BME680 = currentTemperature !== undefined || currentHumidity !== undefined || currentPressure !== undefined;
            sensorStatus.I2C.VEML7700 = currentLight !== undefined;

            if (currentTemperature !== undefined) sensorData.I2C["BME680 Temperature"] = `${parseFloat(currentTemperature).toFixed(2)} °C`;
            if (currentHumidity !== undefined) sensorData.I2C["BME680 Humidity"] = `${parseFloat(currentHumidity).toFixed(2)} %`;
            if (currentPressure !== undefined) sensorData.I2C["BME680 Pressure"] = `${parseFloat(currentPressure).toFixed(2)} hPa`;
            if (currentLight !== undefined) sensorData.I2C["VEML7700 Light Intensity"] = `${parseFloat(currentLight).toFixed(2)} lux`;
          }
          updateSensorUI();
        }
        return;
      }
    }

  // Handle rain gauge data (e.g., "Rain Tip Detected! Hourly: 1 Daily: 2 Weekly: 3")
const rainMatch = line.match(/^Rain Tip Detected!\s*Hourly:\s*(\d+)\s*Daily:\s*(\d+)\s*Weekly:\s*(\d+)/);
if (rainMatch && protocol === "ADC") {
  sensorStatus[protocol]["Rain Gauge"] = true;
  const hourlyTips = parseInt(rainMatch[1]);
  const dailyTips = parseInt(rainMatch[2]);
  const weeklyTips = parseInt(rainMatch[3]);
  sensorData[protocol]["Rainfall Hourly"] = `${(hourlyTips * 0.5).toFixed(2)} mm`;
 sensorData[protocol]["Rainfall Daily"] = `${(dailyTips * 0.5).toFixed(2)} mm`; // Store as mm
  sensorData[protocol]["Rainfall Weekly"] = `${(weeklyTips * 0.5).toFixed(2)} mm`;
  updateSensorUI();
}
    // Handle simple key-value format (e.g., "Battery Voltage: 3.79 V")
    const batteryMatch = line.match(/^Battery Voltage:\s*([\d.]+)\s*V$/);
    if (batteryMatch && protocol === "ADC") {
      const voltage = parseFloat(batteryMatch[1]);
      sensorStatus[protocol]["Battery Voltage"] = true;
      sensorData[protocol]["Battery Voltage"] = `${voltage.toFixed(2)} V`;
      updateSensorUI();
    }
  });
}

/* ------------------------------------------------------------------ */
/*  PROTOCOL / MQTT / FTP / HTTP                                      */
/* ------------------------------------------------------------------ */
function updateProtocolUI() {
  const p = document.getElementById("protocol-select").value;
  document.getElementById("ftp-section").style.display  = p === "FTP"  ? "block" : "none";
  document.getElementById("mqtt-section").style.display = p === "MQTT" ? "block" : "none";
  document.getElementById("http-section").style.display = p === "HTTP" ? "block" : "none";
  if (p === "MQTT") toggleCertUploadAndPort();
  else document.getElementById("cert-upload-button").style.display = "none";
}
function toggleCertUploadAndPort() {
  const ssl = document.getElementById("mqtt-ssl").value;
  document.getElementById("cert-section").style.display = ssl === "yes" ? "block" : "none";
  document.getElementById("cert-upload-button").style.display = ssl === "yes" ? "block" : "none";
  document.getElementById("mqtt-port").value = ssl === "yes" ? "8883" : "1883";
}

async function browseCACert() {
  const fp = await window.electronAPI.openFileDialog();
  if (fp) {
    selectedCACertFile = fp;
    document.getElementById("mqtt-ca-cert-path").value = "/usr/device_cert.pem.crt";
    log(`Selected certificate: ${fp}`, "success");
  } else log("Certificate file selection cancelled", "error");
}
async function browseClientKey() {
  const fp = await window.electronAPI.openFileDialog();
  if (fp) {
    selectedClientKeyFile = fp;
    document.getElementById("mqtt-client-key-path").value = "/usr/private_key.pem.key";
    log(`Selected private key: ${fp}`, "success");
  } else log("Private key file selection cancelled", "error");
}
async function uploadCertificates() {
  if (!selectedCACertFile || !selectedClientKeyFile) return log("Please select both certificate and private key.", "error");
  const res = await window.electronAPI.setMQTTCertificates({ caCertPath: selectedCACertFile, clientKeyPath: selectedClientKeyFile });
  res.error ? log(res.error, "error") : log(res, "success");
}

async function listPorts() {
  const res = await window.electronAPI.listPorts();
  const sel = document.getElementById("ports");
  sel.innerHTML = "";
  if (res.error) return log(res.error, "error");
  res.forEach((p) => {
    const opt = document.createElement("option");
    opt.value = p;
    opt.textContent = p;
    sel.appendChild(opt);
  });
}
async function connectPort() {
  const port = document.getElementById("ports").value;
  const baud = document.getElementById("baud-rate").value;
  if (!port) return log("Please select a port.", "error");
  if (!baud || isNaN(baud) || baud <= 0) return log("Please select a valid baud rate.", "error");
  const res = await window.electronAPI.connectPort(port, baud);
  if (res.error) {
    log(res.error, "error");
  } else {
    log(res, "success");
    isConnected = true;
    currentBaud = baud;
    currentPort = port;
  }
}
async function disconnectPort() {
  const res = await window.electronAPI.disconnectPort();
  if (res.error) {
    log(res.error, "error");
  } else {
    log(res, "success");
    isConnected = false;
    clearSensorData();
  }
}

async function getInterval() {
  if (!isConnected) {
    log("Cannot get interval: No serial port connected", "error");
    return;
  }
  try {
    const res = await window.electronAPI.getInterval();
    if (res.error) {
      log(`Failed to get interval: ${res.error}`, "error");
    } else {
      log(`Command sent: GET_INTERVAL`, "info");
    }
  } catch (err) {
    log(`Error getting interval: ${err.message}`, "error");
  }
}
async function setDeviceID() {
  const id = document.getElementById("device-id").value.trim();
  if (!id || !/^[a-zAZ0-9-_]+$/.test(id)) return log("Please enter a valid alphanumeric Device ID.", "error");
  const res = await window.electronAPI.setDeviceID(id);
  res.error ? log(res.error, "error") : log(res, "success");
}
async function setInterval() {
  const v = document.getElementById("interval").value;
  if (!v || isNaN(v) || v <= 0) return log("Please enter a valid interval (positive seconds).", "error");
  const res = await window.electronAPI.setInterval(v);
  res.error ? log(res.error, "error") : log(res, "success");
}
async function setProtocol() {
  const p = document.getElementById("protocol-select").value;
  const res = await window.electronAPI.setProtocol(p);
  if (res.error) return log(res.error, "error");
  log(res, "success");
  updateProtocolUI();
}
async function setMQTTTopic() {
  const topic = document.getElementById("mqtt-topic").value.trim();
  if (!topic || !/^[a-zA-Z0-9\/_+#-]+$/.test(topic)) return log("Please enter a valid MQTT topic (alphanumeric, /, _, +, #, -).", "error");
  const res = await window.electronAPI.setMQTTTopic(topic);
  res.error ? log(res.error, "error") : log(res, "success");
}

/* FTP / MQTT / HTTP config functions */
async function setFTPConfig() {
  const host = document.getElementById("ftp-host").value.trim();
  const user = document.getElementById("ftp-user").value.trim();
  const pass = document.getElementById("ftp-password").value;
  if (!host && !user && !pass) return log("Please enter at least one FTP configuration field.", "error");
  if (host && !/^[a-zA-Z0-9.-]+$/.test(host)) return log("Invalid FTP host format.", "error");
  const cmds = [];
  if (host) cmds.push(`SET_FTP_HOST:${host}`);
  if (user) cmds.push(`SET_FTP_USER:${user}`);
  if (pass) cmds.push(`SET_FTP_PASS:${pass}`);
  for (const c of cmds) {
    const r = await window.electronAPI.sendData(c);
    r.error ? log(r.error, "error") : log(r, "success");
    await delay(1500);
  }
  const res = await window.electronAPI.setProtocol("FTP");
  res.error ? log(res.error, "error") : log(res, "success");
  await delay(2000);
  await window.electronAPI.getFTPConfig();
}
async function getFTPConfig() {
  const res = await window.electronAPI.getFTPConfig();
  res.error ? log(res.error, "error") : log(res, "success");
}

async function setMQTTConfig() {
  const broker = document.getElementById("mqtt-broker").value.trim();
  const user   = document.getElementById("mqtt-user").value.trim();
  const pass   = document.getElementById("mqtt-password").value;
  const ssl    = document.getElementById("mqtt-ssl").value;
  const topic  = document.getElementById("mqtt-topic").value.trim();
  if (!broker && !user && !pass && !topic && ssl === "no") return log("Please enter at least one MQTT configuration field.", "error");
  if (broker && !/^[a-zA-Z0-9.-]+$/.test(broker)) return log("Invalid MQTT broker format.", "error");
  if (topic && !/^[a-zA-Z0-9\/_+#-]+$/.test(topic)) return log("Invalid MQTT topic format.", "error");
  const cmds = [];
  if (ssl !== "") cmds.push(`SET_MQTT_SSL:${ssl === "yes" ? "ON" : "OFF"}`);
  if (broker) cmds.push(`SET_MQTT_BROKER:${broker}`);
  if (user) cmds.push(`SET_MQTT_USER:${user}`);
  if (pass) cmds.push(`SET_MQTT_PASS:${pass}`);
  if (topic) cmds.push(`SET_PUBLISH_TOPIC:${topic}`);
  for (const c of cmds) {
    const r = await window.electronAPI.sendData(c);
    r.error ? log(r.error, "error") : log(r, "success");
    await delay(1500);
  }
  const res = await window.electronAPI.setProtocol("MQTT");
  if (res.error) return log(res.error, "error");
  log(res, "success");
  await delay(3000);
  const v = await window.electronAPI.getMQTTConfig();
  if (v.error || v.includes("MQTT not active")) log("MQTT protocol not active after setting. Please check device.", "error");
}
async function getMQTTConfig() {
  const res = await window.electronAPI.getMQTTConfig();
  res.error ? log(res.error, "error") : log(res, "success");
}

async function setHTTPConfig() {
  const url  = document.getElementById("http-url").value.trim();
  const user = document.getElementById("http-auth-user").value.trim();
  const pass = document.getElementById("http-auth-password").value;
  if (!url && !user && !pass) return log("Please enter at least one HTTP configuration field.", "error");
  if (url && !/^https?:\/\/.+$/.test(url)) return log("Invalid HTTP URL format.", "error");
  const cmds = [];
  if (url) cmds.push(`SET_HTTP_URL:${url}`);
  if (user && pass) cmds.push(`SET_HTTP_AUTH:${user}:${pass}`);
  for (const c of cmds) {
    const r = await window.electronAPI.sendData(c);
    r.error ? log(r.error, "error") : log(r, "success");
    await delay(1500);
  }
  const res = await window.electronAPI.setProtocol("HTTP");
  res.error ? log(res.error, "error") : log(res, "success");
  await delay(2000);
  await window.electronAPI.getHTTPConfig();
}
async function getHTTPConfig() {
  const res = await window.electronAPI.getHTTPConfig();
  res.error ? log(res.error, "error") : log(res, "success");
}

async function uploadFile() {
  const fp = await window.electronAPI.openFileDialog();
  if (!fp) return log("No file selected for upload.", "error");
  const res = await window.electronAPI.uploadFile(fp);
  res.error ? log(res.error, "error") : log(res, "success");
}

function delay(ms) { return new Promise((r) => setTimeout(r, ms)); }

/* ------------------------------------------------------------------ */
/*  SERIAL DATA HANDLER                                               */
/* ------------------------------------------------------------------ */
window.electronAPI.onSerialData((data) => {
  if (data.includes("DISCONNECTED:")) {
    isConnected = false;
    clearSensorData();
  }
  if (!data) return;
  const sanitized = data.replace(/</g, "&lt;").replace(/>/g, "&gt;");
  parseSensorData(sanitized);

  if (sanitized.includes("RX Received") || sanitized.includes("Text: '") || sanitized.includes("Config saved"))
    return;

  let cls = "log-default";
  if (/error|failed|ENOENT|not active/i.test(sanitized)) cls = "log-error";
  else if (/successfully|saved ok|connected to|current interval|protocol initialized/i.test(sanitized)) cls = "log-success";
  else if (/\/usr contents|device id:|topic=/i.test(sanitized)) cls = "log-info";

  log(sanitized, cls);

  /* auto-fill config forms */
  if (sanitized.startsWith("FTP protocol")) {
    const h = sanitized.match(/host=([^,]+)/);
    const u = sanitized.match(/user=([^,]+)/);
    if (h) document.getElementById("ftp-host").value = h[1];
    if (u) document.getElementById("ftp-user").value = u[1];
  }
  if (sanitized.startsWith("MQTT protocol") || sanitized.includes("MQTT extras")) {
    const b = sanitized.match(/broker=([^,]+)/);
    const u = sanitized.match(/user=([^,]+)/);
    const s = sanitized.match(/ssl=([^,]+)/) || sanitized.match(/ssl_enabled=([^,]+)/);
    const t = sanitized.match(/topic=([^,]+)/);
    if (b) document.getElementById("mqtt-broker").value = b[1];
    if (u) document.getElementById("mqtt-user").value = u[1];
    if (s) {
      document.getElementById("mqtt-ssl").value = /true|on/i.test(s[1]) ? "yes" : "no";
      toggleCertUploadAndPort();
    }
    if (t) document.getElementById("mqtt-topic").value = t[1];
  }
  if (sanitized.startsWith("HTTP protocol")) {
    const u = sanitized.match(/url=([^,]+)/);
    if (u) document.getElementById("http-url").value = u[1];
  }
});

/* ------------------------------------------------------------------ */
/*  Calibration Functions                                             */
/* ------------------------------------------------------------------ */


async function setTempCalibration() {
  const val = document.getElementById("temp-offset").value;
  if (isNaN(val) || val < -2 || val > 2) return log("Invalid temperature offset (-2 to 2)", "error");
  const res = await window.electronAPI.sendData(`TEMP_CALIBRATION:${val}`);
  res.error ? log(res.error, "error") : log(`Set temperature calibration to ${val} °C`, "success");
}

async function setHumCalibration() {
  const val = document.getElementById("hum-offset").value;
  if (isNaN(val) || val < -10 || val > 10) return log("Invalid humidity offset (-10 to 10)", "error");
  const res = await window.electronAPI.sendData(`HUM_CALIBRATION:${val}`);
  res.error ? log(res.error, "error") : log(`Set humidity calibration to ${val} %`, "success");
}

async function setPressCalibration() {
  const val = document.getElementById("press-offset").value;
  if (isNaN(val) || val < -10 || val > 10) return log("Invalid pressure offset (-10 to 10)", "error");
  const res = await window.electronAPI.sendData(`PRESS_CALIBRATION:${val}`);
  res.error ? log(res.error, "error") : log(`Set pressure calibration to ${val} hPa`, "success");
}

async function resetCalibration() {
  const res = await window.electronAPI.sendData("CALIBRATION_RESET");
  res.error ? log(res.error, "error") : log("Calibration reset sent", "success");
  // Reset UI inputs to 0
  document.getElementById("temp-offset").value = 0;
  document.getElementById("hum-offset").value = 0;
  document.getElementById("press-offset").value = 0;
}

/* ------------------------------------------------------------------ */
/*  INIT                                                              */
/* ------------------------------------------------------------------ */
window.addEventListener("DOMContentLoaded", () => {
  updateProtocolUI();
  listPorts();
  updateSensorUI();
  document.getElementById("baud-rate").addEventListener("change", async () => {
    if (isConnected) {
      const oldBaud = currentBaud;
      await disconnectPort();
      log(`Disconnected from port at ${oldBaud} baud. Please reconnect with the new baud rate.`, "info");
    }
  });
  document.getElementById("ports").addEventListener("focus", async () => {
    await listPorts();
  });
  document.getElementById("ports").addEventListener("change", async () => {
    if (isConnected) {
      const oldPort = currentPort;
      const oldBaud = currentBaud;
      await disconnectPort();
      log(`Disconnected from port ${oldPort} at ${oldBaud} baud. Please reconnect with the new port.`, "info");
    }
  });
});

/* tiny helper */
function log(msg, type = "default") {
  const out = document.getElementById("output");
  out.innerHTML += `<span class="log-line log-${type}">${msg}</span><br>`;
  out.scrollTop = out.scrollHeight;
}
function clearSensorData() {
  sensorStatus = {
    I2C: { BME680: false, VEML7700: false },
    ADC: { "Battery Voltage": false, "Rain Gauge": false },
    RS232: { "Ultrasonic Sensor": false },
    RS485: {},
    SPI: {},
  };
  sensorData = { I2C: {}, ADC: {}, RS232: {}, RS485: {}, SPI: {} };
  currentTemperature = null;
  currentHumidity = null;
  currentPressure = null;
  currentLight = null;
  updateSensorUI();
}