const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const { SerialPort } = require("serialport");
const fs = require("fs").promises;
const dns = require("dns").promises;

let mainWindow;
let port;
let responseBuffer = "";

/**
 * Send a simple command to the firmware.
 */
async function sendCommand(message) {
  if (!port || !port.isOpen) {
    return { error: "Port not open!" };
  }

  try {
    const command = message + "\r\n";
    console.log(`Sending command: ${JSON.stringify(command)}`);
    mainWindow.webContents.send("serial-data", `> ${message}`);

    await new Promise((resolve, reject) => {
      port.write(command, (err) => (err ? reject(err) : resolve()));
    });

    return `Successfully sent: ${message}`;
  } catch (error) {
    console.error(`Failed to send command "${message}":`, error);
    return { error: `Failed to send data: ${error.message}` };
  }
}

/**
 * Upload a file to the device.
 */
async function sendFile(filePath, fileName) {
  if (!port || !port.isOpen) {
    return { error: "Port not open!" };
  }

  try {
    const fileContent = await fs.readFile(filePath);
    const command = `UPLOAD_FILE:${fileName}\r\n`;
    const destPath = `/usr/${fileName}`;

    // Flush UART buffer
    while (port.readable && port.readableLength > 0) {
      port.read();
    }
    console.log("Flushed UART buffer before sending UPLOAD_FILE");

    // Send the upload command
    console.log(`Sending upload command for: ${fileName} (${fileContent.length} bytes)`);
    mainWindow.webContents.send("serial-data", `> UPLOAD_FILE:${fileName}`);
    await new Promise((resolve, reject) => {
      port.write(command, (err) => (err ? reject(err) : resolve()));
    });

    // Wait before sending file data
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Send the entire file content
    await new Promise((resolve, reject) => {
      port.write(fileContent, (err) => (err ? reject(err) : resolve()));
    });
    console.log(`Sent ${fileContent.length} bytes for ${fileName}`);

    // Send the end-of-file marker
    await new Promise((resolve, reject) => {
      port.write("END_FILE\r\n", (err) => (err ? reject(err) : resolve()));
    });
    console.log(`Sent END_FILE for ${fileName}`);
    mainWindow.webContents.send("serial-data", "> END_FILE");

    // Wait for confirmation
    const confirmation = await new Promise((resolve, reject) => {
      let responseData = "";
      const timeout = setTimeout(() => {
        cleanup();
        reject(new Error(`Timeout: No confirmation received for ${fileName}`));
      }, 30000);

      const dataListener = (data) => {
        const text = data.toString("utf8");
        responseData += text;
        console.log(`Received chunk during confirmation: "${text}"`);
        mainWindow.webContents.send("serial-data", text);

        if (responseData.includes(`File ${destPath} received and saved OK`)) {
          cleanup();
          resolve(`Successfully uploaded ${fileName}`);
        } else if (responseData.includes("Error")) {
          cleanup();
          reject(new Error(`Firmware error while receiving ${fileName}: ${responseData.substring(0, 200)}`));
        }
      };

      const cleanup = () => {
        clearTimeout(timeout);
        port.removeListener("data", dataListener);
      };

      port.on("data", dataListener);
    });

    return confirmation;
  } catch (error) {
    console.error(`Failed to send file "${fileName}":`, error);
    return { error: `Failed to send file ${fileName}: ${error.message}` };
  }
}

/**
 * Create Electron window.
 */
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
  });

  mainWindow.loadFile("index.html");
}

/**
 * App lifecycle.
 */
app.on("ready", createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    if (port && port.isOpen) {
      port.close(() => console.log("Serial port closed."));
    }
    app.quit();
  }
});

/**
 * IPC handlers.
 */
ipcMain.handle("list-ports", async () => {
  try {
    const ports = await SerialPort.list();
    return ports.map((p) => p.path);
  } catch (error) {
    console.error("List ports error:", error);
    return { error: `Failed to list ports: ${error.message}` };
  }
});

