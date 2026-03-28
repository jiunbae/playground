/**
 * PhysicsConverter - Converts drawn strokes into Matter.js physics bodies.
 * Maps colors to physical properties (elasticity, friction, density).
 */
export class PhysicsConverter {
  // Color → physics property mapping (from game design doc)
  static COLOR_PROPERTIES = {
    0xFF4757: { label: 'elastic', restitution: 0.9, friction: 0.1, density: 0.001, name: '탄성' },   // Red = bouncy
    0x3742FA: { label: 'friction', restitution: 0.1, friction: 0.9, density: 0.003, name: '마찰' },   // Blue = high friction
    0xFFC312: { label: 'light', restitution: 0.3, friction: 0.3, density: 0.0003, name: '가벼움' },   // Yellow = light
    0x2D3436: { label: 'normal', restitution: 0.3, friction: 0.5, density: 0.001, name: '기본' },     // Charcoal = default
    0xFF6B6B: { label: 'soft', restitution: 0.6, friction: 0.4, density: 0.001, name: '부드러움' },   // Coral = soft bounce
    0x4ECDC4: { label: 'sticky', restitution: 0.05, friction: 1.0, density: 0.002, name: '끈적임' },  // Teal = sticky
    0xA8E6CF: { label: 'slippery', restitution: 0.2, friction: 0.01, density: 0.001, name: '미끄러움' }, // Green = slippery
    0x6C5CE7: { label: 'heavy', restitution: 0.1, friction: 0.6, density: 0.005, name: '무거움' },    // Purple = heavy
  };

  static DEFAULT_PROPS = { restitution: 0.3, friction: 0.5, density: 0.001 };

  /**
   * Convert strokes array into Matter.js bodies
   */
  static convertStrokes(scene, strokes) {
    const bodies = [];
    for (const stroke of strokes) {
      const body = PhysicsConverter.strokeToBody(scene, stroke);
      if (body) bodies.push(body);
    }
    return bodies;
  }

  static strokeToBody(scene, stroke) {
    const points = stroke.simplifiedPoints || stroke.points;
    if (points.length < 2) return null;

    // Calculate bounding box and centroid
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    let cx = 0, cy = 0;
    for (const p of points) {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
      cx += p.x;
      cy += p.y;
    }
    cx /= points.length;
    cy /= points.length;

    const width = maxX - minX;
    const height = maxY - minY;

    // Get physics properties from color
    const props = PhysicsConverter.COLOR_PROPERTIES[stroke.color] || PhysicsConverter.DEFAULT_PROPS;

    // Determine shape type based on stroke characteristics
    const isCircular = PhysicsConverter._isCircular(points, cx, cy);
    const isThin = width < 20 || height < 20;

    let body;

    if (isCircular) {
      // Create circle
      const radius = Math.max(15, Math.max(width, height) / 2);
      body = scene.matter.add.circle(cx, cy, radius, {
        restitution: props.restitution,
        friction: props.friction,
        density: props.density,
        label: `drawn_${props.label || 'normal'}`,
      });
    } else if (isThin) {
      // Create line/thin rectangle
      const angle = Math.atan2(
        points[points.length - 1].y - points[0].y,
        points[points.length - 1].x - points[0].x
      );
      const length = Math.max(20, Math.hypot(width, height));
      body = scene.matter.add.rectangle(cx, cy, length, Math.max(stroke.width, 10), {
        angle: angle,
        restitution: props.restitution,
        friction: props.friction,
        density: props.density,
        label: `drawn_${props.label || 'normal'}`,
      });
    } else {
      // Create polygon from vertices
      const vertices = PhysicsConverter._createThickPolygon(points, stroke.width / 2, cx, cy);
      if (vertices.length >= 3) {
        try {
          body = scene.matter.add.fromVertices(cx, cy, vertices, {
            restitution: props.restitution,
            friction: props.friction,
            density: props.density,
            label: `drawn_${props.label || 'normal'}`,
          });
        } catch (e) {
          // Fallback to rectangle if polygon creation fails
          body = scene.matter.add.rectangle(cx, cy, Math.max(width, 20), Math.max(height, 20), {
            restitution: props.restitution,
            friction: props.friction,
            density: props.density,
            label: `drawn_${props.label || 'normal'}`,
          });
        }
      } else {
        body = scene.matter.add.rectangle(cx, cy, Math.max(width, 20), Math.max(height, 20), {
          restitution: props.restitution,
          friction: props.friction,
          density: props.density,
          label: `drawn_${props.label || 'normal'}`,
        });
      }
    }

    if (body) {
      body.drawColor = stroke.color;
      body.drawPoints = points;
      body.physicsLabel = props.label || 'normal';
    }

    return body;
  }

  static _isCircular(points, cx, cy) {
    if (points.length < 8) return false;

    // Check if first and last points are close (closed shape)
    const first = points[0];
    const last = points[points.length - 1];
    const closeDist = Math.hypot(first.x - last.x, first.y - last.y);
    if (closeDist > 60) return false;

    // Check if points are roughly equidistant from center
    let totalDist = 0;
    for (const p of points) {
      totalDist += Math.hypot(p.x - cx, p.y - cy);
    }
    const avgDist = totalDist / points.length;

    let variance = 0;
    for (const p of points) {
      const d = Math.hypot(p.x - cx, p.y - cy);
      variance += (d - avgDist) * (d - avgDist);
    }
    variance /= points.length;
    const stdDev = Math.sqrt(variance);

    return stdDev / avgDist < 0.3;
  }

  /** Create a thick polygon from a line strip (offset both sides) */
  static _createThickPolygon(points, halfWidth, cx, cy) {
    if (points.length < 2) return [];
    const hw = Math.max(halfWidth, 5);
    const top = [];
    const bottom = [];

    for (let i = 0; i < points.length; i++) {
      let nx, ny;
      if (i === 0) {
        const dx = points[1].x - points[0].x;
        const dy = points[1].y - points[0].y;
        const len = Math.hypot(dx, dy) || 1;
        nx = -dy / len;
        ny = dx / len;
      } else if (i === points.length - 1) {
        const dx = points[i].x - points[i - 1].x;
        const dy = points[i].y - points[i - 1].y;
        const len = Math.hypot(dx, dy) || 1;
        nx = -dy / len;
        ny = dx / len;
      } else {
        const dx1 = points[i].x - points[i - 1].x;
        const dy1 = points[i].y - points[i - 1].y;
        const dx2 = points[i + 1].x - points[i].x;
        const dy2 = points[i + 1].y - points[i].y;
        const len1 = Math.hypot(dx1, dy1) || 1;
        const len2 = Math.hypot(dx2, dy2) || 1;
        nx = -(dy1 / len1 + dy2 / len2) / 2;
        ny = (dx1 / len1 + dx2 / len2) / 2;
        const nlen = Math.hypot(nx, ny) || 1;
        nx /= nlen;
        ny /= nlen;
      }

      top.push({ x: points[i].x + nx * hw - cx, y: points[i].y + ny * hw - cy });
      bottom.unshift({ x: points[i].x - nx * hw - cx, y: points[i].y - ny * hw - cy });
    }

    return top.concat(bottom);
  }

  static getColorName(color) {
    const props = PhysicsConverter.COLOR_PROPERTIES[color];
    return props ? props.name : '기본';
  }
}
