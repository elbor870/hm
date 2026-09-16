// ============================================================================
// AUDIO.JS — Звуковой менеджер на Web Audio API
// ============================================================================
// Все звуки синтезируются на лету — никаких внешних файлов.
// Используется осциллятор (для тонов) + белый шум (для выстрелов/ударов).
// ============================================================================

export class AudioManager {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
        this.enabled = true;
        this.volume = 0.25;
        this.muted = false;
        this.lastPlayTimes = {}; // для throttle — не даём играть один звук чаще X мс
        this.init();
    }

    // ---------------------------------------------------------------------
    // ИНИЦИАЛИЗАЦИЯ
    // ---------------------------------------------------------------------
    init() {
        try {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (!AudioCtx) {
                this.enabled = false;
                console.warn('[AUDIO] Web Audio API не поддерживается');
                return;
            }

            this.ctx = new AudioCtx();

            // Мастер-громкость
            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.value = this.volume;
            this.masterGain.connect(this.ctx.destination);

            console.log('[AUDIO] Инициализирован, sample rate:', this.ctx.sampleRate);
        } catch (e) {
            this.enabled = false;
            console.warn('[AUDIO] Ошибка инициализации:', e);
        }
    }

    // ---------------------------------------------------------------------
    // RESUME — вызывается при первом взаимодействии пользователя
    // Браузеры блокируют AudioContext до клика/клавиши
    // ---------------------------------------------------------------------
    resume() {
        if (!this.ctx) return;
        if (this.ctx.state === 'suspended') {
            this.ctx.resume().then(() => {
                // console.log('[AUDIO] Возобновлён');
            }).catch(() => {});
        }
    }

    // ---------------------------------------------------------------------
    // УПРАВЛЕНИЕ ГРОМКОСТЬЮ
    // ---------------------------------------------------------------------
    setVolume(v) {
        this.volume = Math.max(0, Math.min(1, v));
        if (this.masterGain) {
            this.masterGain.gain.value = this.muted ? 0 : this.volume;
        }
    }

    mute() {
        this.muted = true;
        if (this.masterGain) this.masterGain.gain.value = 0;
    }

    unmute() {
        this.muted = false;
        if (this.masterGain) this.masterGain.gain.value = this.volume;
    }

    toggleMute() {
        this.muted ? this.unmute() : this.mute();
        return this.muted;
    }

    // ---------------------------------------------------------------------
    // БАЗОВЫЙ ТОН
    // ---------------------------------------------------------------------
    play(freq, duration, type = 'square', vol = 0.3, slideTo = null) {
        if (!this.enabled || !this.ctx || this.muted) return;

        try {
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = type;
            osc.frequency.setValueAtTime(freq, now);

            if (slideTo) {
                osc.frequency.exponentialRampToValueAtTime(
                    Math.max(1, slideTo),
                    now + duration
                );
            }

            // Плавное затухание — избегаем щелчков
            gain.gain.setValueAtTime(vol, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

            osc.connect(gain);
            gain.connect(this.masterGain);

            osc.start(now);
            osc.stop(now + duration);
        } catch (e) {
            // тихо игнорируем
        }
    }

    // ---------------------------------------------------------------------
    // ШУМ (для выстрелов, ударов, взрывов)
    // ---------------------------------------------------------------------
    noise(duration, vol = 0.3, filterFreq = 1000, filterType = 'lowpass') {
        if (!this.enabled || !this.ctx || this.muted) return;

        try {
            const now = this.ctx.currentTime;
            const sampleRate = this.ctx.sampleRate;
            const bufferSize = Math.max(1, Math.floor(sampleRate * duration));

            const buffer = this.ctx.createBuffer(1, bufferSize, sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = Math.random() * 2 - 1;
            }

            const source = this.ctx.createBufferSource();
            source.buffer = buffer;

            const filter = this.ctx.createBiquadFilter();
            filter.type = filterType;
            filter.frequency.value = filterFreq;

            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(vol, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

            source.connect(filter);
            filter.connect(gain);
            gain.connect(this.masterGain);

            source.start(now);
            source.stop(now + duration);
        } catch (e) {
            // тихо игнорируем
        }
    }

    // ---------------------------------------------------------------------
    // THROTTLE — не даём одному звуку играть слишком часто
    // ---------------------------------------------------------------------
    throttle(key, minInterval = 30) {
        const now = performance.now();
        const last = this.lastPlayTimes[key] || 0;
        if (now - last < minInterval) return false;
        this.lastPlayTimes[key] = now;
        return true;
    }

    // =====================================================================
    // ИГРОВЫЕ ЗВУКИ
    // =====================================================================

    // --- Оружие ---
    shoot() {
        if (!this.throttle('shoot', 30)) return;
        this.play(320, 0.08, 'square', 0.25, 80);
        this.noise(0.10, 0.20, 2000);
    }

    shotgun() {
        this.play(180, 0.15, 'sawtooth', 0.35, 40);
        this.noise(0.20, 0.30, 1200);
    }

    rifle() {
        if (!this.throttle('rifle', 20)) return;
        this.play(400, 0.05, 'square', 0.20, 150);
        this.noise(0.06, 0.15, 3000);
    }

    katana() {
        this.play(800, 0.15, 'sine', 0.30, 200);
        this.noise(0.12, 0.20, 4000, 'highpass');
    }

    // --- Попадания и смерть ---
    hit() {
        if (!this.throttle('hit', 25)) return;
        this.play(150, 0.15, 'sawtooth', 0.30, 30);
        this.noise(0.20, 0.30, 500);
    }

    kill() {
        this.play(80, 0.30, 'sawtooth', 0.35, 20);
        this.noise(0.30, 0.30, 800);
    }

    hurt() {
        this.play(90, 0.30, 'sawtooth', 0.40, 40);
        this.noise(0.30, 0.30, 600);
    }

    // --- Перезарядка ---
    reload() {
        this.play(200, 0.08, 'square', 0.15, 400);
        setTimeout(() => {
            this.play(400, 0.08, 'square', 0.15, 200);
        }, 80);
    }

    empty() {
        if (!this.throttle('empty', 100)) return;
        this.play(120, 0.05, 'square', 0.15);
    }

    // --- Передвижение ---
    dash() {
        this.play(500, 0.15, 'sine', 0.20, 100);
        this.noise(0.15, 0.15, 3000, 'highpass');
    }

    step() {
        if (!this.throttle('step', 80)) return;
        this.play(60 + Math.random() * 20, 0.03, 'sine', 0.05);
    }

    // --- Взаимодействие ---
    pickup() {
        this.play(600, 0.08, 'square', 0.20);
        setTimeout(() => this.play(900, 0.08, 'square', 0.20), 60);
    }

    door() {
        if (!this.throttle('door', 200)) return;
        this.play(150, 0.10, 'square', 0.15, 250);
    }

    // --- Комбо ---
    combo(n) {
        const freq = 400 + Math.min(n, 10) * 80;
        this.play(freq, 0.10, 'sine', 0.20);
    }

    // --- События уровня ---
    levelStart() {
        this.play(400, 0.10, 'square', 0.15);
        setTimeout(() => this.play(600, 0.10, 'square', 0.15), 80);
        setTimeout(() => this.play(900, 0.20, 'square', 0.15), 160);
    }

    levelWin() {
        this.play(600, 0.15, 'square', 0.20);
        setTimeout(() => this.play(800, 0.15, 'square', 0.20), 150);
        setTimeout(() => this.play(1000, 0.15, 'square', 0.20), 300);
        setTimeout(() => this.play(1200, 0.30, 'square', 0.20), 450);
    }

    death() {
        this.play(200, 0.30, 'sawtooth', 0.30, 80);
    }

    achievement() {
        this.play(600, 0.10, 'square', 0.20);
        setTimeout(() => this.play(800, 0.10, 'square', 0.20), 100);
        setTimeout(() => this.play(1000, 0.15, 'square', 0.20), 200);
    }

    // --- UI ---
    uiClick() {
        this.play(700, 0.05, 'square', 0.10);
    }

    uiHover() {
        this.play(900, 0.03, 'sine', 0.05);
    }
}

// ============================================================================
// ЭКСПОРТ ЕДИНОГО ЭКЗЕМПЛЯРА
// ============================================================================
export const audio = new AudioManager();
