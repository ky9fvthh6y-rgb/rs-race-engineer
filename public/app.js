
const connectButton = [...document.querySelectorAll("button")].find(
  (button) => /connect voice|disconnect voice|talk to your engineer/i.test(button.textContent)
);

let recognition = null;
let listening = false;
let speaking = false;
let availableVoices = [];
let selectedVoiceURI = localStorage.getItem("rsEngineerVoice") || "";

const status = document.createElement("p");
status.textContent = "Free voice mode ready";
status.setAttribute("role", "status");
document.body.appendChild(status);

// Voice selection
const voicePanel = document.createElement("section");
voicePanel.style.cssText =
  "padding:16px;margin:16px 0;border:1px solid #777;border-radius:12px;max-width:500px;";

const voiceHeading = document.createElement("h3");
voiceHeading.textContent = "Race Engineer Voice";
voicePanel.appendChild(voiceHeading);

const voiceLabel = document.createElement("label");
voiceLabel.textContent = "Choose a voice available on this device";
voiceLabel.style.cssText = "display:block;margin-bottom:8px;";
voicePanel.appendChild(voiceLabel);

const voiceSelect = document.createElement("select");
voiceSelect.style.cssText =
  "width:100%;padding:12px;font-size:16px;margin-bottom:12px;";
voiceSelect.setAttribute("aria-label", "Race engineer voice");
voicePanel.appendChild(voiceSelect);

const testButton = document.createElement("button");
testButton.textContent = "Test voice";
testButton.type = "button";
testButton.style.cssText = "padding:10px 16px;cursor:pointer;";
voicePanel.appendChild(testButton);

const voiceNote = document.createElement("p");
voiceNote.textContent =
  "The list contains voices made available by your browser.";
voiceNote.style.cssText = "font-size:13px;";
voicePanel.appendChild(voiceNote);

document.body.appendChild(voicePanel);

const conversation = document.createElement("div");
conversation.style.cssText =
  "padding:12px;margin:12px 0;overflow-wrap:anywhere;";
document.body.appendChild(conversation);

function showMessage(who, text) {
  const line = document.createElement("p");
  line.textContent = who + ": " + text;
  conversation.appendChild(line);
}

function refreshVoices() {
  const previousChoice = selectedVoiceURI;
  availableVoices = window.speechSynthesis.getVoices();

  voiceSelect.replaceChildren();

  if (availableVoices.length === 0) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "Loading available voices...";
    voiceSelect.appendChild(option);
    voiceNote.textContent =
      "Waiting for your browser to provide its available voices.";
    return;
  }

  availableVoices.forEach((voice) => {
    const option = document.createElement("option");
    option.value = voice.voiceURI;
    option.textContent =
      voice.name + " (" + voice.lang + ")" +
      (voice.default ? " — Default" : "");
    voiceSelect.appendChild(option);
  });

  let chosen = availableVoices.find(
    (voice) => voice.voiceURI === previousChoice
  );

  // If the saved voice isn't available on this device,
  // prefer a British English voice, then the browser default.
  if (!chosen) {
    chosen = availableVoices.find(
      (voice) => /^en-GB$/i.test(voice.lang)
    );
  }

  if (!chosen) {
    chosen =
      availableVoices.find((voice) => voice.default) ||
      availableVoices[0];
  }

  selectedVoiceURI = chosen.voiceURI;
  voiceSelect.value = chosen.voiceURI;
  localStorage.setItem("rsEngineerVoice", chosen.voiceURI);

  voiceNote.textContent =
    availableVoices.length + " available voice(s).";
}

voiceSelect.addEventListener("change", () => {
  selectedVoiceURI = voiceSelect.value;
  localStorage.setItem("rsEngineerVoice", selectedVoiceURI);
  window.speechSynthesis.cancel();
});

function getSelectedVoice() {
  return availableVoices.find(
    (voice) => voice.voiceURI === voiceSelect.value
  ) || null;
}


