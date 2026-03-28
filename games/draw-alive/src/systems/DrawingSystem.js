/**
 * DrawingSystem - Handles touch/mouse input and converts strokes to polygon data.
 * Uses Douglas-Peucker algorithm for line simplification.
 */
export class DrawingSystem {
  constructor(scene) {
    this.scene = scene;
    this.graphics = scene.add.graphics();
    this.currentStroke = null;
    this.strokes = [];
    this.isDrawing = false;
    this.currentColor = 0x2D3436; // charcoal default
    this.lineWidth = 8;
    this.inkUsed = 0;
    this.inkLimit = Infinity;
    this.enabled = true;
    this.onInkChanged = null;
    this.onStrokeEnd = null;

    this._setupInput();
  }

  _setupInput() {
    const height = this.scene.scale.height;
    // Reserve bottom 130px for UI bar to avoid drawing over buttons
    const uiBarTop = height - 130;

    this.scene.input.on('pointerdown', (pointer) => {
      if (!this.enabled) return;
      if (pointer.event && pointer.event.touches && pointer.event.touches.length > 1) return;
      // Don't draw over UI areas (top 100px for header, bottom 130px for toolbar)
      if (pointer.y < 100 || pointer.y > uiBarTop) return;
      this._startStroke(pointer.x, pointer.y);
    });

    this.scene.input.on('pointermove', (pointer) => {
      if (!this.enabled || !this.isDrawing) return;
      this._continueStroke(pointer.x, pointer.y);
    });

    this.scene.input.on('pointerup', () => {
      if (!this.enabled || !this.isDrawing) return;
      this._endStroke();
    });
  }

  _startStroke(x, y) {
    if (this.inkUsed >= this.inkLimit) return;
    this.isDrawing = true;
    this._lastStrokeTime = Date.now();
    this.currentStroke = {
      points: [{ x, y, w: this.lineWidth }],
      color: this.currentColor,
      width: this.lineWidth,
    };
  }

  _continueStroke(x, y) {
    if (!this.currentStroke) return;
    const last = this.currentStroke.points[this.currentStroke.points.length - 1];
    const dx = x - last.x;
    const dy = y - last.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 3) return; // min distance between points

    // Check ink limit
    const inkCost = dist;
    if (this.inkUsed + inkCost > this.inkLimit) {
      this._endStroke();
      return;
    }

    this.inkUsed += inkCost;

    // Speed-based thickness: faster = thinner, slower = thicker
    const now = Date.now();
    const elapsed = Math.max(1, now - this._lastStrokeTime);
    const speed = dist / elapsed; // pixels per ms
    const speedFactor = Math.max(0.4, Math.min(1.0, 1.0 - speed * 0.15));
    const dynamicWidth = this.lineWidth * speedFactor;
    this._lastStrokeTime = now;

    this.currentStroke.points.push({ x, y, w: dynamicWidth });

    // Draw the line segment with dynamic width and slight transparency
    this.graphics.lineStyle(dynamicWidth, this.currentColor, 0.85);
    this.graphics.beginPath();
    this.graphics.moveTo(last.x, last.y);
    this.graphics.lineTo(x, y);
    this.graphics.strokePath();

    if (this.onInkChanged) {
      this.onInkChanged(this.inkUsed, this.inkLimit);
    }
  }

  _endStroke() {
    this.isDrawing = false;
    if (this.currentStroke && this.currentStroke.points.length >= 2) {
      // Simplify the stroke
      this.currentStroke.simplifiedPoints = this._simplifyStroke(
        this.currentStroke.points, 3
      );
      this.strokes.push(this.currentStroke);
      if (this.onStrokeEnd) {
        this.onStrokeEnd(this.currentStroke);
      }
    }
    this.currentStroke = null;
  }

  /** Douglas-Peucker line simplification */
  _simplifyStroke(points, tolerance) {
    if (points.length <= 2) return [...points];

    let maxDist = 0;
    let maxIndex = 0;
    const first = points[0];
    const last = points[points.length - 1];

    for (let i = 1; i < points.length - 1; i++) {
      const dist = this._perpendicularDistance(points[i], first, last);
      if (dist > maxDist) {
        maxDist = dist;
        maxIndex = i;
      }
    }

    if (maxDist > tolerance) {
      const left = this._simplifyStroke(points.slice(0, maxIndex + 1), tolerance);
      const right = this._simplifyStroke(points.slice(maxIndex), tolerance);
      return left.slice(0, -1).concat(right);
    } else {
      return [first, last];
    }
  }

  _perpendicularDistance(point, lineStart, lineEnd) {
    const dx = lineEnd.x - lineStart.x;
    const dy = lineEnd.y - lineStart.y;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return Math.hypot(point.x - lineStart.x, point.y - lineStart.y);
    const t = Math.max(0, Math.min(1,
      ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / lenSq
    ));
    const projX = lineStart.x + t * dx;
    const projY = lineStart.y + t * dy;
    return Math.hypot(point.x - projX, point.y - projY);
  }

  setColor(color) {
    this.currentColor = color;
  }

  setInkLimit(limit) {
    this.inkLimit = limit;
  }

  getInkRatio() {
    if (this.inkLimit === Infinity) return 0;
    return this.inkUsed / this.inkLimit;
  }

  undo() {
    if (this.strokes.length === 0) return;
    const removed = this.strokes.pop();
    // Recalculate ink used
    this.inkUsed = 0;
    for (const stroke of this.strokes) {
      for (let i = 1; i < stroke.points.length; i++) {
        const dx = stroke.points[i].x - stroke.points[i - 1].x;
        const dy = stroke.points[i].y - stroke.points[i - 1].y;
        this.inkUsed += Math.sqrt(dx * dx + dy * dy);
      }
    }
    this._redraw();
    if (this.onInkChanged) {
      this.onInkChanged(this.inkUsed, this.inkLimit);
    }
    return removed;
  }

  _redraw() {
    this.graphics.clear();
    for (const stroke of this.strokes) {
      const pts = stroke.points;
      for (let i = 1; i < pts.length; i++) {
        const w = pts[i].w || stroke.width;
        this.graphics.lineStyle(w, stroke.color, 0.85);
        this.graphics.beginPath();
        this.graphics.moveTo(pts[i - 1].x, pts[i - 1].y);
        this.graphics.lineTo(pts[i].x, pts[i].y);
        this.graphics.strokePath();
      }
    }
  }

  clear() {
    this.strokes = [];
    this.inkUsed = 0;
    this.graphics.clear();
    if (this.onInkChanged) {
      this.onInkChanged(this.inkUsed, this.inkLimit);
    }
  }

  getStrokes() {
    return this.strokes;
  }

  destroy() {
    this.scene.input.off('pointerdown');
    this.scene.input.off('pointermove');
    this.scene.input.off('pointerup');
    this.graphics.destroy();
  }
}
