// ============================================================================
// ENTITIES.JS — Сущности игры: Player, Enemy, Bullet, Corpse, Pickup, Door, Wall
// ============================================================================
// Этот модуль содержит ТОЛЬКО данные и простые методы сущностей.
// Вся логика поведения (ИИ, стрельба, коллизии) — в ai.js / game.js.
// ============================================================================

import { WEAPONS, WEAPON_KEYS, ENEMY_TYPES } from './config.js';
import { rand, dist, angleTo, normalizeAngle } from './utils.js';

// ============================================================================
// PLAYER — Игрок
// ============================================================================
export class Player {
    constructor(x = 0, y = 0) {
        this.reset(x, y);
    }

    reset(x = 0, y = 0) {
        // Позиция и движение
        this.x = x;
        this.y = y;
        this.r = 14;
        this.speed = 3.6;
        this.angle = 0;
        this.alive = true;

        // Оружие
        this.weapon = 'pistol';
        this.weapons = this.createDefaultArsenal();

        // Таймеры
        this.shootCooldown = 0;
        this.reloading = 0;
        this.recoil = 0;
        this.muzzleFlash = 0;

        // Рывок
        this.dashCooldown = 0;
        this.dashing = 0;
        this.dashDir = { x: 0, y: 0 };
        this.dashDuration = 8;
        this.dashSpeed = 9;
        this.dashCooldownMax = 45;

        // Добивание
        this.canExecute = false;
        this.executeTarget = null;
        this.executeRange = 15;

        // Прочее
        this.footstepTimer = 0;
        this.hitFlash = 0;
    }

    createDefaultArsenal() {
        return {
            pistol:  { ammo: 12, reserve: 60, unlocked: true },
            shotgun: { ammo: 0,  reserve: 0,  unlocked: false },
            rifle:   { ammo: 0,  reserve: 0,  unlocked: false },
            katana:  { ammo: 1,  reserve: 1,  unlocked: false }
        };
    }

    // ----- Геттеры -----
    get currentWeapon() {
        return WEAPONS[this.weapon];
    }

    get currentAmmo() {
        return this.weapons[this.weapon];
    }

    get isReloading() {
        return this.reloading > 0;
    }

    get isDashing() {
        return this.dashing > 0;
    }

    get canDash() {
        return this.dashCooldown <= 0 && !this.isDashing;
    }

    get canShoot() {
        return this.alive && !this.isReloading && this.shootCooldown <= 0;
    }

    // ----- Действия -----
    startReload() {
        const weapon = this.currentWeapon;
        const ammo = this.currentAmmo;
        if (weapon.melee) return false;
        if (ammo.reserve <= 0) return false;
        if (ammo.ammo >= weapon.mag) return false;
        if (this.reloading > 0) return false;

        this.reloading = weapon.reloadTime;
        return true;
    }

    finishReload() {
        const weapon = this.currentWeapon;
        const ammo = this.currentAmmo;
        const need = weapon.mag - ammo.ammo;
        const take = Math.min(need, ammo.reserve);
        ammo.ammo += take;
        ammo.reserve -= take;
    }

    startDash(dirX, dirY) {
        if (!this.canDash) return false;
        const len = Math.hypot(dirX, dirY) || 1;
        this.dashDir = { x: dirX / len, y: dirY / len };
        this.dashing = this.dashDuration;
        this.dashCooldown = this.dashCooldownMax;
        return true;
    }

    switchWeapon(slot) {
        // slot: 1..4
        const key = WEAPON_KEYS[slot - 1];
        if (!key) return false;
        if (!this.weapons[key].unlocked) return false;
        if (this.weapon === key) return false;
        this.weapon = key;
        this.reloading = 0;
        this.shootCooldown = Math.max(this.shootCooldown, 4);
        return true;
    }

    // ----- Обновление таймеров -----
    tick() {
        if (this.shootCooldown > 0) this.shootCooldown--;
        if (this.muzzleFlash > 0) this.muzzleFlash--;
        if (this.dashCooldown > 0) this.dashCooldown--;
        if (this.hitFlash > 0) this.hitFlash--;
        if (this.recoil > 0) this.recoil *= 0.85;

        if (this.isDashing) {
            this.dashing--;
            this.x += this.dashDir.x * this.dashSpeed;
            this.y += this.dashDir.y * this.dashSpeed;
        }

        if (this.isReloading) {
            this.reloading--;
            if (this.reloading === 0) this.finishReload();
        }
    }

