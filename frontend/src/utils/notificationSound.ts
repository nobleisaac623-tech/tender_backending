let audioCtx: AudioContext | null = null;

export function playNotificationSound(): void {
  try {
    if (typeof window === 'undefined') return;
    const Ctx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;

    if (!audioCtx || audioCtx.state === 'closed') {
      audioCtx = new Ctx();
    }

    if (audioCtx.state === 'suspended') {
      // best effort; may still require user interaction in some browsers
      void audioCtx.resume();
    }

    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.exponentialRampToValueAtTime(660, now + 0.18);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.08, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);

    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.24);
  } catch {
    // ignore playback errors (autoplay policies, unsupported browser, etc.)
  }
}

