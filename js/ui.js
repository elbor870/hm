// ============================================================================
// UI.JS — Управление интерфейсом: экраны, меню, прогресс, ачивки, тосты
// ============================================================================
// Модуль отвечает ТОЛЬКО за UI. Игровая логика — в game.js / main.js.
// ============================================================================

import { LEVELS } from './levels.js';
import { ACHIEVEMENTS_DB, STORAGE_KEYS } from './config.js';
import { audio } from './audio.js';

// ============================================================================
// УТИЛИТЫ DOM
// ============================================================================
const $ = id => document.getElementById(id);
const $$ = sel => document.querySelectorAll(sel);

// ============================================================================
// PROGRESS MANAGER — Прогресс игрока (localStorage)
// ============================================================================
class ProgressManager {
    constructor() {
        this.unlocked = this.load(STORAGE_KEYS.unlocked, [true, false, false, false, false]);
        this.stars = this.load(STORAGE_KEYS.stars, [0, 0, 0, 0, 0]);
        this.achievements = this.load(STORAGE_KEYS.achievements, {});
    }

    load(key, fallback) {
        try {
            const v = localStorage.getItem(key);
            return v ? JSON.parse(v) : fallback;
        } catch {
            return fallback;
        }
    }

    save() {
        localStorage.setItem(STORAGE_KEYS.unlocked, JSON.stringify(this.unlocked));
        localStorage.setItem(STORAGE_KEYS.stars, JSON.stringify(this.stars));
        localStorage.setItem(STORAGE_KEYS.achievements, JSON.stringify(this.achievements));
    }

    // ----- Уровни -----
    isLevelUnlocked(index) {
        return !!this.unlocked[index];
    }

    unlockLevel(index) {
        if (index < 0 || index >= LEVELS.length) return;
        if (this.unlocked[index]) return;
        this.unlocked[index] = true;
        this.save();
    }

    getStars(index) {
        return this.stars[index] || 0;
    }

    setStars(index, stars) {
        this.stars[index] = Math.max(this.stars[index] || 0, stars);
        this.save();
    }

    getFirstUnlockedIndex() {
        const i = this.unlocked.findIndex(u => u);
        return i >= 0 ? i : 0;
    }

    isLastLevel(index) {
        return index >= LEVELS.length - 1;
    }

    // ----- Ачивки -----
    hasAchievement(id) {
        return !!this.achievements[id];
    }

    unlockAchievement(id) {
        if (!ACHIEVEMENTS_DB[id]) return false;
        if (this.achievements[id]) return false;
        this.achievements[id] = true;
        this.save();
        return true; // новая ачивка — показать тост
    }

    getAchievementsCount() {
        return Object.keys(this.achievements).length;
    }

    getTotalAchievements() {
        return Object.keys(ACHIEVEMENTS_DB).length;
    }

    // ----- Сброс -----
    reset() {
        this.unlocked = [true, false, false, false, false];
        this.stars = [0, 0, 0, 0, 0];
        this.achievements = {};
        this.save();
    }
}

// ============================================================================
// SCREEN MANAGER — Управление экранами (menu, pause, complete, gameOver)
// ============================================================================
class ScreenManager {
    constructor() {
        this.screens = {
            menu:        $('menu'),
            pause:       $('pauseMenu'),
            complete:    $('levelComplete'),
            gameOver:    $('gameOver')
        };
        this.current = null;
    }

    hideAll() {
        Object.values(this.screens).forEach(s => s && s.classList.add('hidden'));
        this.current = null;
    }

    show(name) {
        this.hideAll();
        const screen = this.screens[name];
        if (!screen) return;
        screen.classList.remove('hidden');
        this.current = name;
    }

    hide(name) {
        const screen = this.screens[name];
        if (screen) screen.classList.add('hidden');
        if (this.current === name) this.current = null;
    }

    isVisible(name) {
        return this.current === name;
    }

    hideAllExcept(name) {
        Object.entries(this.screens).forEach(([key, screen]) => {
            if (!screen || key === name) return;
            screen.classList.add('hidden');
        });
        this.current = name;
    }
}

// ============================================================================
// TOAST MANAGER — Всплывающие уведомления (ачивки)
// ============================================================================
class ToastManager {
    constructor() {
        this.el = $('achievementToast');
        this.nameEl = $('achName');
        this.descEl = $('achDesc');
        this.timeout = null;
        this.queue = [];
        this.busy = false;
    }

    show(achievement) {
        this.queue.push(achievement);
        if (!this.busy) this._processNext();
    }

    _processNext() {
        if (this.queue.length === 0) {
            this.busy = false;
            return;
        }

        this.busy = true;
        const ach = this.queue.shift();

        this.nameEl.textContent = ach.name;
        this.descEl.textContent = ach.desc;
        this.el.classList.add('show');
        audio.achievement();

        clearTimeout(this.timeout);
        this.timeout = setTimeout(() => {
            this.el.classList.remove('show');
            setTimeout(() => this._processNext(), 400);
        }, 3000);
    }

