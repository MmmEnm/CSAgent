/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Web Audio API & Speech Synthesis for 15s Warm Counselor Voice Greeting

class CounselorVoiceEngine {
  private audioCtx: AudioContext | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private timer: any = null;
  private activeCounselorId: string | null = null;
  private oscillatorNodes: OscillatorNode[] = [];
  private gainNodes: GainNode[] = [];

  // Play a 15-second warm greeting
  public playGreeting(
    counselorId: string,
    counselorName: string,
    gender: 'female' | 'male',
    spokenText: string,
    durationSeconds = 15,
    onProgress: (secondsLeft: number, progressRatio: number) => void,
    onEnded: () => void
  ) {
    this.stop();
    this.activeCounselorId = counselorId;

    // 1. Web Audio API gentle warm background chime / frequency bell
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
        if (this.audioCtx.state === 'suspended') {
          this.audioCtx.resume();
        }

        // Create warm harmonic bell chime chords (432Hz healing / 528Hz calming tone)
        const baseFreq = gender === 'female' ? 432 : 324;
        const chords = [baseFreq, baseFreq * 1.25, baseFreq * 1.5];

        chords.forEach((freq, idx) => {
          if (!this.audioCtx) return;
          const osc = this.audioCtx.createOscillator();
          const gain = this.audioCtx.createGain();

          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);

          // Gentle ambient envelope
          gain.gain.setValueAtTime(0.001, this.audioCtx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.035 / (idx + 1), this.audioCtx.currentTime + 1.2);
          gain.gain.exponentialRampToValueAtTime(0.005, this.audioCtx.currentTime + durationSeconds - 1);
          gain.gain.exponentialRampToValueAtTime(0.0001, this.audioCtx.currentTime + durationSeconds);

          osc.connect(gain);
          gain.connect(this.audioCtx.destination);

          osc.start();
          osc.stop(this.audioCtx.currentTime + durationSeconds);

          this.oscillatorNodes.push(osc);
          this.gainNodes.push(gain);
        });
      }
    } catch (e) {
      console.warn('Web Audio background chime init warning:', e);
    }

    // 2. Browser SpeechSynthesis for natural vocal narration
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        // Remove quotes for cleaner speech
        const cleanText = spokenText.replace(/^[“”"']|[“”"']$/g, '');
        const utter = new SpeechSynthesisUtterance(cleanText);

        utter.lang = 'zh-CN';
        utter.rate = gender === 'female' ? 0.88 : 0.84;
        utter.pitch = gender === 'female' ? 1.05 : 0.88;

        // Try picking Chinese voice
        const voices = window.speechSynthesis.getVoices();
        const zhVoice = voices.find(v => v.lang.includes('zh') || v.lang.includes('cmn'));
        if (zhVoice) {
          utter.voice = zhVoice;
        }

        window.speechSynthesis.speak(utter);
        this.currentUtterance = utter;
      } catch (err) {
        console.warn('SpeechSynthesis warning:', err);
      }
    }

    // 3. Precise 15-second progress ticker
    const startTime = Date.now();
    const totalMs = durationSeconds * 1000;

    this.timer = setInterval(() => {
      const elapsedMs = Date.now() - startTime;
      const progress = Math.min(1, elapsedMs / totalMs);
      const secondsPassed = Math.floor(elapsedMs / 1000);
      const secondsLeft = Math.max(0, durationSeconds - secondsPassed);

      onProgress(secondsPassed, progress);

      if (elapsedMs >= totalMs) {
        this.stop();
        onEnded();
      }
    }, 150);
  }

  // Stop active playback
  public stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // ignore
      }
      this.currentUtterance = null;
    }

    this.oscillatorNodes.forEach(osc => {
      try { osc.stop(); osc.disconnect(); } catch {}
    });
    this.oscillatorNodes = [];

    this.gainNodes.forEach(gain => {
      try { gain.disconnect(); } catch {}
    });
    this.gainNodes = [];

    if (this.audioCtx) {
      try { this.audioCtx.close(); } catch {}
      this.audioCtx = null;
    }

    this.activeCounselorId = null;
  }

  public getActiveCounselorId(): string | null {
    return this.activeCounselorId;
  }
}

export const voiceEngine = new CounselorVoiceEngine();
