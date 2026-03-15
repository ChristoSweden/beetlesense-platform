import { useState, useRef, useCallback, useEffect } from 'react';
import { Mic, MicOff } from 'lucide-react';

interface VoiceInputProps {
  onTranscript: (text: string) => void;
  disabled?: boolean;
}

interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent {
  error: string;
  message: string;
}

export function VoiceInput({ onTranscript, disabled = false }: VoiceInputProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isSupported, setIsSupported] = useState(true);
  const recognitionRef = useRef<unknown>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    const SpeechRecognition =
      (window as unknown as Record<string, unknown>).SpeechRecognition ||
      (window as unknown as Record<string, unknown>).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setIsSupported(false);
    }

    return () => {
      stopRecording();
    };
  }, []);

  const stopRecording = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
    }
    const recognition = recognitionRef.current as { stop?: () => void } | null;
    if (recognition?.stop) {
      recognition.stop();
    }
    recognitionRef.current = null;
    setIsRecording(false);
  }, []);

  const startRecording = useCallback(() => {
    const SpeechRecognition =
      (window as unknown as Record<string, unknown>).SpeechRecognition ||
      (window as unknown as Record<string, unknown>).webkitSpeechRecognition;

    if (!SpeechRecognition) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recognition = new (SpeechRecognition as any)();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    let finalTranscript = '';

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript + ' ';
        } else {
          interim += result[0].transcript;
        }
      }
      setTranscript(finalTranscript + interim);

      // Reset silence timer
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }
      silenceTimerRef.current = setTimeout(() => {
        stopRecording();
        if (finalTranscript.trim()) {
          onTranscript(finalTranscript.trim());
        }
      }, 10000); // 10s silence timeout
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.warn('Speech recognition error:', event.error);
      stopRecording();
    };

    recognition.onend = () => {
      setIsRecording(false);
      if (finalTranscript.trim()) {
        onTranscript(finalTranscript.trim());
      }
      setTranscript('');
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
    setTranscript('');

    // Set initial silence timeout
    silenceTimerRef.current = setTimeout(() => {
      stopRecording();
    }, 10000);
  }, [onTranscript, stopRecording]);

  const toggleRecording = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  if (!isSupported) {
    return (
      <button
        disabled
        className="p-2 rounded-lg text-[var(--text3)] cursor-not-allowed opacity-50"
        title="Voice input not supported in this browser"
      >
        <MicOff size={18} />
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={toggleRecording}
        disabled={disabled}
        className={`p-2 rounded-lg transition-colors ${
          isRecording
            ? 'text-[var(--green)] bg-[var(--green)]/10 animate-pulse'
            : 'text-[var(--text3)] hover:text-[var(--green)] hover:bg-[var(--bg3)]'
        } disabled:opacity-50 disabled:cursor-not-allowed`}
        title={isRecording ? 'Stop recording' : 'Start voice input'}
      >
        <Mic size={18} />
      </button>

      {/* Live transcript popup */}
      {isRecording && transcript && (
        <div className="absolute bottom-full right-0 mb-2 w-64 p-3 rounded-xl border border-[var(--border)] bg-[var(--bg2)] shadow-xl">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-danger animate-pulse" />
            <span className="text-[10px] font-semibold text-[var(--text3)] uppercase tracking-wider">
              Listening...
            </span>
          </div>
          <p className="text-xs text-[var(--text2)] leading-relaxed">{transcript}</p>
        </div>
      )}
    </div>
  );
}
