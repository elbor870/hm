// ============================================================================
// LEVELS.JS — Определения уровней: планировки, спавн, старт игрока
// ============================================================================
// Модуль строит мир через world.addWall / addDoor / addPickup и наполняет
// его врагами. Логика боя — в game.js, отрисовка — в render.js.
// ============================================================================

import { W, H } from './config.js';
import { world } from './entities.js';
import { rand, dist, circleRectCollision } from './utils.js';

// ============================================================================
// ХЕЛПЕРЫ ДЛЯ ПОСТРОЕНИЯ
// ============================================================================
function wall(x, y, w, h) {
    world.addWall(x, y, w, h);
}

function door(x, y, w, h, orient = 'v') {
    world.addDoor(x, y, w, h, orient);
}

function pickup(x, y, type) {
    world.addPickup(x, y, type);
}

function outerWalls() {
    wall(0, 0, W, 20);
    wall(0, H - 20, W, 20);
    wall(0, 0, 20, H);
    wall(W - 20, 0, 20, H);
}

// ============================================================================
// УРОВЕНЬ 1 — НОЧНОЙ КЛУБ
// ============================================================================
function buildLevel1() {
    outerWalls();

    wall(250, 100, 20, 300);
    wall(250, 100, 250, 20);
    wall(480, 100, 20, 400);
    wall(480, 100, 380, 20);
    wall(840, 100, 20, 200);
    wall(840, 400, 20, 200);
    wall(600, 400, 260, 20);
    wall(600, 400, 20, 220);
    wall(250, 550, 300, 20);
    wall(400, 250, 200, 20);
    wall(400, 380, 200, 20);
    wall(700, 550, 20, 150);
    wall(900, 650, 300, 20);
    wall(1100, 400, 20, 250);
    wall(1000, 200, 150, 20);
    wall(200, 700, 250, 20);

    door(480, 500, 20, 80, 'v');
    door(820, 300, 20, 80, 'v');

    pickup(600, 250, 'shotgun');
    pickup(950, 500, 'rifle');
    pickup(350, 650, 'katana');
    pickup(700, 200, 'health');
}

// ============================================================================
// УРОВЕНЬ 2 — ОФИС
// ============================================================================
function buildLevel2() {
    outerWalls();

    // Офисные кабинки
    for (let i = 0; i < 4; i++) {
        wall(200 + i * 250, 100, 20, 250);
        wall(200 + i * 250, 100, 150, 20);
        wall(200 + i * 250, 330, 150, 20);
    }

    // Центральный коридор
    wall(100, 450, 1080, 20);
    wall(100, 500, 1080, 20);

    // Нижняя часть — комнаты
    wall(200, 600, 20, 180);
    wall(500, 600, 20, 180);
    wall(800, 600, 20, 180);
    wall(1100, 600, 20, 180);
    wall(200, 600, 150, 20);
    wall(500, 600, 150, 20);
    wall(800, 600, 150, 20);
    wall(1000, 750, 250, 20);

    door(580, 450, 20, 50, 'v');
    door(880, 450, 20, 50, 'v');

    pickup(400, 400, 'shotgun');
    pickup(900, 400, 'rifle');
    pickup(700, 700, 'katana');
    pickup(1150, 300, 'health');
    pickup(150, 300, 'health');
}

// ============================================================================
// УРОВЕНЬ 3 — СКЛАД
// ============================================================================
function buildLevel3() {
    outerWalls();

    // Ящики-укрытия
    const boxes = [
        [200, 150, 100, 100], [350, 150, 100, 100], [500, 150, 100, 100],
        [700, 150, 100, 100], [900, 150, 100, 100], [1050, 150, 100, 100],
        [200, 350, 100, 100], [400, 350, 100, 100], [600, 350, 100, 100],
        [800, 350, 100, 100], [1000, 350, 100, 100],
        [200, 550, 100, 100], [400, 550, 100, 100], [600, 550, 100, 100],
        [800, 550, 100, 100], [1000, 550, 100, 100],
        [700, 700, 250, 60]
    ];
    boxes.forEach(b => wall(...b));

    door(350, 300, 80, 20, 'h');
    door(750, 500, 80, 20, 'h');

    pickup(300, 700, 'shotgun');
    pickup(1000, 700, 'rifle');
    pickup(700, 700, 'health');
}

// ============================================================================
// УРОВЕНЬ 4 — ПЕНТХАУС
// ============================================================================
function buildLevel4() {
    outerWalls();

    // Центральная комната
    wall(300, 200, 20, 400);
    wall(300, 200, 680, 20);
    wall(960, 200, 20, 400);
    wall(300, 580, 680, 20);

    // Коридоры снаружи
    wall(200, 100, 100, 20);
    wall(800, 100, 300, 20);
    wall(100, 650, 600, 20);
    wall(800, 650, 400, 20);

    door(450, 580, 80, 20, 'h');
    door(750, 580, 80, 20, 'h');
    door(300, 350, 20, 80, 'v');
    door(960, 350, 20, 80, 'v');

    // Мебель внутри центральной комнаты
    wall(400, 300, 100, 60);
    wall(700, 300, 100, 60);
    wall(400, 450, 100, 60);
    wall(700, 450, 100, 60);

    pickup(600, 350, 'shotgun');
    pickup(600, 500, 'rifle');
    pickup(150, 150, 'health');
    pickup(1150, 750, 'health');
}

