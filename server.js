require("dotenv").config();
const express = require("express");
const path = require("path");

const app = express();
app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

let latestTelemetry = { connected: false, updatedAt: null };

app.get("/api/telemetry", (_req, res) => res.json(latestTelemetry));

app.post("/api/telemetry", (req, res) => {
  // Prototype endpoint for a future telemetry bridge. Do not expose this publicly
  // without adding authentication before connecting real devices.
  latestTelemetry = { ...req.body, connected: true, updatedAt: new Date().toISOString() };
  res.json({ ok: true });
});

app.post("/api/realtime-session", async (_req, res) => {
  if (!process.env.OPENAI_API_KEY) {
    return res.status(503).json({ error: "Voice is not configured yet. Add OPENAI_API_KEY in the hosting environment variables." });
  }
  try {
    const response = await fetch("https://api.openai.com/v1/realtime/client_secrets", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        session: {
          type: "realtime",
          model: "gpt-realtime",
          audio: { output: { voice: "marin" } }
        }
      })
    });
    const data = await response.json();
    if (!response.ok) return res.status(response.status).json({ error: data.error?.message || "Could not create voice session." });
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: "Could not connect to the voice service." });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, "0.0.0.0", () => console.log(`RS Race Engineer listening on ${port}`));
