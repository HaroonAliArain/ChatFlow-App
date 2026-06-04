/**
 * playNotificationSound — programmatically plays a pleasant, modern two-tone chime
 * using the Web Audio API. This avoids requiring an external audio file, improves
 * cross-browser reliability, and bypasses typical CORS issues.
 * 
 * @param {number} volume - Volume between 0.0 and 1.0 (default 0.8)
 */
export const playNotificationSound = (volume = 0.8) => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;

    const ctx = new AudioContext();
    
    // Master gain for overall volume control
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(volume, ctx.currentTime);
    masterGain.connect(ctx.destination);

    // First Tone: C5 (523.25 Hz) - crisp starting chime
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(523.25, ctx.currentTime);
    
    gain1.gain.setValueAtTime(0, ctx.currentTime);
    gain1.gain.linearRampToValueAtTime(0.25, ctx.currentTime + 0.02);
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
    
    osc1.connect(gain1);
    gain1.connect(masterGain);
    
    osc1.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.12);

    // Second Tone: E5 (659.25 Hz) - bright resolver, starts slightly delayed
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(659.25, ctx.currentTime + 0.07);
    
    gain2.gain.setValueAtTime(0, ctx.currentTime + 0.07);
    gain2.gain.linearRampToValueAtTime(0.25, ctx.currentTime + 0.09);
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.32);
    
    osc2.connect(gain2);
    gain2.connect(masterGain);
    
    osc2.start(ctx.currentTime + 0.07);
    osc2.stop(ctx.currentTime + 0.32);
    
  } catch (error) {
    // Autoplay restrictions or lack of support - fail silently
    console.log("Notification chime playback failed/blocked:", error.message);
  }
};
