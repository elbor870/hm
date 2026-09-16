// ============================================================================
// AI.JS — Логика врагов: состояния, движение, стрельба
// ============================================================================

import { world } from './entities.js';
import { audio } from './audio.js';
import { addParticles } from './effects.js';
import { hasLineOfSight, resolveWallCollisions } from './physics.js';
import { dist, angleTo, clamp, rand, normalizeAngle } from './utils.js';
import { W, H } from './config.js';

// ============================================================================
// ГЛАВНАЯ ФУНКЦИЯ ОБНОВЛЕНИЯ ВСЕХ ВРАГОВ
// ============================================================================
export function updateEnemies(player, damagePlayer) {
    for (const e of world.enemies) {
        if (!e.alive) continue;
        updateEnemy(e, player, damagePlayer);
    }
}

// ============================================================================
// ОБНОВЛЕНИЕ ОДНОГО ВРАГА
// ============================================================================
function updateEnemy(e, player, damagePlayer) {
    const d = dist(e.x, e.y, player.x, player.y);
    const canSee = player.alive
        && d < e.viewRange
        && hasLineOfSight(e.x, e.y, player.x, player.y, world.walls, world.doors);

    // --- Определение состояния ---
    updateState(e, canSee, player);

    // --- Поведение по состоянию ---
    switch (e.state) {
        case 'chase':
            behaviorChase(e, player, d, canSee, damagePlayer);
            break;
        case 'search':
            e.searchTick();
            break;
        default:
            e.patrolTick();
            break;
    }

    // --- Коллизии ---
    resolveWallCollisions(e, world.walls, world.doors);
    e.x = clamp(e.x, e.r, W - e.r);
    e.y = clamp(e.y, e.r, H - e.r);

    // --- Открывание дверей рядом ---
    tryOpenDoors(e);
}

// ============================================================================
// МАШИНА СОСТОЯНИЙ
// ============================================================================
function updateState(e, canSee, player) {
    if (canSee) {
        if (e.state !== 'chase') {
            e.alert(player.x, player.y);
        } else {
            // Обновляем последнюю известную позицию
            e.lastKnownPlayerPos.x = player.x;
            e.lastKnownPlayerPos.y = player.y;
            e.stateTimer = 180;
        }
        return;
    }

    // Потеряли из вида
    if (e.state === 'chase') {
        e.stateTimer--;
        if (e.stateTimer <= 0) {
            e.loseSight();
        }
    } else if (e.state === 'search') {
        e.stateTimer--;
        if (e.stateTimer <= 0) {
            e.giveUpSearch();
        }
    }
}

// ============================================================================
// ПОВЕДЕНИЕ: ПРЕСЛЕДОВАНИЕ
// ============================================================================
function behaviorChase(e, player, d, canSee, damagePlayer) {
    const target = e.lastKnownPlayerPos;
    const ta = angleTo(e.x, e.y, target.x, target.y);
    e.angle = ta;

    if (e.melee) {
        // Ближний бой — бежит прямо на игрока
        if (d > player.r + e.r) {
            e.moveToward(player.x, player.y, 1.4);
        }
        // Атака в упор
        if (d < player.r + e.r + 5 && e.canMeleeAttack()) {
            damagePlayer();
            e.registerMeleeAttack();
        }
    } else {
        // Стрелок — держит дистанцию
        if (d > 250) {
            e.moveToward(target.x, target.y, 1);
        } else if (d < 150) {
            e.moveAwayFrom(target.x, target.y, 0.7);
        }

        // Стрельба
        if (canSee && d < e.viewRange) {
            e.shootTimer--;
            if (e.canShoot()) {
                fireEnemyBullet(e, player);
                e.registerShot();
            }
        }
    }
}

// ============================================================================
// СТРЕЛЬБА ВРАГА
// ============================================================================
function fireEnemyBullet(e, player) {
    const baseAngle = angleTo(e.x, e.y, player.x, player.y);
    const spreadAmount = (e.accuracy || 0.15) * 3;
    const angle = baseAngle + rand(-spreadAmount, spreadAmount);

    const muzzleX = e.x + Math.cos(angle) * (e.r + 6);
    const muzzleY = e.y + Math.sin(angle) * (e.r + 6);

    world.spawnBullet(muzzleX, muzzleY, angle, 12, {
        life: 70,
        fromPlayer: false,
        damage: 100,
        range: 500,
        color: '#ff8800'
    });

    audio.shoot();
    addParticles(muzzleX, muzzleY, '#ff8800', 3, 2, 2, 15);
}

// ============================================================================
// ОТКРЫВАНИЕ ДВЕРЕЙ РЯДОМ С ВРАГОМ
// ============================================================================
function tryOpenDoors(e) {
    for (const door of world.doors) {
        if (door.open || door.locked) continue;
        const d = dist(e.x, e.y, door.cx, door.cy);
        if (d < 50) {
            door.open_();
            audio.door();
        }
    }
}

// ============================================================================
// ВСПОМОГАТЕЛЬНОЕ: ОБНОВЛЕНИЕ ВСЕХ ДВЕРЕЙ (вызывается из game.js)
// ============================================================================
export function updateDoors() {
    for (const d of world.doors) d.update();
}
