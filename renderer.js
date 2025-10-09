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
  const lightCard    = document.getElementById("light-card");

  const thermometerFill  = document.getElementById("thermometer-fill");
  const thermometerBulb  = document.getElementById("thermometer-bulb");
  const thermometerValue = document.getElementById("thermometer-value");

  const humidityValue = document.getElementById("humidity-value");
  const humidityWave  = document.getElementById("humidity-wave");
  const wavePath      = document.getElementById("wavePath");
  const waveColor1    = document.getElementById("waveColor1");
  const waveColor2    = document.getElementById("waveColor2");

  const pressureValue = document.getElementById("pressure-value");
  const pressureBar   = document.getElementById("pressure-bar");

  const lightValue       = document.getElementById("light-value");
  const lightValueDisplay= document.getElementById("light-value");  // Fixed typo, assuming same element

  sensorListDiv.innerHTML = "";
  if (sensorDataDiv) sensorDataDiv.innerHTML = "";  // Check if exists

  /* ----------  hide all cards by default  ---------- */
  thermometerContainer.style.display = "none";
  humidityCard.style.display    = "none";
  pressureCard.style.display    = "none";
  lightCard.style.display       = "none";

  if (!protocol) {
    sensorListDiv.innerHTML = "<p>No protocol selected.</p>";
    if (sensorDataDiv) sensorDataDiv.innerHTML = "<p>No sensor data available.</p>";
    return;
  }

  /* ----------  sensor list  ---------- */
  const sensors = sensorProtocolMap[protocol] || [];
  let listHtml  = "<h4>Sensors</h4><ul>";
  sensors.forEach((s) => {
    const ok = sensorStatus[protocol][s];
    listHtml += `<li><i class="fas ${ok ? "fa-check text-success" : "fa-times text-error"}"></i> ${s}</li>`;
  });
  listHtml += "</ul>";
  sensorListDiv.innerHTML = sensors.length ? listHtml : "<p>No sensors available.</p>";

  /* ----------  sensor data  ---------- */
  const data = sensorData[protocol];
  let dataHtml = "<h4>Sensor Data</h4>";
  let hasData  = false;
  for (const [k, v] of Object.entries(data)) {
    if (v !== null && v !== undefined && v !== "null" && v !== "") {
      dataHtml += `<div class="sensor-data-item"><strong>${k}:</strong> ${v}</div>`;
      hasData = true;
    }
  }
  if (sensorDataDiv) sensorDataDiv.innerHTML = hasData ? dataHtml : "<p>No sensor data available.</p>";

  /* ================================================================
     ＴＥＭＰＥＲＡＴＵＲＥ   –   ＮＥＷ   ＡＮＩＭＡＴＥＤ
     ================================================================ */
  if (
    protocol === "I2C" &&
    currentTemperature !== null &&
    currentTemperature !== undefined &&
    currentTemperature !== "null" &&
    !isNaN(parseFloat(currentTemperature))
  ) {
    thermometerContainer.style.display = "block";
    const temp = parseFloat(currentTemperature);

    /* ----  colour gradient  ---- */
    let color;
    if (temp < 18) color = "#3498db";
    else if (temp < 26) color = "#2ecc71";
    else if (temp < 32) color = "#f39c12";
    else color = "#e74c3c";

    /* ----  mercury height  ---- */
    const minT = -10, maxT = 50;
    const h = Math.min(Math.max((temp - minT) / (maxT - minT), 0), 1) * 160;

    /* ----  animate mercury  ---- */
    const fill  = document.getElementById("thermometer-fill");
    const bulb  = document.getElementById("thermometer-bulb");
    const thermo= document.querySelector(".thermometer");

    fill.style.transition = "height .8s cubic-bezier(0.68,-0.55,0.27,1.55), y .8s cubic-bezier(0.68,-0.55,0.27,1.55)";
    bulb.style.transition = "fill .8s ease";
    thermo.style.setProperty("--glow", color);

    fill.setAttribute("y", 180 - h);
    fill.setAttribute("height", h);
    fill.setAttribute("fill", color);
    bulb.setAttribute("fill", color);

    /* =====  VALUE  ON  TOP  ===== */
    thermometerValue.style.order = "-1";            // push it above SVG
    thermometerValue.textContent = `${temp.toFixed(1)}°C`;

    /* ----  tiny shake on quick change  ---- */
    thermo.classList.remove("shake");
    void thermo.offsetWidth;
    thermo.classList.add("shake");
  } else {
    thermometerContainer.style.display = "none";
  }

  /* ----------  humidity wave card  ---------- */
  if (
    protocol === "I2C" &&
    currentHumidity !== null &&
    currentHumidity !== undefined &&
    currentHumidity !== "null" &&
    !isNaN(parseFloat(currentHumidity))
  ) {
    humidityCard.style.display = "block";
    const humidity = parseFloat(currentHumidity);
    humidityValue.textContent = `${humidity.toFixed(1)}%`;

    const t        = Math.min(Math.max(humidity / 100, 0), 1);
    const lowColor = { r: 61, g: 142, b: 180 };
    const highColor= { r: 4, g: 116, b: 168 };
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
  } else {
    humidityValue.textContent = "";
    waveColor1.setAttribute("style", "stop-color: #3d8eb4; stop-opacity: 0.5");
    waveColor2.setAttribute("style", "stop-color: #0474a8; stop-opacity: 1");
    wavePath.style.animation = "";
    wavePath.setAttribute("d", "M 0 100 V 100 H 100 V 100 Z");
  }

  /* ----------  pressure bar card  ---------- */
  if (
    protocol === "I2C" &&
    currentPressure !== null &&
    currentPressure !== undefined &&
    currentPressure !== "null" &&
    !isNaN(parseFloat(currentPressure))
  ) {
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
    pressureBar.style.width   = `${barWidth}%`;
    pressureBar.style.backgroundColor = barColor;
  } else {
    pressureValue.textContent = "";
    pressureBar.style.width   = "0%";
    pressureBar.style.backgroundColor = "#34d399";
  }

  /* ----------  light sun card  ---------- */
  if (
    protocol === "I2C" &&
    currentLight !== null &&
    currentLight !== undefined &&
    currentLight !== "null" &&
    !isNaN(parseFloat(currentLight))
  ) {
    lightCard.style.display = "block";
    const light = parseFloat(currentLight);
    const sunColor = light <= 10000 ? "#ffeb3b" : light <= 50000 ? "#ffc13bff" : "#f87171";
    const glowStd  = light <= 10000 ? 2 : light <= 50000 ? 5 : 8;
    const brightness = Math.min(Math.max(light / 120000, 0), 1);

    const sunCircle = document.getElementById("sun-circle");
    const rays      = document.querySelectorAll("#light-sun line");
    const glowFilter= document.querySelector("#glow feGaussianBlur");

    sunCircle.setAttribute("fill", sunColor);
    sunCircle.setAttribute("r", 20 + 10 * brightness);
    rays.forEach((ray) => ray.setAttribute("stroke", sunColor));
    glowFilter.setAttribute("stdDeviation", glowStd * brightness);
    document.getElementById("light-sun").setAttribute("filter", "url(#glow)");

    lightValue.textContent       = `${light.toFixed(1)} lux`;
    lightValueDisplay.textContent= `${light.toFixed(1)} lux`;
  } else {
    lightValue.textContent        = "";
    lightValueDisplay.textContent = "";
    const sunCircle = document.getElementById("sun-circle");
    const rays      = document.querySelectorAll("#light-sun line");
    const glowFilter= document.querySelector("#glow feGaussianBlur");
    sunCircle.setAttribute("fill", "#ffeb3b");
    sunCircle.setAttribute("r", 20);
    rays.forEach((ray) => ray.setAttribute("stroke", "#ffeb3b"));
    glowFilter.setAttribute("stdDeviation", 0);
    document.getElementById("light-sun").removeAttribute("filter");
  }
}