ipcMain.handle("connect-port", async (event, portName, baudRate = 115200) => {
  try {
    if (port && port.isOpen) {
      await new Promise((resolve) => port.close(resolve));
    }
    responseBuffer = "";

    port = new SerialPort({
      path: portName,
      baudRate: parseInt(baudRate),
      dataBits: 8,
      parity: "none",
      stopBits: 1,
      autoOpen: false,
    });

    await new Promise((resolve, reject) => {
      port.open((err) => (err ? reject(err) : resolve()));
    });

    await new Promise((resolve) => setTimeout(resolve, 2000));

    port.on("data", (data) => {
      try {
        const incomingText = data.toString("utf8");
        console.log(`Raw data received: "${incomingText}"`);

        responseBuffer += incomingText;
        let lines = responseBuffer.split(/\r?\n/);
        responseBuffer = lines.pop();

        for (const line of lines) {
          const message = line.trim();
          if (message) {
            console.log(`Processed line: "${message}"`);
            mainWindow.webContents.send("serial-data", message);
          }
        }
      } catch (err) {
        console.error("Error processing serial data:", err);
        mainWindow.webContents.send("serial-data", `Error: ${err.message}`);
      }
    });

    port.on("error", (err) => {
      console.error("Serial port error:", err.message);
      mainWindow.webContents.send("serial-data", `Port error: ${err.message}`);
    });

    return `Connected to ${portName} at ${baudRate} baud`;
  } catch (error) {
    console.error("Connect port error:", error);
    return { error: `Failed to connect to ${portName}: ${error.message}` };
  }
});

ipcMain.handle("disconnect-port", async () => {
  try {
    if (port && port.isOpen) {
      await new Promise((resolve) => port.close(resolve));
      responseBuffer = "";
      return "Disconnected from port.";
    }
    return "No port to disconnect.";
  } catch (error) {
    console.error("Disconnect port error:", error);
    return { error: `Failed to disconnect: ${error.message}` };
  }
});

// --- Device ID Config ---
ipcMain.handle("set-device-id", (event, deviceID) => sendCommand(`SET_DEVICE_ID:${deviceID}`));
ipcMain.handle("get-device-id", () => sendCommand("GET_DEVICE_ID"));

// --- Basic config commands ---
ipcMain.handle("send-data", (event, message) => sendCommand(message));
ipcMain.handle("get-interval", () => sendCommand("GET_INTERVAL"));
ipcMain.handle("get-ftp-config", () => sendCommand("GET_FTP_CONFIG"));
ipcMain.handle("get-mqtt-config", () => sendCommand("GET_MQTT_CONFIG"));
ipcMain.handle("get-http-config", () => sendCommand("GET_HTTP_CONFIG"));
ipcMain.handle("get-tcp-config", () => sendCommand("GET_TCP_CONFIG"));
ipcMain.handle("get-sensor-config", () => sendCommand("GET_SENSOR_CONFIG"));

ipcMain.handle("set-interval", (event, interval) => {
  const i = parseInt(interval);
  if (isNaN(i) || i <= 0) return { error: "Invalid interval" };
  return sendCommand(`SET_INTERVAL:${i}`);
});

ipcMain.handle("set-protocol", (event, protocol) => {
  if (!["FTP", "MQTT", "HTTP"].includes(protocol))
    return { error: "Invalid protocol" };
  return sendCommand(`SET_PROTOCOL:${protocol}`);
});

// --- FTP Config ---
ipcMain.handle("set-ftp-host", (event, host) => sendCommand(`SET_FTP_HOST:${host}`));
ipcMain.handle("set-ftp-user", (event, user) => sendCommand(`SET_FTP_USER:${user}`));
ipcMain.handle("set-ftp-password", (event, pass) => sendCommand(`SET_FTP_PASS:${pass}`));
ipcMain.handle("set-ftp-port", (event, portNum) => sendCommand(`SET_FTP_PORT:${portNum}`));

