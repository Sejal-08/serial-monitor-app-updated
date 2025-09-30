let selectedCACertFile = null;
let selectedClientKeyFile = null;

// Sensor protocol to sensor mapping
const sensorProtocolMap = {
  "I2C": ["BME680", "VEML7700"],
  "ADC": ["Battery Voltage", "Rain Gauge"],
  "RS232": ["Ultrasonic Sensor"],
  "RS485": [],
  "SPI": []
};

// Track sensor presence and data
let sensorStatus = {
  "I2C": { BME680: false, VEML7700: false },
  "ADC": { "Battery Voltage": false, "Rain Gauge": false },
  "RS232": { "Ultrasonic Sensor": false },
  "RS485": {},
  "SPI": {}
};

let sensorData = {
  "I2C": {},
  "ADC": {},
  "RS232": {},
  "RS485": {},
  "SPI": {}
};
let currentTemperature = null;
let currentHumidity = null;
let currentPressure = null;
let currentLight = null;

// Update sensor UI
function updateSensorUI() {
  const protocol = document.getElementById("sensor-select").value;
  const sensorListDiv = document.getElementById("sensor-list");
  const sensorDataDiv = document.getElementById("sensor-data");
  const thermometerContainer = document.getElementById("thermometer-container");
  const humidityCard = document.getElementById("humidity-card");
  const pressureCard = document.getElementById("pressure-card");
  const lightCard = document.getElementById("light-card");
  const thermometerFill = document.getElementById("thermometer-fill");
  const thermometerBulb = document.getElementById("thermometer-bulb");
  const thermometerValue = document.getElementById("thermometer-value");
  const humidityValue = document.getElementById("humidity-value");
  const humidityWave = document.getElementById("humidity-wave");
  const wavePath = document.getElementById("wavePath");
  const waveColor1 = document.getElementById("waveColor1");
  const waveColor2 = document.getElementById("waveColor2");
  const pressureValue = document.getElementById("pressure-value");
  const pressureBar = document.getElementById("pressure-bar");
  const lightValue = document.getElementById("light-value");
  const lightValueDisplay = document.getElementById("light-value-display");

  sensorListDiv.innerHTML = "";
  sensorDataDiv.innerHTML = "";

  // Reset card visibility
  thermometerContainer.style.display = "none";
  humidityCard.style.display = "none";
  pressureCard.style.display = "none";
  lightCard.style.display = "none";

  if (protocol) {
    const sensors = sensorProtocolMap[protocol] || [];
    let listHtml = "<h4>Sensors</h4><ul>";
    sensors.forEach(sensor => {
      const isPresent = sensorStatus[protocol][sensor];
      listHtml += `<li><i class="fas ${isPresent ? 'fa-check text-success' : 'fa-times text-error'}"></i> ${sensor}</li>`;
    });
    listHtml += "</ul>";
    sensorListDiv.innerHTML = sensors.length > 0 ? listHtml : "<p>No sensors available.</p>";

    const data = sensorData[protocol];
    let dataHtml = "<h4>Sensor Data</h4>";
    let hasData = false;
    if (Object.keys(data).length > 0) {
      for (const [key, value] of Object.entries(data)) {
        if (value !== null && value !== undefined && value !== "null" && value !== "") {
          dataHtml += `<div class="sensor-data-item"><strong>${key}:</strong> ${value}</div>`;
          hasData = true;
        }
      }
    }
    sensorDataDiv.innerHTML = hasData ? dataHtml : "<p>No sensor data available.</p>";

    // Show cards only if valid data is available
    if (protocol === "I2C" && currentTemperature !== null && currentTemperature !== undefined && currentTemperature !== "null" && !isNaN(parseFloat(currentTemperature))) {
      thermometerContainer.style.display = "flex";
      const temp = parseFloat(currentTemperature);
      let fillColor = temp < 25 ? "#ffeb3b" : temp <= 35 ? "#ff9800" : "#f44336";
      const maxTemp = 50, minTemp = 0, maxHeight = 160;
      const fillHeight = Math.min(Math.max((temp - minTemp) / (maxTemp - minTemp) * maxHeight, 0), maxHeight);
      thermometerFill.setAttribute("y", 180 - fillHeight);
      thermometerFill.setAttribute("height", fillHeight);
      thermometerFill.setAttribute("fill", fillColor);
      thermometerBulb.setAttribute("fill", fillColor);
      thermometerValue.textContent = `${temp.toFixed(2)}°C`;
    } else {
      thermometerFill.setAttribute("y", 180);
      thermometerFill.setAttribute("height", 0);
      thermometerFill.setAttribute("fill", "#ffeb3b");
      thermometerBulb.setAttribute("fill", "#ffeb3b");
      thermometerValue.textContent = "";
    }

    if (protocol === "I2C" && currentHumidity !== null && currentHumidity !== undefined && currentHumidity !== "null" && !isNaN(parseFloat(currentHumidity))) {
      humidityCard.style.display = "flex";
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
      const waveHeight = 100 - (humidity * 100 / 100);
      const waveAnimation = `
        @keyframes waveAnimation {
          0% { d: "M 0 ${waveHeight} Q 25 ${waveHeight + 5} 50 ${waveHeight} T 100 ${waveHeight} V 100 H 0 Z"; }
          50% { d: "M 0 ${waveHeight + 2} Q 25 ${waveHeight + 7} 50 ${waveHeight + 2} T 100 ${waveHeight + 2} V 100 H 0 Z"; }
          100% { d: "M 0 ${waveHeight} Q 25 ${waveHeight + 5} 50 ${waveHeight} T 100 ${waveHeight} V 100 H 0 Z"; }
        }
      `;
      const styleSheet = document.styleSheets[0];
      try {
        styleSheet.insertRule(waveAnimation, styleSheet.cssRules.length);
      } catch (e) {
        // Rule may already exist, update the path directly
      }
      wavePath.style.animation = "waveAnimation 8s ease-in-out infinite";
      wavePath.setAttribute("d", `M 0 ${waveHeight} Q 25 ${waveHeight + 5} 50 ${waveHeight} T 100 ${waveHeight} V 100 H 0 Z`);
    } else {
      humidityValue.textContent = "";
      waveColor1.setAttribute("style", `stop-color: #3d8eb4; stop-opacity: 0.5`);
      waveColor2.setAttribute("style", `stop-color: #0474a8; stop-opacity: 1`);
      wavePath.style.animation = "";
      wavePath.setAttribute("d", "M 0 100 V 100 H 100 V 100 Z");
    }

    if (protocol === "I2C" && currentPressure !== null && currentPressure !== undefined && currentPressure !== "null" && !isNaN(parseFloat(currentPressure))) {
      pressureCard.style.display = "flex";
      const pressure = parseFloat(currentPressure);
      let barColor = pressure >= 950 && pressure <= 1050 ? "#34d399" : (pressure >= 900 && pressure < 950) || (pressure > 1050 && pressure <= 1100) ? "#ffeb3b" : "#f87171";
      const barWidth = Math.min(Math.max((pressure - 300) / (1100 - 300) * 100, 0), 100);
      pressureValue.textContent = `${pressure.toFixed(1)} hPa`;
      pressureBar.style.width = `${barWidth}%`;
      pressureBar.style.backgroundColor = barColor;
    } else {
      pressureValue.textContent = "";
      pressureBar.style.width = "0%";
      pressureBar.style.backgroundColor = "#34d399";
    }

    if (protocol === "I2C" && currentLight !== null && currentLight !== undefined && currentLight !== "null" && !isNaN(parseFloat(currentLight))) {
      lightCard.style.display = "flex";
      const light = parseFloat(currentLight);
      let sunColor = light <= 10000 ? "#ffeb3b" : light <= 50000 ? "#ffc13bff" : "#f87171";
      let glowStd = light <= 10000 ? 2 : light <= 50000 ? 5 : 8;
      const brightness = Math.min(Math.max(light / 120000, 0), 1);
      const sunCircle = document.getElementById("sun-circle");
      const rays = document.querySelectorAll("#light-sun line");
      const glowFilter = document.querySelector("#glow feGaussianBlur");
      sunCircle.setAttribute("fill", sunColor);
      sunCircle.setAttribute("r", 20 + (10 * brightness));
      rays.forEach(ray => ray.setAttribute("stroke", sunColor));
      glowFilter.setAttribute("stdDeviation", glowStd * brightness);
      document.getElementById("light-sun").setAttribute("filter", "url(#glow)");
      lightValue.textContent = `${light.toFixed(1)} lux`;
      lightValueDisplay.textContent = `${light.toFixed(1)} lux`;
    } else {
      lightValue.textContent = "";
      lightValueDisplay.textContent = "";
      const sunCircle = document.getElementById("sun-circle");
      const rays = document.querySelectorAll("#light-sun line");
      const glowFilter = document.querySelector("#glow feGaussianBlur");
      sunCircle.setAttribute("fill", "#ffeb3b");
      sunCircle.setAttribute("r", 20);
      rays.forEach(ray => ray.setAttribute("stroke", "#ffeb3b"));
      glowFilter.setAttribute("stdDeviation", 0);
      document.getElementById("light-sun").removeAttribute("filter");
    }
  } else {
    sensorListDiv.innerHTML = "<p>No protocol selected.</p>";
    sensorDataDiv.innerHTML = "<p>No sensor data available.</p>";
  }
}

