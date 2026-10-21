const statusEl = document.getElementById("voice-status");
const connectBtn = document.getElementById("connect-btn");
const logEl = document.getElementById("voice-log");
const badge = document.getElementById("telemetry-badge");

async function refreshTelemetry() {
  try {
    const response = await fetch("/api/telemetry");
    const data = await response.json();
    if (data.connected) {
      badge.textContent = "DATA RECEIVED";
      document.getElementById("speed").innerHTML = `${data.speed ?? "--"} <small>km/h</small>`;
      document.getElementById("gear").textContent = data.gear ?? "--";
      document.getElementById("rpm").textContent = data.rpm ?? "--";
      document.getElementById("lap").textContent = data.lap ?? "--";
    }
  } catch (_) { /* server unavailable; keep placeholder display */ }
}
refreshTelemetry();
setInterval(refreshTelemetry, 2000);

connectBtn.addEventListener("click", async () => {
  connectBtn.disabled = true;
  statusEl.textContent = "Checking voice setup…";
  try {
    const response = await fetch("/api/realtime-session", { method: "POST" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Voice setup failed.");
    statusEl.textContent = "Voice session created, but live audio connection still needs setup.";
    logEl.textContent = "The session endpoint responded. Browser audio connection is not yet enabled in this starter.";
  } catch (error) {
    statusEl.textContent = "Voice is not configured yet";
    logEl.textContent = error.message;
  } finally {
    connectBtn.disabled = false;
  }
});
