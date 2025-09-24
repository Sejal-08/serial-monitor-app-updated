let selectedCACertFile = null;
let selectedClientKeyFile = null;

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

  certSection.style.display = sslEnabled === "yes" ? "block" : "none";
  certUploadButton.style.display = sslEnabled === "yes" ? "block" : "none";
}

function clearOutput() {
  document.getElementById("output").innerHTML = "";
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
  if (sslEnabled !== "") {
    commands.push(`SET_MQTT_SSL:${sslEnabled === "yes" ? "ON" : "OFF"}`);
  }
  if (broker) {
    commands.push(`SET_MQTT_BROKER:${broker}`);
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

window.electronAPI.onSerialData((data) => {
  console.log("Raw serial data:", data);
  if (data) {
    const sanitizedData = data.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const outputDiv = document.getElementById("output");
    let color = "black";

    if (sanitizedData.includes("Error") || sanitizedData.includes("error") || sanitizedData.includes("failed") || sanitizedData.includes("ENOENT")) {
      color = "red";
    } else if (
      sanitizedData.includes("Successfully") ||
      sanitizedData.includes("saved OK") ||
      sanitizedData.includes("Directory created") ||
      sanitizedData.includes("Connected to") ||
      sanitizedData.includes("SSL configuration applied") ||
      sanitizedData.includes("Device ID set")
    ) {
      color = "green";
    } else if (sanitizedData.includes("/usr contents") || sanitizedData.includes("LIST_FILES") || sanitizedData.includes("Device ID:")) {
      color = "blue";
    } else if (sanitizedData.includes("MQTT connect OK")) {
      color = "green";
    } else if (sanitizedData.includes("MQTT Connect error")) {
      color = "red";
    }

    outputDiv.innerHTML += `<span style="color: ${color};">${sanitizedData}</span><br>`;

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

window.addEventListener("DOMContentLoaded", () => {
  updateProtocolUI();
  listPorts();
});