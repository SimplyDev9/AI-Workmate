import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Mic, MicOff, Volume2, VolumeX, Trash2, Loader2,
  BrainCircuit, User, AlertCircle, Waves, ShieldAlert,
} from 'lucide-react';
import apiService from '../services/api';
import { isGuardrailBlock } from '../utils/guardrails';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────
const RECORDING_MAX_MS = 60_000;

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

const WaveformBars = ({ active }) => (
  <div className="flex items-end gap-[3px] h-8" aria-hidden="true">
    {Array.from({ length: 9 }).map((_, i) => (
      <div
        key={i}
        className={`w-1.5 rounded-full transition-all ${
          active ? 'bg-indigo-500' : 'bg-gray-300 dark:bg-gray-600'
        }`}
        style={
          active
            ? {
                animation: `voiceBar 0.9s ease-in-out ${i * 0.08}s infinite alternate`,
                height: `${20 + Math.sin(i * 0.9) * 14}px`,
              }
            : { height: '8px' }
        }
      />
    ))}
  </div>
);

const RippleRings = () => (
  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
    {[0, 1, 2].map((i) => (
      <span
        key={i}
        className="absolute rounded-full border-2 border-indigo-400/40"
        style={{
          width: `${88 + i * 36}px`,
          height: `${88 + i * 36}px`,
          animation: `ripple 1.8s ease-out ${i * 0.55}s infinite`,
        }}
      />
    ))}
  </div>
);

/**
 * Single conversation turn bubble.
 * Accepts an optional `isBlocked` flag to render a blocked-message style.
 */