// --- MQTT Config ---
ipcMain.handle("set-mqtt-broker", async (event, broker) => {
  try {
    let resolvedBroker = broker;
    if (broker.includes("amazonaws.com")) {
      const { address } = await dns.lookup(broker);
      resolvedBroker = address;
      console.log(`Resolved ${broker} to ${resolvedBroker}`);
      mainWindow.webContents.send("serial-data", `Resolved MQTT broker ${broker} to ${resolvedBroker}`);
    }
    return sendCommand(`SET_MQTT_BROKER:${resolvedBroker}`);
  } catch (error) {
    console.error(`Failed to resolve MQTT broker "${broker}":`, error);
    return { error: `Failed to resolve MQTT broker: ${error.message}` };
  }
});
ipcMain.handle("set-mqtt-user", (event, user) => sendCommand(`SET_MQTT_USER:${user}`));
ipcMain.handle("set-mqtt-password", (event, pass) => sendCommand(`SET_MQTT_PASS:${pass}`));
ipcMain.handle("set-mqtt-port", (event, portNum) => sendCommand(`SET_MQTT_PORT:${portNum}`));
ipcMain.handle("set-mqtt-ca-cert", (event, path) => sendCommand(`SET_MQTT_CERT:${path}`));
ipcMain.handle("set-mqtt-client-key", (event, path) => sendCommand(`SET_MQTT_KEY:${path}`));
ipcMain.handle("set-mqtt-ssl", (event, sslEnabled) => sendCommand(`SET_MQTT_SSL:${sslEnabled ? "ON" : "OFF"}`));

// --- HTTP Config ---
ipcMain.handle("set-http-url", (event, url) => sendCommand(`SET_HTTP_URL:${url}`));
ipcMain.handle("set-http-auth", (event, auth) => sendCommand(`SET_HTTP_AUTH:${auth}`));

// --- TCP Config ---
ipcMain.handle("set-tcp-host", (event, host) => sendCommand(`SET_TCP_HOST:${host}`));
ipcMain.handle("set-tcp-port", (event, portNum) => sendCommand(`SET_TCP_PORT:${portNum}`));

// --- Sensor Config ---
ipcMain.handle("set-sensor-type", (event, type) => sendCommand(`SET_SENSOR_TYPE:${type}`));
ipcMain.handle("set-sensor-format", (event, format) => sendCommand(`SET_SENSOR_FORMAT:${format}`));

// --- File Upload ---
ipcMain.handle("upload-file", async (event, filePath) => {
  const fileName = path.basename(filePath);
  return sendFile(filePath, fileName);
});

/**
 * Upload MQTT certificates (cert + key) and configure them.
 */
