#include <ESP8266WiFi.h>
#include <WebSocketsClient.h>
#include <ArduinoJson.h>

// WiFi Credentials
const char* ssid = "Boroloks Squad";
const char* password = "1234abcde";

// Server Config
const char* websocket_host = "eubpower.top";
const uint16_t websocket_port = 3010;      
const char* websocket_path = "/ws";  

// Device Identity
const char* secret_key = "sMpsIoT@9876euytfhfkf";
const char* device_code = "CA-D-456A";

// WebSocket Client
WebSocketsClient webSocket;

// Relay GPIO pins
const int relayPins[7] = {4, 5, 16, 14, 12, 13, 15};
bool relayStates[7] = {false, false, false, false, false, false, false};

// Send relay update for a single relay to server
void sendRelayUpdate(int index, bool state) {
  StaticJsonDocument<256> doc;
  doc["type"] = "relay_update";
  doc["relay_uid"] = String(device_code) + "-" + String(index + 1);
  doc["status"] = state;

  String out;
  serializeJson(doc, out);
  webSocket.sendTXT(out);
  Serial.print("📤 Relay Update Sent → ");
  Serial.println(out);
}

// Send full relay status report after auth_ok from server
void sendRelayStatusReport() {
  StaticJsonDocument<512> report;
  report["type"] = "relay_status_report";
  JsonArray arr = report.createNestedArray("states");

  for (int i = 0; i < 7; i++) {
    JsonObject obj = arr.createNestedObject();
    obj["relay_uid"] = String(device_code) + "-" + String(i + 1);
    obj["status"] = relayStates[i];
  }

  String out;
  serializeJson(report, out);
  webSocket.sendTXT(out);
  Serial.println("📤 Sent relay_status_report");
}

// Apply relay state physically and update relayStates array (no server update)
void applyRelayState(int index, bool state) {
  digitalWrite(relayPins[index], state ? HIGH : LOW);
  relayStates[index] = state;
  Serial.printf("🔧 Relay %d set to %s\n", index + 1, state ? "ON" : "OFF");
}

// Parse relay index from relay UID string like "CA-D-456A-3"
int relayUidToIndex(const char* relay_uid) {
  String relayUIDStr = String(relay_uid);
  int lastDash = relayUIDStr.lastIndexOf('-');
  if (lastDash == -1) return -1;
  String idxStr = relayUIDStr.substring(lastDash + 1);
  int relayIndex = idxStr.toInt() - 1;
  if (relayIndex < 0 || relayIndex >= 7) return -1;
  return relayIndex;
}

// Handle relay_command from server to update relay states
void handleRelayCommand(const JsonObject& obj) {
  if (!obj.containsKey("relay_uid") || !obj.containsKey("status")) {
    Serial.println("⚠️ relay_command missing fields");
    return;
  }

  const char* relay_uid = obj["relay_uid"];
  bool status = obj["status"];

  int relayIndex = relayUidToIndex(relay_uid);
  if (relayIndex == -1) {
    Serial.println("⚠️ Relay index invalid or out of range");
    return;
  }

  if (relayStates[relayIndex] != status) {
    applyRelayState(relayIndex, status);
  } else {
    Serial.println("ℹ️ Relay state already matches command");
  }
}

// WebSocket event handler
void webSocketEvent(WStype_t type, uint8_t * payload, size_t length) {
  switch(type) {
    case WStype_CONNECTED:
      Serial.println("✅ WebSocket connected");

      {
        StaticJsonDocument<256> doc;
        doc["type"] = "auth";
        doc["secret"] = secret_key;
        doc["device_code"] = device_code;

        String out;
        serializeJson(doc, out);
        webSocket.sendTXT(out);
        Serial.println("📤 Auth sent");
      }
      break;

    case WStype_DISCONNECTED:
      Serial.println("🔌 WebSocket disconnected");
      break;

    case WStype_TEXT:
      Serial.printf("📩 Message: %s\n", payload);

      {
        StaticJsonDocument<512> doc;
        DeserializationError error = deserializeJson(doc, payload, length);
        if (!error) {
          const char* msgType = doc["type"];
          if (!msgType) return;

          if (strcmp(msgType, "auth_ok") == 0) {
            sendRelayStatusReport();
          } else if (strcmp(msgType, "relay_command") == 0) {
            handleRelayCommand(doc.as<JsonObject>());
          }
        } else {
          Serial.println("⚠️ JSON parse error in incoming message");
        }
      }
      break;

    case WStype_ERROR:
      Serial.println("❌ WebSocket error");
      break;

    default:
      break;
  }
}

// Connect to WiFi with serial status output
void connectToWiFi() {
  Serial.printf("🔗 Connecting to %s...\n", ssid);
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\n✅ WiFi connected!");
  Serial.print("📡 IP: ");
  Serial.println(WiFi.localIP());
}

// Handle manual serial input (e.g. "1010111")
void handleSerialInput(String input) {
  input.trim();

  if (input.length() != 7) {
    Serial.println("⚠️ Invalid input length! Use 7-digit binary like 1010111");
    return;
  }

  for (int i = 0; i < 7; i++) {
    char c = input.charAt(i);
    if (c != '0' && c != '1') {
      Serial.println("⚠️ Invalid character! Use only 0 or 1");
      return;
    }
  }

  // Apply new states and send update if changed
  for (int i = 0; i < 7; i++) {
    bool newState = input.charAt(i) == '1';
    if (relayStates[i] != newState) {
      applyRelayState(i, newState);
      sendRelayUpdate(i, newState);
    }
  }

  Serial.print("✅ Updated Relay States: ");
  Serial.println(input);
}

void setup() {
  Serial.begin(115200);
  // Initialize relay pins to LOW and internal state false
  for (int i = 0; i < 7; i++) {
    pinMode(relayPins[i], OUTPUT);
    digitalWrite(relayPins[i], LOW);
    relayStates[i] = false;
  }

  connectToWiFi();

  webSocket.begin(websocket_host, websocket_port, websocket_path);
  webSocket.onEvent(webSocketEvent);
  webSocket.setReconnectInterval(5000);

  Serial.println("📥 Type 7-digit relay pattern like: 1010111");
}

void loop() {
  webSocket.loop();

  if (Serial.available()) {
    String input = Serial.readStringUntil('\n');
    handleSerialInput(input);
  }
}