// Parse sensor data
function parseSensorData(data) {
  const protocol = document.getElementById("sensor-select").value;
  if (!protocol) return;

  const lines = data.split("\n").map(line => line.trim()).filter(line => line);
  lines.forEach(line => {
    const sensorMatch = line.match(/^(.+?)\s*-\s*(.+?):\s*(.+)$/);
    if (sensorMatch) {
      const sensorName = sensorMatch[1].trim();
      const parameter = sensorMatch[2].trim();
      const value = sensorMatch[3].trim();
      const sensors = sensorProtocolMap[protocol] || [];
      if (sensors.includes(sensorName)) {
        // Check if the value is valid (not null, undefined, or empty)
        if (value === "null" || value === "" || isNaN(parseFloat(value.replace(/[^0-9.-]+/g, "")))) {
          sensorStatus[protocol][sensorName] = false; // Mark as not present (red tick)
        } else {
          sensorStatus[protocol][sensorName] = true; // Mark as present (green tick)
          sensorData[protocol][`${sensorName} ${parameter}`] = value;
        }
        if (sensorName === "BME680") {
          if (parameter === "Temperature") {
            currentTemperature = (value === "null" || value === "" || isNaN(parseFloat(value.replace("°C", "").trim()))) ? null : value.replace("°C", "").trim();
          } else if (parameter === "Humidity") {
            currentHumidity = (value === "null" || value === "" || isNaN(parseFloat(value.replace("%", "").trim()))) ? null : value.replace("%", "").trim();
          } else if (parameter === "Pressure") {
            currentPressure = (value === "null" || value === "" || isNaN(parseFloat(value.replace("hPa", "").trim()))) ? null : value.replace("hPa", "").trim();
          }
        } else if (sensorName === "VEML7700" && parameter === "Light Intensity") {
          currentLight = (value === "null" || value === "" || isNaN(parseFloat(value.replace("lux", "").trim()))) ? null : value.replace("lux", "").trim();
        }
        updateSensorUI();
      }
    }

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

function updateProtocolUI() {
  const protocol = document.getElementById("protocol-select").value;
  document.getElementById("ftp-section").style.display = protocol === "FTP" ? "block" : "none";
  document.getElementById("mqtt-section").style.display = protocol === "MQTT" ? "block" : "none";
  document.getElementById("http-section").style.display = protocol === "HTTP" ? "block" : "none";
  if (protocol === "MQTT") toggleCertUploadAndPort();
  else document.getElementById("cert-upload-button").style.display = "none";
}

function toggleCertUploadAndPort() {
  const sslEnabled = document.getElementById("mqtt-ssl").value;
  document.getElementById("cert-section").style.display = sslEnabled === "yes" ? "block" : "none";
  document.getElementById("cert-upload-button").style.display = sslEnabled === "yes" ? "block" : "none";
  document.getElementById("mqtt-port").value = sslEnabled === "yes" ? "8883" : "1883";
}

async function browseCACert() {
  const filePath = await window.electronAPI.openFileDialog();
  if (filePath) {
    selectedCACertFile = filePath;
    document.getElementById("mqtt-ca-cert-path").value = "/usr/device_cert.pem.crt";
    document.getElementById("output").innerHTML += `<span style="color: green;">Selected certificate: ${filePath}</span><br>`;
  } else {
    document.getElementById("output").innerHTML += `<span style="color: red;">Certificate file selection cancelled</span><br>`;
  }
}

async function browseClientKey() {
  const filePath = await window.electronAPI.openFileDialog();
  if (filePath) {
    selectedClientKeyFile = filePath;
    document.getElementById("mqtt-client-key-path").value = "/usr/private_key.pem.key";
    document.getElementById("output").innerHTML += `<span style="color: green;">Selected private key: ${filePath}</span><br>`;
  } else {
    document.getElementById("output").innerHTML += `<span style="color: red;">Private key file selection cancelled</span><br>`;
  }
}

async function uploadCertificates() {
  if (!selectedCACertFile || !selectedClientKeyFile) {
    document.getElementById("output").innerHTML += `<span style="color: red;">Please select both certificate and private key.</span><br>`;
    return;
  }

  const result = await window.electronAPI.setMQTTCertificates({
    caCertPath: selectedCACertFile,
    clientKeyPath: selectedClientKeyFile,
  });

  if (result.error) {
    document.getElementById("output").innerHTML += `<span style="color: red;">${result.error}</span><br>`;
  } else {
    document.getElementById("output").innerHTML += `<span style="color: green;">${result}</span><br>`;
  }
}

async function listPorts() {
  const result = await window.electronAPI.listPorts();
  const select = document.getElementById("ports");
  select.innerHTML = "";

  if (result.error) {
    document.getElementById("output").innerHTML += `<span style="color: red;">${result.error}</span><br>`;
    return;
  }

  result.forEach((p) => {
    const option = document.createElement("option");
    option.value = p;
    option.textContent = p;
    select.appendChild(option);
  });
}

async function connectPort() {
  const portName = document.getElementById("ports").value;
  const baudRate = document.getElementById("baud-rate").value;

  if (!portName) {
    document.getElementById("output").innerHTML += `<span style="color: red;">Please select a port.</span><br>`;
    return;
  }

  if (!baudRate || isNaN(baudRate) || baudRate <= 0) {
    document.getElementById("output").innerHTML += `<span style="color: red;">Please select a valid baud rate.</span><br>`;
    return;
  }

  const result = await window.electronAPI.connectPort(portName, baudRate);
  if (result.error) {
    document.getElementById("output").innerHTML += `<span style="color: red;">${result.error}</span><br>`;
  } else {
    document.getElementById("output").innerHTML += `<span style="color: green;">${result}</span><br>`;
  }
}

async function disconnectPort() {
  const result = await window.electronAPI.disconnectPort();
  if (result.error) {
    document.getElementById("output").innerHTML += `<span style="color: red;">${result.error}</span><br>`;
  } else {
    document.getElementById("output").innerHTML += `<span style="color: green;">${result}</span><br>`;
  }
}

async function setDeviceID() {
  const deviceID = document.getElementById("device-id").value.trim();
  if (!deviceID || !/^[a-zA-Z0-9-_]+$/.test(deviceID)) {
    document.getElementById("output").innerHTML += `<span style="color: red;">Please enter a valid alphanumeric Device ID.</span><br>`;
    return;
  }

  const result = await window.electronAPI.setDeviceID(deviceID);
  if (result.error) {
    document.getElementById("output").innerHTML += `<span style="color: red;">${result.error}</span><br>`;
  } else {
    document.getElementById("output").innerHTML += `<span style="color: green;">${result}</span><br>`;
  }
}

async function setInterval() {
  const interval = document.getElementById("interval").value;
  if (!interval || isNaN(interval) || interval <= 0) {
    document.getElementById("output").innerHTML += `<span style="color: red;">Please enter a valid interval (positive seconds).</span><br>`;
    return;
  }

  const result = await window.electronAPI.setInterval(interval);
  if (result.error) {
    document.getElementById("output").innerHTML += `<span style="color: red;">${result.error}</span><br>`;
  } else {
    document.getElementById("output").innerHTML += `<span style="color: green;">${result}</span><br>`;
  }
}

async function getInterval() {
  const result = await window.electronAPI.getInterval();
  if (result.error) {
    document.getElementById("output").innerHTML += `<span style="color: red;">${result.error}</span><br>`;
  } else {
    document.getElementById("output").innerHTML += `<span style="color: green;">${result}</span><br>`;
  }
}

async function setProtocol() {
  const protocol = document.getElementById("protocol-select").value;
  const result = await window.electronAPI.setProtocol(protocol);
  if (result.error) {
    document.getElementById("output").innerHTML += `<span style="color: red;">${result.error}</span><br>`;
  } else {
    document.getElementById("output").innerHTML += `<span style="color: green;">${result}</span><br>`;
    updateProtocolUI();
  }
}

async function setFTPConfig() {
  const host = document.getElementById("ftp-host").value.trim();
  const user = document.getElementById("ftp-user").value.trim();
  const password = document.getElementById("ftp-password").value;

  if (!host && !user && !password) {
    document.getElementById("output").innerHTML += `<span style="color: red;">Please enter at least one FTP configuration field.</span><br>`;
    return;
  }

  if (host && !/^[a-zA-Z0-9.-]+$/.test(host)) {
    document.getElementById("output").innerHTML += `<span style="color: red;">Invalid FTP host format.</span><br>`;
    return;
  }

  const commands = [];
  if (host) commands.push(`SET_FTP_HOST:${host}`);
  if (user) commands.push(`SET_FTP_USER:${user}`);
  if (password) commands.push(`SET_FTP_PASS:${password}`);

  for (const cmd of commands) {
    const result = await window.electronAPI.sendData(cmd);
    if (result.error) {
      document.getElementById("output").innerHTML += `<span style="color: red;">${result.error}</span><br>`;
    } else {
      document.getElementById("output").innerHTML += `<span style="color: green;">${result}</span><br>`;
    }
    await delay(1500);
  }

  const result = await window.electronAPI.setProtocol("FTP");
  if (result.error) {
    document.getElementById("output").innerHTML += `<span style="color: red;">${result.error}</span><br>`;
  } else {
    document.getElementById("output").innerHTML += `<span style="color: green;">${result}</span><br>`;
    await delay(2000);
    await window.electronAPI.getFTPConfig();
  }
}

async function getFTPConfig() {
  const result = await window.electronAPI.getFTPConfig();
  if (result.error) {
    document.getElementById("output").innerHTML += `<span style="color: red;">${result.error}</span><br>`;
  } else {
    document.getElementById("output").innerHTML += `<span style="color: green;">${result}</span><br>`;
  }
}

async function setMQTTConfig() {
  const broker = document.getElementById("mqtt-broker").value.trim();
  const user = document.getElementById("mqtt-user").value.trim();
  const password = document.getElementById("mqtt-password").value;
  const sslEnabled = document.getElementById("mqtt-ssl").value;

  if (!broker && !user && !password && sslEnabled === "no") {
    document.getElementById("output").innerHTML += `<span style="color: red;">Please enter at least one MQTT configuration field.</span><br>`;
    return;
  }

  if (broker && !/^[a-zA-Z0-9.-]+$/.test(broker)) {
    document.getElementById("output").innerHTML += `<span style="color: red;">Invalid MQTT broker format.</span><br>`;
    return;
  }

  const commands = [];
  if (sslEnabled !== "") commands.push(`SET_MQTT_SSL:${sslEnabled === "yes" ? "ON" : "OFF"}`);
  if (broker) commands.push(`SET_MQTT_BROKER:${broker}`);
  if (user) commands.push(`SET_MQTT_USER:${user}`);
  if (password) commands.push(`SET_MQTT_PASS:${password}`);

  for (const cmd of commands) {
    const result = await window.electronAPI.sendData(cmd);
    if (result.error) {
      document.getElementById("output").innerHTML += `<span style="color: red;">${result.error}</span><br>`;
    } else {
      document.getElementById("output").innerHTML += `<span style="color: green;">${result}</span><br>`;
    }
    await delay(1500);
  }

  const result = await window.electronAPI.setProtocol("MQTT");
  if (result.error) {
    document.getElementById("output").innerHTML += `<span style="color: red;">${result.error}</span><br>`;
  } else {
    document.getElementById("output").innerHTML += `<span style="color: green;">${result}</span><br>`;
    await delay(3000);
    const verifyResult = await window.electronAPI.getMQTTConfig();
    if (verifyResult.error || verifyResult.includes("MQTT not active")) {
      document.getElementById("output").innerHTML += `<span style="color: red;">MQTT protocol not active after setting. Please check device.</span><br>`;
    }
  }
}

async function getMQTTConfig() {
  const result = await window.electronAPI.getMQTTConfig();
  if (result.error) {
    document.getElementById("output").innerHTML += `<span style="color: red;">${result.error}</span><br>`;
  } else {
    document.getElementById("output").innerHTML += `<span style="color: green;">${result}</span><br>`;
  }
}

async function setHTTPConfig() {
  const url = document.getElementById("http-url").value.trim();
  const user = document.getElementById("http-auth-user").value.trim();
  const password = document.getElementById("http-auth-password").value;

  if (!url && !user && !password) {
    document.getElementById("output").innerHTML += `<span style="color: red;">Please enter at least one HTTP configuration field.</span><br>`;
    return;
  }

  if (url && !/^https?:\/\/.+$/.test(url)) {
    document.getElementById("output").innerHTML += `<span style="color: red;">Invalid HTTP URL format.</span><br>`;
    return;
  }

  const commands = [];
  if (url) commands.push(`SET_HTTP_URL:${url}`);
  if (user && password) commands.push(`SET_HTTP_AUTH:${user}:${password}`);

  for (const cmd of commands) {
    const result = await window.electronAPI.sendData(cmd);
    if (result.error) {
      document.getElementById("output").innerHTML += `<span style="color: red;">${result.error}</span><br>`;
    } else {
      document.getElementById("output").innerHTML += `<span style="color: green;">${result}</span><br>`;
    }
    await delay(1500);
  }

  const result = await window.electronAPI.setProtocol("HTTP");
  if (result.error) {
    document.getElementById("output").innerHTML += `<span style="color: red;">${result.error}</span><br>`;
  } else {
    document.getElementById("output").innerHTML += `<span style="color: green;">${result}</span><br>`;
    await delay(2000);
    await window.electronAPI.getHTTPConfig();
  }
}

async function getHTTPConfig() {
  const result = await window.electronAPI.getHTTPConfig();
  if (result.error) {
    document.getElementById("output").innerHTML += `<span style="color: red;">${result.error}</span><br>`;
  } else {
    document.getElementById("output").innerHTML += `<span style="color: green;">${result}</span><br>`;
  }
}

async function uploadFile() {
  const filePath = await window.electronAPI.openFileDialog();
  if (!filePath) {
    document.getElementById("output").innerHTML += `<span style="color: red;">No file selected for upload.</span><br>`;
    return;
  }

  const result = await window.electronAPI.uploadFile(filePath);
  if (result.error) {
    document.getElementById("output").innerHTML += `<span style="color: red;">${result.error}</span><br>`;
  } else {
    document.getElementById("output").innerHTML += `<span style="color: green;">${result}</span><br>`;
  }
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Serial data handler
window.electronAPI.onSerialData((data) => {
  if (data) {
    const sanitizedData = data.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const outputDiv = document.getElementById("output");
    let logClass = "log-default";

    parseSensorData(sanitizedData);

    if (
      sanitizedData.includes("RX Received") ||
      sanitizedData.includes("Text: '") ||
      sanitizedData.includes("Config saved")
    ) {
      return;
    }

    if (
      sanitizedData.includes("Error") ||
      sanitizedData.includes("error") ||
      sanitizedData.includes("failed") ||
      sanitizedData.includes("ENOENT") ||
      sanitizedData.includes("not active")
    ) {
      logClass = "log-error";
    } else if (
      sanitizedData.includes("Successfully") ||
      sanitizedData.includes("saved OK") ||
      sanitizedData.includes("Connected to") ||
      sanitizedData.includes("Current interval") ||
      sanitizedData.includes("protocol initialized")
    ) {
      logClass = "log-success";
    } else if (sanitizedData.includes("/usr contents") || sanitizedData.includes("Device ID:")) {
      logClass = "log-info";
    }

    outputDiv.innerHTML += `<span class="log-line ${logClass}">${sanitizedData}</span><br>`;

    if (sanitizedData.startsWith("FTP protocol")) {
      const hostMatch = sanitizedData.match(/host=([^,]+)/);
      const userMatch = sanitizedData.match(/user=([^,]+)/);
      if (hostMatch) document.getElementById("ftp-host").value = hostMatch[1];
      if (userMatch) document.getElementById("ftp-user").value = userMatch[1];
    }

    if (sanitizedData.startsWith("MQTT protocol") || sanitizedData.includes("MQTT extras")) {
      const brokerMatch = sanitizedData.match(/broker=([^,]+)/);
      const userMatch = sanitizedData.match(/user=([^,]+)/);
      const sslMatch = sanitizedData.match(/ssl=([^,]+)/) || sanitizedData.match(/ssl_enabled=([^,]+)/);
      if (brokerMatch) document.getElementById("mqtt-broker").value = brokerMatch[1];
      if (userMatch) document.getElementById("mqtt-user").value = userMatch[1];
      if (sslMatch) {
        const sslValue = sslMatch[1].toLowerCase();
        document.getElementById("mqtt-ssl").value = sslValue === "true" || sslValue === "on" ? "yes" : "no";
        toggleCertUploadAndPort();
      }
    }

    if (sanitizedData.startsWith("HTTP protocol")) {
      const urlMatch = sanitizedData.match(/url=([^,]+)/);
      if (urlMatch) document.getElementById("http-url").value = urlMatch[1];
    }

    outputDiv.scrollTop = outputDiv.scrollHeight;
  }
});

// Initialize UI
window.addEventListener("DOMContentLoaded", () => {
  updateProtocolUI();
  listPorts();
  updateSensorUI();
});