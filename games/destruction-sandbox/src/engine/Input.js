export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.pointers = new Map();
    this.tapCallback = null;
    this.swipeCallback = null;
    this.longPressCallback = null;
    this.pinchCallback = null;
    this.dragCallback = null;
    this.dragEndCallback = null;

    this._longPressTimer = null;
    this._longPressThreshold = 500;
    this._tapThreshold = 200;
    this._swipeThreshold = 30;
    this._startTime = 0;
    this._startPos = null;
    this._isDragging = false;
    this.lastPointer = null; // track last known pointer position for cursor

    this._bindEvents();
  }

  _bindEvents() {
    const c = this.canvas;

    // Touch events
    c.addEventListener('touchstart', (e) => this._onStart(e), { passive: false });
    c.addEventListener('touchmove', (e) => this._onMove(e), { passive: false });
    c.addEventListener('touchend', (e) => this._onEnd(e), { passive: false });
    c.addEventListener('touchcancel', (e) => this._onEnd(e), { passive: false });

    // Mouse events (for desktop testing)
    c.addEventListener('mousedown', (e) => this._onStart(e));
    c.addEventListener('mousemove', (e) => this._onMove(e));
    c.addEventListener('mouseup', (e) => this._onEnd(e));
  }

  _getPos(e) {
    if (e.touches) {
      const touch = e.touches[0] || e.changedTouches[0];
      return { x: touch.clientX, y: touch.clientY };
    }
    return { x: e.clientX, y: e.clientY };
  }

  _onStart(e) {
    e.preventDefault();
    const pos = this._getPos(e);
    this._startPos = pos;
    this._startTime = Date.now();
    this._isDragging = false;

    // Long press detection
    this._longPressTimer = setTimeout(() => {
      if (this._startPos && !this._isDragging) {
        if (this.longPressCallback) {
          this.longPressCallback(this._startPos);
        }
        this._startPos = null;
      }
    }, this._longPressThreshold);

    // Pinch detection
    if (e.touches && e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      this._pinchStartDist = Math.sqrt(dx * dx + dy * dy);
    }
  }

  _onMove(e) {
    e.preventDefault();
    const pos = this._getPos(e);
    this.lastPointer = pos;

    if (!this._startPos) return;
    const dx = pos.x - this._startPos.x;
    const dy = pos.y - this._startPos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 10) {
      this._isDragging = true;
      clearTimeout(this._longPressTimer);
      if (this.dragCallback) {
        this.dragCallback(this._startPos, pos, { dx, dy });
      }
    }

    // Pinch
    if (e.touches && e.touches.length === 2 && this._pinchStartDist) {
      const pdx = e.touches[0].clientX - e.touches[1].clientX;
      const pdy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(pdx * pdx + pdy * pdy);
      const scale = dist / this._pinchStartDist;
      if (this.pinchCallback) {
        this.pinchCallback(scale);
      }
    }
  }

  _onEnd(e) {
    e.preventDefault();
    clearTimeout(this._longPressTimer);

    if (!this._startPos) return;

    const pos = this._getPos(e);
    const elapsed = Date.now() - this._startTime;
    const dx = pos.x - this._startPos.x;
    const dy = pos.y - this._startPos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (this._isDragging) {
      // Check for swipe
      if (dist > this._swipeThreshold && elapsed < 500) {
        const speed = dist / elapsed;
        const angle = Math.atan2(dy, dx);
        if (this.swipeCallback) {
          this.swipeCallback(this._startPos, pos, { speed, angle, dx, dy });
        }
      }
      if (this.dragEndCallback) {
        this.dragEndCallback(this._startPos, pos);
      }
    } else if (elapsed < this._tapThreshold) {
      // Tap
      if (this.tapCallback) {
        this.tapCallback(pos);
      }
    }

    this._startPos = null;
    this._isDragging = false;
    this._pinchStartDist = null;
  }

  onTap(cb) { this.tapCallback = cb; }
  onSwipe(cb) { this.swipeCallback = cb; }
  onLongPress(cb) { this.longPressCallback = cb; }
  onPinch(cb) { this.pinchCallback = cb; }
  onDrag(cb) { this.dragCallback = cb; }
  onDragEnd(cb) { this.dragEndCallback = cb; }
}
