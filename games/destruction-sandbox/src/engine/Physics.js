import Matter from 'matter-js';

const { Engine, Render, World, Bodies, Body, Events, Composite, Vector, Query } = Matter;

export class Physics {
  constructor(canvas) {
    this.canvas = canvas;
    this.engine = Engine.create({
      gravity: { x: 0, y: 1.0 },
      positionIterations: 8,
      velocityIterations: 6,
    });
    this.world = this.engine.world;

    this.timeScale = 1.0;
    this.targetTimeScale = 1.0;
    this.bodies = new Map(); // id -> gameObject mapping
    this.onCollision = null;
    this.frameCount = 0;
    this.replayFrames = [];
    this.recording = false;

    this._setupCollisions();
  }

  _setupCollisions() {
    Events.on(this.engine, 'collisionStart', (event) => {
      for (const pair of event.pairs) {
        const speed = Vector.magnitude(
          Vector.sub(pair.bodyA.velocity, pair.bodyB.velocity)
        );
        if (this.onCollision) {
          this.onCollision(pair.bodyA, pair.bodyB, speed);
        }
      }
    });
  }

  addBody(body, gameObject) {
    World.add(this.world, body);
    if (gameObject) {
      this.bodies.set(body.id, gameObject);
    }
    return body;
  }

  removeBody(body) {
    World.remove(this.world, body);
    this.bodies.delete(body.id);
  }

  getGameObject(body) {
    return this.bodies.get(body.id);
  }

  setSlowMotion(scale, duration = 1000) {
    this.targetTimeScale = scale;
    this.slowMoDuration = duration;
    this.slowMoTimer = 0;
  }

  applyForce(body, position, force) {
    Body.applyForce(body, position, force);
  }

  applyExplosion(position, radius, strength) {
    const allBodies = Composite.allBodies(this.world);
    const affected = [];
    for (const body of allBodies) {
      if (body.isStatic) continue;
      const dist = Vector.magnitude(Vector.sub(body.position, position));
      if (dist < radius) {
        const factor = 1 - (dist / radius);
        const dir = Vector.normalise(Vector.sub(body.position, position));
        const force = Vector.mult(dir, strength * factor * body.mass * 0.001);
        Body.applyForce(body, body.position, force);
        affected.push({ body, factor });
      }
    }
    return affected;
  }

  queryPoint(point) {
    return Query.point(Composite.allBodies(this.world), point);
  }

  queryRegion(bounds) {
    return Query.region(Composite.allBodies(this.world), bounds);
  }

  startRecording() {
    this.recording = true;
    this.replayFrames = [];
    this.frameCount = 0;
  }

  stopRecording() {
    this.recording = false;
    return this.replayFrames;
  }

  _recordFrame() {
    if (!this.recording) return;
    if (this.frameCount % 2 !== 0) return; // record every other frame

    const allBodies = Composite.allBodies(this.world);
    const frame = [];
    for (const body of allBodies) {
      if (body.isStatic && body.speed < 0.01) continue;
      frame.push({
        id: body.id,
        x: body.position.x,
        y: body.position.y,
        angle: body.angle,
      });
    }
    this.replayFrames.push(frame);
  }

  update(delta) {
    // Smooth time scale transition
    const scaleDiff = this.targetTimeScale - this.timeScale;
    this.timeScale += scaleDiff * 0.1;

    // Auto-restore slow motion
    if (this.targetTimeScale < 1.0 && this.slowMoDuration > 0) {
      this.slowMoTimer += delta;
      if (this.slowMoTimer >= this.slowMoDuration) {
        this.targetTimeScale = 1.0;
      }
    }

    this.engine.timing.timeScale = this.timeScale;
    Engine.update(this.engine, delta);

    this.frameCount++;
    this._recordFrame();
  }

  clear() {
    World.clear(this.world);
    this.bodies.clear();
    this.replayFrames = [];
  }

  getAllBodies() {
    return Composite.allBodies(this.world);
  }
}