ipcMain.handle("set-mqtt-certificates", async (event, { caCertPath, clientKeyPath }) => {
  if (!port || !port.isOpen) return { error: "Port not open!" };
  const delay = (ms) => new Promise((res) => setTimeout(res, ms));

  const certFileName = "device_cert.pem.crt";
  const keyFileName = "private_key.pem.key";
  const maxRetries = 3;

  try {
    console.log("Starting certificate upload sequence...");

    // Flush UART buffer
    while (port.readable && port.readableLength > 0) {
      port.read();
    }
    console.log("Flushed UART buffer before MKDIR");

    // Ensure /usr/ directory exists
    console.log("Sending MKDIR:/usr/ to ensure directory exists");
    await sendCommand("MKDIR:/usr/");
    await delay(1000);

    // Upload certificate with retries
    let certResult;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Attempt ${attempt} to upload ${certFileName}`);
        certResult = await sendFile(caCertPath, certFileName);
        if (certResult.error) throw new Error(certResult.error);
        break;
      } catch (error) {
        console.error(`Attempt ${attempt} failed: ${error.message}`);
        if (attempt === maxRetries) throw error;
        await delay(2000);
        while (port.readable && port.readableLength > 0) {
          port.read();
        }
      }
    }

    await delay(2000);

    // Upload private key with retries
    while (port.readable && port.readableLength > 0) {
      port.read();
    }
    console.log("Flushed UART buffer before private key upload");

    let keyResult;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Attempt ${attempt} to upload ${keyFileName}`);
        keyResult = await sendFile(clientKeyPath, keyFileName);
        if (keyResult.error) throw new Error(keyResult.error);
        break;
      } catch (error) {
        console.error(`Attempt ${attempt} failed: ${error.message}`);
        if (attempt === maxRetries) throw error;
        await delay(2000);
        while (port.readable && port.readableLength > 0) {
          port.read();
        }
      }
    }

    await delay(3000);

    // Set certificate and key paths with retries to avoid ENOENT
    let certSet = false;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Attempt ${attempt} to set MQTT certificate and key`);
        await sendCommand(`SET_MQTT_CERT:/usr/${certFileName}`);
        await delay(500);
        await sendCommand(`SET_MQTT_KEY:/usr/${keyFileName}`);
        await delay(500);

        // Check for ENOENT error in response
        const setResult = await new Promise((resolve, reject) => {
          let responseData = "";
          const timeout = setTimeout(() => {
            cleanup();
            resolve("No ENOENT detected");
          }, 5000);

          const dataListener = (data) => {
            const text = data.toString("utf8");
            responseData += text;
            if (responseData.includes("ENOENT")) {
              cleanup();
              reject(new Error("File not found (ENOENT) during SET_MQTT_CERT/KEY"));
            } else if (responseData.includes("saved OK")) {
              cleanup();
              resolve("Certificate and key set successfully");
            }
          };

          const cleanup = () => {
            clearTimeout(timeout);
            port.removeListener("data", dataListener);
          };

          port.on("data", dataListener);
        });

        certSet = true;
        break;
      } catch (error) {
        console.error(`Attempt ${attempt} to set certificate/key failed: ${error.message}`);
        if (attempt === maxRetries) throw error;
        await delay(1000);
      }
    }

    if (!certSet) {
      throw new Error("Failed to set MQTT certificate and key after retries");
    }

    // Set SSL and port with retries to ensure application
    let sslApplied = false;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Attempt ${attempt} to set MQTT SSL and port`);
        await sendCommand(`SET_MQTT_SSL:ON`);
        await delay(1000);
        await sendCommand(`SET_MQTT_PORT:8883`);
        await delay(500);

        // Verify with GET_MQTT_CONFIG
        await sendCommand("GET_MQTT_CONFIG");
        await delay(1000);

        // Check for ssl=True in response
        const configResult = await new Promise((resolve, reject) => {
          let responseData = "";
          const timeout = setTimeout(() => {
            cleanup();
            resolve("No confirmation, proceeding");
          }, 5000);

          const dataListener = (data) => {
            const text = data.toString("utf8");
            responseData += text;
            if (responseData.includes("ssl=True") || responseData.includes("ssl_enabled: True")) {
              cleanup();
              resolve("SSL configuration applied");
            } else if (responseData.includes("ssl=False") || responseData.includes("ssl_enabled: False")) {
              cleanup();
              reject(new Error("SSL configuration not applied"));
            }
          };

          const cleanup = () => {
            clearTimeout(timeout);
            port.removeListener("data", dataListener);
          };

          port.on("data", dataListener);
        });

        sslApplied = true;
        break;
      } catch (error) {
        console.error(`Attempt ${attempt} to set MQTT SSL failed: ${error.message}`);
        if (attempt === maxRetries) throw new Error("Failed to apply MQTT SSL configuration");
        await delay(1000);
      }
    }

    if (!sslApplied) {
      throw new Error("Failed to confirm SSL configuration after retries");
    }

    // Force MQTT reinitialization to apply new settings
    await sendCommand("SET_PROTOCOL:MQTT");
    await delay(2000);

    // Final verification
    await sendCommand("GET_MQTT_CONFIG");

    return "Certificates uploaded and MQTT configured successfully. SSL applied and client reinitialized.";
  } catch (error) {
    console.error("Failed to upload certificates or configure MQTT:", error);
    return { error: `Failed to upload certificates or configure MQTT: ${error.message}` };
  }
});

/**
 * File dialog.
 */
ipcMain.handle("open-file-dialog", async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ["openFile"],
  });
  return canceled ? null : filePaths[0];
});