// ============================================================================
// УРОВЕНЬ 5 — ФИНАЛ (ЛАБИРИНТ)
// ============================================================================
function buildLevel5() {
    outerWalls();

    const maze = [
        [100, 100, 400, 20], [100, 100, 20, 300], [500, 100, 20, 300],
        [100, 400, 20, 300], [100, 400, 400, 20], [500, 400, 20, 300],
        [100, 680, 400, 20],
        [700, 100, 20, 500], [700, 100, 480, 20],
        [900, 200, 20, 400], [900, 600, 280, 20],
        [700, 400, 200, 20], [700, 600, 20, 200],
        [1000, 400, 20, 200], [1000, 400, 180, 20],
        [1000, 680, 180, 20]
    ];
    maze.forEach(m => wall(...m));

    door(500, 250, 20, 100, 'v');
    door(700, 450, 20, 100, 'v');
    door(900, 350, 20, 100, 'v');

    pickup(300, 300, 'shotgun');
    pickup(800, 300, 'rifle');
    pickup(1100, 150, 'katana');
    pickup(300, 750, 'health');
    pickup(1100, 750, 'health');
}

// ============================================================================
// РЕЕСТР УРОВНЕЙ
// ============================================================================
export const LEVELS = [
    {
        name: 'НОЧНОЙ КЛУБ',
        time: 60,
        enemyCount: 8,
        build: buildLevel1,
        playerStart: { x: 80, y: 720 }
    },
    {
        name: 'ОФИС',
        time: 90,
        enemyCount: 12,
        build: buildLevel2,
        playerStart: { x: 80, y: 720 }
    },
    {
        name: 'СКЛАД',
        time: 75,
        enemyCount: 15,
        build: buildLevel3,
        playerStart: { x: 80, y: 720 }
    },
    {
        name: 'ПЕНТХАУС',
        time: 90,
        enemyCount: 18,
        build: buildLevel4,
        playerStart: { x: 80, y: 720 }
    },
    {
        name: 'ФИНАЛ',
        time: 120,
        enemyCount: 25,
        build: buildLevel5,
        playerStart: { x: 80, y: 720 }
    }
];

// ============================================================================
// СПАВН ВРАГОВ НА УРОВНЕ
// ============================================================================
const SPAWN_AREAS = [
    { x: 300, y: 200, w: 900, h: 500 },
    { x: 200, y: 150, w: 1000, h: 600 },
    { x: 250, y: 200, w: 900, h: 500 },
    { x: 350, y: 250, w: 800, h: 450 },
    { x: 150, y: 150, w: 1100, h: 600 }
];

export function spawnEnemiesForLevel(levelIndex) {
    const level = LEVELS[levelIndex];
    if (!level) return;

    const area = SPAWN_AREAS[Math.min(levelIndex, SPAWN_AREAS.length - 1)];
    const playerStart = level.playerStart;

    let attempts = 0;
    let spawned = 0;
    const maxAttempts = 800;
    const minDistFromPlayer = 300;

    while (spawned < level.enemyCount && attempts < maxAttempts) {
        attempts++;

        const ex = rand(area.x, area.x + area.w);
        const ey = rand(area.y, area.y + area.h);

        // Не спавним рядом с игроком
        if (dist(ex, ey, playerStart.x, playerStart.y) < minDistFromPlayer) continue;

        // Не спавним в стене
        if (isPointInWalls(ex, ey, 16)) continue;

        // Определяем тип врага
        const type = pickEnemyType(levelIndex);

        world.addEnemy(ex, ey, type);
        spawned++;
    }
}

// Проверяем, попадает ли круг в стену
function isPointInWalls(x, y, r) {
    for (const w of world.walls) {
        if (circleRectCollision(x, y, r, w)) return true;
    }
    return false;
}

// Тип врага зависит от уровня и случайности
function pickEnemyType(levelIndex) {
    const r = Math.random();

    if (levelIndex >= 3 && r < 0.20) return 'ninja';
    if (levelIndex >= 2 && r < 0.35) return 'brute';
    if (levelIndex >= 1 && r < 0.55) return 'gunner';
    return 'thug';
}

// ============================================================================
// ПОСТРОЕНИЕ УРОВНЯ ПО ИНДЕКСУ
// ============================================================================
export function buildLevelByIndex(index) {
    const level = LEVELS[index];
    if (!level) return null;

    level.build();
    spawnEnemiesForLevel(index);

    return {
        name: level.name,
        timeLimit: level.time,
        playerStart: level.playerStart
    };
}

// ============================================================================
// УТИЛИТЫ
// ============================================================================
export function getLevelName(index) {
    return LEVELS[index]?.name ?? '???';
}

export function getLevelTime(index) {
    return LEVELS[index]?.time ?? 60;
}

export function getLevelCount() {
    return LEVELS.length;
}

export function isLastLevel(index) {
    return index >= LEVELS.length - 1;
}
