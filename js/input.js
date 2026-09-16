// Модуль ввода: клавиатура + мышь

import { W, H } from './config.js';

export const keys = {};
export const mouse = { x: W / 2, y: H / 2, down: false, clicked: false };

export function initInput(canvas) {
    window.addEventListener('keydown', e => {
        const k = e.key.toLowerCase();
        if (!keys[k]) keys[k + '_pressed'] = true;
        keys[k] = true;
        if ([' ', 'w', 'a', 's', 'd', 'shift', 'r', 'e', '1', '2', '3', '4'].includes(k)) {
            e.preventDefault();
        }
    });

    window.addEventListener('keyup', e => {
        keys[e.key.toLowerCase()] = false;
    });

    canvas.addEventListener('mousemove', e => {
        const rect = canvas.getBoundingClientRect();
        const scaleX = W / rect.width;
        const scaleY = H / rect.height;
        mouse.x = (e.clientX - rect.left) * scaleX;
        mouse.y = (e.clientY - rect.top) * scaleY;
    });

    canvas.addEventListener('mousedown', e => {
        if (e.button === 0) { mouse.down = true; mouse.clicked = true; }
    });

    window.addEventListener('mouseup', e => {
        if (e.button === 0) mouse.down = false;
    });

    canvas.addEventListener('contextmenu', e => e.preventDefault());
}

// Сбрасывает "pressed" флаги в конце кадра
export function clearPressedKeys() {
    for (const k in keys) {
        if (k.endsWith('_pressed')) keys[k] = false;
    }
    mouse.clicked = false;
}
