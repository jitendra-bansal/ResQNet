import React, { useState, useEffect } from 'react';
import {
  Cpu,
  X,
  Copy,
  Check,
  Zap,
  Wifi,
  Download,
  Terminal,
  Radio,
  ShieldAlert,
  Play,
  Sliders
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  isDarkMode: boolean;
  language: 'English' | 'Hindi';
  triggerCount: number;
  lastEventTime: string | null;
  lastDeviceId: string;
  espDefaultMode: 'countdown' | 'instant';
  onChangeDefaultMode: (mode: 'countdown' | 'instant') => void;
}

const PIN_OPTIONS = [
  { label: 'D2 (GPIO 4) — Recommended', defineVal: '4', pinName: 'D2 (GPIO4)' },
  { label: 'D1 (GPIO 5)', defineVal: '5', pinName: 'D1 (GPIO5)' },
  { label: 'D3 / Built-in FLASH Button (GPIO 0)', defineVal: '0', pinName: 'D3 (GPIO0)' },
  { label: 'D5 (GPIO 14)', defineVal: '14', pinName: 'D5 (GPIO14)' },
  { label: 'D6 (GPIO 12)', defineVal: '12', pinName: 'D6 (GPIO12)' },
];

export const Esp8266SetupModal: React.FC<Props> = ({
  isOpen,
  onClose,
  isDarkMode,
  language,
  triggerCount,
  lastEventTime,
  lastDeviceId,
  espDefaultMode,
  onChangeDefaultMode,
}) => {
  const isHindi = language === 'Hindi';
  const [publicOrigin, setPublicOrigin] = useState<string>(() =>
    typeof window !== 'undefined' ? window.location.origin : ''
  );
  const [wifiSsid, setWifiSsid] = useState('YOUR_WIFI_NAME');
  const [wifiPass, setWifiPass] = useState('YOUR_WIFI_PASSWORD');
  const [selectedPinIdx, setSelectedPinIdx] = useState(0);
  const [deviceId, setDeviceId] = useState('ESP8266-Panic-Btn');
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [isTestingWebhook, setIsTestingWebhook] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetch('/api/public-config')
        .then(r => r.json())
        .then(data => {
          if (data?.appUrl) {
            setPublicOrigin(data.appUrl.replace(/\/$/, ''));
          }
        })
        .catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const selectedPin = PIN_OPTIONS[selectedPinIdx] || PIN_OPTIONS[0];
  const webhookUrl = `https://ntfy.sh/resqnet_sos_027672a8`;

  const arduinoSketch = `/*
 * ResQNet — ESP8266 Hardware SOS Panic Button Sketch
 * Board: NodeMCU 1.0 (ESP-12E) / Wemos D1 Mini / Generic ESP8266
 *
 * BUTTON MODES:
 *   - SINGLE PRESS (< 800ms): Opens SMS App on phone & pastes emergency message
 *   - LONG PRESS  (>= 800ms): Opens Phone App on mobile & pastes phone number
 *
 * WIRING (No external resistor required):
 *   - Connect Push Button Pin 1  --->  ${selectedPin.pinName}
 *   - Connect Push Button Pin 2  --->  GND
 */

#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClient.h>
#include <WiFiClientSecureBearSSL.h>

// 1. WiFi Credentials (Mobile Hotspot SSID & Password)
const char* WIFI_SSID = "${wifiSsid.replace(/"/g, '\\"')}";
const char* WIFI_PASS = "${wifiPass.replace(/"/g, '\\"')}";

// 2. ResQNet Public IoT Relay (Bypasses 302 & 404 errors — returns 200 OK!)
const char* RELAY_HTTP_URL  = "http://ntfy.sh/resqnet_sos_027672a8";
const char* RELAY_HTTPS_URL = "https://ntfy.sh/resqnet_sos_027672a8";

// 3. Hardware Pin Configuration (${selectedPin.label})
const int BUTTON_PIN = ${selectedPin.defineVal};
const int STATUS_LED = LED_BUILTIN; // Built-in blue LED on ESP8266 (Active LOW)

// Press Detection Timing
const unsigned long LONG_PRESS_MS = 800; // Hold >= 0.8 seconds for Phone Call
unsigned long pressStartTime = 0;
bool isPressing = false;
bool longPressTriggered = false;

void sendSosSignal(const char* actionType) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi disconnected! Reconnecting...");
    WiFi.reconnect();
    return;
  }

  if (String(actionType) == "call") {
    Serial.println("\\n📞 LONG PRESS DETECTED! Opening Phone App & pasting number...");
  } else {
    Serial.println("\\n💬 SINGLE PRESS DETECTED! Opening SMS App & pasting SOS message...");
  }

  digitalWrite(STATUS_LED, LOW); // Turn ON LED

  String payload = "{\\"event\\":\\"sos\\",\\"action\\":\\"" + String(actionType) + "\\",\\"deviceId\\":\\"${deviceId}\\",\\"mode\\":\\"instant\\",\\"pin\\":\\"${selectedPin.pinName}\\"}";
  bool success = false;

  // Step 1: Fast HTTP POST to Public IoT Relay (200 OK)
  WiFiClient client;
  HTTPClient http;
  if (http.begin(client, RELAY_HTTP_URL)) {
    http.addHeader("Content-Type", "application/json");
    int code = http.POST(payload);
    Serial.printf("[ResQNet] Relay HTTP Status: %d\\n", code);
    if (code >= 200 && code < 300) {
      success = true;
      Serial.println("✅ SUCCESS! Signal delivered to your mobile app!");
    }
    http.end();
  }

  // Step 2: HTTPS Fallback if hotspot blocks port 80
  if (!success) {
    std::unique_ptr<BearSSL::WiFiClientSecure> secClient(new BearSSL::WiFiClientSecure);
    secClient->setInsecure();
    HTTPClient https;
    if (https.begin(*secClient, RELAY_HTTPS_URL)) {
      https.addHeader("Content-Type", "application/json");
      int code = https.POST(payload);
      Serial.printf("[ResQNet] Relay HTTPS Status: %d\\n", code);
      if (code >= 200 && code < 300) {
        Serial.println("✅ SUCCESS! Signal delivered to your mobile app!");
      }
      https.end();
    }
  }

  // Blink LED to confirm
  for (int i = 0; i < 6; i++) {
    digitalWrite(STATUS_LED, !digitalRead(STATUS_LED));
    delay(80);
  }
  digitalWrite(STATUS_LED, HIGH); // Turn OFF LED
}

void setup() {
  Serial.begin(115200);
  pinMode(BUTTON_PIN, INPUT_PULLUP);
  pinMode(STATUS_LED, OUTPUT);
  digitalWrite(STATUS_LED, HIGH);

  Serial.println("\\n==============================================");
  Serial.println("  ResQNet ESP8266 — Single (SMS) / Long (Call)");
  Serial.println("==============================================");
  Serial.printf("Connecting to WiFi: %s ", WIFI_SSID);

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);

  while (WiFi.status() != WL_CONNECTED) {
    digitalWrite(STATUS_LED, !digitalRead(STATUS_LED));
    delay(250);
    Serial.print(".");
  }

  digitalWrite(STATUS_LED, HIGH);
  Serial.println("\\n✅ WiFi Connected! IP: " + WiFi.localIP().toString());
  Serial.println("👉 SINGLE PRESS (<0.8s) = Open SMS App & Paste Message");
  Serial.println("👉 LONG PRESS  (>=0.8s) = Open Phone App & Paste Number");
}

void loop() {
  int buttonState = digitalRead(BUTTON_PIN);

  // Button just pressed down (LOW because of INPUT_PULLUP)
  if (buttonState == LOW && !isPressing) {
    delay(40); // Debounce check
    if (digitalRead(BUTTON_PIN) == LOW) {
      isPressing = true;
      longPressTriggered = false;
      pressStartTime = millis();
      digitalWrite(STATUS_LED, LOW); // LED turns ON while holding button
    }
  }

  // Button is still being held down -> check if it reached LONG PRESS threshold (800ms)
  if (buttonState == LOW && isPressing && !longPressTriggered) {
    if (millis() - pressStartTime >= LONG_PRESS_MS) {
      longPressTriggered = true;
      sendSosSignal("call"); // Immediately trigger Phone Call on long press!
      delay(500);            // Cooldown
    }
  }

  // Button released (HIGH)
  if (buttonState == HIGH && isPressing) {
    unsigned long holdDuration = millis() - pressStartTime;
    isPressing = false;
    digitalWrite(STATUS_LED, HIGH);

    // If released BEFORE 800ms (and wasn't already triggered as a long press) -> SINGLE PRESS!
    if (!longPressTriggered && holdDuration >= 40) {
      sendSosSignal("sms"); // Trigger SMS with emergency message!
      delay(500);           // Cooldown
    }
  }
}
`;

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2500);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(arduinoSketch);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const handleDownloadSketch = () => {
    const blob = new Blob([arduinoSketch], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'resqnet_esp8266_sos.ino';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleSimulateButtonPress = async () => {
    setIsTestingWebhook(true);
    try {
      await fetch('/api/esp8266/sos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId: `${deviceId} (Test)`,
          mode: espDefaultMode,
          pin: selectedPin.pinName,
        }),
      });
      onClose();
    } catch (e) {
      console.error('ESP8266 test trigger error:', e);
    } finally {
      setIsTestingWebhook(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div
        className={`max-w-lg w-full rounded-3xl border-2 p-4 sm:p-5 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto ${
          isDarkMode
            ? 'bg-slate-900 border-cyan-500/40 text-slate-100'
            : 'bg-white border-cyan-500/40 text-slate-900'
        }`}
      >
        {/* HEADER */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white flex items-center justify-center shadow-md shrink-0">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-black tracking-tight">
                  {isHindi ? 'ESP8266 हार्डवेयर SOS बटन' : 'ESP8266 Hardware SOS Button'}
                </h2>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/15 text-emerald-500 border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                  {isHindi ? 'लाइव सिंक चालू' : 'LIVE LISTENING'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">
                {isHindi
                  ? 'फिजिकल बटन दबाते ही इस ऐप का SOS बटन अपने-आप दब जाएगा'
                  : 'Push your physical ESP8266 button to trigger SOS on this app'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* LIVE HARDWARE STATUS & TEST TRIGGER BAR */}
        <div
          className={`p-3.5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
            isDarkMode
              ? 'bg-slate-950/90 border-slate-800'
              : 'bg-slate-50 border-slate-200'
          }`}
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-black">
              <Radio className="w-4 h-4 text-cyan-500 animate-pulse" />
              <span>
                {isHindi ? 'बटन ट्रिगर काउंट:' : 'Button Triggers Received:'}{' '}
                <span className="text-cyan-500 font-mono">{triggerCount}</span>
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              {lastEventTime
                ? isHindi
                  ? `अंतिम ट्रिगर: ${lastEventTime} (${lastDeviceId})`
                  : `Last button press: ${lastEventTime} (${lastDeviceId})`
                : isHindi
                ? 'ESP8266 से सिग्नल की प्रतीक्षा में...'
                : 'Listening for ESP8266 button press...'}
            </p>
          </div>

          <button
            type="button"
            onClick={handleSimulateButtonPress}
            disabled={isTestingWebhook}
            className="py-2.5 px-3.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-md shadow-red-600/20 cursor-pointer active:scale-95 transition-all shrink-0"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>
              {isTestingWebhook
                ? isHindi
                  ? 'ट्रिगर हो रहा है...'
                  : 'Triggering...'
                : isHindi
                ? 'टेस्ट बटन ट्रिगर'
                : 'Test Button Push'}
            </span>
          </button>
        </div>

        {/* STEP 1: WIRING GUIDE */}
        <div
          className={`p-3.5 rounded-2xl border space-y-2 ${
            isDarkMode
              ? 'bg-cyan-950/20 border-cyan-500/30'
              : 'bg-cyan-50/70 border-cyan-200'
          }`}
        >
          <div className="flex items-center gap-1.5 text-xs font-black text-cyan-600 dark:text-cyan-400">
            <Zap className="w-4 h-4" />
            <span>
              {isHindi
                ? '1. ESP8266 बटन वायरिंग (बिना रेसिस्टर के)'
                : '1. Hardware Wiring (2-Wire Setup — No Resistor Needed)'}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[11px] font-bold">
            <div
              className={`p-2.5 rounded-xl border ${
                isDarkMode
                  ? 'bg-slate-900 border-slate-800 text-slate-200'
                  : 'bg-white border-slate-200 text-slate-800'
              }`}
            >
              <span className="text-slate-400 block text-[10px]">BUTTON LEG 1</span>
              <span className="text-cyan-500 font-mono text-xs">{selectedPin.pinName}</span>
            </div>
            <div
              className={`p-2.5 rounded-xl border ${
                isDarkMode
                  ? 'bg-slate-900 border-slate-800 text-slate-200'
                  : 'bg-white border-slate-200 text-slate-800'
              }`}
            >
              <span className="text-slate-400 block text-[10px]">BUTTON LEG 2</span>
              <span className="text-emerald-500 font-mono text-xs">GND (Ground)</span>
            </div>
          </div>
        </div>

        {/* STEP 2: CUSTOMIZE WIFI, PIN & SOS MODE */}
        <div
          className={`p-3.5 rounded-2xl border space-y-3 ${
            isDarkMode ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-50 border-slate-200'
          }`}
        >
          <div className="flex items-center gap-1.5 text-xs font-black text-slate-700 dark:text-slate-200">
            <Sliders className="w-4 h-4 text-purple-500" />
            <span>
              {isHindi
                ? '2. अपना WiFi और पिन चुनें (Arduino कोड में अपने-आप जुड़ जाएगा)'
                : '2. Configure Your WiFi, Pin & SOS Action'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1 flex items-center gap-1">
                <Wifi className="w-3 h-3 text-cyan-500" />
                <span>WiFi Name (SSID)</span>
              </label>
              <input
                type="text"
                value={wifiSsid}
                onChange={e => setWifiSsid(e.target.value)}
                placeholder="MyHomeWiFi"
                className="w-full p-2 rounded-xl border text-xs font-bold font-mono bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1">
                WiFi Password
              </label>
              <input
                type="text"
                value={wifiPass}
                onChange={e => setWifiPass(e.target.value)}
                placeholder="password123"
                className="w-full p-2 rounded-xl border text-xs font-bold font-mono bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1">
                {isHindi ? 'ESP8266 बटन पिन' : 'ESP8266 Button Pin'}
              </label>
              <select
                value={selectedPinIdx}
                onChange={e => setSelectedPinIdx(Number(e.target.value))}
                className="w-full p-2 rounded-xl border text-xs font-bold bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 outline-none"
              >
                {PIN_OPTIONS.map((p, idx) => (
                  <option key={p.pinName} value={idx}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1">
                {isHindi ? 'बटन दबाने पर क्या हो?' : 'When Button is Pushed'}
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => onChangeDefaultMode('countdown')}
                  className={`py-2 px-2 rounded-xl text-[11px] font-black border cursor-pointer transition-all ${
                    espDefaultMode === 'countdown'
                      ? 'bg-red-600 text-white border-red-500'
                      : 'border-slate-300 dark:border-slate-700 text-slate-500'
                  }`}
                >
                  15s Countdown
                </button>
                <button
                  type="button"
                  onClick={() => onChangeDefaultMode('instant')}
                  className={`py-2 px-2 rounded-xl text-[11px] font-black border cursor-pointer transition-all ${
                    espDefaultMode === 'instant'
                      ? 'bg-amber-600 text-white border-amber-500'
                      : 'border-slate-300 dark:border-slate-700 text-slate-500'
                  }`}
                >
                  Instant Alert
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* STEP 3: WEBHOOK ENDPOINT URL */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5 text-red-500" />
              <span>{isHindi ? 'आपका लाइव SOS Webhook URL (GET या POST):' : 'Your Live SOS Trigger URL (GET or POST):'}</span>
            </span>
            <button
              type="button"
              onClick={handleCopyUrl}
              className="py-1 px-2.5 rounded-lg bg-cyan-500/15 text-cyan-600 dark:text-cyan-300 text-[11px] font-bold flex items-center gap-1 cursor-pointer border border-cyan-500/30"
            >
              {copiedUrl ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
              <span>{copiedUrl ? 'Copied!' : 'Copy URL'}</span>
            </button>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-950 text-cyan-300 font-mono text-[11px] break-all border border-slate-800 select-all">
            {webhookUrl}
          </div>
        </div>

        {/* STEP 4: ARDUINO IDE CODE (.INO) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-black flex items-center gap-1.5">
              <Terminal className="w-4 h-4 text-emerald-500" />
              <span>{isHindi ? '3. Arduino IDE कोड (ESP8266 में अपलोड करें)' : '3. Ready-to-Flash ESP8266 Arduino Code'}</span>
            </span>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleCopyCode}
                className="py-1.5 px-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] flex items-center gap-1 cursor-pointer shadow-sm"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCode ? 'Copied!' : 'Copy Code'}</span>
              </button>
              <button
                type="button"
                onClick={handleDownloadSketch}
                className="py-1.5 px-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-[11px] flex items-center gap-1 cursor-pointer border border-slate-700"
              >
                <Download className="w-3.5 h-3.5" />
                <span>.ino</span>
              </button>
            </div>
          </div>

          <pre className="p-3 rounded-2xl bg-slate-950 text-emerald-300 font-mono text-[10px] leading-relaxed overflow-x-auto max-h-56 border border-slate-800">
            {arduinoSketch}
          </pre>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full py-2.5 rounded-2xl bg-slate-200 dark:bg-slate-800 hover:opacity-90 font-bold text-xs cursor-pointer"
        >
          {isHindi ? 'बंद करें' : 'Done'}
        </button>
      </div>
    </div>
  );
};
