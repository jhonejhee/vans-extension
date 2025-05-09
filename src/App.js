import React, { useState, useEffect, useRef } from 'react';
import { allCommands, executeCommand } from './commandFunctions';
import './App.css';

function App() {
  const [transcript, setTranscript] = useState('');
  const [volume, setVolume] = useState(0);
  const [commands, setCommands] = useState([]);
  const [activeTab, setActiveTab] = useState('voice');
  const [commandSearch, setCommandSearch] = useState('');

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
        }, 2000); // Delay of 1.5s before finalizing
      }    
    };

    recognitionRef.current.onspeechend = () => {
        console.log("Speech has stopped being detected. Restarting...");
        recognitionRef.current.stop();
        setTimeout(() => recognitionRef.current.start(), 500);
    };
    
    recognitionRef.current.onend = () => {
        // console.log("Recognition service disconnected. Restarting...");
        // setTimeout(() => recognitionRef.current.start(), 500);
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

        // Expose recognitionRef globally for commandFunctions.js
        window.recognitionRef = recognitionRef;

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
    <div className="vans-app">
      <div className="vans-container">
        <header className="vans-header">
          <h1 className="vans-title">VANS: Voice-Activated Navigation System</h1>
          <h3 className="vans-subtitle">
            Control your navigation with simple voice commands. Speak naturally and watch the system respond.
          </h3>
        </header>

        <div className="vans-main">
          <div className="vans-control-panel">
            <div className="vans-control-header">
              <h2>Voice Control Panel</h2>
              <p>Use voice commands to control your browser.</p>
            </div>
            <div className="vans-tabs">
              <button
                className={`vans-tab${activeTab === 'voice' ? ' active' : ''}`}
                onClick={() => setActiveTab('voice')}
              >
                Voice Input
              </button>
              <button
                className={`vans-tab${activeTab === 'commands' ? ' active' : ''}`}
                onClick={() => setActiveTab('commands')}
              >
                Available Commands
              </button>
            </div>

            <div className="vans-tab-content">
              {activeTab === 'voice' && (
                <div className="vans-voice-tab">
                  {/* <label htmlFor="microphone-select">Select Microphone</label> */}
                  {/* <select id="microphone-select" className="vans-microphone-select">
                    <option>Microphone (Default)</option>
                    <option>Microphone (External)</option>
                  </select> */}

                  <label>Microphone Volume</label>
                  <div className="vans-volume-bar">
                    <div
                      className="vans-volume-level"
                      style={{ width: `${volume}%` }}
                    ></div>
                  </div>

                  
                </div>
              )}

              {activeTab === 'commands' && (
                <div className="vans-commands-tab">
                  <input
                    type="text"
                    className="vans-command-search"
                    placeholder="Search commands..."
                    onChange={(e) => setCommandSearch(e.target.value.toLowerCase())} // Add search functionality
                  />
                  <div className="vans-command-list">
                    {allCommands
                      .filter((cmd) =>
                        cmd.name.toLowerCase().includes(commandSearch) || // Filter by name
                        cmd.description.toLowerCase().includes(commandSearch) // Filter by description
                      )
                      .map((cmd, index) => (
                        <div key={index} className="vans-command-item">
                          <h4>{cmd.name}</h4>
                          <p>{cmd.description}</p>
                          <span className={`vans-command-tag ${cmd.name.toLowerCase().replace(/\s+/g, '-')}`}>
                            {cmd.command}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="vans-recognition-panel">
            <div className="vans-control-header">
              <h2>Recognition Status</h2>
              <p>Real-time transcription and status.</p>
            </div>
            <div className="vans-transcription">
              <h4>Current Transcription</h4>
              <textarea
                className="vans-transcription-box"
                value={transcript || ''}
                readOnly
              ></textarea>
            </div>
            <div className="vans-last-command">
              <h4>Last Recognized Commands</h4>
              {commands.length > 0 ? (
                <ul className="vans-command-history">
                  {commands.map((cmd, index) => (
                    <li
                      key={index}
                      className={`vans-command-history-item ${
                        allCommands.some(c => cmd.toLowerCase().startsWith(c.command.toLowerCase())) ? '' : 'unrecognized'
                      }`}
                    >
                    {cmd}
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No commands recognized yet</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;