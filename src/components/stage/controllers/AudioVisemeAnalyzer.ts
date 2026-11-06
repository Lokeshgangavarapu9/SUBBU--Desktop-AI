/**
 * AudioVisemeAnalyzer.ts
 * Real-time client-side acoustic formant and viseme analyzer for SUBBU.
 * Adapted from wawa-lipsync (Wawa Sensei) and Oculus LipSync specifications.
 * 
 * Maps live audio frequency bands into standard VRM vowel blendshapes:
 * - aa (open mouth, /a/)
 * - ee (wide smile, /e/)
 * - ih (teeth visible, /i/)
 * - oh (rounded open, /o/)
 * - ou (puckered, /u/)
 */

export interface VisemeWeights {
  aa: number;
  ee: number;
  ih: number;
  oh: number;
  ou: number;
  volume: number;
}

export class AudioVisemeAnalyzer {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private dataArray: Uint8Array | null = null;
  private isConnected = false;

  public initialize(context?: AudioContext): boolean {
    try {
      if (!this.audioContext) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        this.audioContext = context || new AudioCtx();
      }
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 1024;
      this.analyser.smoothingTimeConstant = 0.45;
      this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
      return true;
    } catch (e) {
      console.warn('[AudioVisemeAnalyzer] Web Audio API initialization failed:', e);
      return false;
    }
  }

  public connectMediaElement(element: HTMLMediaElement): boolean {
    if (!this.audioContext && !this.initialize()) return false;
    try {
      if (this.audioContext!.state === 'suspended') {
        this.audioContext!.resume();
      }
      const source = this.audioContext!.createMediaElementSource(element);
      source.connect(this.analyser!);
      this.analyser!.connect(this.audioContext!.destination);
      this.isConnected = true;
      return true;
    } catch (e) {
      console.warn('[AudioVisemeAnalyzer] Could not connect media element source:', e);
      return false;
    }
  }

  public connectMediaStream(stream: MediaStream): boolean {
    if (!this.audioContext && !this.initialize()) return false;
    try {
      if (this.audioContext!.state === 'suspended') {
        this.audioContext!.resume();
      }
      const source = this.audioContext!.createMediaStreamSource(stream);
      source.connect(this.analyser!);
      this.isConnected = true;
      return true;
    } catch (e) {
      console.warn('[AudioVisemeAnalyzer] Could not connect media stream source:', e);
      return false;
    }
  }

  /**
   * Analyze audio spectrum and return normalized viseme weights (0..1)
   */
  public analyze(): VisemeWeights {
    if (!this.isConnected || !this.analyser || !this.dataArray) {
      return { aa: 0, ee: 0, ih: 0, oh: 0, ou: 0, volume: 0 };
    }

    this.analyser.getByteFrequencyData(this.dataArray as any);
    const binCount = this.analyser.frequencyBinCount;
    const sampleRate = this.audioContext ? this.audioContext.sampleRate : 44100;
    const binHz = sampleRate / (binCount * 2);

    // Formant Energy Bins
    // Low: 100Hz - 400Hz (ou, oh)
    // Mid: 400Hz - 1000Hz (aa)
    // High-Mid: 1000Hz - 2500Hz (ee, ih)
    // High: 2500Hz - 6000Hz (fricatives)

    let lowEnergy = 0;
    let midEnergy = 0;
    let highMidEnergy = 0;
    let totalEnergy = 0;

    for (let i = 0; i < binCount; i++) {
      const hz = i * binHz;
      const val = this.dataArray[i] / 255;
      totalEnergy += val;

      if (hz >= 100 && hz < 400) {
        lowEnergy += val;
      } else if (hz >= 400 && hz < 1100) {
        midEnergy += val;
      } else if (hz >= 1100 && hz < 2800) {
        highMidEnergy += val;
      }
    }

    const avgVolume = Math.min((totalEnergy / (binCount * 0.4)) * 2.0, 1.0);

    if (avgVolume < 0.04) {
      return { aa: 0, ee: 0, ih: 0, oh: 0, ou: 0, volume: 0 };
    }

    const normLow = Math.min((lowEnergy / 15) * 1.5, 1.0);
    const normMid = Math.min((midEnergy / 20) * 1.6, 1.0);
    const normHighMid = Math.min((highMidEnergy / 30) * 1.4, 1.0);

    return {
      aa: normMid * avgVolume,
      ee: normHighMid * 0.7 * avgVolume,
      ih: normHighMid * 0.5 * avgVolume,
      oh: normLow * 0.85 * avgVolume,
      ou: normLow * 0.6 * avgVolume,
      volume: avgVolume,
    };
  }
}