    takeDamage() {
        if (!this.alive) return false;
        this.alive = false;
        return true;
    }
}

// ============================================================================
// ENEMY — Враг
// ============================================================================
export class Enemy {
    constructor(x, y, type = 'thug') {
        const cfg = ENEMY_TYPES[type] || ENEMY_TYPES.thug;

        // Позиция
        this.x = x;
        this.y = y;
        this.r = 14;
        this.angle = rand(0, Math.PI * 2);

        // Параметры из типа
        this.type = type;
        this.speed = cfg.speed;
        this.hp = cfg.hp;
        this.maxHp = cfg.hp;
        this.fireRate = cfg.fireRate;
        this.accuracy = cfg.accuracy;
        this.color = cfg.color;
        this.viewRange = cfg.viewRange;
        this.weapon = cfg.weapon;
        this.melee = cfg.melee;

        // Состояние
        this.alive = true;
        this.state = 'patrol'; // patrol | chase | search | dead
        this.stateTimer = 0;
        this.alerted = false;
        this.hitFlash = 0;

        // Патруль
        this.wanderAngle = rand(0, Math.PI * 2);
        this.wanderTimer = rand(30, 120);

        // Стрельба
        this.shootTimer = rand(20, 80);

        // Поиск
        this.lastKnownPlayerPos = { x, y };
        this.searchAngle = 0;

        // Ближний бой
        this.meleeAttackCooldown = 0;

        // Прочее
        this.bloodColor = '#aa0011';
    }

    // ----- Геттеры -----
    get isAlive() {
        return this.alive;
    }

    get isAlerted() {
        return this.alerted;
    }

    get healthPercent() {
        return this.hp / this.maxHp;
    }

    get isMelee() {
        return this.melee;
    }

    // ----- Урон -----
    takeDamage(amount) {
        if (!this.alive) return false;
        this.hp -= amount;
        this.hitFlash = 6;
        if (this.hp <= 0) {
            this.hp = 0;
            this.alive = false;
            this.state = 'dead';
            return true; // убит
        }
        return false;
    }

    // ----- Алерт -----
    alert(playerX, playerY) {
        this.alerted = true;
        this.state = 'chase';
        this.stateTimer = 180;
        this.lastKnownPlayerPos = { x: playerX, y: playerY };
    }

    loseSight() {
        if (this.state !== 'chase') return;
        this.state = 'search';
        this.stateTimer = 120;
        this.searchAngle = this.angle;
    }

    giveUpSearch() {
        this.state = 'patrol';
        this.alerted = false;
    }

    // ----- Обновление таймеров -----
    tick() {
        if (this.hitFlash > 0) this.hitFlash--;
        if (this.meleeAttackCooldown > 0) this.meleeAttackCooldown--;
        if (this.stateTimer > 0 && this.state !== 'patrol') this.stateTimer--;
    }

    // ----- Поворот к цели -----
    lookAt(tx, ty) {
        this.angle = angleTo(this.x, this.y, tx, ty);
    }

    // ----- Движение -----
    moveBy(dx, dy) {
        this.x += dx;
        this.y += dy;
    }

    moveToward(tx, ty, speedScale = 1) {
        const a = angleTo(this.x, this.y, tx, ty);
        this.x += Math.cos(a) * this.speed * speedScale;
        this.y += Math.sin(a) * this.speed * speedScale;
    }

    moveAwayFrom(tx, ty, speedScale = 0.7) {
        const a = angleTo(this.x, this.y, tx, ty);
        this.x -= Math.cos(a) * this.speed * speedScale;
        this.y -= Math.sin(a) * this.speed * speedScale;
    }

    // ----- Патруль -----
    patrolTick() {
        this.wanderTimer--;
        if (this.wanderTimer <= 0) {
            this.wanderAngle = rand(0, Math.PI * 2);
            this.wanderTimer = rand(60, 180);
        }
        this.angle = this.wanderAngle;
        this.x += Math.cos(this.wanderAngle) * this.speed * 0.4;
        this.y += Math.sin(this.wanderAngle) * this.speed * 0.4;
        if (Math.random() < 0.005) this.wanderAngle += rand(-1, 1);
    }

