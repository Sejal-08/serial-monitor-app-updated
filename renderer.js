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
  const rainGaugeCard = document.getElementById("rain-gauge-card");

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
  const rainGaugeValue = document.getElementById("rain-gauge-value");
  const rainPath = document.getElementById("rainPath");
  const rainColor1 = document.getElementById("rainColor1");
  const rainColor2 = document.getElementById("rainColor2");

  sensorListDiv.innerHTML = "";
  if (sensorDataDiv) sensorDataDiv.innerHTML = "";

  /* ---------- hide all cards by default ---------- */
  thermometerContainer.style.display = "none";
  humidityCard.style.display = "none";
  pressureCard.style.display = "none";
  lightCard.style.display = "none";
  batteryCard.style.display = "none";
  rainGaugeCard.style.display = "none";

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
      dataHtml += `<div class="sensor-data-item"><strong>${k}:</strong> ${v}</div>`;
      hasData = true;
    }
  }
  if (sensorDataDiv) sensorDataDiv.innerHTML = hasData ? dataHtml : "<p>No sensor data available.</p>";

  /* ---------- I2C-specific sensor cards ---------- */
  if (protocol === "I2C") {
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

      thermometerValue.textContent = `${temp.toFixed(1)}°C`;
      thermometerContainer.classList.remove("shake");
      void thermometerContainer.offsetWidth;
      thermometerContainer.classList.add("shake");
    }

    /* Humidity */
    if (currentHumidity !== null && !isNaN(parseFloat(currentHumidity))) {
      humidityCard.style.display = "block";
      const humidity = parseFloat(currentHumidity);
      humidityValue.textContent = `${humidity.toFixed(1)}%`;

      const t = Math.min(Math.max(humidity / 100, 0), 1);
      const lowColor = { r: 61, g: 142, b: 180 };
      const highColor = { r: 4, g: 116, b: 168 };
      const r = Math.round(lowColor.r + (highColor.r - lowColor.r) * t);
      const g = Math.round(lowColor.g + (highColor.g - lowColor.g) * t);
      const b = Math.round(lowColor.b + (highColor.b - lowColor.b) * t);
      const primaryColor = `rgb(${r}, ${g}, ${b})`;
      waveColor1.setAttribute("style", `stop-color: ${primaryColor}; stop-opacity: 0.5`);
      waveColor2.setAttribute("style", `stop-color: ${primaryColor}; stop-opacity: 1`);

      const waveHeight = 100 - humidity;
      const waveAnimation = `
        @keyframes waveAnimation {
          0%  { d: "M 0 ${waveHeight} Q 25 ${waveHeight + 5} 50 ${waveHeight} T 100 ${waveHeight} V 100 H 0 Z"; }
          50% { d: "M 0 ${waveHeight + 2} Q 25 ${waveHeight + 7} 50 ${waveHeight + 2} T 100 ${waveHeight + 2} V 100 H 0 Z"; }
          100%{ d: "M 0 ${waveHeight} Q 25 ${waveHeight + 5} 50 ${waveHeight} T 100 ${waveHeight} V 100 H 0 Z"; }
        }`;
      const styleSheet = document.styleSheets[0];
      try {
        styleSheet.insertRule(waveAnimation, styleSheet.cssRules.length);
      } catch {}
      wavePath.style.animation = "waveAnimation 8s ease-in-out infinite";
      wavePath.setAttribute("d", `M 0 ${waveHeight} Q 25 ${waveHeight + 5} 50 ${waveHeight} T 100 ${waveHeight} V 100 H 0 Z`);
    }

    /* Pressure */
    if (currentPressure !== null && !isNaN(parseFloat(currentPressure))) {
      pressureCard.style.display = "block";
      const pressure = parseFloat(currentPressure);
      const barColor =
        pressure >= 950 && pressure <= 1050
          ? "#34d399"
          : (pressure >= 900 && pressure < 950) || (pressure > 1050 && pressure <= 1100)
          ? "#ffeb3b"
          : "#f87171";
      const barWidth = Math.min(Math.max((pressure - 300) / (1100 - 300) * 100, 0), 100);
      pressureValue.textContent = `${pressure.toFixed(1)} hPa`;
      pressureBar.style.width = `${barWidth}%`;
      pressureBar.style.backgroundColor = barColor;
    }

    /* Light Intensity */
    if (currentLight !== null && !isNaN(parseFloat(currentLight))) {
      lightCard.style.display = "block";
      const light = parseFloat(currentLight);
      const maxLight = 120000;
      const brightness = Math.min(Math.max(light / maxLight, 0), 1);

      sunCircle.setAttribute("r", 20 + 10 * brightness);
      glowFilter.setAttribute("stdDeviation", 5 + 5 * brightness);

      const lowColor = { r: 255, g: 215, b: 0 };
      const highColor = { r: 255, g: 140, b: 0 };
      const r = Math.round(lowColor.r + (highColor.r - lowColor.r) * brightness);
      const g = Math.round(lowColor.g + (highColor.g - lowColor.g) * brightness);
      const b = Math.round(lowColor.b + (highColor.b - lowColor.b) * brightness);
      const sunColor = `rgb(${r}, ${g}, ${b})`;

      sunGradient.children[0].setAttribute("style", `stop-color:${sunColor}; stop-opacity:0.9`);
      sunGradient.children[1].setAttribute("style", `stop-color:${sunColor}; stop-opacity:0.4`);
      sunGradient.children[2].setAttribute("style", `stop-color:${sunColor}; stop-opacity:0`);

      const backgroundBrightness = 0.8 + 0.2 * Math.sin(Date.now() / 300);
      lightCard.querySelector("rect").style.filter = `brightness(${backgroundBrightness})`;
      sparkles.style.opacity = brightness * 0.7;

      lightValue.textContent = `${light.toFixed(1)} lux`;
    }
  } else if (protocol === "ADC") {
    /* Battery Voltage */
    if (sensorData.ADC["Battery Voltage"] !== undefined && !isNaN(parseFloat(sensorData.ADC["Battery Voltage"]))) {
      batteryCard.style.display = "block";
      const voltage = parseFloat(sensorData.ADC["Battery Voltage"]);
      const maxVoltage = 4.2; // 100%
      const minVoltage = 3.0; // 0%

      // Convert voltage to percentage (based on provided C++ logic)
      let percentage;
      if (voltage >= maxVoltage) {
        percentage = 100.0;
      } else if (voltage <= minVoltage) {
        percentage = 0.0;
      } else {
        percentage = ((voltage - minVoltage) / (maxVoltage - minVoltage)) * 100.0;
      }

      const fillWidth = (percentage / 100) * 66; // Max width of fill is 66 (out of 70)

      batteryFill.style.transition = "width 0.8s ease, fill 0.8s ease";
      batteryFill.setAttribute("width", fillWidth);

      // Interpolate color from red (0%) to yellow (50%) to green (100%)
      let fillColor;
      if (percentage <= 50) {
        // Red (#f87171) to Yellow (#ffeb3b)
        const t = percentage / 50;
        const r = Math.round(248 + (255 - 248) * t); // 248 -> 255
        const g = Math.round(113 + (235 - 113) * t); // 113 -> 235
        const b = Math.round(113 + (59 - 113) * t);  // 113 -> 59
        fillColor = `rgb(${r}, ${g}, ${b})`;
      } else {
        // Yellow (#ffeb3b) to Green (#34d399)
        const t = (percentage - 50) / 50;
        const r = Math.round(255 + (52 - 255) * t);  // 255 -> 52
        const g = Math.round(235 + (211 - 235) * t); // 235 -> 211
        const b = Math.round(59 + (153 - 59) * t);   // 59 -> 153
        fillColor = `rgb(${r}, ${g}, ${b})`;
      }
      batteryFill.setAttribute("fill", fillColor);
      batteryCard.style.setProperty("--glow", fillColor); // Update glow color

      batteryValue.textContent = `${voltage.toFixed(2)} V (${percentage.toFixed(0)}%)`;
      batteryCard.classList.remove("shake");
      void batteryCard.offsetWidth;
      batteryCard.classList.add("shake");
    }

    /* Rain Gauge */
    if (sensorData.ADC["Rain Gauge Hourly"] !== undefined && !isNaN(parseFloat(sensorData.ADC["Rain Gauge Hourly"]))) {
      rainGaugeCard.style.display = "block";
      const rainTips = parseFloat(sensorData.ADC["Rain Gauge Hourly"]);
      rainGaugeValue.textContent = `${rainTips.toFixed(0)} tips`;

      const maxTips = 50;
      const t = Math.min(Math.max(rainTips / maxTips, 0), 1);
      const lowColor = { r: 30, g: 144, b: 255 };
      const highColor = { r: 0, g: 0, b: 139 };
      const r = Math.round(lowColor.r + (highColor.r - lowColor.r) * t);
      const g = Math.round(lowColor.g + (highColor.g - lowColor.g) * t);
      const b = Math.round(lowColor.b + (highColor.b - lowColor.b) * t);
      const primaryColor = `rgb(${r}, ${g}, ${b})`;
      rainColor1.setAttribute("style", `stop-color: ${primaryColor}; stop-opacity: 0.5`);
      rainColor2.setAttribute("style", `stop-color: ${primaryColor}; stop-opacity: 1`);

      const waveHeight = 100 - (t * 80);
      const rainWaveAnimation = `
        @keyframes rainWaveAnimation {
          0%  { d: "M 0 ${waveHeight} Q 25 ${waveHeight + 5} 50 ${waveHeight} T 100 ${waveHeight} V 100 H 0 Z"; }
          50% { d: "M 0 ${waveHeight + 2} Q 25 ${waveHeight + 7} 50 ${waveHeight + 2} T 100 ${waveHeight + 2} V 100 H 0 Z"; }
          100%{ d: "M 0 ${waveHeight} Q 25 ${waveHeight + 5} 50 ${waveHeight} T 100 ${waveHeight} V 100 H 0 Z"; }
        }`;
      const styleSheet = document.styleSheets[0];
      try {
        styleSheet.insertRule(rainWaveAnimation, styleSheet.cssRules.length);
      } catch {}
      rainPath.style.animation = "rainWaveAnimation 8s ease-in-out infinite";
      rainPath.setAttribute("d", `M 0 ${waveHeight} Q 25 ${waveHeight + 5} 50 ${waveHeight} T 100 ${waveHeight} V 100 H 0 Z`);
    }
  } else {
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
}
/* ------------------------------------------------------------------ */
/*  DATA PARSER                                                       */
/* ------------------------------------------------------------------ */
function parseSensorData(data) {
  const protocol = document.getElementById("sensor-select").value;
  if (!protocol) return;

  const lines = data.split("\n").map((line) => line.trim()).filter((line) => line);
  lines.forEach((line) => {
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
    if (line.startsWith("Published to topic 'device/data':")) {
      try {
        const jsonStr = line.split(": ", 2)[1];
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
            sensorData.ADC["Rain Gauge Hourly"] = `${json.RainfallHourly} tips`;
            sensorData.ADC["Rain Gauge Daily"] = `${json.RainfallDaily} tips`;
            sensorData.ADC["Rain Gauge Weekly"] = `${json.RainfallWeekly} tips`;
          }
        }
        updateSensorUI();
      } catch (e) {
        console.error("Error parsing JSON:", e);
      }
      return;
    }

    // Handle rain gauge data (e.g., "Rain Tip Detected! Hourly: 1 Daily: 2 Weekly: 3")
    const rainMatch = line.match(/^Rain Tip Detected!\s*Hourly:\s*(\d+)\s*Daily:\s*(\d+)\s*Weekly:\s*(\d+)/);
    if (rainMatch && protocol === "ADC") {
      sensorStatus[protocol]["Rain Gauge"] = true;
      sensorData[protocol]["Rain Gauge Hourly"] = `${rainMatch[1]} tips`;
      sensorData[protocol]["Rain Gauge Daily"] = `${rainMatch[2]} tips`;
      sensorData[protocol]["Rain Gauge Weekly"] = `${rainMatch[3]} tips`;
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
  res.error ? log(res.error, "error") : log(res, "success");
}
async function disconnectPort() {
  const res = await window.electronAPI.disconnectPort();
  res.error ? log(res.error, "error") : log(res, "success");
}
async function setDeviceID() {
  const id = document.getElementById("device-id").value.trim();
  if (!id || !/^[a-zA-Z0-9-_]+$/.test(id)) return log("Please enter a valid alphanumeric Device ID.", "error");
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
/*  INIT                                                              */
/* ------------------------------------------------------------------ */
window.addEventListener("DOMContentLoaded", () => {
  updateProtocolUI();
  listPorts();
  updateSensorUI();
});

/* tiny helper */
function log(msg, type = "default") {
  const out = document.getElementById("output");
  out.innerHTML += `<span class="log-line log-${type}">${msg}</span><br>`;
  out.scrollTop = out.scrollHeight;
}