// ============================================================================
// GAME.JS — Ядро: состояние, update, стрельба, урон, завершение уровня
// ============================================================================
// Использует классы сущностей из entities.js и фасад ui.js.
// ============================================================================

import { W, H, WEAPONS } from './config.js';
import { world } from './entities.js';
import { LEVELS, buildLevelByIndex } from './levels.js';
import { keys, mouse } from './input.js';
import { audio } from './audio.js';
import { ui } from './ui.js';
import {
    addParticles, addBloodStain, addBulletHole,
    addHitMarker, addDamageNumber, addFloatingText,
    updateEffects, clearEffects
} from './effects.js';
import { updateEnemies } from './ai.js';
import {
    resolveWallCollisions, hasLineOfSight,
    dist, angleTo, clamp
} from './physics.js';
import { screenShake, updateCamera } from './render.js';

// ============================================================================
// КОНСТАНТЫ
// ============================================================================
const COMBO_MAX_TIME = 90;
const RELOAD_WHILE_MOVING_MULT = 0.6;
const FOOTSTEP_INTERVAL = 14;

// ============================================================================
// СОСТОЯНИЕ ИГРЫ
// ============================================================================
export const state = {
    gameState: 'menu',    // menu | playing | paused | complete | dead
    currentLevel: 0,
    kills: 0,
    combo: 0,
    comboTimer: 0,
    maxCombo: 0,
    shotsFired: 0,
    shotsHit: 0,
    levelStartTime: 0,
    levelTime: 0,
    score: 0,
    hitStop: 0,
    slowMo: 0,
    pausedAt: 0
};

export const stats = {
    executions: 0,
    shotgunKills: 0,
    katanaKills: 0,
    weaponsUsed: new Set(),
    noDamageThisLevel: true,
    flawless: true
};

// ============================================================================
// ЗАПУСК УРОВНЯ
// ============================================================================
export function startLevel(index) {
    if (index < 0 || index >= LEVELS.length) return;

    state.currentLevel = index;
    state.gameState = 'playing';

    // 1. Очищаем мир
    world.clear();

    // 2. Строим новый уровень (стены, двери, пикапы, враги)
    const levelInfo = buildLevelByIndex(index);
    if (!levelInfo) return;

    // 3. Сбрасываем игрока
    world.player.reset(levelInfo.playerStart.x, levelInfo.playerStart.y);

    // 4. Сбрасываем эффекты
    clearEffects();

    // 5. Сброс статистики
    resetStats();

    // 6. Таймер
    state.levelStartTime = performance.now();
    state.levelTime = 0;

    // 7. Звук и экран
    audio.resume();
    audio.levelStart();
    ui.hideAllScreens();
}

// ============================================================================
// СБРОС СТАТИСТИКИ
// ============================================================================
function resetStats() {
    state.kills = 0;
    state.combo = 0;
    state.comboTimer = 0;
    state.maxCombo = 0;
    state.shotsFired = 0;
    state.shotsHit = 0;
    state.score = 0;
    state.hitStop = 0;
    state.slowMo = 0;

    stats.executions = 0;
    stats.shotgunKills = 0;
    stats.katanaKills = 0;
    stats.weaponsUsed.clear();
    stats.noDamageThisLevel = true;
    stats.flawless = true;
}

// ============================================================================
// ГЛАВНЫЙ UPDATE
// ============================================================================
export function update() {
    if (state.gameState !== 'playing') return;

    // Время уровня
    state.levelTime = (performance.now() - state.levelStartTime) / 1000;

    // Hit stop — короткая заморозка кадра
    if (state.hitStop > 0) {
        state.hitStop--;
        return;
    }

    // Slow-mo
    if (state.slowMo > 0) state.slowMo--;

    // Combo timer
    if (state.comboTimer > 0) {
        state.comboTimer--;
        if (state.comboTimer === 0 && state.combo > 0) {
            state.combo = 0;
        }
    }

    // Основные подсистемы
    updatePlayer();
    updateEnemies(world.player, killPlayer);
    updateBullets();
    updateDoors();
    updatePickups();
    updateEffects();
    updateCamera();

    // Оверлей slow-mo
    ui.setSlowMoOverlay(state.slowMo > 0);

    // Проверка победы
    if (!world.hasAliveEnemies && world.player.alive) {
        completeLevel();
        return;
    }

    // Проверка поражения
    if (!world.player.alive) {
        state.gameState = 'dead';
        ui.showGameOver();
        audio.death();
    }
}

