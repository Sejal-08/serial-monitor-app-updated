let selectedCACertFile = null;
let selectedClientKeyFile = null;
// Sensor protocol to sensor mapping
const sensorProtocolMap = {
  "I2C": ["BME680", "VEML7700"], // I2C sensors
  "ADC": ["Battery Voltage", "Rain Gauge"], // ADC sensors
  "RS232": ["Ultrasonic Sensor"], // RS232
  "RS485": [], // RS485
  "SPI": [] // SPI
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
let currentTemperature = null; // Store latest temperature value
let currentHumidity = null;    // Store latest humidity value
let currentPressure = null;    // Store latest pressure value
let currentLight = null;       // Store latest light intensity value



// Update sensor UI (list, data, thermometer, and cards)
function updateSensorUI() {
  const protocol = document.getElementById("sensor-select").value;
  const sensorListDiv = document.getElementById("sensor-list");
  const sensorDataDiv = document.getElementById("sensor-data");
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
  const lightBar = document.getElementById("light-bar");
  sensorListDiv.innerHTML = "";
  sensorDataDiv.innerHTML = "";

  
  if (protocol) {
    // Display sensor list
    const sensors = sensorProtocolMap[protocol] || [];
    let listHtml = "<h4>Sensors</h4><ul>";
    sensors.forEach(sensor => {
      const isPresent = sensorStatus[protocol][sensor];
      listHtml += `<li><i class="fas ${isPresent ? 'fa-check text-success' : 'fa-times text-error'}"></i> ${sensor}</li>`;
    });
    listHtml += "</ul>";
    sensorListDiv.innerHTML = sensors.length > 0 ? listHtml : "<p>No sensors available.</p>";

    // Display sensor data
    const data = sensorData[protocol];
    let dataHtml = "<h4>Sensor Data</h4>";
    if (Object.keys(data).length > 0) {
      for (const [key, value] of Object.entries(data)) {
        dataHtml += `<div class="sensor-data-item"><strong>${key}:</strong> ${value}</div>`;
      }
    } else {
      dataHtml += "<p>No sensor data available.</p>";
    }
    sensorDataDiv.innerHTML = dataHtml;

    // Update thermometer (only for I2C protocol)
    if (protocol === "I2C" && currentTemperature !== null) {
      const temp = parseFloat(currentTemperature);
      let fillColor;
      if (temp < 25) {
        fillColor = "#ffeb3b"; // Yellow
      } else if (temp >= 25 && temp <= 35) {
        fillColor = "#ff9800"; // Orange
      } else {
        fillColor = "#f44336"; // Red
      }
      const maxTemp = 50;
      const minTemp = 0;
      const maxHeight = 160;
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
      thermometerValue.textContent = "N/A";
    }

    // Update humidity wave (only for I2C protocol)
    if (protocol === "I2C" && currentHumidity !== null) {
      const humidity = parseFloat(currentHumidity);
      humidityValue.textContent = `${humidity.toFixed(1)}%`;

      // Interpolate wave colors based on humidity
      const t = Math.min(Math.max(humidity / 100, 0), 1);
      const lowColor = { r: 61, g: 142, b: 180 }; // #3d8eb4
      const highColor = { r: 4, g: 116, b: 168 }; // #0474a8
      const r = Math.round(lowColor.r + (highColor.r - lowColor.r) * t);
      const g = Math.round(lowColor.g + (highColor.g - lowColor.g) * t);
      const b = Math.round(lowColor.b + (highColor.b - lowColor.b) * t);
      const primaryColor = `rgb(${r}, ${g}, ${b})`;
      waveColor1.setAttribute("style", `stop-color: ${primaryColor}; stop-opacity: 0.5`);
      waveColor2.setAttribute("style", `stop-color: ${primaryColor}; stop-opacity: 1`);

      // Animate wave height
      const waveHeight = 100 - (humidity * 100 / 100); // Invert for fill effect
      const waveAnimation = `
        @keyframes waveAnimation {
          0% { d: "M 0 ${waveHeight} Q 25 ${waveHeight + 5} 50 ${waveHeight} T 100 ${waveHeight} V 100 H 0 Z"; }
          50% { d: "M 0 ${waveHeight + 2} Q 25 ${waveHeight + 7} 50 ${waveHeight + 2} T 100 ${waveHeight + 2} V 100 H 0 Z"; }
          100% { d: "M 0 ${waveHeight} Q 25 ${waveHeight + 5} 50 ${waveHeight} T 100 ${waveHeight} V 100 H 0 Z"; }
        }
      `;
      const styleSheet = document.styleSheets[0];
      styleSheet.insertRule(waveAnimation, styleSheet.cssRules.length);
      wavePath.style.animation = "waveAnimation 8s ease-in-out infinite";
      wavePath.setAttribute("d", `M 0 ${waveHeight} Q 25 ${waveHeight + 5} 50 ${waveHeight} T 100 ${waveHeight} V 100 H 0 Z`);
    } else {
      humidityValue.textContent = "N/A";
      waveColor1.setAttribute("style", `stop-color: #3d8eb4; stop-opacity: 0.5`);
      waveColor2.setAttribute("style", `stop-color: #0474a8; stop-opacity: 1`);
      wavePath.style.animation = "";
      wavePath.setAttribute("d", "M 0 100 V 100 H 100 V 100 Z");
    }

    // Update pressure card (only for I2C protocol)
    if (protocol === "I2C" && currentPressure !== null) {
      const pressure = parseFloat(currentPressure);
      let barColor;
      if (pressure >= 950 && pressure <= 1050) {
        barColor = "#34d399"; // Green
      } else if ((pressure >= 900 && pressure < 950) || (pressure > 1050 && pressure <= 1100)) {
        barColor = "#ffeb3b"; // Yellow
      } else {
        barColor = "#f87171"; // Red
      }
      const barWidth = Math.min(Math.max((pressure - 300) / (1100 - 300) * 100, 0), 100);
      pressureValue.textContent = `${pressure.toFixed(1)} hPa`;
      pressureBar.style.width = `${barWidth}%`;
      pressureBar.style.backgroundColor = barColor;
    } else {
      pressureValue.textContent = "N/A";
      pressureBar.style.width = "0%";
      pressureBar.style.backgroundColor = "#34d399"; // Default green
    }

    // Update light intensity card (only for I2C protocol)
    if (protocol === "I2C" && currentLight !== null) {
      const light = parseFloat(currentLight);
      let barColor;
      if (light <= 10000) {
        barColor = "#34d399"; // Green
      } else if (light > 10000 && light <= 50000) {
        barColor = "#ffeb3b"; // Yellow
      } else {
        barColor = "#f87171"; // Red
      }
      const barWidth = Math.min(Math.max(light / 120000 * 100, 0), 100);
      lightValue.textContent = `${light.toFixed(1)} lux`;
      lightBar.style.width = `${barWidth}%`;
      lightBar.style.backgroundColor = barColor;
    } else {
      lightValue.textContent = "N/A";
      lightBar.style.width = "0%";
      lightBar.style.backgroundColor = "#34d399"; // Default green
    }
  } else {
    sensorListDiv.innerHTML = "<p>No protocol selected.</p>";
    sensorDataDiv.innerHTML = "<p>No sensor data available.</p>";
    thermometerFill.setAttribute("y", 180);
    thermometerFill.setAttribute("height", 0);
    thermometerFill.setAttribute("fill", "#ffeb3b");
    thermometerBulb.setAttribute("fill", "#ffeb3b");
    thermometerValue.textContent = "N/A";
    humidityValue.textContent = "N/A";
    waveColor1.setAttribute("style", `stop-color: #3d8eb4; stop-opacity: 0.5`);
    waveColor2.setAttribute("style", `stop-color: #0474a8; stop-opacity: 1`);
    wavePath.style.animation = "";
    wavePath.setAttribute("d", "M 0 100 V 100 H 100 V 100 Z");
    pressureValue.textContent = "N/A";
    pressureBar.style.width = "0%";
    pressureBar.style.backgroundColor = "#34d399";
    lightValue.textContent = "N/A";
    lightBar.style.width = "0%";
    lightBar.style.backgroundColor = "#34d399";
  }
}

// Parse sensor data and update presence
function parseSensorData(data) {
  const protocol = document.getElementById("sensor-select").value;
  if (!protocol) return;

  const lines = data.split("\n").map(line => line.trim()).filter(line => line);
  lines.forEach(line => {
    // Parse I2C sensor data (e.g., "BME680 - Temperature: 26.92°C")
    const sensorMatch = line.match(/^(.+?)\s*-\s*(.+?):\s*(.+)$/);
    if (sensorMatch) {
      const sensorName = sensorMatch[1].trim();
      const parameter = sensorMatch[2].trim();
      const value = sensorMatch[3].trim();

      // Check if sensor belongs to the current protocol
      const sensors = sensorProtocolMap[protocol] || [];
      if (sensors.includes(sensorName)) {
        // Mark sensor as present
        sensorStatus[protocol][sensorName] = true;
        // Store sensor data
        sensorData[protocol][`${sensorName} ${parameter}`] = value;
        // Update specific values for cards
        if (sensorName === "BME680") {
          if (parameter === "Temperature") {
            currentTemperature = value.replace("°C", "").trim();
          } else if (parameter === "Humidity") {
            currentHumidity = value.replace("%", "").trim();
          } else if (parameter === "Pressure") {
            currentPressure = value.replace("hpa", "").trim();
          }
        } else if (sensorName === "VEML7700" && parameter === "LightIntensity") {
          currentLight = value.replace("lux", "").trim();
        }
        // Update UI
        updateSensorUI();
      }
    }

    // Parse Rain Gauge data (e.g., "Rain Tip Detected! Hourly: 1 Daily: 2 Weekly: 3")
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

  if (protocol === "MQTT") {
    toggleCertUploadAndPort();
  } else {
    document.getElementById("cert-upload-button").style.display = "none";
  }
}

function toggleCertUploadAndPort() {
  const sslEnabled = document.getElementById("mqtt-ssl").value;
  const certSection = document.getElementById("cert-section");
  const certUploadButton = document.getElementById("cert-upload-button");
  const portField = document.getElementById("mqtt-port");

  certSection.style.display = sslEnabled === "yes" ? "block" : "none";
  certUploadButton.style.display = sslEnabled === "yes" ? "block" : "none";
  
  // Update port based on SSL selection
  portField.value = sslEnabled === "yes" ? "8883" : "1883";
}

async function browseCACert() {
  const filePath = await window.electronAPI.openFileDialog();
  if (filePath) {
    selectedCACertFile = filePath;
    document.getElementById("mqtt-ca-cert-path").value = "/usr/device_cert.pem.crt";
    console.log("Selected certificate file:", filePath);
    document.getElementById("output").innerHTML += `Selected certificate: ${filePath}<br>`;
  } else {
    console.log("Certificate file selection cancelled");
    document.getElementById("output").innerHTML += "Certificate file selection cancelled<br>";
  }
}

async function browseClientKey() {
  const filePath = await window.electronAPI.openFileDialog();
  if (filePath) {
    selectedClientKeyFile = filePath;
    document.getElementById("mqtt-client-key-path").value = "/usr/private_key.pem.key";
    console.log("Selected private key file:", filePath);
    document.getElementById("output").innerHTML += `Selected private key: ${filePath}<br>`;
  } else {
    console.log("Private key file selection cancelled");
    document.getElementById("output").innerHTML += "Private key file selection cancelled<br>";
  }
}

async function uploadCertificates() {
  console.log("Attempting to upload certificates...");

  if (!selectedCACertFile || !selectedClientKeyFile) {
    const errorMsg = "Please select both certificate and private key.";
    console.log(errorMsg);
    document.getElementById("output").innerHTML += `<span style="color: red;">${errorMsg}</span><br>`;
    return;
  }

  console.log("Uploading certificate:", selectedCACertFile, "and key:", selectedClientKeyFile);

  const result = await window.electronAPI.setMQTTCertificates({
    caCertPath: selectedCACertFile,
    clientKeyPath: selectedClientKeyFile,
  });

  if (result.error) {
    console.log("Upload failed:", result.error);
    document.getElementById("output").innerHTML += `<span style="color: red;">${result.error}</span><br>`;
  } else {
    console.log("Upload successful:", result);
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
    return;
  }

  document.getElementById("output").innerHTML += `<span style="color: green;">${result}</span><br>`;
}

async function disconnectPort() {
  const result = await window.electronAPI.disconnectPort();
  if (result.error) {
    document.getElementById("output").innerHTML += `<span style="color: red;">${result.error}</span><br>`;
    return;
  }
  document.getElementById("output").innerHTML += `<span style="color: green;">${result}</span><br>`;
}

async function sendCommand(cmd) {
  if (!cmd) return;

  const result = await window.electronAPI.sendData(cmd);
  if (result.error) {
    document.getElementById("output").innerHTML += `<span style="color: red;">${result.error}</span><br>`;
    return;
  }

  document.getElementById("output").innerHTML += result + "<br>";
}

async function setDeviceID() {
  const deviceID = document.getElementById("device-id").value.trim();
  if (!deviceID) {
    document.getElementById("output").innerHTML += `<span style="color: red;">Please enter a valid Device ID.</span><br>`;
    return;
  }

  // Basic validation: ensure Device ID is alphanumeric with optional hyphens/underscores
  if (!/^[a-zA-Z0-9-_]+$/.test(deviceID)) {
    document.getElementById("output").innerHTML += `<span style="color: red;">Device ID must be alphanumeric with optional hyphens or underscores.</span><br>`;
    return;
  }

  const result = await window.electronAPI.setDeviceID(deviceID);
  if (result.error) {
    document.getElementById("output").innerHTML += `<span style="color: red;">${result.error}</span><br>`;
    return;
  }

  document.getElementById("output").innerHTML += `<span style="color: green;">${result}</span><br>`;
  await delay(500);
  await window.electronAPI.getDeviceID(); // Verify setting
}

async function getDeviceID() {
  const result = await window.electronAPI.getDeviceID();
  if (result.error) {
    document.getElementById("output").innerHTML += `<span style="color: red;">${result.error}</span><br>`;
  } else {
    document.getElementById("output").innerHTML += result + "<br>";
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
    return;
  }

  document.getElementById("output").innerHTML += result + "<br>";
  await delay(500);
  await window.electronAPI.getInterval();
}

async function getInterval() {
  const result = await window.electronAPI.getInterval();
  if (result.error) {
    document.getElementById("output").innerHTML += `<span style="color: red;">${result.error}</span><br>`;
  } else {
    document.getElementById("output").innerHTML += result + "<br>";
  }
}

async function setProtocol() {
  const protocol = document.getElementById("protocol-select").value;
  const result = await window.electronAPI.setProtocol(protocol);

  if (result.error) {
    document.getElementById("output").innerHTML += `<span style="color: red;">${result.error}</span><br>`;
    return;
  }

  document.getElementById("output").innerHTML += result + "<br>";
  updateProtocolUI();
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
    console.log(`Sending command: ${cmd}`);
    const result = await window.electronAPI.sendData(cmd);
    console.log(`Result for ${cmd}:`, result);
    if (result.error) {
      document.getElementById("output").innerHTML += `<span style="color: red;">${result.error}</span><br>`;
    } else {
      document.getElementById("output").innerHTML += `<span style="color: green;">${result}</span><br>`;
    }
    await delay(500); // Delay between commands
  }

  await delay(500);
  await window.electronAPI.getFTPConfig();
}

async function getFTPConfig() {
  const result = await window.electronAPI.getFTPConfig();
  if (result.error) {
    document.getElementById("output").innerHTML += `<span style="color: red;">${result.error}</span><br>`;
  } else {
    document.getElementById("output").innerHTML += result + "<br>";
  }
}

async function setMQTTConfig() {
  const broker = document.getElementById("mqtt-broker").value.trim();
  const port = document.getElementById("mqtt-port").value.trim();
  const user = document.getElementById("mqtt-user").value.trim();
  const password = document.getElementById("mqtt-password").value;
  const sslEnabled = document.getElementById("mqtt-ssl").value;

  if (!broker && !port && !user && !password && sslEnabled === "no") {
    document.getElementById("output").innerHTML += `<span style="color: red;">Please enter at least one MQTT configuration field.</span><br>`;
    return;
  }

  if (broker && !/^[a-zA-Z0-9.-]+$/.test(broker)) {
    document.getElementById("output").innerHTML += `<span style="color: red;">Invalid MQTT broker format.</span><br>`;
    return;
  }

  if (port && (isNaN(port) || port <= 0 || port > 65535)) {
    document.getElementById("output").innerHTML += `<span style="color: red;">Invalid MQTT port. Must be between 1 and 65535.</span><br>`;
    return;
  }

  const commands = [];
  if (sslEnabled !== "") {
    commands.push(`SET_MQTT_SSL:${sslEnabled === "yes" ? "ON" : "OFF"}`);
  }
  if (broker) {
    commands.push(`SET_MQTT_BROKER:${broker}`);
  }
  if (port) {
    commands.push(`SET_MQTT_PORT:${port}`);
  }
  if (user) {
    commands.push(`SET_MQTT_USER:${user}`);
  }
  if (password) {
    commands.push(`SET_MQTT_PASS:${password}`);
  }

  for (const cmd of commands) {
    console.log(`Sending command: ${cmd}`);
    const result = await window.electronAPI.sendData(cmd);
    console.log(`Result for ${cmd}:`, result);
    if (result.error) {
      document.getElementById("output").innerHTML += `<span style="color: red;">${result.error}</span><br>`;
    } else {
      document.getElementById("output").innerHTML += `<span style="color: green;">${result}</span><br>`;
    }
    await delay(500); // Delay between commands
  }

  await window.electronAPI.setProtocol("MQTT");
  await delay(2000);

  document.getElementById("output").innerHTML += `<span style="color: green;">MQTT config sent and reinitialized. Verifying...</span><br>`;
  await delay(1000);
  await window.electronAPI.getMQTTConfig();
}
async function getMQTTConfig() {
  const result = await window.electronAPI.getMQTTConfig();
  if (result.error) {
    document.getElementById("output").innerHTML += `<span style="color: red;">${result.error}</span><br>`;
  } else {
    document.getElementById("output").innerHTML += result + "<br>";
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
    console.log(`Sending command: ${cmd}`);
    const result = await window.electronAPI.sendData(cmd);
    console.log(`Result for ${cmd}:`, result);
    if (result.error) {
      document.getElementById("output").innerHTML += `<span style="color: red;">${result.error}</span><br>`;
    } else {
      document.getElementById("output").innerHTML += `<span style="color: green;">${result}</span><br>`;
    }
    await delay(500); // Delay between commands
  }

  await delay(500);
  await window.electronAPI.getHTTPConfig();
}

async function getHTTPConfig() {
  const result = await window.electronAPI.getHTTPConfig();
  if (result.error) {
    document.getElementById("output").innerHTML += `<span style="color: red;">${result.error}</span><br>`;
  } else {
    document.getElementById("output").innerHTML += result + "<br>";
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
    return;
  }

  document.getElementById("output").innerHTML += `<span style="color: green;">${result}</span><br>`;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}



// Update the onSerialData handler
window.electronAPI.onSerialData((data) => {
  if (data) {
    const sanitizedData = data.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const outputDiv = document.getElementById("output");
    let logClass = "log-default";

    // Parse sensor data
    parseSensorData(sanitizedData);

    // Existing log classification logic
    if (sanitizedData.includes("Error") || sanitizedData.includes("error") || sanitizedData.includes("failed") || sanitizedData.includes("ENOENT")) {
      logClass = "log-error";
    } else if (
      sanitizedData.includes("Successfully") ||
      sanitizedData.includes("saved OK") ||
      sanitizedData.includes("Directory created") ||
      sanitizedData.includes("Connected to") ||
      sanitizedData.includes("SSL configuration applied") ||
      sanitizedData.includes("Device ID set")
    ) {
      logClass = "log-success";
    } else if (sanitizedData.includes("/usr contents") || sanitizedData.includes("LIST_FILES") || sanitizedData.includes("Device ID:")) {
      logClass = "log-info";
    } else if (sanitizedData.includes("MQTT connect OK")) {
      logClass = "log-success";
    } else if (sanitizedData.includes("MQTT Connect error")) {
      logClass = "log-error";
    }

    outputDiv.innerHTML += `<span class="log-line ${logClass}">${sanitizedData}</span><br>`;

    // Existing protocol configuration parsing
    if (sanitizedData.startsWith("FTP protocol")) {
      const hostMatch = sanitizedData.match(/host=([^,]+)/);
      const userMatch = sanitizedData.match(/user=([^,]+)/);
      if (hostMatch) document.getElementById("ftp-host").value = hostMatch[1];
      if (userMatch) document.getElementById("ftp-user").value = userMatch[1];
    }

    if (sanitizedData.startsWith("MQTT protocol") || sanitizedData.includes("MQTT extras")) {
      const brokerMatch = sanitizedData.match(/broker=([^,]+)/);
      const userMatch = sanitizedData.match(/user=([^,]+)/);
      const portMatch = sanitizedData.match(/port=([^,]+)/);
      const sslMatch = sanitizedData.match(/ssl=([^,]+)/) || sanitizedData.match(/ssl_enabled=([^,]+)/);
      if (brokerMatch) document.getElementById("mqtt-broker").value = brokerMatch[1];
      if (userMatch) document.getElementById("mqtt-user").value = userMatch[1];
      if (portMatch) document.getElementById("mqtt-port").value = portMatch[1];
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

    if (sanitizedData.startsWith("Device ID:")) {
      const idMatch = sanitizedData.match(/Device ID: ([a-zA-Z0-9-_]+)/);
      if (idMatch) document.getElementById("device-id").value = idMatch[1];
    }

    outputDiv.scrollTop = outputDiv.scrollHeight;
  }
});

// Update DOMContentLoaded to initialize sensor UI
window.addEventListener("DOMContentLoaded", () => {
  updateProtocolUI();
  listPorts();
  updateSensorUI();
});