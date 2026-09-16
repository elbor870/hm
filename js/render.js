// ============================================================================
// RENDER.JS — Вся отрисовка: сцена, сущности, эффекты, HUD
// ============================================================================

import { W, H, WEAPONS } from './config.js';
import { world } from './entities.js';
import {
    particles, bloodStains, bulletHoles,
    hitMarkers, damageNumbers, floatingTexts
} from './effects.js';
import { mouse } from './input.js';

// ============================================================================
// КАМЕРА
// ============================================================================
export const camera = { x: 0, y: 0, shake: 0 };

export function screenShake(amount) {
    camera.shake = Math.max(camera.shake, amount);
}

export function updateCamera() {
    camera.shake *= 0.88;
    if (camera.shake < 0.2) camera.shake = 0;
    camera.x = (Math.random() - 0.5) * camera.shake;
    camera.y = (Math.random() - 0.5) * camera.shake;
}

// ============================================================================
// ГЛАВНАЯ ФУНКЦИЯ ОТРИСОВКИ
// ============================================================================
export function draw(ctx, combo, comboTimer, levelTime, score) {
    const player = world.player;

    ctx.save();
    ctx.translate(camera.x, camera.y);

    drawBackground(ctx);
    drawBloodStains(ctx);
    drawBulletHoles(ctx);
    drawCorpses(ctx);
    drawPickups(ctx);
    drawWalls(ctx);
    drawDoors(ctx);
    drawParticles(ctx);
    drawEnemies(ctx);
    drawPlayer(ctx, player);
    drawBullets(ctx);
    drawHitMarkers(ctx);
    drawDamageNumbers(ctx);
    drawFloatingTexts(ctx);
    drawCrosshair(ctx, player);
    drawMinimap(ctx, player);

    ctx.restore();

    drawHUD(ctx, player, combo, comboTimer, levelTime, score);
}

// ============================================================================
// ФОН
// ============================================================================
function drawBackground(ctx) {
    ctx.fillStyle = '#0a0a14';
    ctx.fillRect(-40, -40, W + 80, H + 80);

    ctx.strokeStyle = 'rgba(255, 0, 102, 0.06)';
    ctx.lineWidth = 1;
    const g = 40;
    for (let x = 0; x < W + g; x += g) {
        ctx.beginPath(); ctx.moveTo(x, -40); ctx.lineTo(x, H + 40); ctx.stroke();
    }
    for (let y = 0; y < H + g; y += g) {
        ctx.beginPath(); ctx.moveTo(-40, y); ctx.lineTo(W + 40, y); ctx.stroke();
    }
}

