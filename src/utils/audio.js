/**
 * Audio Alarm Utility
 * Handles playing the alarm sound using Web Audio API (oscillators).
 */

class AudioAlarm {
    constructor() {
        this.audioCtx = null;
        this.isPlaying = false;
        this.oscillator = null;
    }

    // Initialize AudioContext (must be called after user interaction)
    init() {
        if (!this.audioCtx) {
            this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
    }

    // Start the alarm
    start() {
        if (this.isPlaying) return;
        this.init();

        // Resume context if suspended (common browser policy)
        if (this.audioCtx.state === 'suspended') {
            this.audioCtx.resume();
        }

        this.isPlaying = true;
        this.playBeep();
    }

    // Stop the alarm
    stop() {
        this.isPlaying = false;
        if (this.oscillator) {
            try {
                this.oscillator.stop();
                this.oscillator.disconnect();
            } catch (e) {
                // Ignore if already stopped
            }
            this.oscillator = null;
        }
    }

    // Internal: Play a single beep loop
    playBeep() {
        if (!this.isPlaying) return;

        const osc = this.audioCtx.createOscillator();
        const gainNode = this.audioCtx.createGain();

        osc.type = 'square';
        osc.frequency.setValueAtTime(880, this.audioCtx.currentTime); // A5
        osc.frequency.setValueAtTime(440, this.audioCtx.currentTime + 0.1); // A4 (Siren effect)

        gainNode.gain.setValueAtTime(0.5, this.audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.5);

        osc.connect(gainNode);
        gainNode.connect(this.audioCtx.destination);

        osc.start();
        osc.stop(this.audioCtx.currentTime + 0.5);

        this.oscillator = osc;

        // Loop
        setTimeout(() => {
            if (this.isPlaying) this.playBeep();
        }, 600);
    }
}

export const alarmSystem = new AudioAlarm();
