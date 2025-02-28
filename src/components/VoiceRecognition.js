import { useEffect, useState } from 'react';

const VoiceRecognition = ({ onCommand }) => {
  const [listening, setListening] = useState(false);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Your browser does not support speech recognition.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);

    recognition.onresult = (event) => {
      const transcript = event.results[event.results.length - 1][0].transcript;
      if (transcript.toLowerCase().includes("hey vans")) {
        const command = transcript.toLowerCase().replace("hey vans", "").trim();
        onCommand(command);
      }
    };

    recognition.start();

    return () => recognition.stop();
  }, [onCommand]);

  return <div>{listening ? "Listening..." : "Voice recognition stopped"}</div>;
};

export default VoiceRecognition;