// ============================================================================
// ИГРОК
// ============================================================================
function updatePlayer() {
    const player = world.player;
    if (!player.alive) return;

    // --- Движение ---
    let dx = 0, dy = 0;
    if (keys['w'] || keys['arrowup'])    dy -= 1;
    if (keys['s'] || keys['arrowdown'])  dy += 1;
    if (keys['a'] || keys['arrowleft'])  dx -= 1;
    if (keys['d'] || keys['arrowright']) dx += 1;

    if (player.isDashing) {
        // Во время рывка оставляем след
        addParticles(player.x, player.y, '#00ffff', 2, 2, 3, 15);
    } else if (dx !== 0 || dy !== 0) {
        const len = Math.hypot(dx, dy);
        dx /= len;
        dy /= len;

        const speedMult = player.isReloading ? RELOAD_WHILE_MOVING_MULT : 1;
        player.x += dx * player.speed * speedMult;
        player.y += dy * player.speed * speedMult;

        // Шаги
        player.footstepTimer--;
        if (player.footstepTimer <= 0) {
            audio.step();
            player.footstepTimer = FOOTSTEP_INTERVAL;
        }
    }

    // --- Рывок ---
    if (keys['shift_pressed'] && (dx !== 0 || dy !== 0)) {
        if (player.startDash(dx, dy)) {
            audio.dash();
            screenShake(3);
        }
    }

    // --- Прицел ---
    player.angle = angleTo(player.x, player.y, mouse.x, mouse.y);

    // --- Таймеры игрока ---
    player.tick();

    // --- Авто-перезарядка при пустом магазине ---
    const weapon = player.currentWeapon;
    const ammo = player.currentAmmo;

    if (!weapon.melee && ammo.ammo === 0 && ammo.reserve > 0 && !player.isReloading) {
        if (player.startReload()) audio.reload();
    }

    // --- Стрельба ---
    if (mouse.down && player.canShoot) {
        playerShoot();
    }

    // --- Ручная перезарядка ---
    if (keys['r_pressed']) {
        if (player.startReload()) audio.reload();
    }

    // --- Смена оружия (клавиши 1-4) ---
    for (let i = 1; i <= 4; i++) {
        if (keys[i + '_pressed']) {
            if (player.switchWeapon(i)) {
                audio.pickup();
                stats.weaponsUsed.add(player.weapon);
                addFloatingText(player.x, player.y - 30, WEAPONS[player.weapon].name, '#00ffff');
            }
        }
    }

    // --- Коллизии ---
    resolveWallCollisions(player, world.walls, world.doors);
    player.x = clamp(player.x, player.r, W - player.r);
    player.y = clamp(player.y, player.r, H - player.r);

    // --- Добивание ---
    updateExecuteTarget(player);

    if (keys['e_pressed'] && player.canExecute && player.executeTarget) {
        executeEnemy(player.executeTarget);
    }
}

// ============================================================================
// ПОИСК ЦЕЛИ ДЛЯ ДОБИВАНИЯ
// ============================================================================
function updateExecuteTarget(player) {
    player.canExecute = false;
    player.executeTarget = null;

    const range = player.r + 15 + 14;
    const target = world.findEnemyInMeleeRange(player.x, player.y, range);

    if (target) {
        player.canExecute = true;
        player.executeTarget = target;
    }
}

// ============================================================================
// ДОБИВАНИЕ
// ============================================================================
function executeEnemy(enemy) {
    const player = world.player;

    killEnemy(enemy, player.x, player.y, 'execute');

    stats.executions++;
    state.score += 500;

    addFloatingText(player.x, player.y - 40, 'ДОБИВАНИЕ! +500', '#ff0066');
    screenShake(15);
    state.slowMo = 30;
    audio.katana();

    if (stats.executions >= 5) ui.unlockAchievement('executioner');
}

