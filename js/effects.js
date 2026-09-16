// Эффекты: частицы, кровь, гильзы, hit markers, floating text

import { rand } from './utils.js';

export const particles = [];
export const bloodStains = [];
export const bulletHoles = [];
export const hitMarkers = [];
export const damageNumbers = [];
export const floatingTexts = [];

export function addParticles(x, y, color, count, speed, size = 3, life = 30) {
    for (let i = 0; i < count; i++) {
        const a = rand(0, Math.PI * 2);
        const sp = rand(1, speed);
        particles.push({
            x, y,
            vx: Math.cos(a) * sp,
            vy: Math.sin(a) * sp,
            life: rand(life * 0.5, life),
            maxLife: life,
            color,
            size: rand(1, size)
        });
    }
}

export function addBloodStain(x, y, color = '#880011') {
    bloodStains.push({
        x: x + rand(-15, 15),
        y: y + rand(-15, 15),
        r: rand(8, 25),
        alpha: rand(0.4, 0.7),
        color
    });
    if (bloodStains.length > 150) bloodStains.shift();
}

export function addBulletHole(x, y) {
    bulletHoles.push({ x, y, r: rand(2, 5), alpha: 0.8 });
    if (bulletHoles.length > 100) bulletHoles.shift();
}

export function addHitMarker(x, y, kill = false) {
    hitMarkers.push({ x, y, life: kill ? 25 : 15, maxLife: kill ? 25 : 15, kill });
}

export function addDamageNumber(x, y, dmg, kill = false) {
    damageNumbers.push({ x, y, dmg, life: 40, maxLife: 40, vy: -1, kill });
}

export function addFloatingText(x, y, text, color = '#ffcc00') {
    floatingTexts.push({ x, y, text, color, life: 60, maxLife: 60, vy: -1.2 });
}

export function updateEffects() {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx; p.y += p.vy;
        p.vx *= 0.93; p.vy *= 0.93;
        p.life--;
        if (p.life <= 0) particles.splice(i, 1);
    }
    for (let i = bloodStains.length - 1; i >= 0; i--) {
        bloodStains[i].alpha *= 0.9995;
        if (bloodStains[i].alpha < 0.05) bloodStains.splice(i, 1);
    }
    for (let i = bulletHoles.length - 1; i >= 0; i--) {
        bulletHoles[i].alpha *= 0.999;
        if (bulletHoles[i].alpha < 0.1) bulletHoles.splice(i, 1);
    }
    for (let i = hitMarkers.length - 1; i >= 0; i--) {
        hitMarkers[i].life--;
        if (hitMarkers[i].life <= 0) hitMarkers.splice(i, 1);
    }
    for (let i = damageNumbers.length - 1; i >= 0; i--) {
        damageNumbers[i].life--;
        damageNumbers[i].y += damageNumbers[i].vy;
        damageNumbers[i].vy *= 0.94;
        if (damageNumbers[i].life <= 0) damageNumbers.splice(i, 1);
    }
    for (let i = floatingTexts.length - 1; i >= 0; i--) {
        floatingTexts[i].life--;
        floatingTexts[i].y += floatingTexts[i].vy;
        floatingTexts[i].vy *= 0.96;
        if (floatingTexts[i].life <= 0) floatingTexts.splice(i, 1);
    }
}

export function clearEffects() {
    particles.length = 0;
    bloodStains.length = 0;
    bulletHoles.length = 0;
    hitMarkers.length = 0;
    damageNumbers.length = 0;
    floatingTexts.length = 0;
}
