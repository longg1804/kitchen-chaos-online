import * as THREE from 'three';

export class TextureGenerator3D {
  private static cache: Map<string, THREE.CanvasTexture> = new Map();

  /**
   * Overcooked-Style Blue-Grey Octagon & Diamond Geometric Tile Floor (Matches Reference Image 1)
   */
  public static getFloorTexture(): THREE.CanvasTexture {
    const key = 'floor_tiles_octagon_v3';
    if (this.cache.has(key)) return this.cache.get(key)!;

    const size = 1024;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    const cells = 4;
    const cellSize = size / cells;

    // Deep slate grout base
    ctx.fillStyle = '#4e5968';
    ctx.fillRect(0, 0, size, size);

    const octColors = ['#7c889b', '#768295', '#808c9f', '#788497'];
    const cut = cellSize * 0.22; // 45-degree corner chamfer for octagon
    const gap = 5;

    // 1. Draw Octagon Tiles
    for (let r = 0; r < cells; r++) {
      for (let c = 0; c < cells; c++) {
        const x = c * cellSize;
        const y = r * cellSize;
        const color = octColors[(r * 3 + c * 5) % octColors.length];

        const drawOctagon = (inset: number) => {
          ctx.beginPath();
          ctx.moveTo(x + cut + inset * 0.4, y + inset);
          ctx.lineTo(x + cellSize - cut - inset * 0.4, y + inset);
          ctx.lineTo(x + cellSize - inset, y + cut + inset * 0.4);
          ctx.lineTo(x + cellSize - inset, y + cellSize - cut - inset * 0.4);
          ctx.lineTo(x + cellSize - cut - inset * 0.4, y + cellSize - inset);
          ctx.lineTo(x + cut + inset * 0.4, y + cellSize - inset);
          ctx.lineTo(x + inset, y + cellSize - cut - inset * 0.4);
          ctx.lineTo(x + inset, y + cut + inset * 0.4);
          ctx.closePath();
        };

        // Grout shadow border
        ctx.fillStyle = '#3b4452';
        drawOctagon(gap - 2);
        ctx.fill();

        // Main octagon tile surface with subtle bevel gradient
        const grad = ctx.createLinearGradient(x, y, x + cellSize, y + cellSize);
        grad.addColorStop(0, '#8b97aa');
        grad.addColorStop(0.25, color);
        grad.addColorStop(0.85, color);
        grad.addColorStop(1, '#687385');
        ctx.fillStyle = grad;
        drawOctagon(gap);
        ctx.fill();

        // Subtle inner bevel highlight
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
        ctx.lineWidth = 2;
        drawOctagon(gap + 2);
        ctx.stroke();
      }
    }

    // 2. Draw Small Rotated Square (Diamond) Inserts at Every Corner Intersection
    const dRadius = cut - gap * 1.1;
    for (let r = 0; r <= cells; r++) {
      for (let c = 0; c <= cells; c++) {
        const cx = c * cellSize;
        const cy = r * cellSize;

        ctx.fillStyle = '#707c8e';
        ctx.beginPath();
        ctx.moveTo(cx, cy - dRadius);
        ctx.lineTo(cx + dRadius, cy);
        ctx.lineTo(cx, cy + dRadius);
        ctx.lineTo(cx - dRadius, cy);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(3.5, 2.8);
    this.cache.set(key, texture);
    return texture;
  }

  /**
   * Floor Roughness Map matching the Octagon & Diamond tiles
   */
  public static getFloorRoughnessMap(): THREE.CanvasTexture {
    const key = 'floor_roughness_octagon_v3';
    if (this.cache.has(key)) return this.cache.get(key)!;

    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    const cells = 4;
    const cellSize = size / cells;
    const cut = cellSize * 0.22;
    const gap = 3;

    // Matte grout
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(0, 0, size, size);

    for (let r = 0; r < cells; r++) {
      for (let c = 0; c < cells; c++) {
        const x = c * cellSize;
        const y = r * cellSize;
        const roughVal = 95 + ((r * 13 + c * 7) % 20);
        ctx.fillStyle = `rgb(${roughVal}, ${roughVal}, ${roughVal})`;
        ctx.beginPath();
        ctx.moveTo(x + cut, y + gap);
        ctx.lineTo(x + cellSize - cut, y + gap);
        ctx.lineTo(x + cellSize - gap, y + cut);
        ctx.lineTo(x + cellSize - gap, y + cellSize - cut);
        ctx.lineTo(x + cellSize - cut, y + cellSize - gap);
        ctx.lineTo(x + cut, y + cellSize - gap);
        ctx.lineTo(x + gap, y + cellSize - cut);
        ctx.lineTo(x + gap, y + cut);
        ctx.closePath();
        ctx.fill();
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(3.5, 2.8);
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
   * Overcooked-Style White/Light-Grey Cutting Board with Side Handle Slots (Matches Reference Image 1)
   */
  public static getButcherBlockTexture(): THREE.CanvasTexture {
    const key = 'butcher_block_white_v3';
    if (this.cache.has(key)) return this.cache.get(key)!;

    const w = 512;
    const h = 384;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;

    // Warm light grey-white plastic board surface
    ctx.fillStyle = '#e5e7eb';
    ctx.fillRect(0, 0, w, h);

    // Subtle recessed inner cutting groove border
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 6;
    if (ctx.roundRect) {
      ctx.beginPath();
      ctx.roundRect(18, 18, w - 36, h - 36, 28);
      ctx.stroke();
    }

    // Subtle knife score marks in center
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)';
    ctx.lineWidth = 3;
    for (let i = -3; i <= 3; i++) {
      ctx.beginPath();
      ctx.moveTo(w / 2 - 60 + i * 18, h / 2 - 45);
      ctx.lineTo(w / 2 + 40 + i * 18, h / 2 + 55);
      ctx.stroke();
    }

    // Left and Right Dark-Wood Cutout Handle Slots (Revealing the brown table beneath, just like Image 1!)
    const drawHandleSlot = (sx: number) => {
      ctx.fillStyle = '#5c3418';
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 4;
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(sx, h * 0.24, 34, h * 0.52, 17);
      } else {
        ctx.rect(sx, h * 0.24, 34, h * 0.52);
      }
      ctx.fill();
      ctx.stroke();
    };
    drawHandleSlot(34);
    drawHandleSlot(w - 68);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    this.cache.set(key, texture);
    return texture;
  }

  /**
   * Overcooked-Style Ingredient Crate Top Surface Decal (Matches Reference Image 1 Row 2 Center):
   * - Dark recessed wooden panel background (#5c3418)
   * - Large crisp white circular plate medallion in the center
   * - Single bold, high-contrast 2D cartoon ingredient illustration centered on the white circle!
   */
  public static getIngredientBinTopDecalTexture(crateType: string): THREE.CanvasTexture {
    const key = `bin_top_decal_oc_${crateType}`;
    if (this.cache.has(key)) return this.cache.get(key)!;

    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    // 1. Recessed Dark Warm Wood Inner Panel (#5c3418)
    ctx.fillStyle = '#5c3418';
    ctx.fillRect(0, 0, size, size);

    // Subtle wood grain lines on recessed panel
    ctx.strokeStyle = 'rgba(40, 20, 8, 0.35)';
    ctx.lineWidth = 4;
    for (let y = 16; y < size; y += 36) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(size, y);
      ctx.stroke();
    }

    // Inner shadow around perimeter from raised wooden frame
    ctx.strokeStyle = 'rgba(20, 10, 4, 0.55)';
    ctx.lineWidth = 24;
    ctx.strokeRect(0, 0, size, size);

    // 2. Center White Circular Plate Medallion (Just like Reference Image 1!)
    const cx = size / 2;
    const cy = size / 2;
    const plateRadius = 168;

    // Drop shadow under white circle
    ctx.fillStyle = 'rgba(15, 8, 2, 0.45)';
    ctx.beginPath();
    ctx.arc(cx, cy + 8, plateRadius + 4, 0, Math.PI * 2);
    ctx.fill();

    // Crisp White Circular Plate
    ctx.fillStyle = '#f8fafc';
    ctx.strokeStyle = '#29170a';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.arc(cx, cy, plateRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Subtle inner plate rim
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(cx, cy, plateRadius - 24, 0, Math.PI * 2);
    ctx.stroke();

    // 3. Single Large Bold 2D Cartoon Ingredient Illustration in the Center of the White Circle
    if (crateType !== 'crate_plate') {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(2.15, 2.15);
      this.drawCartoonIngredientIcon(ctx, crateType);
      ctx.restore();
    }

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