// ============================================================================
// СТРЕЛЬБА ИГРОКА
// ============================================================================
function playerShoot() {
    const player = world.player;
    const weapon = player.currentWeapon;
    const ammo = player.currentAmmo;

    // --- Ближний бой (катана) ---
    if (weapon.melee) {
        player.shootCooldown = weapon.fireRate;
        player.muzzleFlash = 8;
        audio.katana();
        screenShake(4);

        for (const e of world.enemies) {
            if (!e.alive) continue;

            const d = dist(player.x, player.y, e.x, e.y);
            if (d > weapon.range + e.r) continue;

            const angleToEnemy = angleTo(player.x, player.y, e.x, e.y);
            let diff = angleToEnemy - player.angle;
            while (diff > Math.PI)  diff -= Math.PI * 2;
            while (diff < -Math.PI) diff += Math.PI * 2;

            if (Math.abs(diff) < 0.8) {
                killEnemy(e, player.x, player.y, 'katana');
            }
        }
        return;
    }

    // --- Огнестрел ---
    if (ammo.ammo <= 0) {
        if (ammo.reserve > 0) {
            if (player.startReload()) audio.reload();
        } else {
            audio.empty();
        }
        return;
    }

    if (player.shootCooldown > 0) return;
    if (!weapon.auto && !mouse.down) return;

    // Регистрируем выстрел
    player.shootCooldown = weapon.fireRate;
    ammo.ammo--;
    state.shotsFired++;
    player.muzzleFlash = 6;
    player.recoil = weapon.recoil;
    screenShake(weapon.recoil);

    // Звук по типу оружия
    if (player.weapon === 'shotgun')      audio.shotgun();
    else if (player.weapon === 'rifle')   audio.rifle();
    else                                  audio.shoot();

    // Вылет пуль (у дробовика — веер)
    for (let i = 0; i < weapon.pellets; i++) {
        const spread = weapon.spread * (Math.random() - 0.5) * 2;
        const a = player.angle + spread;

        world.spawnBullet(
            player.x + Math.cos(a) * (player.r + 6),
            player.y + Math.sin(a) * (player.r + 6),
            a,
            weapon.bulletSpeed,
            {
                life: 60,
                fromPlayer: true,
                damage: weapon.damage,
                range: weapon.range,
                startX: player.x,
                startY: player.y,
                color: '#ffff00'
            }
        );
    }

    // Гильза
    addParticles(
        player.x + Math.cos(player.angle) * 20,
        player.y + Math.sin(player.angle) * 20,
        '#ffaa00', 3, 2, 2, 15
    );
}

// ============================================================================
// ОБНОВЛЕНИЕ ПУЛЬ
// ============================================================================
function updateBullets() {
    for (const b of world.bullets) {
        if (b.dead) continue;

        let hit = false;

        // --- Стены ---
        for (const w of world.walls) {
            if (b.x > w.x && b.x < w.x + w.w && b.y > w.y && b.y < w.y + w.h) {
                addParticles(b.x, b.y, '#ffaa00', 4, 3, 2, 15);
                addBulletHole(b.x, b.y);
                hit = true;
                break;
            }
        }

        // --- Двери ---
        if (!hit) {
            for (const d of world.doors) {
                if (d.open) continue;
                if (b.x > d.x && b.x < d.x + d.w && b.y > d.y && b.y < d.y + d.h) {
                    addParticles(b.x, b.y, '#ffaa00', 4, 3, 2, 15);
                    addBulletHole(b.x, b.y);
                    hit = true;
                    break;
                }
            }
        }

        // --- Сущности ---
        if (!hit) {
            if (b.fromPlayer) {
                // Пуля игрока ищет врагов
                for (const e of world.enemies) {
                    if (!e.alive) continue;
                    const ddx = b.x - e.x;
                    const ddy = b.y - e.y;
                    if (ddx * ddx + ddy * ddy < e.r * e.r) {
                        damageEnemy(e, b.damage, b.startX, b.startY, world.player.weapon);
                        hit = true;
                        break;
                    }
                }
            } else if (world.player.alive) {
                // Вражеская пуля ищет игрока
                const ddx = b.x - world.player.x;
                const ddy = b.y - world.player.y;
                if (ddx * ddx + ddy * ddy < world.player.r * world.player.r) {
                    killPlayer();
                    hit = true;
                }
            }
        }

        if (hit) b.dead = true;
    }

    world.removeDeadBullets();
}

