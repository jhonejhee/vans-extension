import React, { useState, useEffect, useRef, useCallback } from 'react';
import { allCommands, executeCommand, speakText } from './commandFunctions';
import './App.css';

function App() {
  const [transcript, setTranscript] = useState('');
  const [volume, setVolume] = useState(0);
  const [commands, setCommands] = useState([]);
  const [activeTab, setActiveTab] = useState('voice');
  const [commandSearch, setCommandSearch] = useState('');
  const [isListening, setIsListening] = useState(false);

  const recognitionRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const isListeningRef = useRef(false);

  const hasRecognizableWords = (text) => {
    const englishWords = text.match(/\b\w+\b/g);
    return englishWords && englishWords.length > 0;
  };

  const handleSpeechResult = useCallback((event) => {
    const transcript = Array.from(event.results)
      .map((result) => result[0].transcript)
      .join('');

    const lastResultIndex = event.results.length - 1;
    const lastResult = event.results[lastResultIndex];

    setTranscript(transcript);
    console.log("Transcript:", transcript);
    console.log("Last Result:", lastResult, "Is Final:", lastResult.isFinal);

    if (lastResult.isFinal) {
      const recognizedText = lastResult[0].transcript.trim().toLowerCase();
      console.log("Recognized Text:", recognizedText);
      console.log("Current isListening state:", isListeningRef.current);

      if (!isListeningRef.current) {
        if (recognizedText === 'vans') {
          isListeningRef.current = true;
          setIsListening(true);
          console.log("Wake word detected. Listening for commands...");
          speakText('Listening');
        } else {
          console.log("Wake word not detected. Continuing to listen...");
        }
      } else {
        if (hasRecognizableWords(recognizedText)) {
          console.log("Command detected:", recognizedText);
          setCommands((prevCommands) => [...prevCommands, recognizedText]);
          executeCommand(recognizedText);
          isListeningRef.current = false;
          setIsListening(false);
          console.log("Command executed. Resetting listening state.");
        }
      }
    }
  }, []);

  const initializeSpeechRecognition = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser.');
      return;
    }

    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous = false;
    recognitionRef.current.interimResults = false;
    recognitionRef.current.maxAlternatives = 1;
    recognitionRef.current.lang = 'en-US';

    recognitionRef.current.onresult = handleSpeechResult;

    recognitionRef.current.onspeechend = () => {
      console.log('Speech has stopped being detected. Restarting...');
      recognitionRef.current.stop();

      setTimeout(() => {
        if (recognitionRef.current && recognitionRef.current.state !== 'running') {
          console.log("Restarting speech recognition...");
          console.log("Current listening state:", isListeningRef.current);
          recognitionRef.current.start();
        }
      }, 1000);
    };

    recognitionRef.current.onend = () => {
      // console.log("Recognition service disconnected. Restarting...");
    };

    recognitionRef.current.onerror = (event) => {
      console.error('Speech recognition error detected: ' + event.error);
      if (event.error === 'no-speech') {
        console.log('No speech detected. Restarting...');
        if (recognitionRef.current && recognitionRef.current.state !== 'running') {
          setTimeout(() => recognitionRef.current.start(), 500);
        }
      }
    };
  }, [handleSpeechResult]);

  const initializeAudioContext = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      analyserRef.current = audioContextRef.current.createAnalyser();
      const source = audioContextRef.current.createMediaStreamSource(stream);

      const noiseGate = audioContextRef.current.createGain();
      const threshold = -50;
      const attackTime = 0.02;
      const releaseTime = 0.05;

      source.connect(noiseGate);
      noiseGate.connect(analyserRef.current);

      const bufferSize = 2048;
      const noiseProcessor = audioContextRef.current.createScriptProcessor(bufferSize, 1, 1);
      noiseProcessor.onaudioprocess = function(e) {
        const inputData = e.inputBuffer.getChannelData(0);
        const outputData = e.outputBuffer.getChannelData(0);
        
        let rms = 0;
        for (let i = 0; i < inputData.length; i++) {
          rms += inputData[i] * inputData[i];
        }
        rms = Math.sqrt(rms / inputData.length);
        const db = 20 * Math.log10(rms);
        
        const gain = db < threshold ? 0 : 1;
        noiseGate.gain.setTargetAtTime(
          gain,
          audioContextRef.current.currentTime,
          gain === 0 ? releaseTime : attackTime
        );
        
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

  useEffect(() => {
    const initialize = async () => {
        await initializeAudioContext();
        initializeSpeechRecognition();

        window.recognitionRef = recognitionRef;

        if (recognitionRef.current) {
            recognitionRef.current.start();
        }
    };

    initialize();

    return () => {
        if (recognitionRef.current) {
            recognitionRef.current.stop();
        }
        if (audioContextRef.current) {
            audioContextRef.current.close();
        }
    };
  }, [initializeSpeechRecognition]);

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
                    onChange={(e) => setCommandSearch(e.target.value.toLowerCase())}
                  />
                  <div className="vans-command-list">
                    {allCommands
                      .filter((cmd) =>
                        cmd.name.toLowerCase().includes(commandSearch) ||
                        cmd.description.toLowerCase().includes(commandSearch)
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