// ============================================================================
// КРОВЬ
// ============================================================================
function drawBloodStains(ctx) {
    for (const b of bloodStains) {
        ctx.fillStyle = b.color;
        ctx.globalAlpha = b.alpha;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(b.x + 3, b.y + 2, b.r * 0.6, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalAlpha = 1;
}

// ============================================================================
// ПУЛЕВЫЕ ОТВЕРСТИЯ
// ============================================================================
function drawBulletHoles(ctx) {
    for (const h of bulletHoles) {
        ctx.fillStyle = `rgba(0, 0, 0, ${h.alpha})`;
        ctx.beginPath();
        ctx.arc(h.x, h.y, h.r, 0, Math.PI * 2);
        ctx.fill();
    }
}

// ============================================================================
// ТРУПЫ
// ============================================================================
function drawCorpses(ctx) {
    for (const c of world.corpses) {
        ctx.save();
        ctx.translate(c.x, c.y);
        ctx.rotate(c.angle);
        ctx.fillStyle = c.color;
        ctx.globalAlpha = c.alpha;
        ctx.beginPath();
        ctx.ellipse(0, 0, c.rx, c.ry, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.restore();
    }
}

// ============================================================================
// ПИКАПЫ
// ============================================================================
function drawPickups(ctx) {
    const t = performance.now() / 1000;
    for (const p of world.pickups) {
        if (p.taken) continue;
        const pulse = p.pulse(t);
        const bob = p.bob(t);

        ctx.save();
        ctx.translate(p.x, p.y + bob);
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 20 * pulse;
        ctx.fillStyle = p.color;

        if (p.isHealth) {
            ctx.fillRect(-6, -2, 12, 4);
            ctx.fillRect(-2, -6, 4, 12);
        } else {
            ctx.fillRect(-10, -6, 20, 12);
            ctx.fillStyle = '#000';
            ctx.fillRect(-6, -3, 12, 6);
        }
        ctx.restore();
    }
}

// ============================================================================
// СТЕНЫ
// ============================================================================
function drawWalls(ctx) {
    for (const w of world.walls) {
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(w.x, w.y, w.w, w.h);
        ctx.fillStyle = '#252540';
        ctx.fillRect(w.x + 3, w.y + 3, w.w - 6, w.h - 6);

        ctx.strokeStyle = '#ff0066';
        ctx.lineWidth = 2;
        ctx.strokeRect(w.x, w.y, w.w, w.h);

        ctx.shadowColor = '#ff0066';
        ctx.shadowBlur = 10;
        ctx.strokeRect(w.x, w.y, w.w, w.h);
        ctx.shadowBlur = 0;
    }
}

// ============================================================================
// ДВЕРИ
// ============================================================================
function drawDoors(ctx) {
    for (const d of world.doors) {
        ctx.save();
        ctx.translate(d.cx, d.cy);
        if (d.orient === 'v') ctx.rotate(d.angle);
        else ctx.rotate(-d.angle);

        ctx.fillStyle = d.open ? '#4a4a60' : '#3a3a55';
        ctx.fillRect(-d.w / 2, -d.h / 2, d.w, d.h);

        ctx.strokeStyle = '#00ffff';
        ctx.lineWidth = 2;
        ctx.strokeRect(-d.w / 2, -d.h / 2, d.w, d.h);

        ctx.shadowColor = '#00ffff';
        ctx.shadowBlur = 8;
        ctx.strokeRect(-d.w / 2, -d.h / 2, d.w, d.h);
        ctx.shadowBlur = 0;
        ctx.restore();
    }
}

// ============================================================================
// ЧАСТИЦЫ
// ============================================================================
function drawParticles(ctx) {
    for (const p of particles) {
        const alpha = p.life / p.maxLife;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalAlpha = 1;
}

// ============================================================================
// ВРАГИ
// ============================================================================
function drawEnemies(ctx) {
    const t = performance.now() / 100;

    for (const e of world.enemies) {
        if (!e.alive) continue;

        // Индикатор тревоги
        if (e.alerted) {
            ctx.strokeStyle = `rgba(255, 0, 0, ${0.3 + Math.sin(t) * 0.2})`;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(e.x, e.y, e.r + 12, 0, Math.PI * 2);
            ctx.stroke();
        }

        ctx.save();
        ctx.translate(e.x, e.y);
        ctx.rotate(e.angle);

        // Тело
        ctx.shadowColor = e.color;
        ctx.shadowBlur = 20;
        ctx.fillStyle = e.hitFlash > 0 ? '#ffffff' : e.color;
        ctx.beginPath();
        ctx.arc(0, 0, e.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Внутренний круг
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(0, 0, e.r * 0.6, 0, Math.PI * 2);
        ctx.fill();

        // Направление
        ctx.fillStyle = e.hitFlash > 0 ? '#fff' : e.color;
        ctx.beginPath();
        ctx.moveTo(e.r - 2, -4);
        ctx.lineTo(e.r + 10, 0);
        ctx.lineTo(e.r - 2, 4);
        ctx.closePath();
        ctx.fill();

        // HP бар
        if (e.hp < e.maxHp) {
            ctx.rotate(-e.angle);
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(-15, -22, 30, 5);
            const pct = e.healthPercent;
            ctx.fillStyle = pct > 0.5 ? '#00ff00' : pct > 0.25 ? '#ffaa00' : '#ff0000';
            ctx.fillRect(-15, -22, 30 * pct, 5);
        }

        ctx.restore();
    }
}

// ============================================================================
// ИГРОК
// ============================================================================
function drawPlayer(ctx, player) {
    if (!player.alive) return;

    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.rotate(player.angle);

    // Тело
    ctx.shadowColor = '#00ffff';
    ctx.shadowBlur = 30;
    ctx.fillStyle = '#00ffff';
    ctx.beginPath();
    ctx.arc(0, 0, player.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Внутренний круг
    ctx.fillStyle = '#003344';
    ctx.beginPath();
    ctx.arc(0, 0, player.r * 0.55, 0, Math.PI * 2);
    ctx.fill();

    // Ствол
    ctx.fillStyle = '#00ffff';
    ctx.beginPath();
    ctx.moveTo(player.r - 2, -5);
    ctx.lineTo(player.r + 14, 0);
    ctx.lineTo(player.r - 2, 5);
    ctx.closePath();
    ctx.fill();

    // Muzzle flash
    if (player.muzzleFlash > 0) {
        ctx.fillStyle = `rgba(255, 255, 0, ${player.muzzleFlash / 6})`;
        ctx.beginPath();
        ctx.arc(player.r + 16, 0, 12, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.restore();

    // Индикатор добивания
    if (player.canExecute && player.executeTarget) {
        ctx.save();
        ctx.translate(player.executeTarget.x, player.executeTarget.y - 30);
        const pulse = 1 + Math.sin(performance.now() / 100) * 0.2;
        ctx.scale(pulse, pulse);
        ctx.fillStyle = '#ff0066';
        ctx.font = 'bold 16px "Courier New"';
        ctx.textAlign = 'center';
        ctx.shadowColor = '#ff0066';
        ctx.shadowBlur = 15;
        ctx.fillText('[E]', 0, 0);
        ctx.restore();
    }
}

// ============================================================================
// ПУЛИ
// ============================================================================
function drawBullets(ctx) {
    for (const b of world.bullets) {
        ctx.shadowColor = b.color;
        ctx.shadowBlur = 15;
        ctx.fillStyle = b.color;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = b.color + 'aa';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(b.x, b.y);
        ctx.lineTo(b.tailX, b.tailY);
        ctx.stroke();
        ctx.shadowBlur = 0;
    }
}

// ============================================================================
// HIT MARKERS
// ============================================================================
function drawHitMarkers(ctx) {
    for (const hm of hitMarkers) {
        const alpha = hm.life / hm.maxLife;
        ctx.strokeStyle = hm.kill
            ? `rgba(255, 0, 102, ${alpha})`
            : `rgba(255, 255, 255, ${alpha})`;
        ctx.lineWidth = hm.kill ? 3 : 2;
        const s = hm.kill ? 12 : 8;
        ctx.beginPath();
        ctx.moveTo(hm.x - s, hm.y - s); ctx.lineTo(hm.x - s / 2, hm.y - s / 2);
        ctx.moveTo(hm.x + s, hm.y - s); ctx.lineTo(hm.x + s / 2, hm.y - s / 2);
        ctx.moveTo(hm.x - s, hm.y + s); ctx.lineTo(hm.x - s / 2, hm.y + s / 2);
        ctx.moveTo(hm.x + s, hm.y + s); ctx.lineTo(hm.x + s / 2, hm.y + s / 2);
        ctx.stroke();
    }
}

// ============================================================================
// ЧИСЛА УРОНА
// ============================================================================
function drawDamageNumbers(ctx) {
    for (const dn of damageNumbers) {
        const alpha = dn.life / dn.maxLife;
        ctx.fillStyle = dn.kill
            ? `rgba(255, 0, 102, ${alpha})`
            : `rgba(255, 255, 255, ${alpha})`;
        ctx.font = dn.kill ? 'bold 22px "Courier New"' : 'bold 16px "Courier New"';
        ctx.textAlign = 'center';
        ctx.shadowColor = dn.kill ? '#ff0066' : '#fff';
        ctx.shadowBlur = 8;
        ctx.fillText(dn.kill ? '✖' : Math.ceil(dn.dmg), dn.x, dn.y);
        ctx.shadowBlur = 0;
    }
}

// ============================================================================
// ВСПЛЫВАЮЩИЙ ТЕКСТ
// ============================================================================
function drawFloatingTexts(ctx) {
    for (const ft of floatingTexts) {
        const alpha = ft.life / ft.maxLife;
        ctx.fillStyle = ft.color;
        ctx.globalAlpha = alpha;
        ctx.font = 'bold 18px "Courier New"';
        ctx.textAlign = 'center';
        ctx.shadowColor = ft.color;
        ctx.shadowBlur = 10;
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
    }
}

// ============================================================================
// ПРИЦЕЛ
// ============================================================================
function drawCrosshair(ctx, player) {
    if (!player.alive) return;
    const cx = mouse.x, cy = mouse.y;
    const color = player.canExecute ? '#ff0066' : '#00ffff';

    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.shadowColor = color;
    ctx.shadowBlur = 12;

    const s = 14, gap = 5;
    ctx.beginPath();
    ctx.moveTo(cx - s, cy); ctx.lineTo(cx - gap, cy);
    ctx.moveTo(cx + gap, cy); ctx.lineTo(cx + s, cy);
    ctx.moveTo(cx, cy - s); ctx.lineTo(cx, cy - gap);
    ctx.moveTo(cx, cy + gap); ctx.lineTo(cx, cy + s);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, 2, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.shadowBlur = 0;
}

// ============================================================================
// МИНИКАРТА
// ============================================================================
function drawMinimap(ctx, player) {
    const mmW = 200, mmH = 130;
    const mmX = W - mmW - 20;
    const mmY = 20;
    const scale = Math.min(mmW / W, mmH / H);

    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(mmX, mmY, mmW, mmH);
    ctx.translate(mmX + (mmW - W * scale) / 2, mmY + (mmH - H * scale) / 2);
    ctx.scale(scale, scale);

    // Стены
    ctx.fillStyle = 'rgba(255, 0, 102, 0.4)';
    for (const w of world.walls) ctx.fillRect(w.x, w.y, w.w, w.h);

    // Враги
    for (const e of world.enemies) {
        if (!e.alive) continue;
        ctx.fillStyle = e.alerted ? '#ff0000' : '#ff6600';
        ctx.beginPath();
        ctx.arc(e.x, e.y, 12, 0, Math.PI * 2);
        ctx.fill();
    }

    // Пикапы
    for (const p of world.pickups) {
        if (p.taken) continue;
        ctx.fillStyle = '#ffcc00';
        ctx.fillRect(p.x - 5, p.y - 5, 10, 10);
    }

    // Игрок
    if (player.alive) {
        ctx.fillStyle = '#00ffff';
        ctx.beginPath();
        ctx.arc(player.x, player.y, 12, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#00ffff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(player.x, player.y);
        ctx.lineTo(
            player.x + Math.cos(player.angle) * 30,
            player.y + Math.sin(player.angle) * 30
        );
        ctx.stroke();
    }

    ctx.restore();

    // Рамка
    ctx.strokeStyle = '#ff0066';
    ctx.lineWidth = 1;
    ctx.strokeRect(mmX, mmY, mmW, mmH);
}

// ============================================================================
// HUD
// ============================================================================
function drawHUD(ctx, player, combo, comboTimer, levelTime, score) {
    ctx.save();

    const weapon = WEAPONS[player.weapon];
    const ammo = player.currentAmmo;

    // Оружие
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 20px "Courier New"';
    ctx.textAlign = 'left';
    ctx.shadowColor = '#ff0066';
    ctx.shadowBlur = 8;
    ctx.fillText(weapon.name, 25, 40);

    if (!weapon.melee) {
        ctx.font = 'bold 24px "Courier New"';
        ctx.fillStyle = ammo.ammo > 0 ? '#fff' : '#ff0000';
        ctx.fillText(`${ammo.ammo} / ${ammo.reserve}`, 25, 70);
    } else {
        ctx.font = 'bold 24px "Courier New"';
        ctx.fillStyle = '#ff00ff';
        ctx.fillText('∞', 25, 70);
    }

    // Перезарядка
    if (player.isReloading) {
        const total = weapon.reloadTime;
        const progress = 1 - player.reloading / total;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(25, 80, 200, 8);
        ctx.fillStyle = '#ffaa00';
        ctx.fillRect(25, 80, 200 * progress, 8);
        ctx.font = 'bold 14px "Courier New"';
        ctx.fillText('ПЕРЕЗАРЯДКА', 25, 105);
    }

    // Комбо
    if (combo > 1) {
        const alpha = Math.min(1, comboTimer / 30);
        ctx.globalAlpha = alpha;
        ctx.font = 'bold 42px "Courier New"';
        ctx.fillStyle = '#ff0066';
        ctx.textAlign = 'center';
        ctx.shadowColor = '#ff0066';
        ctx.shadowBlur = 20;
        ctx.fillText(`x${combo}`, W / 2, 80);

        ctx.fillStyle = '#ff0066';
        ctx.fillRect(W / 2 - 100, 90, 200 * (comboTimer / 90), 4);
        ctx.globalAlpha = 1;
    }

    // Время
    ctx.textAlign = 'right';
    ctx.fillStyle = '#00ffff';
    ctx.font = 'bold 20px "Courier New"';
    ctx.shadowColor = '#00ffff';
    ctx.fillText(`${levelTime.toFixed(1)}s`, W - 25, 40);

    // Счёт
    ctx.fillStyle = '#ffcc00';
    ctx.font = 'bold 18px "Courier New"';
    ctx.shadowColor = '#ffcc00';
    ctx.fillText(`${score}`, W - 25, 70);

    // Враги
    const alive = world.aliveEnemyCount;
    ctx.fillStyle = alive > 0 ? '#ff3355' : '#00ff00';
    ctx.font = 'bold 18px "Courier New"';
    ctx.shadowColor = alive > 0 ? '#ff3355' : '#00ff00';
    ctx.fillText(`ВРАГОВ: ${alive}`, W - 25, 100);

    ctx.restore();
}
