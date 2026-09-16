// ============================================================================
// PHYSICS.JS — Физика: коллизии, линия видимости, raycast
// ============================================================================

import { circleRectCollision } from './utils.js';

// ---------------------------------------------------------------------------
// РАЗРЕШЕНИЕ КОЛЛИЗИЙ СО СТЕНАМИ И ДВЕРЯМИ
// ---------------------------------------------------------------------------
export function resolveWallCollisions(entity, walls, doors) {
    for (const w of walls) {
        resolveCircleRect(entity, w);
    }
    for (const d of doors) {
        if (d.open) continue;
        resolveCircleRect(entity, d);
    }
}

function resolveCircleRect(entity, rect) {
    const closestX = Math.max(rect.x, Math.min(entity.x, rect.x + rect.w));
    const closestY = Math.max(rect.y, Math.min(entity.y, rect.y + rect.h));
    const dx = entity.x - closestX;
    const dy = entity.y - closestY;
    const d2 = dx * dx + dy * dy;

    if (d2 < entity.r * entity.r) {
        const d = Math.sqrt(d2);
        if (d > 0.01) {
            const overlap = entity.r - d;
            entity.x += (dx / d) * overlap;
            entity.y += (dy / d) * overlap;
        } else {
            // Центр внутри прямоугольника — выталкиваем наружу по короткой стороне
            const cx = rect.x + rect.w / 2;
            const cy = rect.y + rect.h / 2;
            const ddx = entity.x - cx;
            const ddy = entity.y - cy;
            const dd = Math.hypot(ddx, ddy) || 1;
            entity.x += (ddx / dd) * (entity.r + 2);
            entity.y += (ddy / dd) * (entity.r + 2);
        }
    }
}

// ---------------------------------------------------------------------------
// ЛИНИЯ ВИДИМОСТИ (raycast по сетке через стены и двери)
// ---------------------------------------------------------------------------
export function hasLineOfSight(x1, y1, x2, y2, walls, doors) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy);
    if (len < 1) return true;

    const steps = Math.ceil(len / 12);
    for (let i = 1; i < steps; i++) {
        const t = i / steps;
        const px = x1 + dx * t;
        const py = y1 + dy * t;

        for (const w of walls) {
            if (px > w.x && px < w.x + w.w && py > w.y && py < w.y + w.h) {
                return false;
            }
        }
        for (const d of doors) {
            if (d.open) continue;
            if (px > d.x && px < d.x + d.w && py > d.y && py < d.y + d.h) {
                return false;
            }
        }
    }
    return true;
}

// ---------------------------------------------------------------------------
// ПОИСК БЛИЖАЙШЕЙ ТОЧКИ СТОЛКНОВЕНИЯ ЛУЧА СО СТЕНОЙ
// (для трассировки пуль, если понадобится)
// ---------------------------------------------------------------------------
export function raycastWalls(x1, y1, x2, y2, walls, doors) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy);
    if (len < 1) return null;

    const steps = Math.ceil(len / 4);
    for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        const px = x1 + dx * t;
        const py = y1 + dy * t;

        for (const w of walls) {
            if (px > w.x && px < w.x + w.w && py > w.y && py < w.y + w.h) {
                return { x: px, y: py, hit: 'wall' };
            }
        }
        for (const d of doors) {
            if (d.open) continue;
            if (px > d.x && px < d.x + d.w && py > d.y && py < d.y + d.h) {
                return { x: px, y: py, hit: 'door' };
            }
        }
    }
    return null;
}

// ---------------------------------------------------------------------------
// ПРОВЕРКА, НАХОДИТСЯ ЛИ ТОЧКА В СТЕНЕ / ДВЕРИ
// ---------------------------------------------------------------------------
export function pointInWalls(x, y, walls, doors) {
    for (const w of walls) {
        if (x > w.x && x < w.x + w.w && y > w.y && y < w.y + w.h) return true;
    }
    for (const d of doors) {
        if (d.open) continue;
        if (x > d.x && x < d.x + d.w && y > d.y && y < d.y + d.h) return true;
    }
    return false;
}

// ---------------------------------------------------------------------------
// ПРОВЕРКА, ПОПАДАЕТ ЛИ КРУГ В ЛЮБУЮ СТЕНУ
// ---------------------------------------------------------------------------
export function circleInWalls(cx, cy, cr, walls, doors) {
    for (const w of walls) {
        if (circleRectCollision(cx, cy, cr, w)) return true;
    }
    for (const d of doors) {
        if (d.open) continue;
        if (circleRectCollision(cx, cy, cr, d)) return true;
    }
    return false;
}

// Реэкспорт утилит для удобства
export { dist, angleTo, clamp } from './utils.js';