function speak(text) {
  window.speechSynthesis.cancel();
  speaking = false;

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1;
  utterance.pitch = 1;

  const voice = getSelectedVoice();

  if (voice) {
    utterance.voice = voice;
    utterance.lang = voice.lang;
  } else {
    utterance.lang = "en-GB";
  }

  utterance.onstart = () => {
    speaking = true;
  };

  utterance.onend = () => {
    speaking = false;

    if (listening && recognition) {
      try {
        recognition.start();
      } catch (_) {}
    }
  };

  utterance.onerror = (event) => {
    speaking = false;
    console.log("Speech error:", event.error);
  };

  // Give Safari a moment to finish cancelling previous speech.
  setTimeout(() => {
    window.speechSynthesis.speak(utterance);
  }, 150);
}

  speak(
    "Radio check. This is your race engineer. How does this voice sound, driver?"
  );
});

if ("speechSynthesis" in window) {
  refreshVoices();
  window.speechSynthesis.addEventListener(
    "voiceschanged",
    refreshVoices
  );
} else {
  voiceNote.textContent =
    "Speech synthesis is not supported by this browser.";
  testButton.disabled = true;
}

function makeReply(message) {
  const text = message.toLowerCase();

  if (text.includes("hello") || text.includes("hi engineer")) {
    return "Radio check, I'm here. What do you need, driver?";
  }

  if (text.includes("tyre") || text.includes("tire")) {
    return "Keep an eye on tyre temperatures and wear in your game. I cannot see your live tyre data yet.";
  }

  if (text.includes("fuel")) {
    return "Check your remaining fuel and estimated laps in the game. I don't have access to your live fuel data yet.";
  }

  if (text.includes("weather") || text.includes("rain")) {
    return "Check the in-game weather forecast before deciding whether to change tyres. I cannot see your live weather data yet.";
  }

  if (
    text.includes("lap") ||
    text.includes("pace") ||
    text.includes("faster")
  ) {
    return "Focus on consistent braking points, smooth exits and getting on the power early. I cannot analyse your lap telemetry yet.";
  }

  if (text.includes("thank")) {
    return "No problem, driver. I'm here when you need me.";
  }

  if (
    text.includes("stop listening") ||
    text.includes("disconnect")
  ) {
    stopListening();
    speak("Radio off. See you on track.");
    return null;
  }

  return "Copy that, driver. I'm listening, but this free test version uses simple preset replies rather than a full AI engineer. What would you like help with?";
}

function stopListening() {
  listening = false;

  if (recognition) {
    recognition.onend = null;
    recognition.stop();
    recognition = null;
  }

  window.speechSynthesis.cancel();
  speaking = false;

  if (connectButton) {
    connectButton.textContent = "Connect voice";
  }

  status.textContent = "Voice disconnected";
}

function startListening() {
  const SpeechRecognition =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    status.textContent =
      "Speech recognition is not supported in this browser. Try a supported browser.";
    return;
  }

  recognition = new SpeechRecognition();
  recognition.lang = "en-GB";
  recognition.continuous = false;
  recognition.interimResults = false;

  recognition.onstart = () => {
    status.textContent = "Listening — speak now";
  };

  recognition.onresult = (event) => {
    const message =
      event.results[event.results.length - 1][0].transcript;

    showMessage("You", message);

    const reply = makeReply(message);

    if (reply) {
      showMessage("RS Engineer", reply);
      speak(reply);
    }
  };

  recognition.onerror = (event) => {
    status.textContent = "Microphone error: " + event.error;
  };

  recognition.onend = () => {
    if (listening && !speaking && recognition) {
      setTimeout(() => {
        if (listening && !speaking && recognition) {
          try {
            recognition.start();
          } catch (_) {}
        }
      }, 400);
    }
  };

  listening = true;

  if (connectButton) {
    connectButton.textContent = "Disconnect voice";
  }

  status.textContent = "Starting microphone...";

  try {
    recognition.start();
  } catch (_) {
    status.textContent = "Could not start listening. Try again.";
    listening = false;
  }
}

if (connectButton) {
  connectButton.addEventListener("click", () => {
    if (listening) {
      stopListening();
    } else {
      startListening();
    }
  });
} else {
  status.textContent =
    "Could not find the voice button. Please check the page.";
}
