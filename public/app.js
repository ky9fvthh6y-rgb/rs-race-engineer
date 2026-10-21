
const connectButton = [...document.querySelectorAll("button")].find(
  (button) =>
    /connect voice|disconnect voice|talk to your engineer/i.test(
      button.textContent
    )
);

let recognition = null;
let listening = false;
let speaking = false;
let availableVoices = [];
let selectedVoiceURI = localStorage.getItem("rsEngineerVoice") || "";
let currentUtterance = null;
let speechTimer = null;
let restartTimer = null;

const status = document.createElement("p");
status.textContent = "Free voice mode ready";
status.setAttribute("role", "status");
document.body.appendChild(status);

// Voice selector
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

function showMessage(who, message) {
  const line = document.createElement("p");
  line.textContent = who + ": " + message;
  conversation.appendChild(line);
}

function refreshVoices() {
  availableVoices = window.speechSynthesis.getVoices();

  if (availableVoices.length === 0) {
    voiceNote.textContent = "Loading available voices...";
    return;
  }

  const previousChoice = selectedVoiceURI;
  voiceSelect.replaceChildren();

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

function getSelectedVoice() {
  return (
    availableVoices.find(
      (voice) => voice.voiceURI === voiceSelect.value
    ) || null
  );
}

voiceSelect.addEventListener("change", () => {
  selectedVoiceURI = voiceSelect.value;
  localStorage.setItem("rsEngineerVoice", selectedVoiceURI);
});

function scheduleListeningRestart() {
  clearTimeout(restartTimer);

  if (!listening || speaking || !recognition) return;

  restartTimer = setTimeout(() => {
    if (!listening || speaking || !recognition) return;

    try {
      recognition.start();
    } catch (_) {
      // Recognition may already be starting.
    }
  }, 250);
}

function speak(message) {
  clearTimeout(speechTimer);
  clearTimeout(restartTimer);

  if (!("speechSynthesis" in window)) {
    status.textContent = "Speech playback is not supported.";
    return;
  }

  // Ignore late events from an older utterance.
  const previousUtterance = currentUtterance;
  currentUtterance = null;

  if (
    window.speechSynthesis.speaking ||
    window.speechSynthesis.pending
  ) {
    window.speechSynthesis.cancel();
  }

  const utterance = new SpeechSynthesisUtterance(message);
  utterance.rate = 1;
  utterance.pitch = 1;

  const voice = getSelectedVoice();

  if (voice) {
    utterance.voice = voice;
    utterance.lang = voice.lang;
  } else {
    utterance.lang = "en-GB";
  }

  currentUtterance = utterance;

  // Mark speech as active immediately so recognition does not
  // restart while Safari is preparing the audio.
  speaking = true;
  status.textContent = "Engineer speaking...";

  utterance.onstart = () => {
    if (currentUtterance !== utterance) return;
    speaking = true;
    status.textContent = "Engineer speaking...";
  };

  utterance.onend = () => {
    if (currentUtterance !== utterance) return;

    currentUtterance = null;
    speaking = false;

    if (listening) {
      status.textContent = "Listening — speak now";
      scheduleListeningRestart();
    } else {
      status.textContent = "Free voice mode ready";
    }
  };

  utterance.onerror = (event) => {
    if (currentUtterance !== utterance) return;

    currentUtterance = null;
    speaking = false;
    console.log("Speech playback error:", event.error);

    status.textContent = listening
      ? "Speech playback failed. Listening may resume."
      : "Speech playback failed. Try Test voice.";

    scheduleListeningRestart();
  };

  // A short pause can help Safari after cancelling existing audio.
  speechTimer = setTimeout(() => {
    if (currentUtterance !== utterance) return;

    try {
      window.speechSynthesis.speak(utterance);
    } catch (error) {
      speaking = false;
      currentUtterance = null;
      status.textContent = "Could not start speech playback.";
      console.log(error);
    }
  }, previousUtterance ? 150 : 50);
}

testButton.addEventListener("click", () => {
  refreshVoices();

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

// Free preset race-engineer replies
function makeReply(message) {
  const text = message.toLowerCase();

  if (text.includes("stop listening") || text.includes("disconnect")) {
    stopListening();
    speak("Radio off. See you on track.");
    return null;
  }

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

  return "Copy that, driver. I'm listening, but this free test version uses simple preset replies rather than a full AI engineer. What would you like help with?";
}

function stopListening() {
  listening = false;
  clearTimeout(restartTimer);
  clearTimeout(speechTimer);

  if (recognition) {
    const oldRecognition = recognition;
    recognition = null;
    oldRecognition.onend = null;
    oldRecognition.onerror = null;

    try {
      oldRecognition.stop();
    } catch (_) {}
  }

  currentUtterance = null;
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
      "Speech recognition is not supported here. Try Safari on your iPhone or a supported browser.";
    return;
  }

  if (!("speechSynthesis" in window)) {
    status.textContent = "Speech playback is not supported.";
    return;
  }

  recognition = new SpeechRecognition();
  const activeRecognition = recognition;

  activeRecognition.lang = "en-GB";
  activeRecognition.continuous = false;
  activeRecognition.interimResults = false;
  activeRecognition.maxAlternatives = 1;

  activeRecognition.onstart = () => {
    if (recognition !== activeRecognition || !listening) return;

    status.textContent = speaking
      ? "Preparing engineer reply..."
      : "Listening — speak now";
  };

  activeRecognition.onresult = (event) => {
    if (recognition !== activeRecognition || !listening) return;

    const result = event.results[event.results.length - 1];
    if (!result || !result[0]) return;

    const message = result[0].transcript.trim();
    if (!message) return;

    showMessage("You", message);

    // Prevent the recognition end event from racing the reply audio.
    speaking = true;

    const reply = makeReply(message);

    if (reply) {
      showMessage("RS Engineer", reply);
      speak(reply);
    }
  };

  activeRecognition.onerror = (event) => {
    if (recognition !== activeRecognition || !listening) return;

    console.log("Microphone error:", event.error);

    if (event.error === "not-allowed" ||
        event.error === "service-not-allowed") {
      status.textContent =
        "Microphone access denied. Check Safari website permissions.";
    } else if (event.error === "no-speech") {
      status.textContent = "Didn't hear you. Listening again...";
    } else {
      status.textContent = "Microphone error: " + event.error;
    }
  };

  activeRecognition.onend = () => {
    if (recognition !== activeRecognition) return;

    if (listening && !speaking) {
      scheduleListeningRestart();
    }
  };

  listening = true;

  if (connectButton) {
    connectButton.textContent = "Disconnect voice";
  }

  status.textContent = "Starting microphone...";

  try {
    activeRecognition.start();
  } catch (error) {
    listening = false;
    recognition = null;

    if (connectButton) {
      connectButton.textContent = "Connect voice";
    }

    status.textContent = "Could not start listening. Try again.";
    console.log(error);
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
    "Could not find the voice button. Check the page's button text.";
}
