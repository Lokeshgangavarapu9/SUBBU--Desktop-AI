import { MicMode, VoiceState, VoiceSettings } from '../../types/voice';
import { sanitizeTextForTTS } from '../../utils/ttsSanitizer';

type VoiceStateCallback = (state: VoiceState) => void;
type WaveformCallback = (frequencyData: Uint8Array, rms: number) => void;
type SpeechTranscriptCallback = (text: string, isFinal: boolean) => void;

export class VoiceManager {
  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private mediaStream: MediaStream | null = null;
  private animFrameId: number | null = null;
  private recognition: any = null; // Browser SpeechRecognition if available
  private state: VoiceState = 'idle';
  private mode: MicMode = 'dictation';
  private vadActive = false;
  private silenceTimer: NodeJS.Timeout | null = null;
  private isSpeakingAudio = false;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private onStateChange: VoiceStateCallback | null = null;
  private onWaveform: WaveformCallback | null = null;
  private onTranscript: SpeechTranscriptCallback | null = null;
  private onBargeIn: (() => void) | null = null;

  constructor() {
    this.initSpeechRecognition();
  }

  public setCallbacks(
    onStateChange: VoiceStateCallback,
    onWaveform: WaveformCallback,
    onTranscript: SpeechTranscriptCallback,
    onBargeIn: () => void
  ) {
    this.onStateChange = onStateChange;
    this.onWaveform = onWaveform;
    this.onTranscript = onTranscript;
    this.onBargeIn = onBargeIn;
  }

  public setMode(mode: MicMode) {
    this.mode = mode;
  }

  public getState(): VoiceState {
    return this.state;
  }

  private setState(newState: VoiceState) {
    if (this.state !== newState) {
      this.state = newState;
      this.onStateChange?.(newState);
    }
  }

  private initSpeechRecognition() {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      try {
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = 'en-US';

        this.recognition.onresult = (ev: any) => {
          let interim = '';
          let final = '';
          for (let i = ev.resultIndex; i < ev.results.length; ++i) {
            if (ev.results[i].isFinal) {
              final += ev.results[i][0].transcript;
            } else {
              interim += ev.results[i][0].transcript;
            }
          }

          if (final.trim()) {
            this.onTranscript?.(final.trim(), true);
          } else if (interim.trim()) {
            this.onTranscript?.(interim.trim(), false);
          }
        };

        this.recognition.onerror = (ev: any) => {
          console.warn('[VoiceManager] Speech recognition error:', ev.error);
        };
      } catch (e) {
        console.warn('[VoiceManager] Speech recognition init failed:', e);
      }
    }
  }

  public async startListening(): Promise<boolean> {
    try {
      if (!this.mediaStream) {
        this.mediaStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
      }

      if (!this.audioCtx) {
        this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      if (this.audioCtx.state === 'suspended') {
        await this.audioCtx.resume();
      }

      const source = this.audioCtx.createMediaStreamSource(this.mediaStream);
      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 64; // Produces 32 frequency bins
      this.analyser.smoothingTimeConstant = 0.8;
      source.connect(this.analyser);

      this.setState('listening');
      this.startWaveformLoop();

      if (this.recognition) {
        try {
          this.recognition.start();
        } catch (e) {
          // May already be running
        }
      }

      return true;
    } catch (err: any) {
      console.error('[VoiceManager] Failed to access mic:', err);
      this.setState('error');
      return false;
    }
  }

  public stopListening(): void {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }

    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (e) {}
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }

    if (this.audioCtx) {
      this.audioCtx.close();
      this.audioCtx = null;
    }

    if (this.state === 'listening') {
      this.setState('idle');
    }
  }

  private startWaveformLoop(): void {
    if (!this.analyser) return;

    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const check = () => {
      if (!this.analyser) return;
      this.analyser.getByteFrequencyData(dataArray);

      // Calculate root mean square (RMS) energy
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i] * dataArray[i];
      }
      const rms = Math.sqrt(sum / bufferLength) / 255;

      this.onWaveform?.(dataArray, rms);

      // VAD Threshold check
      if (rms > 0.08) {
        // User is speaking
        if (this.isSpeakingAudio) {
          // Barge-in interruption!
          this.stopSpeaking();
          this.onBargeIn?.();
        }

        this.vadActive = true;
        if (this.silenceTimer) {
          clearTimeout(this.silenceTimer);
          this.silenceTimer = null;
        }
      } else if (this.vadActive && !this.silenceTimer) {
        // User stopped speaking -> wait 1.2s silence before transitioning
        this.silenceTimer = setTimeout(() => {
          this.vadActive = false;
          this.silenceTimer = null;
          if (this.mode === 'dictation') {
            this.stopListening();
          }
        }, 1200);
      }

      this.animFrameId = requestAnimationFrame(check);
    };

    check();
  }

  public speak(text: string, onEnd?: () => void): void {
    const cleanText = sanitizeTextForTTS(text);
    if (!cleanText) {
      onEnd?.();
      return;
    }

    this.stopSpeaking();

    if ('speechSynthesis' in window) {
      this.isSpeakingAudio = true;
      this.setState('speaking');

      const utterance = new SpeechSynthesisUtterance(cleanText);
      this.currentUtterance = utterance;

      // Prefer a natural female voice if available
      const voices = window.speechSynthesis.getVoices();
      const preferred = voices.find(
        (v) =>
          v.name.includes('Natural') ||
          v.name.includes('Jenny') ||
          v.name.includes('Aria') ||
          v.name.includes('Female')
      );
      if (preferred) utterance.voice = preferred;

      utterance.rate = 1.05;
      utterance.pitch = 1.05;

      utterance.onend = () => {
        this.isSpeakingAudio = false;
        this.currentUtterance = null;
        this.setState(this.mode === 'continuous' ? 'listening' : 'idle');
        onEnd?.();
      };

      utterance.onerror = () => {
        this.isSpeakingAudio = false;
        this.currentUtterance = null;
        this.setState('idle');
        onEnd?.();
      };

      window.speechSynthesis.speak(utterance);
    } else {
      onEnd?.();
    }
  }

  public stopSpeaking(): void {
    if (this.isSpeakingAudio || window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
      this.isSpeakingAudio = false;
      this.currentUtterance = null;
      this.setState('idle');
    }
  }
}

