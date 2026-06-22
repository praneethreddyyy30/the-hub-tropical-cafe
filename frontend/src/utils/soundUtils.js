// Web Audio API Sound Synthesizer Helper
// Synthesizes clean sound chimes dynamically in the browser, avoiding external asset load requirements.

let audioCtx = null;

function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioCtx;
}

/**
   * Synthesizes a generic sine note with gain decay.
   */
function playNote(frequency, startTime, duration, type = 'sine', volume = 0.2) {
  try {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = type;
    osc.frequency.setValueAtTime(frequency, startTime);

    gain.gain.setValueAtTime(volume, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    osc.start(startTime);
    osc.stop(startTime + duration);
  } catch (err) {
    console.warn('Sound synthesis failed:', err);
  }
}

/**
 * Plays a high arpeggio chime to indicate a new order on the Admin Dashboard.
 */
export function playAdminNotificationSound() {
  const ctx = getAudioContext();
  const now = ctx.currentTime;
  playNote(587.33, now, 0.15, 'sine', 0.25); // D5
  playNote(880.00, now + 0.1, 0.4, 'sine', 0.25); // A5
}

/**
 * Plays a positive ascending chime when a customer verifies their payment.
 */
export function playPaymentReceivedSound() {
  const ctx = getAudioContext();
  const now = ctx.currentTime;
  playNote(523.25, now, 0.1, 'sine', 0.3); // C5
  playNote(659.25, now + 0.08, 0.1, 'sine', 0.3); // E5
  playNote(783.99, now + 0.16, 0.35, 'sine', 0.3); // G5
}

/**
 * Plays a soft double beep alert on the customer tracking screen when status changes.
 */
export function playCustomerStatusAlert() {
  const ctx = getAudioContext();
  const now = ctx.currentTime;
  playNote(523.25, now, 0.12, 'triangle', 0.15); // C5
  playNote(659.25, now + 0.12, 0.18, 'triangle', 0.15); // E5
}
