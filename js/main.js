// ============================================================================
// MAIN.JS — Точка входа: инициализация, игровой цикл, обработчики UI
// ============================================================================

import { W, H } from './config.js';
import { initInput, clearPressedKeys } from './input.js';
import { draw } from './render.js';
import {
    state, startLevel, update,
    pauseGame, resumeGame, quitToMenu,
    restartLevel, nextLevel
} from './game.js';
import { ui } from './ui.js';
import { audio } from './audio.js';

// ============================================================================
// CANVAS + РАЗМЕР
// ============================================================================
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
    const maxW = window.innerWidth;
    const maxH = window.innerHeight;
    const ratio = W / H;
    let cw = maxW;
    let ch = maxW / ratio;
    if (ch > maxH) {
        ch = maxH;
        cw = ch * ratio;
    }
    canvas.style.width = cw + 'px';
    canvas.style.height = ch + 'px';
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// ============================================================================
// ВВОД
// ============================================================================
initInput(canvas);

// ============================================================================
// ХЕЛПЕР
// ============================================================================
const $ = id => document.getElementById(id);

// Проверка что все нужные элементы есть
function checkElements() {
    const required = [
        'playBtn', 'levelsBtn', 'howToBtn',
        'menuMain', 'menuLevels', 'menuHowTo',
        'backFromLevels', 'backFromHowTo',
        'resumeBtn', 'restartLevelBtn', 'quitToMenuBtn',
        'nextLevelBtn', 'retryLevelBtn', 'completeToMenuBtn',
        'retryBtn', 'gameOverToMenuBtn',
        'levelGrid', 'howToKeys', 'howToWeapons',
        'ratingStars', 'completeStats',
        'achievementToast', 'achName', 'achDesc'
    ];
    const missing = required.filter(id => !$(id));
    if (missing.length) {
        console.error('[INIT] Не найдены элементы:', missing);
    }
    return missing.length === 0;
}

// ============================================================================
// ОБРАБОТЧИКИ КНОПОК
// ============================================================================
function bindButtons() {
    console.log('[INIT] Привязываем кнопки');

    // --- Главное меню ---
    const playBtn = $('playBtn');
    if (playBtn) {
        playBtn.addEventListener('click', () => {
            console.log('[UI] Клик: Играть');
            startLevel(ui.getFirstUnlockedIndex());
        });
    }

    const levelsBtn = $('levelsBtn');
    if (levelsBtn) {
        levelsBtn.addEventListener('click', () => {
            console.log('[UI] Клик: Уровни');
            const mainMenu = $('menuMain');
            const levelMenu = $('menuLevels');
            if (mainMenu) mainMenu.classList.add('hidden');
            if (levelMenu) levelMenu.classList.remove('hidden');
            ui.buildLevelMenu();
        });
    }

    const howToBtn = $('howToBtn');
    if (howToBtn) {
        howToBtn.addEventListener('click', () => {
            console.log('[UI] Клик: Как играть');
            const mainMenu = $('menuMain');
            const howToMenu = $('menuHowTo');
            if (mainMenu) mainMenu.classList.add('hidden');
            if (howToMenu) howToMenu.classList.remove('hidden');
            ui.fillHowTo();
        });
    }

    const backFromLevels = $('backFromLevels');
    if (backFromLevels) {
        backFromLevels.addEventListener('click', () => {
            const levelMenu = $('menuLevels');
            const mainMenu = $('menuMain');
            if (levelMenu) levelMenu.classList.add('hidden');
            if (mainMenu) mainMenu.classList.remove('hidden');
        });
    }

    const backFromHowTo = $('backFromHowTo');
    if (backFromHowTo) {
        backFromHowTo.addEventListener('click', () => {
            const howToMenu = $('menuHowTo');
            const mainMenu = $('menuMain');
            if (howToMenu) howToMenu.classList.add('hidden');
            if (mainMenu) mainMenu.classList.remove('hidden');
        });
    }

    // --- Пауза ---
    const resumeBtn = $('resumeBtn');
    if (resumeBtn) resumeBtn.addEventListener('click', resumeGame);

    const restartLevelBtn = $('restartLevelBtn');
    if (restartLevelBtn) restartLevelBtn.addEventListener('click', restartLevel);

    const quitToMenuBtn = $('quitToMenuBtn');
    if (quitToMenuBtn) quitToMenuBtn.addEventListener('click', quitToMenu);

    // --- Победа ---
    const nextLevelBtn = $('nextLevelBtn');
    if (nextLevelBtn) nextLevelBtn.addEventListener('click', nextLevel);

    const retryLevelBtn = $('retryLevelBtn');
    if (retryLevelBtn) retryLevelBtn.addEventListener('click', restartLevel);

    const completeToMenuBtn = $('completeToMenuBtn');
    if (completeToMenuBtn) completeToMenuBtn.addEventListener('click', quitToMenu);

    // --- Смерть ---
    const retryBtn = $('retryBtn');
    if (retryBtn) retryBtn.addEventListener('click', restartLevel);

    const gameOverToMenuBtn = $('gameOverToMenuBtn');
    if (gameOverToMenuBtn) gameOverToMenuBtn.addEventListener('click', quitToMenu);
}