    // ----- Поиск -----
    searchTick() {
        this.searchAngle += 0.05;
        this.angle = this.searchAngle;
        this.x += Math.cos(this.searchAngle) * this.speed * 0.3;
        this.y += Math.sin(this.searchAngle) * this.speed * 0.3;
    }

    // ----- Стрельба -----
    canShoot() {
        return this.shootTimer <= 0 && !this.melee;
    }

    registerShot() {
        this.shootTimer = this.fireRate * rand(0.7, 1.3);
    }

    // ----- Ближний бой -----
    canMeleeAttack() {
        return this.melee && this.meleeAttackCooldown <= 0;
    }

    registerMeleeAttack() {
        this.meleeAttackCooldown = 60;
    }
}

// ============================================================================
// BULLET — Пуля
// ============================================================================
export class Bullet {
    constructor(x, y, angle, speed, opts = {}) {
        this.x = x;
        this.y = y;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        this.startX = x;
        this.startY = y;

        this.life = opts.life ?? 60;
        this.maxLife = this.life;
        this.fromPlayer = opts.fromPlayer ?? false;
        this.damage = opts.damage ?? 100;
        this.range = opts.range ?? 700;
        this.color = opts.color ?? (this.fromPlayer ? '#ffff00' : '#ff8800');
        this.radius = opts.radius ?? 4;
        this.trailLength = opts.trailLength ?? 2.5;

        this.dead = false;
        this.hitWall = false;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.life--;

        if (this.life <= 0) this.dead = true;
        if (this.x < 0 || this.x > 1280 || this.y < 0 || this.y > 800) this.dead = true;

        // Проверка дистанции
        if (this.range) {
            const travelled = Math.hypot(this.x - this.startX, this.y - this.startY);
            if (travelled > this.range) this.dead = true;
        }
    }

    get tailX() { return this.x - this.vx * this.trailLength; }
    get tailY() { return this.y - this.vy * this.trailLength; }
}

// ============================================================================
// CORPSE — Труп
// ============================================================================
export class Corpse {
    constructor(x, y, angle, type, color) {
        this.x = x;
        this.y = y;
        this.angle = angle;
        this.type = type;
        this.color = color;
        this.rx = 16;
        this.ry = 10;
        this.alpha = 0.4;
    }
}

// ============================================================================
// PICKUP — Подбираемый предмет
// ============================================================================
export class Pickup {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type; // 'pistol' | 'shotgun' | 'rifle' | 'katana' | 'health'
        this.taken = false;
        this.bobPhase = rand(0, Math.PI * 2);
    }

    get isHealth() {
        return this.type === 'health';
    }

    get color() {
        return this.isHealth ? '#00ff00' : '#ffcc00';
    }

    // Применить эффект к игроку. Возвращает true, если подобрано.
    applyTo(player) {
        if (this.taken) return false;
        if (this.isHealth) {
            this.taken = true;
            return { type: 'health' };
        }
        const ammo = player.weapons[this.type];
        if (!ammo) return false;
        ammo.unlocked = true;
        ammo.reserve += WEAPONS[this.type].mag * 2;
        this.taken = true;
        return { type: 'weapon', weapon: this.type };
    }

    bob(time) {
        return Math.sin(time * 3 + this.bobPhase) * 3;
    }

    pulse(time) {
        return 1 + Math.sin(time * 4 + this.bobPhase) * 0.15;
    }
}

// ============================================================================
// DOOR — Дверь
// ============================================================================
export class Door {
    constructor(x, y, w, h, orient = 'v') {
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
        this.orient = orient; // 'v' | 'h'
        this.open = false;
        this.locked = false;
        this.angle = 0;
        this.targetAngle = 0;
        this.speed = 0.15;
    }

    open_() {
        if (this.open || this.locked) return false;
        this.open = true;
        this.targetAngle = Math.PI / 2;
        return true;
    }

    close() {
        if (!this.open) return false;
        this.open = false;
        this.targetAngle = 0;
        return true;
    }

    update() {
        this.angle += (this.targetAngle - this.angle) * this.speed;
    }

