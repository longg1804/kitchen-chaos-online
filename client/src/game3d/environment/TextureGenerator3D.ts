import * as THREE from 'three';

export class TextureGenerator3D {
  private static cache: Map<string, THREE.CanvasTexture> = new Map();

  /**
   * Warm Stylized Restaurant Kitchen Floor Tiles with per-tile color variation,
   * subtle ceramic speckles, beveled edges, and ambient occlusion grout lines.
   */
  public static getFloorTexture(): THREE.CanvasTexture {
    const key = 'floor_tiles_v2';
    if (this.cache.has(key)) return this.cache.get(key)!;

    const size = 1024;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    const tiles = 8;
    const tileSize = size / tiles;

    // Deep warm slate-brown mortar grout base (provides soft AO between tiles)
    ctx.fillStyle = '#64748b';
    ctx.fillRect(0, 0, size, size);

    const warmCreamVariants = ['#fffbeb', '#fef3c7', '#f8fafc', '#fef9c3'];
    const terracottaVariants = ['#fed7aa', '#fdba74', '#ffedd5', '#fde68a'];

    for (let r = 0; r < tiles; r++) {
      for (let c = 0; c < tiles; c++) {
        const isAlternate = (r + c) % 2 === 1;
        const x = c * tileSize;
        const y = r * tileSize;
        const gap = 5;

        // Deterministic pseudo-random variation per tile
        const hash = (r * 17 + c * 31) % 4;
        const baseColor = isAlternate
          ? terracottaVariants[hash]
          : (warmCreamVariants[hash].startsWith('#') && warmCreamVariants[hash].length === 7 ? warmCreamVariants[hash] : '#fffbeb');
        const shadeColor = isAlternate ? '#f59e0b' : '#e2e8f0';

        // Outer grout AO shadow
        ctx.fillStyle = 'rgba(15, 23, 42, 0.28)';
        ctx.fillRect(x + gap - 2, y + gap - 2, tileSize - (gap - 2) * 2, tileSize - (gap - 2) * 2);

        // Tile body gradient
        const grad = ctx.createLinearGradient(x + gap, y + gap, x + tileSize - gap, y + tileSize - gap);
        grad.addColorStop(0, baseColor);
        grad.addColorStop(0.85, baseColor);
        grad.addColorStop(1, shadeColor);

        ctx.fillStyle = grad;
        ctx.beginPath();
        const rad = 10;
        if (ctx.roundRect) {
          ctx.roundRect(x + gap, y + gap, tileSize - gap * 2, tileSize - gap * 2, rad);
        } else {
          ctx.rect(x + gap, y + gap, tileSize - gap * 2, tileSize - gap * 2);
        }
        ctx.fill();

        // Subtle ceramic texture speckles for natural variation
        ctx.fillStyle = isAlternate ? 'rgba(180, 83, 9, 0.06)' : 'rgba(100, 116, 139, 0.05)';
        for (let s = 0; s < 10; s++) {
          const sx = x + gap + 14 + ((r * 23 + c * 41 + s * 37) % (tileSize - gap * 2 - 28));
          const sy = y + gap + 14 + ((r * 19 + c * 29 + s * 53) % (tileSize - gap * 2 - 28));
          ctx.beginPath();
          ctx.arc(sx, sy, 2 + (s % 3), 0, Math.PI * 2);
          ctx.fill();
        }

        // Top-left bevel highlight
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(x + gap + 4, y + tileSize - gap - 6);
        ctx.lineTo(x + gap + 4, y + gap + 4);
        ctx.lineTo(x + tileSize - gap - 6, y + gap + 4);
        ctx.stroke();

        // Bottom-right bevel shadow
        ctx.strokeStyle = 'rgba(71, 85, 105, 0.28)';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(x + tileSize - gap - 4, y + gap + 6);
        ctx.lineTo(x + tileSize - gap - 4, y + tileSize - gap - 4);
        ctx.lineTo(x + gap + 6, y + tileSize - gap - 4);
        ctx.stroke();
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(3.2, 2.6);
    this.cache.set(key, texture);
    return texture;
  }

  /**
   * Floor Roughness Map: Smooth satin tile centers (grey ~0.35) with matte grout lines (white ~0.95)
   */
  public static getFloorRoughnessMap(): THREE.CanvasTexture {
    const key = 'floor_roughness_v2';
    if (this.cache.has(key)) return this.cache.get(key)!;

    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    const tiles = 8;
    const tileSize = size / tiles;

    // Matte grout (high roughness)
    ctx.fillStyle = '#f1f5f9';
    ctx.fillRect(0, 0, size, size);

    for (let r = 0; r < tiles; r++) {
      for (let c = 0; c < tiles; c++) {
        const x = c * tileSize;
        const y = r * tileSize;
        const gap = 3;
        // Slight per-tile roughness variation
        const roughVal = 95 + ((r * 13 + c * 7) % 30);
        ctx.fillStyle = `rgb(${roughVal}, ${roughVal}, ${roughVal})`;
        ctx.fillRect(x + gap, y + gap, tileSize - gap * 2, tileSize - gap * 2);
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(3.2, 2.6);
    this.cache.set(key, texture);
    return texture;
  }

  /**
   * Warm Artisanal Subway Tile Back Wall with 3D Bevel Depth & Wainscot Trim
   */
  public static getSubwayTileTexture(): THREE.CanvasTexture {
    const key = 'subway_tiles_v2';
    if (this.cache.has(key)) return this.cache.get(key)!;

    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#64748b'; // Deep grout
    ctx.fillRect(0, 0, size, size);

    const rows = 12;
    const rowH = size / rows;
    const brickW = size / 6;
    const tileTones = ['#ffffff', '#f8fafc', '#fffbeb', '#f1f5f9'];

    for (let r = 0; r < rows; r++) {
      const offsetX = (r % 2) * (brickW / 2);
      for (let c = -1; c < 7; c++) {
        const x = c * brickW + offsetX;
        const y = r * rowH;
        const gap = 2.5;
        const tone = tileTones[(r * 5 + c * 3 + 10) % tileTones.length];

        const grad = ctx.createLinearGradient(x, y, x, y + rowH);
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.18, tone);
        grad.addColorStop(0.85, '#e2e8f0');
        grad.addColorStop(1, '#cbd5e1');

        ctx.fillStyle = grad;
        ctx.fillRect(x + gap, y + gap, brickW - gap * 2, rowH - gap * 2);

        // Top gloss highlight
        ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
        ctx.fillRect(x + gap + 2, y + gap + 2, brickW - gap * 2 - 4, 3);
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(4, 2);
    this.cache.set(key, texture);
    return texture;
  }

  /**
   * Detailed Cartoon Shaker Cabinet Door Panel Texture with metallic handle & hinges
   */
  public static getCabinetFrontTexture(): THREE.CanvasTexture {
    const key = 'cabinet_front_v2';
    if (this.cache.has(key)) return this.cache.get(key)!;

    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    // Outer Shaker stiles & rails (Rich slate-navy lacquer)
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, size, size);

    // Recessed center panel with vertical beadboard grooves
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(22, 22, size - 44, size - 44);

    ctx.strokeStyle = 'rgba(51, 65, 85, 0.55)';
    ctx.lineWidth = 2;
    for (let gx = 48; gx < size - 24; gx += 32) {
      ctx.beginPath();
      ctx.moveTo(gx, 24);
      ctx.lineTo(gx, size - 24);
      ctx.stroke();
    }

    // Inner bevel frame highlight
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 3;
    ctx.strokeRect(22, 22, size - 44, size - 44);

    // Top brushed brass/chrome pull bar
    ctx.fillStyle = '#f8fafc';
    if (ctx.roundRect) {
      ctx.beginPath();
      ctx.roundRect(size / 2 - 34, 42, 68, 12, 6);
      ctx.fill();
    } else {
      ctx.fillRect(size / 2 - 34, 42, 68, 12);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
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

        ctx.strokeStyle = 'rgba(0,0,0,0.15)';
        ctx.lineWidth = 1;
        ctx.strokeRect(c * w, r * h, w, h);
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    this.cache.set(key, texture);
    return texture;
  }

  /**
   * PHẦN 2.2: High-Resolution 2D Cartoon Ingredient Illustration Decal for Storage Bin Top Surface!
   * Replaces plain colored 2D circles with multi-icon cartoon artwork representing the exact ingredient inside.
   * Purely decorative decal (no collider, does not block placement or raycasting).
   */
  public static getIngredientBinTopDecalTexture(crateType: string): THREE.CanvasTexture {
    const key = `bin_top_decal_${crateType}`;
    if (this.cache.has(key)) return this.cache.get(key)!;

    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    let bgTint = '#fffbeb';
    let borderColor = '#d97706';
    let labelText = 'BÁNH MÌ BURGER';

    if (crateType === 'crate_meat') {
      bgTint = '#fff1f2';
      borderColor = '#ef4444';
      labelText = 'THỊT BÒ TƯƠI';
    } else if (crateType === 'crate_lettuce') {
      bgTint = '#f0fdf4';
      borderColor = '#22c55e';
      labelText = 'XÀ LÁCH TƯƠI';
    } else if (crateType === 'crate_tomato') {
      bgTint = '#fef2f2';
      borderColor = '#f43f5e';
      labelText = 'CÀ CHUA ĐỎ';
    } else if (crateType === 'crate_cheese') {
      bgTint = '#fefce8';
      borderColor = '#eab308';
      labelText = 'PHÔ MAI THỤY SĨ';
    } else if (crateType === 'crate_plate') {
      bgTint = '#f0f9ff';
      borderColor = '#0ea5e9';
      labelText = 'KỆ ĐĨA SỨ SẠCH';
    }

    // 1. Soft rounded wooden/parchment inlay mat
    ctx.fillStyle = bgTint;
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(14, 14, size - 28, size - 28, 36);
    } else {
      ctx.rect(14, 14, size - 28, size - 28);
    }
    ctx.fill();

    // Subtle diagonal gingham/butcher-paper pattern
    ctx.strokeStyle = `${borderColor}18`;
    ctx.lineWidth = 10;
    for (let i = -size; i < size * 2; i += 44) {
      ctx.beginPath();
      ctx.moveTo(i, 16);
      ctx.lineTo(i + size, size - 16);
      ctx.stroke();
    }

    // Outer double cartoon frame
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 10;
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(18, 18, size - 36, size - 36, 32);
    } else {
      ctx.rect(18, 18, size - 36, size - 36);
    }
    ctx.stroke();

    // Subtle corner L-brackets indicating multi-item surface area (never plain circles!)
    ctx.strokeStyle = `${borderColor}66`;
    ctx.lineWidth = 5;
    const corners = [
      [42, 42, 1, 1],
      [size - 42, 42, -1, 1],
      [42, size - 88, 1, -1],
      [size - 42, size - 88, -1, -1]
    ];
    corners.forEach(([cx, cy, dx, dy]) => {
      ctx.beginPath();
      ctx.moveTo(cx, cy + dy * 28);
      ctx.lineTo(cx, cy);
      ctx.lineTo(cx + dx * 28, cy);
      ctx.stroke();
    });

    // 2. Draw 4 rich 2D cartoon ingredient illustrations arranged across the bin top
    const iconPositions = [
      { x: 148, y: 142, scale: 0.92, rot: -0.14 },
      { x: 364, y: 142, scale: 0.92, rot: 0.16 },
      { x: 148, y: 312, scale: 0.92, rot: 0.12 },
      { x: 364, y: 312, scale: 0.92, rot: -0.12 },
      { x: 256, y: 224, scale: 1.22, rot: 0.0 }
    ];

    iconPositions.forEach((pos) => {
      ctx.save();
      ctx.translate(pos.x, pos.y);
      ctx.rotate(pos.rot);
      ctx.scale(pos.scale, pos.scale);
      this.drawCartoonIngredientIcon(ctx, crateType);
      ctx.restore();
    });

    // 3. Bottom Cartoon Ribbon Name Banner
    ctx.fillStyle = borderColor;
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(56, size - 74, size - 112, 48, 24);
    } else {
      ctx.rect(56, size - 74, size - 112, 48);
    }
    ctx.fill();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 26px "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(labelText, size / 2, size - 49);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    this.cache.set(key, texture);
    return texture;
  }

  /**
   * Vector 2D Cartoon Illustration Drawer for each Ingredient Type
   */
  private static drawCartoonIngredientIcon(ctx: CanvasRenderingContext2D, crateType: string) {
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    if (crateType === 'crate_bread') {
      // Drop shadow
      ctx.fillStyle = 'rgba(0,0,0,0.14)';
      ctx.beginPath();
      ctx.ellipse(0, 26, 54, 18, 0, 0, Math.PI * 2);
      ctx.fill();

      // Bottom bun base
      ctx.fillStyle = '#fde68a';
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.ellipse(0, 18, 48, 16, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Golden dome top bun
      const bunGrad = ctx.createRadialGradient(-14, -18, 8, 0, 0, 54);
      bunGrad.addColorStop(0, '#fbbf24');
      bunGrad.addColorStop(0.7, '#d97706');
      bunGrad.addColorStop(1, '#b45309');
      ctx.fillStyle = bunGrad;
      ctx.beginPath();
      ctx.arc(0, 10, 48, Math.PI, 0, false);
      ctx.bezierCurveTo(48, 24, -48, 24, -48, 10);
      ctx.fill();
      ctx.stroke();

      // Sesame seeds
      ctx.fillStyle = '#fef9c3';
      const seeds = [
        [-18, -14, -0.3],
        [0, -22, 0.1],
        [18, -12, 0.4],
        [-10, -2, 0.2],
        [12, -1, -0.2]
      ];
      seeds.forEach(([sx, sy, rot]) => {
        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(rot);
        ctx.beginPath();
        ctx.ellipse(0, 0, 6, 3.2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
    } else if (crateType === 'crate_meat') {
      // Cartoon T-Bone / Ribeye Steak Cut with white fat marbling & bone eye
      ctx.fillStyle = 'rgba(0,0,0,0.14)';
      ctx.beginPath();
      ctx.ellipse(2, 8, 54, 38, 0, 0, Math.PI * 2);
      ctx.fill();

      // White fat outer rim
      ctx.fillStyle = '#ffe4e6';
      ctx.strokeStyle = '#7f1d1d';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.ellipse(0, 0, 52, 36, -0.15, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Ruby red steak interior
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.ellipse(2, 0, 42, 28, -0.15, 0, Math.PI * 2);
      ctx.fill();

      // White marbling streaks & round bone ring
      ctx.strokeStyle = '#fecdd3';
      ctx.lineWidth = 4.5;
      ctx.beginPath();
      ctx.moveTo(-22, -8);
      ctx.quadraticCurveTo(0, 6, 26, -10);
      ctx.moveTo(-14, 12);
      ctx.quadraticCurveTo(8, 2, 28, 12);
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#991b1b';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(-18, -4, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else if (crateType === 'crate_lettuce') {
      // Ruffled Cartoon Lettuce Leaf Rosette
      const leafColors = ['#16a34a', '#22c55e', '#4ade80'];
      for (let l = 0; l < 6; l++) {
        ctx.save();
        ctx.rotate((l / 6) * Math.PI * 2);
        ctx.fillStyle = leafColors[l % leafColors.length];
        ctx.strokeStyle = '#14532d';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.ellipse(20, 0, 28, 18, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
      // Crisp light green center heart & leaf veins
      ctx.fillStyle = '#86efac';
      ctx.strokeStyle = '#14532d';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(0, 0, 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else if (crateType === 'crate_tomato') {
      // Plump Glossy Red Vine Tomato with 5-pointed green star calyx
      ctx.fillStyle = 'rgba(0,0,0,0.14)';
      ctx.beginPath();
      ctx.ellipse(2, 8, 46, 40, 0, 0, Math.PI * 2);
      ctx.fill();

      const tomGrad = ctx.createRadialGradient(-14, -12, 6, 0, 0, 48);
      tomGrad.addColorStop(0, '#ff6b6b');
      tomGrad.addColorStop(0.65, '#ef233c');
      tomGrad.addColorStop(1, '#b91c1c');
      ctx.fillStyle = tomGrad;
      ctx.strokeStyle = '#7f1d1d';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.ellipse(0, 2, 44, 38, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Gloss shine arc
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.beginPath();
      ctx.ellipse(-16, -12, 12, 6, -0.5, 0, Math.PI * 2);
      ctx.fill();

      // 5-pointed green leaf calyx on top
      ctx.fillStyle = '#16a34a';
      ctx.strokeStyle = '#14532d';
      ctx.lineWidth = 4;
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const ang = (i / 5) * Math.PI * 2 - Math.PI / 2;
        const ox = Math.cos(ang) * 22;
        const oy = -8 + Math.sin(ang) * 16;
        if (i === 0) ctx.moveTo(ox, oy);
        else ctx.lineTo(ox, oy);
        const ix = Math.cos(ang + Math.PI / 5) * 8;
        const iy = -8 + Math.sin(ang + Math.PI / 5) * 6;
        ctx.lineTo(ix, iy);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (crateType === 'crate_cheese') {
      // Triangular Swiss Cheese Wedge with holes
      ctx.fillStyle = '#facc15';
      ctx.strokeStyle = '#854d0e';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(-42, 18);
      ctx.lineTo(44, 22);
      ctx.lineTo(12, -34);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Cheese side depth face
      ctx.fillStyle = '#eab308';
      ctx.beginPath();
      ctx.moveTo(-42, 18);
      ctx.lineTo(44, 22);
      ctx.lineTo(44, 38);
      ctx.lineTo(-42, 34);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Swiss cheese holes
      ctx.fillStyle = '#ca8a04';
      const holes = [
        [-10, 4, 8],
        [14, 8, 6.5],
        [4, -12, 6]
      ];
      holes.forEach(([hx, hy, hr]) => {
        ctx.beginPath();
        ctx.arc(hx, hy, hr, 0, Math.PI * 2);
        ctx.fill();
      });
    } else {
      // Ceramic Plate with blue rim
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(0, 0, 42, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, 28, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
}