// ============================================================================
// ГОРЯЧИЕ КЛАВИШИ
// ============================================================================
function bindHotkeys() {
    window.addEventListener('keydown', e => {
        const k = e.key.toLowerCase();

        if (k === 'escape') {
            if (state.gameState === 'playing') pauseGame();
            else if (state.gameState === 'paused') resumeGame();
            return;
        }

        if (k === 'enter') {
            if (state.gameState === 'dead') {
                restartLevel();
            } else if (state.gameState === 'complete') {
                nextLevel();
            }
        }
    });
}

// ============================================================================
// АУДИО РЕЗЮМ
// ============================================================================
function initAudioResume() {
    const resume = () => {
        try { audio.resume(); } catch (e) { /* ignore */ }
        window.removeEventListener('click', resume);
        window.removeEventListener('keydown', resume);
    };
    window.addEventListener('click', resume);
    window.addEventListener('keydown', resume);
}

// ============================================================================
// ИГРОВОЙ ЦИКЛ
// ============================================================================
function gameLoop() {
    try {
        update();
        draw(ctx, state.combo, state.comboTimer, state.levelTime, state.score);
    } catch (err) {
        console.error('[GAME LOOP]', err);
    }
    clearPressedKeys();
    requestAnimationFrame(gameLoop);
}

// ============================================================================
// ИНИЦИАЛИЗАЦИЯ
// ============================================================================
function init() {
    console.log('[INIT] Старт инициализации');

    // 1. Проверяем все DOM-элементы
    if (!checkElements()) {
        console.warn('[INIT] Часть элементов отсутствует — возможны проблемы');
    }

    // 2. Регистрируем обработчик выбора уровня
    ui.setLevelSelectHandler(index => {
        console.log('[UI] Выбран уровень', index);
        startLevel(index);
    });

    // 3. Привязываем кнопки
    bindButtons();

    // 4. Горячие клавиши
    bindHotkeys();

    // 5. Аудио
    initAudioResume();

    // 6. Показываем главное меню
    ui.showScreen('menu');

    // 7. Сбрасываем под-меню в правильное состояние
    const mainMenu = $('menuMain');
    const levelMenu = $('menuLevels');
    const howToMenu = $('menuHowTo');
    if (mainMenu) mainMenu.classList.remove('hidden');
    if (levelMenu) levelMenu.classList.add('hidden');
    if (howToMenu) howToMenu.classList.add('hidden');

    // 8. Запускаем игровой цикл
    requestAnimationFrame(gameLoop);

    console.log('[INIT] Готово');
}

// Ждём полной загрузки DOM
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