/* ------------------------------------------------------------------ */
/*  DATA PARSER                                                       */
/* ------------------------------------------------------------------ */
function parseSensorData(data) {
  const protocol = document.getElementById("sensor-select").value;
  if (!protocol) return;

  const lines = data.split("\n").map((l) => l.trim()).filter((l) => l);
  lines.forEach((line) => {
    if (line.startsWith("Published to topic 'device/data':")) {
      try {
        const jsonStr = line.split(": ", 2)[1];
        const json = JSON.parse(jsonStr);

        // Set global variables
        currentTemperature = json.CurrentTemperature;
        currentHumidity = json.CurrentHumidity;
        currentPressure = json.AtmPressure;
        currentLight = json.LightIntensity;

        // Update sensor status and data for I2C
        if (protocol === "I2C") {
          if (currentTemperature !== undefined) {
            sensorStatus.I2C.BME680 = true;
            sensorData.I2C["BME680 Temperature"] = `${currentTemperature} °C`;
          }
          if (currentHumidity !== undefined) {
            sensorStatus.I2C.BME680 = true;
            sensorData.I2C["BME680 Humidity"] = `${currentHumidity} %`;
          }
          if (currentPressure !== undefined) {
            sensorStatus.I2C.BME680 = true;
            sensorData.I2C["BME680 Pressure"] = `${currentPressure} hPa`;
          }
          if (currentLight !== undefined) {
            sensorStatus.I2C.VEML7700 = true;
            sensorData.I2C["VEML7700 Light Intensity"] = `${currentLight} lux`;
          }
        }

        // Update for ADC if applicable
        if (protocol === "ADC") {
          if (json.BatteryVoltage !== undefined) {
            sensorStatus.ADC["Battery Voltage"] = true;
            sensorData.ADC["Battery Voltage"] = `${json.BatteryVoltage} V`;
          }
          if (json.RainfallHourly !== undefined || json.RainfallDaily !== undefined || json.RainfallWeekly !== undefined) {
            sensorStatus.ADC["Rain Gauge"] = true;
            sensorData.ADC["Rain Gauge Hourly"] = json.RainfallHourly;
            sensorData.ADC["Rain Gauge Daily"] = json.RainfallDaily;
            sensorData.ADC["Rain Gauge Weekly"] = json.RainfallWeekly;
          }
        }

        updateSensorUI();
      } catch (e) {
        console.error("Error parsing JSON:", e);
      }
    }

    // Keep existing parsing for other formats if needed
    const m = line.match(/^(.+?)\s*-\s*(.+?):\s*(.+)$/);
    if (m) {
      const sensorName = m[1].trim();
      const param      = m[2].trim();
      const value      = m[3].trim();
      const sensors    = sensorProtocolMap[protocol] || [];
      if (sensors.includes(sensorName)) {
        const ok = !(value === "null" || value === "" || isNaN(parseFloat(value.replace(/[^0-9.-]+/g, ""))));
        sensorStatus[protocol][sensorName] = ok;
        if (ok) sensorData[protocol][`${sensorName} ${param}`] = value;

        if (sensorName === "BME680") {
          if (param === "Temperature") currentTemperature = ok ? value.replace("°C", "").trim() : null;
          else if (param === "Humidity") currentHumidity = ok ? value.replace("%", "").trim() : null;
          else if (param === "Pressure") currentPressure = ok ? value.replace("hPa", "").trim() : null;
        } else if (sensorName === "VEML7700" && param === "Light Intensity") {
          currentLight = ok ? value.replace("lux", "").trim() : null;
        }
        updateSensorUI();
      }
    }

    const rain = line.match(/^Rain Tip Detected!\s*Hourly:\s*(\d+)\s*Daily:\s*(\d+)\s*Weekly:\s*(\d+)/);
    if (rain && protocol === "ADC") {
      sensorStatus[protocol]["Rain Gauge"] = true;
      sensorData[protocol]["Rain Gauge Hourly"] = `${rain[1]} tips`;
      sensorData[protocol]["Rain Gauge Daily"]  = `${rain[2]} tips`;
      sensorData[protocol]["Rain Gauge Weekly"] = `${rain[3]} tips`;
      updateSensorUI();
    }
  });
}