    get cx() { return this.x + this.w / 2; }
    get cy() { return this.y + this.h / 2; }
}

// ============================================================================
// WALL — Стена
// ============================================================================
export class Wall {
    constructor(x, y, w, h) {
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
    }

    get rect() {
        return { x: this.x, y: this.y, w: this.w, h: this.h };
    }
}

// ============================================================================
// WORLD — Контейнер для всех сущностей
// ============================================================================
export class World {
    constructor() {
        this.player = new Player();
        this.enemies = [];
        this.bullets = [];
        this.corpses = [];
        this.pickups = [];
        this.doors = [];
        this.walls = [];
    }

    // ----- Очистка -----
    clear() {
        this.enemies.length = 0;
        this.bullets.length = 0;
        this.corpses.length = 0;
        this.pickups.length = 0;
        this.doors.length = 0;
        this.walls.length = 0;
    }

    clearEntities() {
        this.enemies.length = 0;
        this.bullets.length = 0;
        this.corpses.length = 0;
        this.pickups.length = 0;
        this.doors.length = 0;
        this.walls.length = 0;
    }

    // ----- Добавление -----
    addWall(x, y, w, h) {
        const wall = new Wall(x, y, w, h);
        this.walls.push(wall);
        return wall;
    }

    addDoor(x, y, w, h, orient = 'v') {
        const door = new Door(x, y, w, h, orient);
        this.doors.push(door);
        return door;
    }

    addPickup(x, y, type) {
        const pickup = new Pickup(x, y, type);
        this.pickups.push(pickup);
        return pickup;
    }

    addEnemy(x, y, type = 'thug') {
        const enemy = new Enemy(x, y, type);
        this.enemies.push(enemy);
        return enemy;
    }

    spawnBullet(x, y, angle, speed, opts) {
        const bullet = new Bullet(x, y, angle, speed, opts);
        this.bullets.push(bullet);
        return bullet;
    }

    addCorpse(enemy) {
        const corpse = new Corpse(enemy.x, enemy.y, enemy.angle, enemy.type, enemy.color);
        this.corpses.push(corpse);
        return corpse;
    }

    // ----- Удаление мёртвых -----
    removeDeadBullets() {
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            if (this.bullets[i].dead) this.bullets.splice(i, 1);
        }
    }

    // ----- Запросы -----
    get aliveEnemies() {
        return this.enemies.filter(e => e.alive);
    }

    get aliveEnemyCount() {
        let n = 0;
        for (const e of this.enemies) if (e.alive) n++;
        return n;
    }

    get hasAliveEnemies() {
        for (const e of this.enemies) if (e.alive) return true;
        return false;
    }

    findNearestEnemy(x, y, maxRange = Infinity) {
        let best = null;
        let bestDist = maxRange;
        for (const e of this.enemies) {
            if (!e.alive) continue;
            const d = dist(x, y, e.x, e.y);
            if (d < bestDist) {
                bestDist = d;
                best = e;
            }
        }
        return best;
    }

    findEnemyInMeleeRange(x, y, range) {
        for (const e of this.enemies) {
            if (!e.alive) continue;
            if (dist(x, y, e.x, e.y) < range) return e;
        }
        return null;
    }

    // ----- Обновление -----
    tick(time) {
        // Таймеры игрока
        this.player.tick();

        // Таймеры врагов
        for (const e of this.enemies) e.tick();

        // Двери
        for (const d of this.doors) d.update();

        // Пули
        for (const b of this.bullets) b.update();

        // Удаление мёртвых пуль
        this.removeDeadBullets();
    }
}

// ============================================================================
// ЭКСПОРТ ЕДИНОГО ЭКЗЕМПЛЯРА МИРА
// ============================================================================
export const world = new World();

// ============================================================================
// ХЕЛПЕРЫ ДЛЯ БЫСТРОГО СОЗДАНИЯ (обратная совместимость)
// ============================================================================
export function createPlayer() {
    return new Player();
}

export function createEnemy(x, y, type = 'thug') {
    return new Enemy(x, y, type);
}

export function createBullet(x, y, angle, speed, opts = {}) {
    return new Bullet(x, y, angle, speed, opts);
}

export function clearWorld() {
    world.clear();
}

// Псевдоним для старого API
export const world_data = world;