// ============================================================================
// УРОН ВРАГУ
// ============================================================================
function damageEnemy(enemy, damage, fromX, fromY, weaponType) {
    if (!enemy.alive) return;

    const killed = enemy.takeDamage(damage);

    addHitMarker(enemy.x, enemy.y, false);
    addDamageNumber(enemy.x, enemy.y - 15, damage, false);
    addParticles(enemy.x, enemy.y, enemy.bloodColor, 5, 4, 2, 20);
    audio.hit();

    state.shotsHit++;

    if (killed) {
        killEnemy(enemy, fromX, fromY, weaponType);
    } else {
        enemy.alert(fromX, fromY);
    }
}

// ============================================================================
// СМЕРТЬ ВРАГА
// ============================================================================
function killEnemy(enemy, fromX, fromY, weaponType) {
    if (!enemy.alive) return;

    // Форсируем смерть (для добивания и катаны — мгновенно)
    enemy.alive = false;
    enemy.state = 'dead';

    // Комбо и статистика
    state.kills++;
    state.combo++;
    state.comboTimer = COMBO_MAX_TIME;
    state.maxCombo = Math.max(state.maxCombo, state.combo);

    if (state.combo > 1) audio.combo(Math.min(state.combo, 10));

    // Очки
    const basePoints =
        enemy.type === 'brute'  ? 300 :
        enemy.type === 'ninja'  ? 400 :
        enemy.type === 'gunner' ? 200 : 100;

    const comboBonus = 1 + (state.combo - 1) * 0.2;
    state.score += Math.floor(basePoints * comboBonus);

    // Визуальные эффекты
    addParticles(enemy.x, enemy.y, '#ff0033', 20, 8, 4, 40);
    addParticles(enemy.x, enemy.y, enemy.bloodColor, 15, 6, 5, 50);
    addBloodStain(enemy.x, enemy.y);
    addBloodStain(enemy.x, enemy.y);
    addHitMarker(enemy.x, enemy.y, true);
    addDamageNumber(enemy.x, enemy.y - 20, 999, true);

    screenShake(12);
    state.hitStop = 6;
    state.slowMo = 15;
    audio.kill();

    // Труп
    world.addCorpse(enemy);

    // Статистика по оружию
    if (weaponType === 'shotgun') stats.shotgunKills++;
    if (weaponType === 'katana')  stats.katanaKills++;

    // Ачивки по комбо
    if (state.combo >= 5)  ui.unlockAchievement('combo5');
    if (state.combo >= 10) ui.unlockAchievement('combo10');
    if (state.combo >= 20) ui.unlockAchievement('combo20');
    if (state.kills === 1) ui.unlockAchievement('firstBlood');

    // Дроп оружия с врага
    if (enemy.weapon && enemy.weapon !== 'pistol' && enemy.weapon !== 'katana') {
        world.addPickup(enemy.x, enemy.y, enemy.weapon);
    }
}

// ============================================================================
// СМЕРТЬ ИГРОКА
// ============================================================================
function killPlayer() {
    const player = world.player;
    if (!player.alive) return;

    player.takeDamage();
    stats.noDamageThisLevel = false;

    addParticles(player.x, player.y, '#00ffff', 30, 8, 4, 50);
    addParticles(player.x, player.y, '#ff0033', 20, 6, 5, 60);
    addBloodStain(player.x, player.y, '#00cccc');
    addBloodStain(player.x, player.y, '#00cccc');

    screenShake(25);
    state.hitStop = 12;
    state.slowMo = 60;
    audio.hurt();
    ui.flashDamage();
}

