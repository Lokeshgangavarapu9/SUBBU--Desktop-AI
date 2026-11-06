import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Square,
  Play,
  Pause,
  Send,
  Volume2,
  VolumeX,
  Radio,
  Sliders,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { useSubbuStore } from '../../store/useSubbuStore';
import { GlassButton } from '../ui/GlassButton';

export const VoiceDrawer: React.FC = () => {
  const adapter = useSubbuStore((state) => state.adapter);
  const activeAgentId = useSubbuStore((state) => state.activeAgentId);
  const currentModelName = useSubbuStore((state) => state.currentModelName);
  const activeSessionId = useSubbuStore((state) => state.activeSessionId);
  const [isVoiceMuted, setIsVoiceMuted] = useState(false);

  const [isRecording, setIsRecording] = useState(false);
  const [recordDuration, setRecordDuration] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [hasSpeechRecognition, setHasSpeechRecognition] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Ready to listen');

  // TTS Voice Controls
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceUri, setSelectedVoiceUri] = useState<string>('');
  const [speechRate, setSpeechRate] = useState(1.0);
  const [speechPitch, setSpeechPitch] = useState(1.0);
  const [isSpeakingTest, setIsSpeakingTest] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<number | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);

  // Initialize Speech Recognition & TTS voices
  useEffect(() => {
    const SpeechRec =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRec) {
      setHasSpeechRecognition(true);
      try {
        const rec = new SpeechRec();
        rec.continuous = true;
        rec.interimResults = true;
        rec.lang = 'en-US';

        rec.onresult = (event: any) => {
          let text = '';
          for (let i = 0; i < event.results.length; i++) {
            text += event.results[i][0].transcript + ' ';
          }
          setTranscript(text.trim());
        };

        rec.onerror = (e: any) => {
          console.warn('Speech recognition error:', e.error);
        };

        recognitionRef.current = rec;
      } catch (e) {
        console.warn('Speech recognition init failed:', e);
      }
    }

    // Load available voices
    if ('speechSynthesis' in window) {
      const loadVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        setAvailableVoices(voices);
        if (voices.length > 0 && !selectedVoiceUri) {
          // Default to an English voice or the first voice
          const preferred =
            voices.find((v) => v.name.includes('Natural') || v.name.includes('Zira') || v.name.includes('Jenny')) ||
            voices.find((v) => v.lang.startsWith('en')) ||
            voices[0];
          if (preferred) setSelectedVoiceUri(preferred.voiceURI);
        }
      };

      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    return () => {
      stopRecording();
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (_) {}
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, []);

  // Duration timer
  useEffect(() => {
    if (isRecording) {
      timerRef.current = window.setInterval(() => {
        setRecordDuration((d) => d + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setRecordDuration(0);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording]);

  const startRecording = async () => {
    try {
      setStatusMessage('Requesting microphone access...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setStatusMessage('Listening...');
      setIsRecording(true);

      // Web Audio API for visual meter
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const updateMeter = () => {
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        setAudioLevel(Math.min(100, Math.round((avg / 128) * 100)));
        animFrameRef.current = requestAnimationFrame(updateMeter);
      };
      updateMeter();

      // MediaRecorder for audio playback
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        if (audioUrl) URL.revokeObjectURL(audioUrl);
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();

      // Start recognition if available
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch (_) {}
      }
    } catch (err: any) {
      console.error('Microphone error:', err);
      setStatusMessage(`Microphone unavailable: ${err.message || 'Permission denied'}`);
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (!isRecording) return;
    setIsRecording(false);
    setStatusMessage('Recording finished');

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (_) {}
    }

    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
    }
    setAudioLevel(0);
  };

  const handleToggleAudioPlay = () => {
    if (!audioUrl) return;
    if (!audioElementRef.current) {
      audioElementRef.current = new Audio(audioUrl);
      audioElementRef.current.onended = () => setIsPlayingAudio(false);
    }

    if (isPlayingAudio) {
      audioElementRef.current.pause();
      setIsPlayingAudio(false);
    } else {
      audioElementRef.current.src = audioUrl;
      audioElementRef.current.play();
      setIsPlayingAudio(true);
    }
  };

  const handleSendTranscript = async () => {
    const text = transcript.trim();
    if (!text) return;

    setStatusMessage('Sending prompt to Subbu...');
    const promptToSend = text;
    setTranscript('');
    setAudioUrl(null);

    const userMsgId = `user-${Date.now()}`;
    const assistantMsgId = `assistant-${Date.now()}`;
    useSubbuStore.getState().addMessage({
      id: userMsgId,
      sessionId: activeSessionId,
      role: 'user',
      content: promptToSend,
      timestamp: Date.now(),
    });
    useSubbuStore.getState().addMessage({
      id: assistantMsgId,
      sessionId: activeSessionId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      streaming: true,
    });

    await adapter.sendMessage(
      promptToSend,
      activeSessionId,
      (_delta, fullText, emotion, thought) => {
        useSubbuStore.getState().updateMessage(assistantMsgId, { content: fullText, emotion, thought });
      },
      (finalText, emotion) => {
        useSubbuStore.getState().updateMessage(assistantMsgId, { content: finalText, emotion, streaming: false });
        if (!isVoiceMuted) {
          adapter.voice.speak(finalText);
        }
      },
      (err) => {
        useSubbuStore.getState().updateMessage(assistantMsgId, {
          content: `Error: ${err.message || 'Generation failed'}`,
          streaming: false,
        });
      },
      {
        model: currentModelName,
        agentId: activeAgentId,
        history: useSubbuStore.getState().messages,
      }
    );
    setStatusMessage('Prompt delivered');
  };

  const handleTestTTS = () => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();

    if (isSpeakingTest) {
      setIsSpeakingTest(false);
      return;
    }

    const testUtterance = new SpeechSynthesisUtterance(
      'Hello! I am Subbu, your personal AI assistant. My voice is ready and synchronized.'
    );
    testUtterance.rate = speechRate;
    testUtterance.pitch = speechPitch;

    const matchedVoice = availableVoices.find((v) => v.voiceURI === selectedVoiceUri);
    if (matchedVoice) {
      testUtterance.voice = matchedVoice;
    }

    testUtterance.onstart = () => setIsSpeakingTest(true);
    testUtterance.onend = () => setIsSpeakingTest(false);
    testUtterance.onerror = () => setIsSpeakingTest(false);

    window.speechSynthesis.speak(testUtterance);
  };

  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 64);
    const s = sec % 64;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col h-full gap-4 text-ink-primary">
      {/* Studio Banner / Status */}
      <div className="p-3 rounded-2xl bg-sakura-50/70 border border-sakura-200/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Radio className={`w-4 h-4 ${isRecording ? 'text-rose-500 animate-pulse' : 'text-sakura-600'}`} />
          <div>
            <p className="text-xs font-semibold text-ink-primary">Voice Studio Engine</p>
            <p className="text-[10px] text-ink-muted">{statusMessage}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setIsVoiceMuted(!isVoiceMuted)}
            title={isVoiceMuted ? 'Voice is muted' : 'Voice is unmuted'}
            className={`p-1.5 rounded-lg border text-xs flex items-center gap-1 cursor-pointer transition-colors ${
              isVoiceMuted
                ? 'bg-rose-50 border-rose-200 text-rose-600'
                : 'bg-emerald-50 border-emerald-200 text-emerald-700'
            }`}
          >
            {isVoiceMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            <span className="text-[10px] font-medium">{isVoiceMuted ? 'Muted' : 'Sound On'}</span>
          </button>
        </div>
      </div>

      {/* Recording Control Hub */}
      <div className="flex flex-col items-center justify-center p-5 rounded-2xl bg-white/70 border border-white/90 shadow-sm gap-3">
        <div className="relative">
          {/* Animated sound ripple */}
          {isRecording && (
            <div
              className="absolute inset-0 rounded-full bg-rose-400/20 animate-ping"
              style={{ transform: `scale(${1 + audioLevel / 100})` }}
            />
          )}

          <button
            onClick={isRecording ? stopRecording : startRecording}
            className={`relative w-16 h-16 rounded-full flex items-center justify-center shadow-md transition-all cursor-pointer ${
              isRecording
                ? 'bg-rose-500 hover:bg-rose-600 text-white ring-4 ring-rose-200'
                : 'bg-gradient-to-tr from-sakura-400 to-sakura-500 hover:from-sakura-500 hover:to-sakura-600 text-white shadow-sakura-200/50'
            }`}
          >
            {isRecording ? <Square className="w-6 h-6 fill-current" /> : <Mic className="w-7 h-7" />}
          </button>
        </div>

        <div className="text-center">
          <p className="text-sm font-mono font-semibold text-ink-primary">
            {isRecording ? formatDuration(recordDuration) : '00:00'}
          </p>
          <p className="text-[11px] text-ink-muted">
            {isRecording ? 'Recording microphone...' : 'Click microphone to begin speaking'}
          </p>
        </div>

        {/* Audio Level Waveform Bar */}
        <div className="w-full max-w-[240px] flex items-center gap-2">
          <div className="flex-1 h-2 bg-sakura-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-sakura-500 transition-all duration-75 rounded-full"
              style={{ width: `${audioLevel}%` }}
            />
          </div>
          <span className="text-[10px] font-mono text-ink-muted w-7 text-right">{audioLevel}%</span>
        </div>

        {/* Recorded Audio Playback */}
        {audioUrl && !isRecording && (
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={handleToggleAudioPlay}
              className="px-3 py-1 bg-sakura-100 hover:bg-sakura-200 text-sakura-800 rounded-full text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              {isPlayingAudio ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{isPlayingAudio ? 'Pause Take' : 'Play Take'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Real-time Editable Transcript */}
      <div className="flex flex-col gap-1.5 flex-1">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-ink-secondary flex items-center gap-1">
            <span>Voice Transcript</span>
            {hasSpeechRecognition ? (
              <span className="text-[10px] text-emerald-600 font-normal flex items-center gap-0.5">
                <CheckCircle2 className="w-3 h-3" /> Live STT Active
              </span>
            ) : (
              <span className="text-[10px] text-amber-600 font-normal flex items-center gap-0.5">
                <AlertCircle className="w-3 h-3" /> Manual / Native Mode
              </span>
            )}
          </label>
        </div>

        <textarea
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          placeholder={
            hasSpeechRecognition
              ? 'Transcribed speech will appear here in real time. You can edit before sending.'
              : 'Speech recognition engine in WebView2 can be typed or pasted here, or dictated with Windows Speech.'
          }
          className="w-full flex-1 min-h-[90px] p-3 text-xs font-sans rounded-xl bg-white/70 border border-white/90 text-ink-primary placeholder-ink-muted focus:outline-hidden focus:ring-1 focus:ring-sakura-400 resize-none shadow-inner"
        />

        <div className="flex justify-end pt-1">
          <GlassButton
            size="sm"
            variant="primary"
            onClick={handleSendTranscript}
            disabled={!transcript.trim()}
          >
            <Send className="w-3.5 h-3.5" />
            <span>Send to Subbu</span>
          </GlassButton>
        </div>
      </div>

      {/* Voice Synthesis Settings */}
      <div className="p-3 rounded-2xl bg-white/60 border border-white/80 flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-ink-secondary flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-sakura-600" />
            Speech Synthesis (TTS)
          </span>
          <button
            onClick={handleTestTTS}
            className="text-[11px] text-sakura-700 hover:text-sakura-900 font-medium underline cursor-pointer"
          >
            {isSpeakingTest ? 'Stop Voice' : 'Test Subbu Voice'}
          </button>
        </div>

        {availableVoices.length > 0 && (
          <select
            value={selectedVoiceUri}
            onChange={(e) => setSelectedVoiceUri(e.target.value)}
            className="text-xs bg-white/80 border border-sakura-200/50 rounded-lg p-1.5 text-ink-primary outline-hidden"
          >
            {availableVoices.map((v) => (
              <option key={v.voiceURI} value={v.voiceURI}>
                {v.name} ({v.lang})
              </option>
            ))}
          </select>
        )}

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <div className="flex justify-between text-[11px] text-ink-muted mb-0.5">
              <span>Speed</span>
              <span>{speechRate.toFixed(1)}x</span>
            </div>
            <input
              type="range"
              min="0.7"
              max="1.5"
              step="0.1"
              value={speechRate}
              onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
              className="w-full accent-sakura-500 cursor-pointer"
            />
          </div>
          <div>
            <div className="flex justify-between text-[11px] text-ink-muted mb-0.5">
              <span>Pitch</span>
              <span>{speechPitch.toFixed(1)}</span>
            </div>
            <input
              type="range"
              min="0.8"
              max="1.3"
              step="0.1"
              value={speechPitch}
              onChange={(e) => setSpeechPitch(parseFloat(e.target.value))}
              className="w-full accent-sakura-500 cursor-pointer"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
