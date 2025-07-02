// Ensure the speech SDK is loaded before trying to use it.
window.onload = function () {
  // --- IMPORTANT: Replace with your actual Azure Speech Service Key and Region ---
  // You can find these in your Azure portal under your Speech Service resource.
  const SPEECH_KEY = AZURE_SPEECH_CONFIG.KEY;
  const SPEECH_REGION = AZURE_SPEECH_CONFIG.REGION;

  // Get references to HTML elements
  const textInput = document.getElementById("textInput");
  const languageSelect = document.getElementById("languageSelect");
  const voiceSelect = document.getElementById("voiceSelect");
  const styleSelect = document.getElementById("styleSelect");
  const styleDegreeSelect = document.getElementById("styleDegreeSelect");
  const roleSelect = document.getElementById("roleSelect");
  const pitchSelect = document.getElementById("pitchSelect");
  const rateSelect = document.getElementById("rateSelect");
  const volumeSelect = document.getElementById("volumeSelect");
  const emphasisSelect = document.getElementById("emphasisSelect");
  const startButton = document.getElementById("startButton");
  const stopButton = document.getElementById("stopButton");
  const statusMessage = document.getElementById("statusMessage");
  const volumeSlider = document.getElementById("volumeSlider");

  // Initialize Speech SDK objects
  let speechConfig;
  let synthesizer;

  // Audio playback management
  let audioContext = null;
  let audioSource = null;
  let gainNode = null;

  // Function to update status message
  function updateStatus(message, type = "info") {
    statusMessage.textContent = message;
    statusMessage.className = `status-message status-${type}`;
  }

  // Function to enable/disable buttons
  function setButtonsState(isSynthesizing) {
    startButton.disabled = isSynthesizing;
    stopButton.disabled = !isSynthesizing;
  }

  // Function to stop audio playback
  function stopAudioPlayback() {
    if (audioSource) {
      try {
        audioSource.stop();
      } catch (e) {}
      audioSource.disconnect();
      audioSource = null;
    }
    if (audioContext) {
      try {
        audioContext.close();
      } catch (e) {}
      audioContext = null;
    }
  }

  // Initialize SpeechConfig and Synthesizer
  try {
    speechConfig = SpeechSDK.SpeechConfig.fromSubscription(
      SPEECH_KEY,
      SPEECH_REGION
    );
    // Set the output format to be a WAV file (default is usually OK but good to be explicit)
    speechConfig.speechSynthesisOutputFormat =
      SpeechSDK.SpeechSynthesisOutputFormat.Audio16Khz32KBitRateMonoMp3;

    // Create a speech synthesizer.
    // Use null for AudioConfig so we can handle playback ourselves and avoid double audio.
    synthesizer = new SpeechSDK.SpeechSynthesizer(
      speechConfig,
      null // Do not use fromDefaultSpeakerOutput()
    );

    // Event handler for synthesis completion
    synthesizer.SynthesisCompleted = function (s, e) {
      if (
        e.result.reason === SpeechSDK.ResultReason.SynthesizingAudioCompleted
      ) {
        updateStatus("Synthesis completed successfully.", "success");
      } else if (e.result.reason === SpeechSDK.ResultReason.Canceled) {
        const cancellationDetails = SpeechSDK.CancellationDetails.fromResult(
          e.result
        );
        if (cancellationDetails.reason === SpeechSDK.CancellationReason.Error) {
          updateStatus(
            `Synthesis cancelled. Error details: ${cancellationDetails.errorDetails}`,
            "error"
          );
        } else {
          updateStatus("Synthesis cancelled.", "info");
        }
      }
      setButtonsState(false);
    };

    // Event handler for synthesis cancellation
    synthesizer.Canceled = function (s, e) {
      const cancellationDetails = SpeechSDK.CancellationDetails.fromResult(
        e.result
      );
      if (cancellationDetails.reason === SpeechSDK.CancellationReason.Error) {
        updateStatus(
          `Synthesis error: ${cancellationDetails.errorDetails}`,
          "error"
        );
      } else {
        updateStatus("Synthesis cancelled.", "info");
      }
      setButtonsState(false);
    };

    // Event handler for synthesis started
    synthesizer.SynthesisStarted = function (s, e) {
      updateStatus("Synthesis started...", "info");
      setButtonsState(true);
    };
  } catch (error) {
    updateStatus(
      `Error initializing Speech SDK: ${error.message}. Please check your key and region.`,
      "error"
    );
    startButton.disabled = true;
    stopButton.disabled = true;
    return; // Stop execution if SDK initialization fails
  }

  // Function to build SSML string dynamically
  function buildSsml(
    text,
    lang,
    voiceName,
    style,
    styleDegree,
    role,
    pitch,
    rate,
    volume,
    emphasis
  ) {
    let ssml = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="http://www.w3.org/2001/mstts" xml:lang="${lang}">`;
    ssml += `<voice name="${voiceName}">`;

    let openTags = [];

    // mstts:express-as
    let expressAsAttributes = [];
    if (style && style !== "") {
      expressAsAttributes.push(`style="${style}"`);
    }
    if (styleDegree && styleDegree !== "default") {
      expressAsAttributes.push(
        `styledegree="${parseFloat(styleDegree) / 100}"`
      );
    }
    if (role && role !== "") {
      expressAsAttributes.push(`role="${role}"`);
    }
    if (expressAsAttributes.length > 0) {
      const tag = `<mstts:express-as ${expressAsAttributes.join(" ")}>`;
      ssml += tag;
      openTags.push("</mstts:express-as>");
    }

    // prosody
    let prosodyAttributes = [];
    if (pitch && pitch !== "default") {
      prosodyAttributes.push(`pitch="${pitch}"`);
    }
    if (rate && rate !== "default") {
      prosodyAttributes.push(`rate="${rate}"`);
    }
    if (volume && volume !== "default") {
      prosodyAttributes.push(`volume="${volume}"`);
    }
    if (prosodyAttributes.length > 0) {
      const tag = `<prosody ${prosodyAttributes.join(" ")}>`;
      ssml += tag;
      openTags.push("</prosody>");
    }

    // emphasis
    if (emphasis && emphasis !== "none") {
      const tag = `<emphasis level="${emphasis}">`;
      ssml += tag;
      openTags.push("</emphasis>");
    }

    // Escape special characters in the text content for SSML safety
    const escapedText = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");

    ssml += escapedText;

    // Close tags in reverse order
    ssml += openTags.reverse().join("");

    ssml += `</voice>`;
    ssml += `</speak>`;
    return ssml;
  }

  // Start Synthesis button click handler
  startButton.addEventListener("click", () => {
    // Stop any currently playing audio before starting new synthesis
    stopAudioPlayback();

    const text = textInput.value.trim();
    const lang = languageSelect.value;
    const voiceName = voiceSelect.value;
    const style = styleSelect.value;
    const styleDegree = styleDegreeSelect.value;
    const role = roleSelect.value;
    const pitch = pitchSelect.value;
    const rate = rateSelect.value;
    const volume = volumeSelect.value;
    const emphasis = emphasisSelect.value;

    if (!text) {
      updateStatus("Please enter some text to synthesize.", "error");
      return;
    }
    if (!synthesizer) {
      updateStatus(
        "Speech synthesizer not initialized. Check console for errors.",
        "error"
      );
      return;
    }

    const ssml = buildSsml(
      text,
      lang,
      voiceName,
      style,
      styleDegree,
      role,
      pitch,
      rate,
      volume,
      emphasis
    );
    updateStatus("Sending SSML for synthesis...", "info");
    setButtonsState(true);

    synthesizer.speakSsmlAsync(
      ssml,
      (result) => {
        if (
          result.reason === SpeechSDK.ResultReason.SynthesizingAudioCompleted
        ) {
          // Play the audio data using Web Audio API
          if (result.audioData && result.audioData.byteLength > 0) {
            try {
              audioContext = new (window.AudioContext ||
                window.webkitAudioContext)();
              gainNode = audioContext.createGain();
              gainNode.gain.value = parseFloat(volumeSlider.value);
              audioContext.decodeAudioData(
                result.audioData.slice(0),
                (buffer) => {
                  audioSource = audioContext.createBufferSource();
                  audioSource.buffer = buffer;
                  audioSource.connect(gainNode);
                  gainNode.connect(audioContext.destination);
                  audioSource.start(0);
                  audioSource.onended = () => {
                    stopAudioPlayback();
                    setButtonsState(false); // Only disable stop button after playback ends
                  };
                },
                (err) => {
                  updateStatus("Error decoding audio: " + err, "error");
                  stopAudioPlayback();
                  setButtonsState(false); // Disable stop button on error
                }
              );
            } catch (e) {
              updateStatus("Audio playback error: " + e, "error");
              stopAudioPlayback();
              setButtonsState(false); // Disable stop button on error
            }
          } else {
            setButtonsState(false); // No audio data, disable stop button
          }
          updateStatus("Synthesis finished.", "success");
        } else {
          const cancellation = SpeechSDK.CancellationDetails.fromResult(result);
          if (cancellation.reason === SpeechSDK.CancellationReason.Error) {
            updateStatus(
              `Synthesis error: ${cancellation.errorDetails}. SSML: ${ssml}`,
              "error"
            );
          } else {
            updateStatus(
              `Synthesis cancelled: ${cancellation.reason}.`,
              "error"
            );
          }
          setButtonsState(false); // On error/cancel, disable stop button
        }
      },
      (error) => {
        updateStatus(`An unexpected error occurred: ${error}`, "error");
        setButtonsState(false);
      }
    );
  });

  // Stop Synthesis button click handler
  stopButton.addEventListener("click", () => {
    stopAudioPlayback();
    setButtonsState(false);
    updateStatus("Playback stopped.", "info");
  });

  // Volume slider event
  volumeSlider.addEventListener("input", () => {
    if (gainNode) {
      gainNode.gain.value = parseFloat(volumeSlider.value);
    }
  });

  // Initial state for buttons
  setButtonsState(false);

  // Set a default text to make it easy to test
  textInput.value =
    "Oh my good Heather, I can't believe you did that! You are so amazing and I love you so much. You are the best thing that has ever happened to me. I am so grateful for you and everything you do for me. You make my life so much better and i can't imagine living without you. You are my everything and I love you more than words can say.";
};