    clear() {
        clearTimeout(this.timeout);
        this.queue = [];
        this.busy = false;
        this.el.classList.remove('show');
    }
}

// ============================================================================
// МЕНЮ УРОВНЕЙ — Динамическое построение карточек
// ============================================================================
class LevelMenuBuilder {
    constructor(progress, onSelect) {
        this.progress = progress;
        this.onSelect = onSelect;
        this.grid = $('levelGrid');
    }

    build() {
        if (!this.grid) return;
        this.grid.innerHTML = '';
        LEVELS.forEach((level, i) => {
            this.grid.appendChild(this._createCard(level, i));
        });
    }

    _createCard(level, index) {
        const unlocked = this.progress.isLevelUnlocked(index);
        const stars = this.progress.getStars(index);

        const card = document.createElement('div');
        card.className = 'level-card' + (unlocked ? '' : ' locked');
        card.dataset.index = index;

        card.innerHTML = `
            <span class="num">${index + 1}</span>
            <span class="name">${level.name}</span>
            <div class="stars">${this._starsString(stars)}</div>
        `;

        if (unlocked) {
            card.addEventListener('click', () => this.onSelect(index));
            card.setAttribute('role', 'button');
            card.setAttribute('tabindex', '0');
        } else {
            card.setAttribute('aria-disabled', 'true');
        }

        return card;
    }

    _starsString(stars) {
        return '★'.repeat(stars) + '☆'.repeat(3 - stars);
    }

    // Обновление без полной пересборки
    refresh() {
        if (!this.grid) return;
        const cards = this.grid.querySelectorAll('.level-card');
        cards.forEach(card => {
            const index = parseInt(card.dataset.index, 10);
            const unlocked = this.progress.isLevelUnlocked(index);
            const stars = this.progress.getStars(index);

            card.classList.toggle('locked', !unlocked);
            const starsEl = card.querySelector('.stars');
            if (starsEl) starsEl.textContent = this._starsString(stars);
        });
    }
}

// ============================================================================
// "КАК ИГРАТЬ" — Заполнение справки
// ============================================================================
const HOWTO_KEYS = [
    ['ПЕРЕМЕЩЕНИЕ', 'W A S D'],
    ['ПРИЦЕЛ', 'МЫШЬ'],
    ['ОГОНЬ', 'ЛКМ'],
    ['РЫВОК', 'SHIFT'],
    ['ПЕРЕЗАРЯДКА', 'R'],
    ['СМЕНА ОРУЖИЯ', '1 2 3 4'],
    ['ДОБИТЬ', 'E'],
    ['ПАУЗА', 'ESC']
];

const HOWTO_WEAPONS = [
    ['ПИСТОЛЕТ', 'Быстрый, точный'],
    ['ДРОБОВИК', 'Разброс, мощь вблизи'],
    ['АВТОМАТ', 'Скорострельность'],
    ['КАТАНА', 'Мгновенная смерть вблизи'],
    ['ДОБИВАНИЕ', 'Враг в упор → клавиша E']
];

function renderStatRows(rows) {
    return rows
        .map(([k, v]) => `<div class="stat-row"><span>${k}</span><span>${v}</span></div>`)
        .join('');
}

// ============================================================================
// ЭФФЕКТЫ UI (вспышки, оверлеи)
// ============================================================================
class UIEffects {
    constructor() {
        this.damageEl = $('damageFlash');
        this.slowMoEl = $('slowMoOverlay');
        this.damageTimeout = null;
    }

    flashDamage() {
        if (!this.damageEl) return;
        this.damageEl.style.opacity = '1';
        clearTimeout(this.damageTimeout);
        this.damageTimeout = setTimeout(() => {
            this.damageEl.style.opacity = '0';
        }, 300);
    }

    setSlowMo(active) {
        if (!this.slowMoEl) return;
        this.slowMoEl.style.opacity = active ? '0.3' : '0';
    }
}

// ============================================================================
// ЭКРАН ПОБЕДЫ
// ============================================================================
function renderCompleteScreen(data) {
    const { stars, time, kills, accuracy, maxCombo, score, hasNext } = data;

    const starsEl = $('ratingStars');
    if (starsEl) starsEl.textContent = '★'.repeat(stars) + '☆'.repeat(3 - stars);

    const statsEl = $('completeStats');
    if (statsEl) {
        statsEl.innerHTML = `
            <div class="stat-row"><span>ВРЕМЯ</span><span>${time.toFixed(1)}s</span></div>
            <div class="stat-row"><span>УБИЙСТВ</span><span>${kills}</span></div>
            <div class="stat-row"><span>ТОЧНОСТЬ</span><span>${Math.floor(accuracy * 100)}%</span></div>
            <div class="stat-row"><span>МАКС. КОМБО</span><span>x${maxCombo}</span></div>
            <div class="stat-row total"><span>ОЧКИ</span><span>${score}</span></div>
        `;
    }

    const nextBtn = $('nextLevelBtn');
    if (nextBtn) nextBtn.classList.toggle('hidden', !hasNext);
}

