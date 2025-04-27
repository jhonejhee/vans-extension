import React, { useState, useEffect, useRef } from 'react';
import { executeCommand } from './commandFunctions';
import './App.css';

function App() {
  const [transcript, setTranscript] = useState('');
  const [volume, setVolume] = useState(0);
  const [commands, setCommands] = useState([]);

  const recognitionRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);

  // Check if the transcript contains any recognizable English words
  const hasRecognizableWords = (text) => {
    // Simple check for English words (you can expand this logic)
    const englishWords = text.match(/\b\w+\b/g); // Match word-like patterns
    return englishWords && englishWords.length > 0;
  };

  // Initialize SpeechRecognition
  const initializeSpeechRecognition = () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser.');
      return;
    }

    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous = false;
    recognitionRef.current.interimResults = false;
    recognitionRef.current.maxAlternatives = 1
    recognitionRef.current.lang = 'en-US'; // Set language to English

    recognitionRef.current.onresult = (event) => {

      const transcript = Array.from(event.results)
        .map((result) => result[0].transcript)
        .join('');

      const lastResultIndex = event.results.length - 1;
      const lastResult = event.results[lastResultIndex];

      setTranscript(transcript);
      console.log(lastResult, lastResult.isFinal)
       // Only use finalized speech results
       if (lastResult.isFinal) {
        setTimeout(() => {
          const recognizedCommand = lastResult[0].transcript.trim().toLowerCase();
      
          if (hasRecognizableWords(recognizedCommand)) {
            setCommands((prevCommands) => [...prevCommands, recognizedCommand]);
            executeCommand(recognizedCommand);
          }
        }, 1500); // Delay of 1.5s before finalizing
      }    
    };

    recognitionRef.current.onspeechend = () => {
        console.log("Speech has stopped being detected. Restarting...");
        recognitionRef.current.stop();
        setTimeout(() => recognitionRef.current.start(), 500);
    };
    
    recognitionRef.current.onend = () => {
        console.log("Recognition service disconnected. Restarting...");
        setTimeout(() => recognitionRef.current.start(), 500);
    };
    
    recognitionRef.current.onerror = (event) => {
        console.error("Speech recognition error detected: " + event.error);
        if (event.error === 'no-speech') {
            console.log("No speech detected. Restarting...");
            setTimeout(() => recognitionRef.current.start(), 500);
        }
    };
    
  };

  // Initialize audio context and analyser
  const initializeAudioContext = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      analyserRef.current = audioContextRef.current.createAnalyser();
      const source = audioContextRef.current.createMediaStreamSource(stream);

      // Add noise gate
      const noiseGate = audioContextRef.current.createGain();
      const threshold = -50; // Adjust this value based on your needs (-60 to -40 dB is typical)
      const attackTime = 0.02;
      const releaseTime = 0.05;

      source.connect(noiseGate);
      noiseGate.connect(analyserRef.current);

      // Noise gate processing
      const bufferSize = 2048;
      const noiseProcessor = audioContextRef.current.createScriptProcessor(bufferSize, 1, 1);
      noiseProcessor.onaudioprocess = function(e) {
        const inputData = e.inputBuffer.getChannelData(0);
        const outputData = e.outputBuffer.getChannelData(0);
        
        // Calculate RMS (Root Mean Square) value
        let rms = 0;
        for (let i = 0; i < inputData.length; i++) {
          rms += inputData[i] * inputData[i];
        }
        rms = Math.sqrt(rms / inputData.length);
        const db = 20 * Math.log10(rms);
        
        // Apply noise gate
        const gain = db < threshold ? 0 : 1;
        noiseGate.gain.setTargetAtTime(
          gain,
          audioContextRef.current.currentTime,
          gain === 0 ? releaseTime : attackTime
        );
        
        // Copy processed data to output
        for (let i = 0; i < outputData.length; i++) {
          outputData[i] = inputData[i];
        }
      };

      noiseGate.connect(noiseProcessor);
      noiseProcessor.connect(audioContextRef.current.destination);

      analyserRef.current.fftSize = 32;

      const bufferLength = analyserRef.current.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const updateVolume = () => {
        analyserRef.current.getByteFrequencyData(dataArray);
        const averageVolume = dataArray.reduce((sum, value) => sum + value, 0) / bufferLength;
        setVolume(averageVolume);
        requestAnimationFrame(updateVolume);
      };

      updateVolume();
    } catch (err) {
      console.error('Error accessing microphone:', err);
      alert('Failed to access microphone. Please ensure microphone access is allowed.');
    }
  };

  // Initialize microphone and speech recognition when component mounts
  useEffect(() => {
    const initialize = async () => {
      await initializeAudioContext(); // Ensure microphone access
      initializeSpeechRecognition(); // Initialize SpeechRecognition

      // Start speech recognition
      if (recognitionRef.current) {
        recognitionRef.current.start();
      }
    };

    initialize();

    // Cleanup on unmount
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  return (
    <div className="App">
      <h1>VANS Voice-Activated Navigation System</h1>

      {/* Volume Bar */}
      <div className="volume-bar">
        <div
          className="volume-level"
          style={{ width: `${volume}%` }}
        ></div>
      </div>

      {/* Transcript Textbox */}
      <textarea
        className="transcript-box"
        value={transcript}
        readOnly
        placeholder="Speak and your words will appear here..."
      />
      
      {commands.map((command) => (
        <div key={command} className="command">
          {command}
        </div>
      ))}
    </div>
  );
}

export default App;