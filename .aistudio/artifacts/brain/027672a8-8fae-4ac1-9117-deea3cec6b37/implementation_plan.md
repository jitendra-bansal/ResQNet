# ResQNet Microphone Access & On-Demand Voice Assistant Integration

Enable full browser and iframe microphone permissions with click-to-listen voice activation, live acoustic waveform visualization, and real-time spoken text preview across the onboarding conversation and Home page voice assistant.

> [!IMPORTANT]
> **User Review & Critical Decisions**
> - **Click-to-Listen Activation**: Per your preference, the microphone will not auto-listen when the Home page loads or unprompted; instead, clicking any microphone trigger (in the onboarding conversation, on the Home page voice assistant banner, or on the floating voice button) immediately requests hardware microphone access and starts active listening.
> - **Live Waveform & Real-Time Transcript Preview**: While the microphone is actively listening, a multi-bar live audio frequency waveform (driven by the Web Audio API) and a real-time spoken text preview will appear so you can see your voice being captured word-by-word in English or Hindi.
> - **Dual-Engine Speech Recognition**: Browser speech recognition is paired with a live audio recorder fallback that transcribes speech via the backend audio transcription service whenever native speech recognition is restricted by the browser environment.

## 1. Overview & Core Concept
- **Primary Objective**: Ensure uninterrupted, reliable microphone access throughout the ResQNet safety application so seniors and relatives can answer every onboarding question by voice and issue voice commands on the Home screen whenever they click the microphone button.
- **Core Capabilities**:
  - **Iframe & Browser Hardware Permission Grant**: Configure application frame permissions for microphone and geolocation access, and trigger `navigator.mediaDevices.getUserMedia({ audio: true })` directly inside microphone button click handlers so browser security policies grant immediate audio capture.
  - **On-Demand Onboarding Voice Answers**: Allow users to click the microphone button at any step of the bilingual (English/Hindi) onboarding conversation—including name, age, watch model, medical conditions, 10-digit emergency contact phone number, and 4-digit SMS OTP verification—to speak their answer with live visual confirmation.
  - **Home Page Click-to-Listen Voice Assistant**: Provide an interactive microphone control directly on the Home page voice assistant card and floating voice assistant modal that starts listening immediately when clicked.

## 2. User Experience & Visual Design
- **Aesthetic Direction & Domain Exemplars**: High-contrast, senior-friendly medical telemetry interface inspired by Apple Health and emergency clinical monitors, featuring clear tactile touch targets ($48 \times 48\text{px}$ minimum hitboxes), high-luminance emerald and cyan status accents, and unambiguous active-listening states.
- **Live Voice Waveform & Real-Time Spoken Text Preview**:
  - **Acoustic Waveform Visualizer**: When the microphone is active, a responsive multi-bar audio visualizer animates in real time using live microphone volume levels from the Web Audio API `AnalyserNode`.
  - **Real-Time Transcript Banner**: Spoken words appear immediately in a high-contrast preview pill as the user speaks (e.g., *"🎙️ Listening: 'My age is 68'..."* or digit accumulation *"98765 (5/10 digits)"*), before automatically submitting or populating the answer field.
  - **Clear State Transitions**: Distinct visual and acoustic cues differentiate between **App Speaking** (cyan speaker pulse), **Microphone Actively Listening** (emerald/crimson recording pulse + live waveform + interim text preview), and **Ready to Speak** (prominent "Tap Mic to Speak" call-to-action).

## 3. Key Product Decisions & Trade-Offs
- **Click-to-Activate vs. Continuous Background Listening on Home Page**:
  - *Decision*: Only start listening when the user clicks the microphone button on the Home page or inside the Voice Assistant.
  - *Rationale*: Prevents unintended voice triggers, respects user privacy, avoids browser autoplay/microphone blocking without a user gesture, and gives clear intentional control.
- **Web Audio API Stream + Speech Recognition Hybrid**:
  - *Decision*: Acquire a real `MediaStream` via `getUserMedia({ audio: true })` on microphone click alongside `SpeechRecognition` (with automatic fallback to `MediaRecorder` + server-side Gemini audio transcription).
  - *Rationale*: Explicitly requesting the audio stream on button click guarantees the browser permission prompt is satisfied and powers a genuine, real-time frequency waveform even while speech-to-text is processing.

## 4. Technical Architecture & Data Strategy
- **Microphone Permission & Audio Pipeline**:
  1. **Frame Permission Configuration**: Declare microphone and geolocation permissions in the application metadata so the hosting container delegates hardware access to the app iframe.
  2. **User-Gesture Audio Stream Acquisition**: When the user clicks the microphone button in onboarding or on the Home page, invoke `navigator.mediaDevices.getUserMedia({ audio: true })` to unlock microphone hardware and attach a Web Audio `AudioContext` + `AnalyserNode` for real-time amplitude sampling.
  3. **Bilingual Speech-to-Text Engine**: Run browser `SpeechRecognition` (`en-US` / `hi-IN`) with `interimResults: true` to stream live spoken text into the preview banner. If browser speech recognition encounters a permission or network block, seamlessly capture audio chunks via `MediaRecorder` and transcribe via the `/api/transcribe-audio` endpoint.

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                    User Clicks Microphone Button                        │
│        (Onboarding Chat Bar / Home Voice Card / Voice Assistant)        │
└───────────────────────────────────┬─────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│             Hardware Microphone Access (getUserMedia Audio)             │
│     Grants Browser Permission + Feeds Web Audio API AnalyserNode        │
└─────────────────┬───────────────────────────────────┬───────────────────┘
                  │                                   │
                  ▼                                   ▼
┌───────────────────────────────────┐ ┌───────────────────────────────────┐
│   Live Voice Waveform Visualizer  │ │  Speech Recognition / Recorder    │
│  Real-time frequency bars driven  │ │ Streams interim spoken words &    │
│  by microphone voice amplitude    │ │ final transcript (EN / HI)        │
└─────────────────┬─────────────────┘ └─────────────────┬─────────────────┘
                  │                                   │
                  └─────────────────┬─────────────────┘
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│         Real-Time Spoken Text Preview & Command / Answer Handler        │
│   Displays live transcript & submits onboarding answer or Home command  │
└─────────────────────────────────────────────────────────────────────────┘
```