// ============================================================================
// UI FACADE — Единая точка доступа для игровой логики
// ============================================================================
class UIManager {
    constructor() {
        this.progress = new ProgressManager();
        this.screens = new ScreenManager();
        this.toasts = new ToastManager();
        this.effects = new UIEffects();
        this.levelMenu = null; // создаётся при первом открытии
        this._onLevelSelect = null;
    }

    // ---------------------------------------------------------------------
    // ПРОГРЕСС
    // ---------------------------------------------------------------------
    isLevelUnlocked(index) { return this.progress.isLevelUnlocked(index); }
    getStars(index) { return this.progress.getStars(index); }
    getFirstUnlockedIndex() { return this.progress.getFirstUnlockedIndex(); }
    isLastLevel(index) { return this.progress.isLastLevel(index); }

    unlockLevel(index) { this.progress.unlockLevel(index); }
    setStars(index, stars) { this.progress.setStars(index, stars); }

    hasAchievement(id) { return this.progress.hasAchievement(id); }

    unlockAchievement(id) {
        const isNew = this.progress.unlockAchievement(id);
        if (!isNew) return;
        const ach = ACHIEVEMENTS_DB[id];
        if (ach) this.toasts.show(ach);
    }

    getAchievementStats() {
        return {
            unlocked: this.progress.getAchievementsCount(),
            total: this.progress.getTotalAchievements()
        };
    }

    resetProgress() {
        this.progress.reset();
        if (this.levelMenu) this.levelMenu.refresh();
    }

    // ---------------------------------------------------------------------
    // ЭКРАНЫ
    // ---------------------------------------------------------------------
    showScreen(name) { this.screens.show(name); }
    hideScreen(name) { this.screens.hide(name); }
    hideAllScreens() { this.screens.hideAll(); }

    // ---------------------------------------------------------------------
    // ЭФФЕКТЫ
    // ---------------------------------------------------------------------
    flashDamage() { this.effects.flashDamage(); }
    setSlowMoOverlay(active) { this.effects.setSlowMo(active); }

    // ---------------------------------------------------------------------
    // МЕНЮ УРОВНЕЙ
    // ---------------------------------------------------------------------
    setLevelSelectHandler(handler) {
        this._onLevelSelect = handler;
        this.levelMenu = new LevelMenuBuilder(this.progress, handler);
    }

    buildLevelMenu() {
        if (!this.levelMenu) {
            this.levelMenu = new LevelMenuBuilder(this.progress, this._onLevelSelect);
        }
        this.levelMenu.build();
    }

    refreshLevelMenu() {
        if (this.levelMenu) this.levelMenu.refresh();
    }

    // ---------------------------------------------------------------------
    // СПРАВКА
    // ---------------------------------------------------------------------
    fillHowTo() {
        const keysEl = $('howToKeys');
        const weaponsEl = $('howToWeapons');
        if (keysEl) keysEl.innerHTML = renderStatRows(HOWTO_KEYS);
        if (weaponsEl) weaponsEl.innerHTML = renderStatRows(HOWTO_WEAPONS);
    }

    // ---------------------------------------------------------------------
    // ЭКРАН ПОБЕДЫ
    // ---------------------------------------------------------------------
    showLevelComplete(data) {
        renderCompleteScreen(data);
        this.screens.show('complete');
    }

    // ---------------------------------------------------------------------
    // ЭКРАН СМЕРТИ
    // ---------------------------------------------------------------------
    showGameOver() {
        this.screens.show('gameOver');
    }
}

// ============================================================================
// ЭКСПОРТ ЕДИНОГО ЭКЗЕМПЛЯРА
// ============================================================================
export const ui = new UIManager();

// ============================================================================
// ОБРАТНАЯ СОВМЕСТИМОСТЬ — именованные экспорты для старого API
// ============================================================================
export const progress = ui.progress;
export const screens = ui.screens.screens;

export const unlockLevel         = i => ui.unlockLevel(i);
export const setStars            = (i, s) => ui.setStars(i, s);
export const hasAchievement      = id => ui.hasAchievement(id);
export const unlockAchievement   = id => ui.unlockAchievement(id);
export const hideAllScreens      = () => ui.hideAllScreens();
export const showScreen          = name => ui.showScreen(name);
export const buildLevelMenu      = handler => {
    ui.setLevelSelectHandler(handler);
    ui.buildLevelMenu();
};
export const fillHowTo           = () => ui.fillHowTo();
export const showLevelComplete   = data => ui.showLevelComplete(data);
export const flashDamage         = () => ui.flashDamage();
export const setSlowMoOverlay    = active => ui.setSlowMoOverlay(active);
export const resetProgress       = () => ui.resetProgress();
