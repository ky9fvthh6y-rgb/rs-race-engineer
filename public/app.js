
const connectButton = [...document.querySelectorAll("button")].find(
  (button) => /connect voice|disconnect voice|talk to your engineer/i.test(button.textContent)
);

let recognition = null;
let listening = false;
let speaking = false;

const status = document.createElement("p");
status.textContent = "Free voice mode ready";
status.setAttribute("role", "status");
document.body.appendChild(status);

const conversation = document.createElement("div");
conversation.style.cssText =
  "padding:12px; margin:12px 0; overflow-wrap:anywhere;";
document.body.appendChild(conversation);

function showMessage(who, text) {
  const line = document.createElement("p");
  line.textContent = who + ": " + text;
  conversation.appendChild(line);
}

function speak(text) {
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1;
  utterance.onstart = () => { speaking = true; };
  utterance.onend = () => {
    speaking = false;
    if (listening && recognition) {
      try {
        recognition.start();
      } catch (_) {}
    }
  };
  utterance.onerror = () => {
    speaking = false;
  };

  window.speechSynthesis.speak(utterance);
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

  if (text.includes("lap") || text.includes("pace") || text.includes("faster")) {
    return "Focus on consistent braking points, smooth exits and getting on the power early. I cannot analyse your lap telemetry yet.";
  }

  if (text.includes("thank")) {
    return "No problem, driver. I'm here when you need me.";
  }

  if (text.includes("stop listening") || text.includes("disconnect")) {
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

  if (connectButton) connectButton.textContent = "Connect voice";
  status.textContent = "Voice disconnected";
}

function startListening() {
  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    status.textContent =
      "Speech recognition is not supported in this browser. Try Chrome on your computer.";
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
    const message = event.results[event.results.length - 1][0].transcript;
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
  if (connectButton) connectButton.textContent = "Disconnect voice";
  status.textContent = "Starting microphone...";

  try {
    recognition.start();
  } catch (error) {
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