// ============================================================================
// ДВЕРИ
// ============================================================================
function updateDoors() {
    for (const d of world.doors) d.update();
}

// ============================================================================
// ПОДБОР ПРЕДМЕТОВ
// ============================================================================
function updatePickups() {
    const player = world.player;
    if (!player.alive) return;

    for (const p of world.pickups) {
        if (p.taken) continue;

        const d = dist(player.x, player.y, p.x, p.y);
        if (d > player.r + 20) continue;

        const result = p.applyTo(player);
        if (!result) continue;

        if (result.type === 'health') {
            addFloatingText(player.x, player.y - 40, '+ЗДОРОВЬЕ', '#00ff00');
            audio.pickup();
        } else if (result.type === 'weapon') {
            addFloatingText(player.x, player.y - 40, WEAPONS[result.weapon].name, '#00ffff');
            audio.pickup();
        }
    }
}

// ============================================================================
// ЗАВЕРШЕНИЕ УРОВНЯ
// ============================================================================
function completeLevel() {
    state.gameState = 'complete';

    const level = LEVELS[state.currentLevel];
    const time = state.levelTime;

    // --- Подсчёт звёзд ---
    let stars = 1;
    if (time < level.time * 0.7)  stars = 2;
    if (time < level.time * 0.45) stars = 3;
    if (stats.noDamageThisLevel)  stars = Math.min(3, stars + 1);
    if (stats.flawless)           stars = Math.min(3, stars + 1);
    stars = Math.min(3, stars);

    // --- Сохранение прогресса ---
    ui.setStars(state.currentLevel, stars);
    if (state.currentLevel + 1 < LEVELS.length) {
        ui.unlockLevel(state.currentLevel + 1);
    }

    // --- Ачивки ---
    if (stars === 3)                       ui.unlockAchievement('perfect');
    if (stats.noDamageThisLevel)           ui.unlockAchievement('noDamage');
    if (time < 30)                         ui.unlockAchievement('speedrun');
    if (stats.flawless)                    ui.unlockAchievement('flawless');
    if (stats.weaponsUsed.size >= 4)       ui.unlockAchievement('allWeapons');
    if (stats.shotgunKills >= 10)          ui.unlockAchievement('shotgunMaster');
    if (stats.katanaKills >= 10)           ui.unlockAchievement('katanaMaster');
    if (state.currentLevel + 1 >= LEVELS.length) ui.unlockAchievement('survivor');

    // --- Бонусные очки ---
    const timeBonus = Math.max(0, Math.floor((level.time - time) * 100));
    const accuracy = state.shotsFired > 0 ? state.shotsHit / state.shotsFired : 1;
    const accuracyBonus = Math.floor(accuracy * 2000);
    const starBonus = stars * 1000;
    state.score += timeBonus + accuracyBonus + starBonus;

    // --- Экран победы ---
    ui.showLevelComplete({
        stars,
        time,
        kills: state.kills,
        accuracy,
        maxCombo: state.maxCombo,
        score: state.score,
        hasNext: state.currentLevel + 1 < LEVELS.length
    });

    audio.levelWin();
}

// ============================================================================
// ПАУЗА / ВОЗОБНОВЛЕНИЕ / ВЫХОД
// ============================================================================
export function pauseGame() {
    if (state.gameState !== 'playing') return;
    state.gameState = 'paused';
    state.pausedAt = performance.now();
    ui.showScreen('pause');
}

export function resumeGame() {
    if (state.gameState !== 'paused') return;

    // Сдвигаем старт времени, чтобы пауза не шла в зачёт уровня
    const pauseDuration = performance.now() - state.pausedAt;
    state.levelStartTime += pauseDuration;

    state.gameState = 'playing';
    ui.hideAllScreens();
}

export function quitToMenu() {
    state.gameState = 'menu';
    ui.showScreen('menu');
}

export function restartLevel() {
    startLevel(state.currentLevel);
}

export function nextLevel() {
    if (state.currentLevel + 1 < LEVELS.length) {
        startLevel(state.currentLevel + 1);
    } else {
        quitToMenu();
    }
}
