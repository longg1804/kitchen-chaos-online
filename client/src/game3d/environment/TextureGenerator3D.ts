import * as THREE from 'three';

export class TextureGenerator3D {
  private static cache: Map<string, THREE.CanvasTexture> = new Map();

  /**
   * Warm Cozy Checkered Restaurant Kitchen Tiles
   * 8x8 checker of warm cream (#f8fafc) and soft terracotta peach (#fed7aa)
   * with beveled edges and soft ambient occlusion grout
   */
  public static getFloorTexture(): THREE.CanvasTexture {
    const key = 'floor_tiles';
    if (this.cache.has(key)) return this.cache.get(key)!;

    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    const tiles = 8;
    const tileSize = size / tiles;

    // Base background / grout
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(0, 0, size, size);

    for (let r = 0; r < tiles; r++) {
      for (let c = 0; c < tiles; c++) {
        const isAlternate = (r + c) % 2 === 1;
        const x = c * tileSize;
        const y = r * tileSize;
        const gap = 3;

        // Tile base color
        const baseColor = isAlternate ? '#fef3c7' : '#ffffff';
        const shadeColor = isAlternate ? '#fde68a' : '#f1f5f9';

        // Outer tile with soft gradient for bevel
        const grad = ctx.createLinearGradient(x + gap, y + gap, x + tileSize - gap, y + tileSize - gap);
        grad.addColorStop(0, baseColor);
        grad.addColorStop(1, shadeColor);

        ctx.fillStyle = grad;
        ctx.beginPath();
        const rad = 4;
        ctx.roundRect ? ctx.roundRect(x + gap, y + gap, tileSize - gap * 2, tileSize - gap * 2, rad)
                      : ctx.rect(x + gap, y + gap, tileSize - gap * 2, tileSize - gap * 2);
        ctx.fill();

        // Subtle inner bevel highlight on top-left edge
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x + gap + 2, y + tileSize - gap - 2);
        ctx.lineTo(x + gap + 2, y + gap + 2);
        ctx.lineTo(x + tileSize - gap - 2, y + gap + 2);
        ctx.stroke();

        // Soft shadow on bottom-right edge
        ctx.strokeStyle = 'rgba(100, 116, 139, 0.25)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x + tileSize - gap - 2, y + gap + 2);
        ctx.lineTo(x + tileSize - gap - 2, y + tileSize - gap - 2);
        ctx.lineTo(x + gap + 2, y + tileSize - gap - 2);
        ctx.stroke();
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(3, 2.5); // Repeats nicely over 12x10 kitchen floor
    this.cache.set(key, texture);
    return texture;
  }

  /**
   * Classic White/Cream Subway Tile Back Wall
   */
  public static getSubwayTileTexture(): THREE.CanvasTexture {
    const key = 'subway_tiles';
    if (this.cache.has(key)) return this.cache.get(key)!;

    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#64748b'; // Grout color
    ctx.fillRect(0, 0, size, size);

    const rows = 12;
    const rowH = size / rows;
    const brickW = size / 6;

    for (let r = 0; r < rows; r++) {
      const offsetX = (r % 2) * (brickW / 2);
      for (let c = -1; c < 7; c++) {
        const x = c * brickW + offsetX;
        const y = r * rowH;
        const gap = 2;

        const grad = ctx.createLinearGradient(x, y, x, y + rowH);
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.1, '#f8fafc');
        grad.addColorStop(0.9, '#e2e8f0');
        grad.addColorStop(1, '#cbd5e1');

        ctx.fillStyle = grad;
        ctx.fillRect(x + gap, y + gap, brickW - gap * 2, rowH - gap * 2);
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(4, 2);
    this.cache.set(key, texture);
    return texture;
  }

  /**
   * Front Cabinet Door Panel Texture (Shaker Style)
   */
  public static getCabinetFrontTexture(): THREE.CanvasTexture {
    const key = 'cabinet_front';
    if (this.cache.has(key)) return this.cache.get(key)!;

    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    // Warm Cabinet wood/lacquer color (Overcooked navy/teal or warm orange-brown)
    ctx.fillStyle = '#1e293b'; // Sleek dark slate cabinet
    ctx.fillRect(0, 0, size, size);

    // Inner recessed shaker panel
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(20, 20, size - 40, size - 40);

    // Inner bevel highlight
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 3;
    ctx.strokeRect(20, 20, size - 40, size - 40);

    // Polished Chrome Handle / Knob
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.arc(size / 2, 60, 10, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#94a3b8';
    ctx.beginPath();
    ctx.arc(size / 2, 60, 6, 0, Math.PI * 2);
    ctx.fill();

    const texture = new THREE.CanvasTexture(canvas);
    this.cache.set(key, texture);
    return texture;
  }

  /**
   * Cutting Board Butcher Block Texture
   */
  public static getButcherBlockTexture(): THREE.CanvasTexture {
    const key = 'butcher_block';
    if (this.cache.has(key)) return this.cache.get(key)!;

    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    // End-grain checkerboard wood
    const cols = 6;
    const rows = 4;
    const w = size / cols;
    const h = size / rows;

    const woodTones = ['#b45309', '#d97706', '#92400e', '#78350f', '#f59e0b'];

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const tone = woodTones[(r * 3 + c * 2) % woodTones.length];
        ctx.fillStyle = tone;
        ctx.fillRect(c * w, r * h, w, h);

        // Juice groove border on edges
        ctx.strokeStyle = 'rgba(0,0,0,0.15)';
        ctx.lineWidth = 1;
        ctx.strokeRect(c * w, r * h, w, h);
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    this.cache.set(key, texture);
    return texture;
  }
}
