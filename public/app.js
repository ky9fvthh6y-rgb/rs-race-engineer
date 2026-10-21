
const connectButton = [...document.querySelectorAll("button")].find(
  (button) => button.textContent.trim().toLowerCase().includes("connect voice")
);

const textElements = [...document.querySelectorAll("body *")].filter(
  (element) => element.children.length === 0
);

const findText = (text) =>
  textElements.find((element) => element.textContent.trim() === text);

const statusElement =
  findText("Ready when you are") ||
  findText("NOT CONNECTED");

const placeholder = findText("Your radio messages will appear here.");
const messagesElement = placeholder?.parentElement;

let peer = null;
let microphone = null;
let channel = null;
let remoteAudio = null;
let connected = false;
let busy = false;

function setStatus(message) {
  if (statusElement) statusElement.textContent = message;
}

function addMessage(speaker, message) {
  if (!messagesElement) {
    console.log(`${speaker}: ${message}`);
    return;
  }

  if (placeholder) placeholder.style.display = "none";

  const line = document.createElement("p");
  line.textContent = `${speaker}: ${message}`;
  line.style.margin = "10px 0";
  line.style.overflowWrap = "anywhere";
  messagesElement.appendChild(line);
}

function stopVoice() {
  if (channel) channel.close();
  if (peer) peer.close();

  if (microphone) {
    microphone.getTracks().forEach((track) => track.stop());
  }

  if (remoteAudio) {
    remoteAudio.pause();
    remoteAudio.srcObject = null;
  }

  channel = null;
  peer = null;
  microphone = null;
  remoteAudio = null;
  connected = false;
  busy = false;

  if (connectButton) connectButton.textContent = "Connect voice";
  setStatus("Ready when you are");
}

async function startVoice() {
  if (busy) return;
  busy = true;

  try {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("Microphone access requires a secure HTTPS website.");
    }

    setStatus("Connecting to your engineer...");
    if (connectButton) connectButton.textContent = "Connecting...";

    // Get a temporary voice-session key from your own server.
    const sessionResponse = await fetch("/api/realtime-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({})
    });

    const sessionData = await sessionResponse.json();

    if (!sessionResponse.ok) {
      throw new Error(
        sessionData.error?.message ||
        sessionData.error ||
        "Could not create a voice session. Check your Render logs."
      );
    }

    const temporaryKey =
      sessionData.value ||
      sessionData.client_secret?.value;

    if (!temporaryKey) {
      throw new Error("The server did not return a temporary voice key.");
    }

    microphone = await navigator.mediaDevices.getUserMedia({
      audio: true
    });

    peer = new RTCPeerConnection();

    remoteAudio = document.createElement("audio");
    remoteAudio.autoplay = true;
    remoteAudio.playsInline = true;
    document.body.appendChild(remoteAudio);

    peer.ontrack = (event) => {
      remoteAudio.srcObject = event.streams[0];
      remoteAudio.play().catch(() => {
        setStatus("Connected. Allow audio playback in your browser.");
      });
    };

    microphone.getTracks().forEach((track) => {
      peer.addTrack(track, microphone);
    });

    channel = peer.createDataChannel("oai-events");

    channel.onopen = () => {
      connected = true;
      busy = false;

      if (connectButton) connectButton.textContent = "Disconnect voice";
      setStatus("Connected — talk to your engineer!");
      addMessage("RS Engineer", "Radio connected. How can I help you today?");

      channel.send(JSON.stringify({
        type: "session.update",
        session: {
          type: "realtime",
          instructions:
            "You are RS Race Engineer, a friendly, natural-sounding F1 24 race engineer. Speak conversationally and keep replies concise so the driver can focus on racing. Give useful driving and race strategy advice when asked. You do not currently have live telemetry from the PS4 or ESP32, so never invent speed, gear, RPM, lap, tyre, fuel, or other live data. Be honest when information is unavailable. You are speaking to the driver through their phone.",
          audio: {
            input: {
              turn_detection: { type: "server_vad" },
              transcription: { model: "gpt-4o-mini-transcribe" }
            },
            output: { voice: "marin" }
          }
        }
      }));

      channel.send(JSON.stringify({
        type: "response.create",
        response: {
          instructions:
            "Briefly greet the driver as their RS Race Engineer and ask what they need."
        }
      }));
    };

    channel.onmessage = (event) => {
      let data;

      try {
        data = JSON.parse(event.data);
      } catch {
        return;
      }

      if (data.type === "conversation.item.input_audio_transcription.completed") {
        if (data.transcript) addMessage("You", data.transcript);
      }

      if (data.type === "response.output_audio_transcript.done") {
        if (data.transcript) addMessage("RS Engineer", data.transcript);
      }

      if (data.type === "error") {
        console.error("Voice session error:", data.error);
        setStatus("Voice error: " + (data.error?.message || "Please reconnect."));
      }
    };

    const offer = await peer.createOffer();
    await peer.setLocalDescription(offer);

    const answerResponse = await fetch(
      "https://api.openai.com/v1/realtime?model=gpt-realtime",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${temporaryKey}`,
          "Content-Type": "application/sdp"
        },
        body: offer.sdp
      }
    );

    if (!answerResponse.ok) {
      throw new Error(
        "OpenAI voice connection failed (" + answerResponse.status +
        "). Check API billing, your Render key, and the browser console."
      );
    }

    const answerSdp = await answerResponse.text();

    await peer.setRemoteDescription({
      type: "answer",
      sdp: answerSdp
    });

    // Wait for the data channel to open before declaring success.
    setStatus("Finishing voice connection...");
  } catch (error) {
    console.error("RS Race Engineer connection error:", error);
    stopVoice();
    setStatus(error.message || "Could not connect. Please try again.");
    addMessage("System", error.message || "Could not connect.");
  } finally {
    busy = false;
  }
}

if (connectButton) {
  connectButton.addEventListener("click", () => {
    if (connected) {
      stopVoice();
    } else {
      startVoice();
    }
  });
} else {
  console.error("RS Race Engineer: Connect voice button was not found.");
}
