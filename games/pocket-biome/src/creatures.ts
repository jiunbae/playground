// ============================================================
// Creature AI & Behavior Trees
// ============================================================

import {
  Creature, SpeciesType, BehaviorState, Genetics, Vec2,
  SPECIES_CONFIG, CreatureCategory, Plant, Fence, TerrainType,
} from './types';
import { TerrainMap, WORLD_SIZE } from './terrain';

let nextCreatureId = 1;

const NICKNAMES_ADJ = [
  'Brave', 'Gentle', 'Swift', 'Shy', 'Bold', 'Wise', 'Tiny', 'Fierce',
  'Calm', 'Wild', 'Lucky', 'Sly', 'Happy', 'Lone', 'Bright', 'Shadow',
  'Misty', 'Storm', 'Dawn', 'Dusk', 'Frost', 'Ember', 'Pebble', 'Cloud',
];

const NICKNAMES_NAME = [
  'Luna', 'Mochi', 'Bomi', 'Nabi', 'Tori', 'Haru', 'Sora', 'Kiki',
  'Mimi', 'Ryu', 'Dali', 'Hana', 'Bora', 'Nuri', 'Toto', 'Kuma',
  'Yuki', 'Suji', 'Poki', 'Namu', 'Bambi', 'Pip', 'Dot', 'Echo',
];

function randomGenetics(rng: () => number): Genetics {
  return {
    speed: 0.8 + rng() * 0.4,
    size: 0.8 + rng() * 0.4,
    senseRange: 0.8 + rng() * 0.4,
    color: (rng() - 0.5) * 30,
    aggression: rng() * 0.5,
    sociability: rng(),
  };
}

function crossoverGenetics(a: Genetics, b: Genetics, rng: () => number): Genetics {
  const pick = (va: number, vb: number) => rng() > 0.5 ? va : vb;
  const mutate = (v: number, range: number = 0.1) => {
    if (rng() < 0.1) v += (rng() - 0.5) * range * 2;
    return Math.max(0.3, Math.min(2.5, v));
  };
  return {
    speed: mutate(pick(a.speed, b.speed)),
    size: mutate(pick(a.size, b.size)),
    senseRange: mutate(pick(a.senseRange, b.senseRange)),
    color: mutate(pick(a.color, b.color), 10),
    aggression: Math.max(0, Math.min(1, mutate(pick(a.aggression, b.aggression)))),
    sociability: Math.max(0, Math.min(1, mutate(pick(a.sociability, b.sociability)))),
  };
}

export function createCreature(
  species: SpeciesType,
  pos: Vec2,
  rng: () => number,
  generation: number = 0,
  genetics?: Genetics,
  day: number = 0,
): Creature {
  const config = SPECIES_CONFIG[species];
  const g = genetics || randomGenetics(rng);
  const id = nextCreatureId++;
  return {
    id,
    species,
    category: config.category,
    pos: { ...pos },
    vel: { x: 0, y: 0 },
    genetics: g,
    energy: config.maxEnergy * 0.7,
    maxEnergy: config.maxEnergy * g.size,
    hunger: 0.3,
    fear: 0,
    reproductionUrge: 0,
    age: 0,
    maxAge: config.maxAge * (0.8 + g.size * 0.4),
    state: BehaviorState.Wander,
    stateTimer: 0,
    targetId: null,
    targetPos: null,
    nickname: null,
    generation,
    parentIds: [],
    childCount: 0,
    alive: true,
    birthDay: day,
  };
}

export function generateNickname(rng: () => number): string {
  const adj = NICKNAMES_ADJ[Math.floor(rng() * NICKNAMES_ADJ.length)];
  const name = NICKNAMES_NAME[Math.floor(rng() * NICKNAMES_NAME.length)];
  return `${adj} ${name}`;
}

function dist(a: Vec2, b: Vec2): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function normalize(v: Vec2): Vec2 {
  const len = Math.sqrt(v.x * v.x + v.y * v.y);
  if (len < 0.001) return { x: 0, y: 0 };
  return { x: v.x / len, y: v.y / len };
}

function clampToWorld(pos: Vec2): Vec2 {
  return {
    x: Math.max(10, Math.min(WORLD_SIZE - 10, pos.x)),
    y: Math.max(10, Math.min(WORLD_SIZE - 10, pos.y)),
  };
}

// Check if a line segment intersects with a fence
function lineIntersectsFence(from: Vec2, to: Vec2, fence: Fence): boolean {
  const d1x = to.x - from.x;
  const d1y = to.y - from.y;
  const d2x = fence.end.x - fence.start.x;
  const d2y = fence.end.y - fence.start.y;

  const cross = d1x * d2y - d1y * d2x;
  if (Math.abs(cross) < 0.001) return false;

  const dx = fence.start.x - from.x;
  const dy = fence.start.y - from.y;
  const t = (dx * d2y - dy * d2x) / cross;
  const u = (dx * d1y - dy * d1x) / cross;

  return t >= 0 && t <= 1 && u >= 0 && u <= 1;
}

