// Конфигурация игры: константы, оружие, ачивки

export const W = 1280;
export const H = 800;

export const WEAPONS = {
    pistol:  { name: 'ПИСТОЛЕТ', damage: 100, fireRate: 8,  spread: 0.03, bulletSpeed: 20, mag: 12,       reloadTime: 45, auto: false, pellets: 1, range: 700, recoil: 3,  melee: false },
    shotgun: { name: 'ДРОБОВИК', damage: 70,  fireRate: 35, spread: 0.35, bulletSpeed: 16, mag: 6,        reloadTime: 90, auto: false, pellets: 7, range: 300, recoil: 12, melee: false },
    rifle:   { name: 'АВТОМАТ',  damage: 45,  fireRate: 5,  spread: 0.10, bulletSpeed: 22, mag: 30,       reloadTime: 60, auto: true,  pellets: 1, range: 800, recoil: 2,  melee: false },
    katana:  { name: 'КАТАНА',   damage: 999, fireRate: 20, spread: 0,    bulletSpeed: 0,  mag: Infinity, reloadTime: 0,  auto: false, pellets: 0, range: 55,  recoil: 5,  melee: true  }
};

export const WEAPON_KEYS = ['pistol', 'shotgun', 'rifle', 'katana'];

export const ENEMY_TYPES = {
    thug:   { speed: 1.3, hp: 100, fireRate: 60, accuracy: 0.15, color: '#ff3355', viewRange: 320, weapon: 'pistol',  melee: false },
    gunner: { speed: 1.6, hp: 80,  fireRate: 35, accuracy: 0.20, color: '#ff6600', viewRange: 400, weapon: 'rifle',   melee: false },
    brute:  { speed: 0.9, hp: 200, fireRate: 90, accuracy: 0.10, color: '#cc0033', viewRange: 280, weapon: 'shotgun', melee: false },
    ninja:  { speed: 2.2, hp: 60,  fireRate: 0,  accuracy: 0,    color: '#9900ff', viewRange: 350, weapon: 'katana',  melee: true  }
};

export const ACHIEVEMENTS_DB = {
    firstBlood:     { name: 'Первая кровь',    desc: 'Убить первого врага' },
    combo5:         { name: 'Серия убийств',   desc: 'Комбо x5' },
    combo10:        { name: 'Мясорубка',       desc: 'Комбо x10' },
    combo20:        { name: 'Машина смерти',   desc: 'Комбо x20' },
    perfect:        { name: 'Идеально',        desc: 'Пройти уровень на 3 звезды' },
    noDamage:       { name: 'Неуязвимый',      desc: 'Пройти уровень без урона' },
    speedrun:       { name: 'Спидран',         desc: 'Пройти уровень за 30 секунд' },
    allWeapons:     { name: 'Арсенал',         desc: 'Использовать все виды оружия' },
    executioner:    { name: 'Палач',           desc: 'Выполнить 5 добиваний' },
    shotgunMaster:  { name: 'Дробовик',        desc: 'Убить 10 врагов дробовиком' },
    katanaMaster:   { name: 'Самурай',         desc: 'Убить 10 врагов катаной' },
    survivor:       { name: 'Выживший',        desc: 'Пройти все уровни' },
    flawless:       { name: 'Безупречно',      desc: 'Пройти уровень без промахов' }
};

export const STORAGE_KEYS = {
    unlocked: 'hm_unlocked',
    stars:    'hm_stars',
    achievements: 'hm_ach'
};
