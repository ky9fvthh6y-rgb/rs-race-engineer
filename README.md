# RS Race Engineer

A responsive starter website for the RS Race Engineer project.

## Deploying
- Deploy this repository as a **Render Web Service**.
- Build command: `npm install`
- Start command: `npm start`
- Add `OPENAI_API_KEY` as a secret environment variable in Render. Never put a real API key in this repository or share it in chat.

## Current limitations
This is a prototype, not a finished connected race engineer. Voice requires a valid API key and may need updates as the Realtime API changes. The website does not yet receive telemetry directly from the PS4 or ESP32. Keep the existing ESP32 telemetry setup unchanged; a secure local bridge still needs to be designed and tested before live telemetry is connected.