export function updateCreature(
  c: Creature,
  creatures: Creature[],
  plants: Plant[],
  terrain: TerrainMap,
  fences: Fence[],
  dt: number,
  rng: () => number,
  dayTime: number, // 0-1, 0.5 = noon
  currentDay: number,
): { born: Creature | null; journalEvent: string | null; discoveryEvent: { id: string; title: string; desc: string } | null } {
  let born: Creature | null = null;
  let journalEvent: string | null = null;
  let discoveryEvent: { id: string; title: string; desc: string } | null = null;

  if (!c.alive) return { born, journalEvent, discoveryEvent };

  const config = SPECIES_CONFIG[c.species];
  const speed = config.baseSpeed * c.genetics.speed;
  const senseRange = config.baseSenseRange * c.genetics.senseRange;
  const isAquatic = c.category === CreatureCategory.Fish;
  const isNight = dayTime < 0.25 || dayTime > 0.75;
  const nightMultiplier = isNight ? 0.6 : 1.0;
  const name = c.nickname || `${c.species}#${c.id}`;

  // Age and energy
  c.age += dt;
  c.hunger += dt * 0.0008 * (isNight ? 0.5 : 1.0);
  c.energy -= dt * 0.005 * (c.state === BehaviorState.Rest ? 0.3 : 1.0);

  if (c.energy < 0) c.energy = 0;
  if (c.hunger > 1) c.hunger = 1;

  // Reproduction urge builds over time when well-fed
  if (c.hunger < 0.4 && c.energy > c.maxEnergy * 0.5 && c.age > c.maxAge * 0.15) {
    c.reproductionUrge += dt * 0.0003;
  }

  // Death by old age or starvation
  if (c.age > c.maxAge || c.energy <= 0) {
    c.alive = false;
    c.state = BehaviorState.Dead;
    if (c.nickname) {
      journalEvent = `${name} has passed away at age ${Math.floor(c.age)}. ${c.age > c.maxAge ? 'Lived a full life.' : 'Died of starvation.'}`;
    }
    return { born, journalEvent, discoveryEvent };
  }

  // State timer
  c.stateTimer -= dt;

  // Find nearby creatures
  const nearbyCreatures = creatures.filter(
    o => o.id !== c.id && o.alive && dist(c.pos, o.pos) < senseRange
  );

  // Find predators nearby
  const predators = nearbyCreatures.filter(
    o => config.predators.includes(o.species)
  );

  // Find prey nearby
  const prey = nearbyCreatures.filter(
    o => (config.diet as string[]).includes(o.species) && o.alive
  );

  // Find same species for reproduction
  const mates = nearbyCreatures.filter(
    o => o.species === c.species && o.reproductionUrge > 0.5 && o.alive
  );

  // Find nearby plants
  const nearbyPlants = plants.filter(
    p => dist(c.pos, p.pos) < senseRange && p.energy > 0
  );

  // Fear management
  if (predators.length > 0) {
    c.fear = Math.min(1, c.fear + dt * 0.005);
  } else {
    c.fear = Math.max(0, c.fear - dt * 0.002);
  }

  // ---- BEHAVIOR TREE ----

  // Priority 1: Flee from predators
  if (predators.length > 0 && c.fear > 0.3) {
    c.state = BehaviorState.Flee;
    const closest = predators.reduce((a, b) => dist(c.pos, a.pos) < dist(c.pos, b.pos) ? a : b);
    const dir = normalize({ x: c.pos.x - closest.pos.x, y: c.pos.y - closest.pos.y });
    c.vel.x = dir.x * speed * 1.5 * nightMultiplier;
    c.vel.y = dir.y * speed * 1.5 * nightMultiplier;
  }
  // Priority 2: Hunt prey if predator and hungry
  else if (c.hunger > 0.5 && prey.length > 0 && (config.diet as string[]).some(d => d !== 'plant')) {
    const closestPrey = prey.reduce((a, b) => dist(c.pos, a.pos) < dist(c.pos, b.pos) ? a : b);
    const d = dist(c.pos, closestPrey.pos);

    if (d < 15 * c.genetics.size) {
      // Attack prey
      c.state = BehaviorState.Eating;
      closestPrey.energy -= dt * 2;
      c.energy = Math.min(c.maxEnergy, c.energy + dt * 1.5);
      c.hunger = Math.max(0, c.hunger - dt * 0.003);
      if (closestPrey.energy <= 0) {
        closestPrey.alive = false;
        closestPrey.state = BehaviorState.Dead;
        c.hunger = Math.max(0, c.hunger - 0.4);
        c.energy = Math.min(c.maxEnergy, c.energy + 30);
        const preyName = closestPrey.nickname || `${closestPrey.species}#${closestPrey.id}`;
        if (c.nickname || closestPrey.nickname) {
          journalEvent = `${name} hunted ${preyName}.`;
        }
        discoveryEvent = { id: `hunt_${c.species}_${closestPrey.species}`, title: `${c.species} hunts ${closestPrey.species}`, desc: `A ${c.species} was observed hunting a ${closestPrey.species}!` };
      }
    } else {
      c.state = BehaviorState.Hunt;
      const dir = normalize({ x: closestPrey.pos.x - c.pos.x, y: closestPrey.pos.y - c.pos.y });
      c.vel.x = dir.x * speed * 1.3 * nightMultiplier;
      c.vel.y = dir.y * speed * 1.3 * nightMultiplier;
    }
  }
  // Priority 3: Eat plants if herbivore and hungry
  else if (c.hunger > 0.4 && (config.diet as string[]).includes('plant') && nearbyPlants.length > 0) {
    const closestPlant = nearbyPlants.reduce((a, b) => dist(c.pos, a.pos) < dist(c.pos, b.pos) ? a : b);
    const d = dist(c.pos, closestPlant.pos);

    if (d < 15) {
      c.state = BehaviorState.Eating;
      const eatAmount = dt * 0.5;
      closestPlant.energy -= eatAmount;
      c.energy = Math.min(c.maxEnergy, c.energy + eatAmount * 0.8);
      c.hunger = Math.max(0, c.hunger - dt * 0.002);
      c.vel.x *= 0.9;
      c.vel.y *= 0.9;
    } else {
      c.state = BehaviorState.SeekFood;
      const dir = normalize({ x: closestPlant.pos.x - c.pos.x, y: closestPlant.pos.y - c.pos.y });
      c.vel.x = dir.x * speed * nightMultiplier;
      c.vel.y = dir.y * speed * nightMultiplier;
    }
  }
  // Priority 4: Reproduce
  else if (c.reproductionUrge > 0.7 && mates.length > 0) {
    const mate = mates[0];
    const d = dist(c.pos, mate.pos);
    if (d < 20) {
      c.state = BehaviorState.Reproduce;
      c.reproductionUrge = 0;
      mate.reproductionUrge = 0;
      c.energy *= 0.6;

      const childGenetics = crossoverGenetics(c.genetics, mate.genetics, rng);
      const childPos = {
        x: c.pos.x + (rng() - 0.5) * 30,
        y: c.pos.y + (rng() - 0.5) * 30,
      };
      born = createCreature(c.species, clampToWorld(childPos), rng, Math.max(c.generation, mate.generation) + 1, childGenetics, currentDay);
      born.parentIds = [c.id, mate.id];
      c.childCount++;
      mate.childCount++;

      if (c.nickname) {
        journalEvent = `${name} had a baby! (Generation ${born.generation})`;
      }
      discoveryEvent = { id: `reproduce_${c.species}_gen${born.generation}`, title: `${c.species} reproduction`, desc: `A ${c.species} gave birth. Generation ${born.generation}.` };
    } else {
      const dir = normalize({ x: mate.pos.x - c.pos.x, y: mate.pos.y - c.pos.y });
      c.vel.x = dir.x * speed * 0.8 * nightMultiplier;
      c.vel.y = dir.y * speed * 0.8 * nightMultiplier;
    }
  }
  // Priority 5: Night rest
  else if (isNight && c.hunger < 0.6 && c.category !== CreatureCategory.Predator) {
    c.state = BehaviorState.Rest;
    c.vel.x *= 0.95;
    c.vel.y *= 0.95;
  }
  // Priority 6: Wander
  else {
    if (c.stateTimer <= 0) {
      c.state = BehaviorState.Wander;
      c.stateTimer = 100 + rng() * 200;
      const angle = rng() * Math.PI * 2;
      c.vel.x = Math.cos(angle) * speed * 0.5 * nightMultiplier;
      c.vel.y = Math.sin(angle) * speed * 0.5 * nightMultiplier;
    }
  }

  // Birds can fly over water/mountains, add slight wave motion
  if (c.category === CreatureCategory.Bird) {
    c.vel.y += Math.sin(c.age * 0.02) * 0.02;
  }

  // Apply velocity
  const newPos = {
    x: c.pos.x + c.vel.x * dt * 0.1,
    y: c.pos.y + c.vel.y * dt * 0.1,
  };

  // Check terrain walkability (birds/insects ignore most terrain)
  const canWalk = c.category === CreatureCategory.Bird ||
    c.category === CreatureCategory.Insect ||
    terrain.isWalkable(newPos.x, newPos.y, isAquatic);

  // Check fences
  let blockedByFence = false;
  for (const fence of fences) {
    if (lineIntersectsFence(c.pos, newPos, fence)) {
      blockedByFence = true;
      break;
    }
  }

  if (canWalk && !blockedByFence) {
    c.pos = clampToWorld(newPos);
  } else {
    // Bounce off obstacles
    c.vel.x = -c.vel.x + (rng() - 0.5) * 0.5;
    c.vel.y = -c.vel.y + (rng() - 0.5) * 0.5;
  }

  // Slow down over time
  c.vel.x *= 0.995;
  c.vel.y *= 0.995;

  return { born, journalEvent, discoveryEvent };
}
