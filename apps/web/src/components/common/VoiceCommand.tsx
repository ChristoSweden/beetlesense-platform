import React, { useState, useRef, useEffect } from 'react';
import { Mic } from 'lucide-react';

type SpeechRecognitionType = typeof window.webkitSpeechRecognition;

interface Command {
  keywords: string[];
  action: () => void;
  label: string;
}

export const VoiceCommand: React.FC = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<InstanceType<SpeechRecognitionType> | null>(null);

  useEffect(() => {
    // Initialize speech recognition
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError('Speech recognition not supported in this browser');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'sv-SE'; // Swedish first, will handle English fallback

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript.toLowerCase();
        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' ';
        } else {
          interimTranscript += transcript;
        }
      }

      const displayText = finalTranscript || interimTranscript;
      setTranscript(displayText);

      // Process final transcript
      if (finalTranscript) {
        processCommand(finalTranscript.trim());
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      setError(`Error: ${event.error}`);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
      setTimeout(() => setTranscript(''), 2000);
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  const commands: Command[] = [
    {
      keywords: ['visa brand', 'show fire', 'fire risk'],
      action: () => {
        const fireSection = document.getElementById('fire-risk');
        if (fireSection) fireSection.scrollIntoView({ behavior: 'smooth' });
      },
      label: 'Fire Risk',
    },
    {
      keywords: ['visa barkborrar', 'show beetles', 'beetle'],
      action: () => {
        const beetleSection = document.getElementById('beetle-data');
        if (beetleSection) beetleSection.scrollIntoView({ behavior: 'smooth' });
      },
      label: 'Beetle Data',
    },
    {
      keywords: ['visa väder', 'show weather', 'weather'],
      action: () => {
        const weatherSection = document.getElementById('weather-section');
        if (weatherSection) weatherSection.scrollIntoView({ behavior: 'smooth' });
      },
      label: 'Weather',
    },
    {
      keywords: ['beräkna kol', 'calculate carbon', 'carbon calculator'],
      action: () => {
        const carbonSection = document.getElementById('carbon-calculator');
        if (carbonSection) carbonSection.scrollIntoView({ behavior: 'smooth' });
      },
      label: 'Carbon Calculator',
    },
    {
      keywords: ['visa karta', 'show map', 'threat map'],
      action: () => {
        const mapSection = document.getElementById('threat-map');
        if (mapSection) mapSection.scrollIntoView({ behavior: 'smooth' });
      },
      label: 'Threat Map',
    },
  ];

  const processCommand = (text: string) => {
    for (const command of commands) {
      for (const keyword of command.keywords) {
        if (text.includes(keyword)) {
          command.action();
          return;
        }
      }
    }
  };

  const toggleListening = () => {
    if (!recognitionRef.current) return;

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setTranscript('');
    }
  };

  if (error && error.includes('not supported')) {
    return null; // Don't render if not supported
  }

  return (
    <div className="fixed bottom-6 left-6 z-40 flex flex-col gap-2">
      {/* Transcript Display */}
      {(isListening || transcript) && (
        <div
          className={`
            px-4 py-2 rounded-lg border text-xs text-[var(--text)]
            bg-[var(--bg2)] border-[var(--border)]
            max-w-xs animate-in fade-in
          `}
        >
          {isListening && <span className="inline-block mr-2">Listening...</span>}
          {transcript && <span>{transcript}</span>}
        </div>
      )}

      {/* Mic Button */}
      <button
        onClick={toggleListening}
        className={`
          flex items-center justify-center w-12 h-12 rounded-full
          transition-all duration-200 shadow-lg
          ${
            isListening
              ? 'bg-blue-500 scale-110 ring-2 ring-blue-400'
              : 'bg-[var(--bg2)] border border-[var(--border)] hover:bg-[var(--bg3)]'
          }
        `}
        aria-label="Voice Command"
        title="Voice Command (click to listen)"
      >
        {isListening ? (
          <Mic size={20} className="text-white animate-pulse" />
        ) : (
          <Mic size={20} className="text-[var(--text)]" />
        )}
      </button>

      {/* Voice Commands Help (visible on hover) */}
      <div
        className={`
          absolute bottom-full left-0 mb-2 p-3 rounded-lg
          bg-[var(--bg2)] border border-[var(--border)]
          text-xs text-[var(--text2)] leading-relaxed
          opacity-0 hover:opacity-100 transition-opacity
          pointer-events-none hover:pointer-events-auto
          w-48
        `}
      >
        <p className="font-semibold text-[var(--text)] mb-2">Voice commands:</p>
        <ul className="space-y-1">
          <li>• "Show fire"</li>
          <li>• "Show beetles"</li>
          <li>• "Show weather"</li>
          <li>• "Calculate carbon"</li>
          <li>• "Show map"</li>
        </ul>
      </div>
    </div>
  );
};

export default VoiceCommand;
