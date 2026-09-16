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
import { LEVELS } from './levels.js';
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
// ХЕЛПЕР ДЛЯ DOM
// ============================================================================
const $ = id => document.getElementById(id);

// ============================================================================
// ОБРАБОТЧИКИ КНОПОК
// ============================================================================
function bindButtons() {
    // --- Главное меню ---
    $('playBtn').addEventListener('click', () => {
        const index = ui.getFirstUnlockedIndex();
        startLevel(index);
    });

    $('levelsBtn').addEventListener('click', () => {
        $('menuMain').classList.add('hidden');
        $('menuLevels').classList.remove('hidden');
        ui.buildLevelMenu();
    });

    $('howToBtn').addEventListener('click', () => {
        $('menuMain').classList.add('hidden');
        $('menuHowTo').classList.remove('hidden');
        ui.fillHowTo();
    });

    $('backFromLevels').addEventListener('click', () => {
        $('menuLevels').classList.add('hidden');
        $('menuMain').classList.remove('hidden');
    });

    $('backFromHowTo').addEventListener('click', () => {
        $('menuHowTo').classList.add('hidden');
        $('menuMain').classList.remove('hidden');
    });

    // --- Пауза ---
    $('resumeBtn').addEventListener('click', resumeGame);
    $('restartLevelBtn').addEventListener('click', restartLevel);
    $('quitToMenuBtn').addEventListener('click', quitToMenu);

    // --- Победа ---
    $('nextLevelBtn').addEventListener('click', nextLevel);
    $('retryLevelBtn').addEventListener('click', restartLevel);
    $('completeToMenuBtn').addEventListener('click', quitToMenu);

    // --- Смерть ---
    $('retryBtn').addEventListener('click', restartLevel);
    $('gameOverToMenuBtn').addEventListener('click', quitToMenu);
}

// ============================================================================
// ГЛОБАЛЬНЫЕ ГОРЯЧИЕ КЛАВИШИ
// ============================================================================
function bindHotkeys() {
    window.addEventListener('keydown', e => {
        const k = e.key.toLowerCase();

        // Пауза
        if (k === 'escape') {
            if (state.gameState === 'playing') pauseGame();
            else if (state.gameState === 'paused') resumeGame();
            return;
        }

        // Enter — рестарт / следующий уровень
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
// АУДИО — резюмируем при первом взаимодействии
// ============================================================================
function initAudioResume() {
    const resume = () => {
        audio.resume();
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
    update();

    draw(
        ctx,
        state.combo,
        state.comboTimer,
        state.levelTime,
        state.score
    );

    // Сброс pressed-флагов ввода после кадра
    clearPressedKeys();

    requestAnimationFrame(gameLoop);
}

// ============================================================================
// ИНИЦИАЛИЗАЦИЯ
// ============================================================================
function init() {
    // Регистрируем обработчик выбора уровня для меню
    ui.setLevelSelectHandler(index => startLevel(index));

    // Привязываем кнопки
    bindButtons();
    bindHotkeys();

    // Резюмируем звук при первом клике / клавише
    initAudioResume();

    // Показываем главное меню
    ui.showScreen('menu');

    // Запускаем игровой цикл
    requestAnimationFrame(gameLoop);
}

// Стартуем
init();