const VoiceBubble = ({ turn }) => {
  const isUser    = turn.role === 'user';
  const isBlocked = turn.isBlocked === true;

  return (
    <div className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      <div
        className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center ${
          isBlocked
            ? 'bg-red-100 dark:bg-red-900/40'
            : isUser
            ? 'bg-gradient-to-br from-indigo-500 to-indigo-600'
            : 'bg-gradient-to-br from-cyan-400 to-cyan-500'
        }`}
      >
        {isBlocked ? (
          <ShieldAlert className="w-4 h-4 text-red-500" />
        ) : isUser ? (
          <User className="w-4 h-4 text-white" />
        ) : (
          <BrainCircuit className="w-4 h-4 text-white" />
        )}
      </div>

      {/* Bubble */}
      <div
        className={`max-w-[72%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap break-words ${
          isBlocked
            ? 'bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 rounded-tl-sm'
            : isUser
            ? 'bg-indigo-600 text-white rounded-tr-sm'
            : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-tl-sm border border-gray-200 dark:border-gray-700'
        }`}
      >
        {isBlocked && (
          <p className="font-semibold text-red-600 dark:text-red-400 mb-1 flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5" />
            Message blocked
          </p>
        )}

        <p>{turn.text}</p>

        {/* Sources */}
        {!isUser && !isBlocked && turn.sources?.length > 0 && (
          <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 border-t border-gray-100 dark:border-gray-700 pt-2">
            <p className="font-semibold mb-1">📄 Sources:</p>
            <ul className="space-y-0.5">
              {turn.sources.map((src, idx) => (
                <li key={idx}>
                  {src.type === 'sharepoint' && src.url ? (
                    <a
                      href={src.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:underline"
                    >
                      {src.name} 🔗
                    </a>
                  ) : (
                    <span>{src.name}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Timestamp */}
        <p className={`mt-1 text-[10px] ${
          isBlocked
            ? 'text-red-400'
            : isUser
            ? 'text-indigo-300'
            : 'text-gray-400 dark:text-gray-500'
        }`}>
          {turn.timestamp}
        </p>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// CSS keyframes injected once
// ─────────────────────────────────────────────────────────────────────────────
const KEYFRAMES = `
@keyframes voiceBar {
  0%   { transform: scaleY(0.4); opacity: 0.7; }
  100% { transform: scaleY(1.2); opacity: 1;   }
}
@keyframes ripple {
  0%   { transform: scale(0.85); opacity: 0.7; }
  100% { transform: scale(1.6);  opacity: 0;   }
}
@keyframes pulseGlow {
  0%, 100% { box-shadow: 0 0 0 0   rgba(99,102,241,0.4); }
  50%       { box-shadow: 0 0 0 14px rgba(99,102,241,0);   }
}
`;

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────
const VoiceAssistantPage = () => {
  const [status, setStatus]     = useState('idle');
  const [turns, setTurns]       = useState([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [isMuted, setIsMuted]   = useState(false);
  const [liveDb, setLiveDb]     = useState(0);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef   = useRef([]);
  const audioElRef       = useRef(new Audio());
  const streamRef        = useRef(null);
  const analyserRef      = useRef(null);
  const rafRef           = useRef(null);
  const maxTimerRef      = useRef(null);
  const bottomRef        = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [turns, status]);

  useEffect(() => {
    const el = document.createElement('style');
    el.innerHTML = KEYFRAMES;
    document.head.appendChild(el);
    return () => el.remove();
  }, []);

  useEffect(() => {
    return () => {
      stopStream();
      cancelAnimationFrame(rafRef.current);
      clearTimeout(maxTimerRef.current);
      audioElRef.current.pause();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  const showError = (msg) => {
    setErrorMsg(msg);
    setStatus('error');
    stopStream();
    cancelAnimationFrame(rafRef.current);
    clearTimeout(maxTimerRef.current);
  };

  const startAnalyser = useCallback((stream) => {
    const ctx      = new (window.AudioContext || window.webkitAudioContext)();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    ctx.createMediaStreamSource(stream).connect(analyser);
    analyserRef.current = analyser;

    const buf = new Uint8Array(analyser.frequencyBinCount);
    const tick = () => {
      analyser.getByteFrequencyData(buf);
      const avg = buf.reduce((a, b) => a + b, 0) / buf.length;
      setLiveDb(Math.min(100, avg * 2));
      rafRef.current = requestAnimationFrame(tick);
    };
    tick();
  }, []);

  const startRecording = async () => {
    setErrorMsg('');
    audioElRef.current.pause();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      startAnalyser(stream);

      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = handleRecordingStop;
      recorder.start(200);
      mediaRecorderRef.current = recorder;
      setStatus('recording');

      maxTimerRef.current = setTimeout(() => {
        if (mediaRecorderRef.current?.state === 'recording') {
          mediaRecorderRef.current.stop();
        }
      }, RECORDING_MAX_MS);
    } catch (err) {
      if (err.name === 'NotAllowedError') {
        showError('Microphone access denied. Please allow microphone permissions.');
      } else {
        showError(`Could not start recording: ${err.message}`);
      }
    }
  };

  const stopRecording = () => {
    clearTimeout(maxTimerRef.current);
    cancelAnimationFrame(rafRef.current);
    setLiveDb(0);
    stopStream();

    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    setStatus('transcribing');
  };

  const handleRecordingStop = async () => {
    const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
    audioChunksRef.current = [];

    if (blob.size < 1000) {
      showError('Recording too short. Please try again.');
      return;
    }

    // 1. Transcribe via backend (Amazon Transcribe)
    setStatus('transcribing');
    const transcribeResult = await apiService.transcribeAudio(blob);

    // ── Guardrail block from transcription endpoint ────────────────────
    if (!transcribeResult.success) {
      if (transcribeResult.isGuardrailBlock) {
        // Build a blocked user turn to show what was said + why it was blocked
        const blockedUserTurn = {
          id:        Date.now(),
          role:      'user',
          text:      transcribeResult.blockedTranscript || '(speech detected)',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };

        const blockedSystemTurn = {
          id:        Date.now() + 1,
          role:      'assistant',
          isBlocked: true,
          text:      transcribeResult.error.replace('CONTENT_BLOCKED: ', '').replace('⚠️ ', ''),
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };

        setTurns((prev) => [...prev, blockedUserTurn, blockedSystemTurn]);
        setStatus('idle');
        return;
      }

      showError(`Transcription failed: ${transcribeResult.error}`);
      return;
    }

    const userText = transcribeResult.data.transcript?.trim();
    if (!userText) {
      showError('Could not detect speech. Please speak clearly and try again.');
      return;
    }

    // Add user turn
    const userTurn = {
      id:        Date.now(),
      role:      'user',
      text:      userText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setTurns((prev) => [...prev, userTurn]);

    // 2. RAG query — server-side guardrails also run here
    setStatus('thinking');
    const chatResult = await apiService.sendMessage(userText);

    if (!chatResult.success) {
      if (isGuardrailBlock(chatResult.error)) {
        // Guardrail blocked the RAG query (edge case — transcription passed but chat blocked)
        const blockedTurn = {
          id:        Date.now() + 1,
          role:      'assistant',
          isBlocked: true,
          text:      chatResult.error.replace('CONTENT_BLOCKED: ', '').replace('⚠️ ', ''),
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setTurns((prev) => [...prev, blockedTurn]);
        setStatus('idle');
      } else {
        showError(`AI error: ${chatResult.error}`);
      }
      return;
    }

    const aiText  = chatResult.data.response;
    const sources = chatResult.data.sources || [];

    const aiTurn = {
      id:        Date.now() + 1,
      role:      'assistant',
      text:      aiText,
      sources,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setTurns((prev) => [...prev, aiTurn]);

    // 3. TTS via backend (Amazon Polly)
    if (!isMuted) {
      setStatus('speaking');
      const ttsResult = await apiService.synthesizeSpeech(aiText);

      if (ttsResult.success && ttsResult.audioUrl) {
        const audio  = audioElRef.current;
        audio.src    = ttsResult.audioUrl;
        audio.onended = () => setStatus('idle');
        audio.onerror = () => setStatus('idle');
        audio.play().catch(() => setStatus('idle'));
      } else {
        setStatus('idle');
      }
    } else {
      setStatus('idle');
    }
  };

  const toggleMute = () => {
    setIsMuted((prev) => {
      const next = !prev;
      audioElRef.current.muted = next;
      return next;
    });
  };

  const stopSpeaking = () => {
    audioElRef.current.pause();
    setStatus('idle');
  };

  const clearHistory = () => {
    audioElRef.current.pause();
    setTurns([]);
    setErrorMsg('');
    setStatus('idle');
  };

  const isRecording = status === 'recording';
  const isBusy      = ['transcribing', 'thinking', 'speaking'].includes(status);
  const canRecord   = status === 'idle' || status === 'error';

  const statusLabels = {
    idle:         'Tap the microphone to speak',
    recording:    'Listening… tap again to stop',
    transcribing: 'Transcribing your voice…',
    thinking:     'Searching knowledge base…',
    speaking:     'Playing response…',
    error:        errorMsg || 'An error occurred',
  };

  const statusColors = {
    idle:         'text-gray-500 dark:text-gray-400',
    recording:    'text-indigo-600 dark:text-indigo-400',
    transcribing: 'text-amber-600 dark:text-amber-400',
    thinking:     'text-cyan-600 dark:text-cyan-400',
    speaking:     'text-green-600 dark:text-green-400',
    error:        'text-red-600 dark:text-red-400',
  };

  const volPct = isRecording ? `${liveDb}%` : '0%';

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">

      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-cyan-400 rounded-lg flex items-center justify-center">
            <Waves className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Voice Assistant
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Speak naturally — powered by your knowledge base
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleMute}
            title={isMuted ? 'Unmute audio' : 'Mute audio'}
            className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            data-testid="voice-mute-toggle"
          >
            {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>

          {status === 'speaking' && (
            <button
              onClick={stopSpeaking}
              className="px-3 py-1.5 text-xs font-medium bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/40 transition-colors"
              data-testid="stop-speaking-button"
            >
              Stop
            </button>
          )}

          {turns.length > 0 && (
            <button
              onClick={clearHistory}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              data-testid="clear-voice-history"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Conversation history */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
        {turns.length === 0 && status !== 'error' && (
          <div className="h-full flex flex-col items-center justify-center gap-4 text-center">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-indigo-500 to-cyan-400 flex items-center justify-center shadow-lg">
              <Mic className="w-10 h-10 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">
                Start a voice conversation
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm">
                Press the microphone button and ask anything related to your
                knowledge base documents.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-2 max-w-lg w-full">
              {[
                '🗂️ "Summarize the Q3 report"',
                '🔍 "What is our refund policy?"',
                '📋 "List recent project updates"',
              ].map((q) => (
                <div
                  key={q}
                  className="px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs text-gray-600 dark:text-gray-400 text-center"
                >
                  {q}
                </div>
              ))}
            </div>
          </div>
        )}

        {turns.map((turn) => (
          <VoiceBubble key={turn.id} turn={turn} />
        ))}

        {isBusy && (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-400 to-cyan-500 flex items-center justify-center flex-shrink-0">
              <Loader2 className="w-4 h-4 text-white animate-spin" />
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-2xl rounded-tl-sm px-4 py-3 border border-gray-200 dark:border-gray-700">
              <p className={`text-sm font-medium ${statusColors[status]}`}>
                {statusLabels[status]}
              </p>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-700 dark:text-red-400">{errorMsg}</p>
              <button
                onClick={() => setStatus('idle')}
                className="mt-1 text-xs text-red-500 hover:underline"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Control panel */}
      <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-6 py-6">
        <div className="flex flex-col items-center gap-4">

          <div className="w-48 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-500 rounded-full transition-all duration-100"
              style={{ width: volPct }}
            />
          </div>

          <WaveformBars active={isRecording} />

          <div className="relative flex items-center justify-center">
            {isRecording && <RippleRings />}

            <button
              onClick={isRecording ? stopRecording : canRecord ? startRecording : undefined}
              disabled={isBusy}
              data-testid="voice-mic-button"
              aria-label={isRecording ? 'Stop recording' : 'Start recording'}
              className={`relative z-10 w-20 h-20 rounded-full flex items-center justify-center shadow-lg transition-all duration-200
                ${isRecording
                  ? 'bg-red-500 hover:bg-red-600 scale-110'
                  : isBusy
                  ? 'bg-gray-300 dark:bg-gray-600 cursor-not-allowed'
                  : 'bg-gradient-to-br from-indigo-500 to-indigo-700 hover:from-indigo-600 hover:to-indigo-800 hover:scale-105 active:scale-95'
                }`}
              style={isRecording ? { animation: 'pulseGlow 1.4s ease-in-out infinite' } : {}}
            >
              {isRecording ? (
                <MicOff className="w-8 h-8 text-white" />
              ) : isBusy ? (
                <Loader2 className="w-8 h-8 text-white animate-spin" />
              ) : (
                <Mic className="w-8 h-8 text-white" />
              )}
            </button>
          </div>

          <p
            className={`text-sm font-medium text-center transition-colors ${statusColors[status]}`}
            data-testid="voice-status-label"
          >
            {statusLabels[status]}
          </p>

          <div className="flex items-center gap-3 flex-wrap justify-center mt-1">
            {[
              { icon: '🎙️', label: 'Amazon Transcribe' },
              { icon: '🛡️', label: 'Guardrails' },
              { icon: '🧠', label: 'Amazon Bedrock RAG' },
              { icon: '🔊', label: 'Amazon Polly' },
            ].map(({ icon, label }) => (
              <span
                key={label}
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full text-xs font-medium"
              >
                {icon} {label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VoiceAssistantPage;