/* ------------------------------------------------------------------ */
/*  PROTOCOL / MQTT / FTP / HTTP  (unchanged)                         */
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
async function getInterval() {
  const res = await window.electronAPI.getInterval();
  res.error ? log(res.error, "error") : log(res, "success");
}
async function setProtocol() {
  const p = document.getElementById("protocol-select").value;
  const res = await window.electronAPI.setProtocol(p);
  if (res.error) return log(res.error, "error");
  log(res, "success");
  updateProtocolUI();
}

/* FTP / MQTT / HTTP config functions (unchanged) */
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
  if (!broker && !user && !pass && ssl === "no") return log("Please enter at least one MQTT configuration field.", "error");
  if (broker && !/^[a-zA-Z0-9.-]+$/.test(broker)) return log("Invalid MQTT broker format.", "error");
  const cmds = [];
  if (ssl !== "") cmds.push(`SET_MQTT_SSL:${ssl === "yes" ? "ON" : "OFF"}`);
  if (broker) cmds.push(`SET_MQTT_BROKER:${broker}`);
  if (user) cmds.push(`SET_MQTT_USER:${user}`);
  if (pass) cmds.push(`SET_MQTT_PASS:${pass}`);
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
/*  SERIAL DATA HANDLER  (unchanged)                                  */
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
  else if (/\/usr contents|device id:/i.test(sanitized)) cls = "log-info";

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
    if (b) document.getElementById("mqtt-broker").value = b[1];
    if (u) document.getElementById("mqtt-user").value = u[1];
    if (s) {
      document.getElementById("mqtt-ssl").value = /true|on/i.test(s[1]) ? "yes" : "no";
      toggleCertUploadAndPort();
    }
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