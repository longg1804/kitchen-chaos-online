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
   * Overcooked-Style Ingredient Crate Top Surface Decal (Matches Reference Image 1 & Image 4):
   * - Recessed Walnut wooden panel background with corner rivets
   * - Large crisp white circular plate medallion with bold color-coded accent border ring
   * - Large, high-contrast 2D cartoon ingredient illustration
   * - High-contrast Vietnamese Pill Badge at the bottom so it is 100% instantly readable!
   */
  public static getIngredientBinTopDecalTexture(crateType: string): THREE.CanvasTexture {
    const key = `bin_top_decal_oc_v5_${crateType}`;
    if (this.cache.has(key)) return this.cache.get(key)!;

    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    // 1. Recessed Warm Walnut Wooden Panel
    ctx.fillStyle = '#45220d';
    ctx.fillRect(0, 0, size, size);

    // Warm horizontal wood slats
    ctx.strokeStyle = 'rgba(25, 12, 4, 0.45)';
    ctx.lineWidth = 5;
    for (let y = 20; y < size; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(size, y);
      ctx.stroke();
    }

    // Heavy inset border shadow
    ctx.strokeStyle = 'rgba(15, 8, 2, 0.65)';
    ctx.lineWidth = 28;
    ctx.strokeRect(0, 0, size, size);

    // Metal corner rivets
    ctx.fillStyle = '#94a3b8';
    [[24, 24], [size - 24, 24], [24, size - 24], [size - 24, size - 24]].forEach(([rx, ry]) => {
      ctx.beginPath();
      ctx.arc(rx, ry, 7, 0, Math.PI * 2);
      ctx.fill();
    });

    const getCrateMeta = (t: string) => {
      switch (t) {
        case 'crate_bread': return { ring: '#f59e0b', ringDark: '#b45309', label: 'BÁNH MÌ', iconScale: 2.7 };
        case 'crate_meat': return { ring: '#ef4444', ringDark: '#991b1b', label: 'THỊT BÒ', iconScale: 2.7 };
        case 'crate_lettuce': return { ring: '#22c55e', ringDark: '#14532d', label: 'XÀ LÁCH', iconScale: 2.7 };
        case 'crate_tomato': return { ring: '#dc2626', ringDark: '#7f1d1d', label: 'CÀ CHUA', iconScale: 2.7 };
        case 'crate_cheese': return { ring: '#eab308', ringDark: '#854d0e', label: 'PHÔ MAI', iconScale: 2.7 };
        case 'crate_mushroom': return { ring: '#d97706', ringDark: '#78350f', label: 'NẤM TƯƠI', iconScale: 2.7 };
        case 'crate_onion': return { ring: '#a855f7', ringDark: '#581c87', label: 'HÀNH TÂY', iconScale: 2.7 };
        case 'crate_potato': return { ring: '#ca8a04', ringDark: '#713f12', label: 'KHOAI TÂY', iconScale: 2.7 };
        case 'crate_fish': return { ring: '#0284c7', ringDark: '#075985', label: 'CÁ HỒI', iconScale: 2.7 };
        case 'crate_shrimp': return { ring: '#f43f5e', ringDark: '#9f1239', label: 'TÔM TƯƠI', iconScale: 2.7 };
        case 'crate_chicken': return { ring: '#f97316', ringDark: '#9a3412', label: 'THỊT GÀ', iconScale: 2.7 };
        case 'crate_plate': return { ring: '#06b6d4', ringDark: '#0e7490', label: 'ĐĨA SẠCH', iconScale: 2.7 };
        default: return { ring: '#f59e0b', ringDark: '#78350f', label: 'NGUYÊN LIỆU', iconScale: 2.7 };
      }
    };

    const meta = getCrateMeta(crateType);
    const cx = size / 2;
    const cy = size / 2 - 14;
    const plateRadius = 196;

    // Outer Drop Shadow under plate
    ctx.fillStyle = 'rgba(0, 0, 0, 0.52)';
    ctx.beginPath();
    ctx.arc(cx, cy + 12, plateRadius + 6, 0, Math.PI * 2);
    ctx.fill();

    // Vibrant Accent Color Ring (Overcooked 2 style colorful station indicator)
    ctx.fillStyle = meta.ring;
    ctx.strokeStyle = meta.ringDark;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(cx, cy, plateRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Inner White Porcelain Plate
    const plateGrad = ctx.createRadialGradient(cx - 30, cy - 30, 20, cx, cy, plateRadius - 16);
    plateGrad.addColorStop(0, '#ffffff');
    plateGrad.addColorStop(0.85, '#f8fafc');
    plateGrad.addColorStop(1, '#e2e8f0');
    ctx.fillStyle = plateGrad;
    ctx.strokeStyle = meta.ringDark;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(cx, cy, plateRadius - 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Inner bevel groove
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.45)';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(cx, cy, plateRadius - 38, 0, Math.PI * 2);
    ctx.stroke();

    // Vector 2D Cartoon Artwork in center
    ctx.save();
    ctx.translate(cx, cy - 8);
    ctx.scale(meta.iconScale, meta.iconScale);
    this.drawCartoonIngredientIcon(ctx, crateType);
    ctx.restore();

    // Bold Vietnamese Pill Label at the bottom of the medallion
    const pillY = size - 62;
    const pillW = 224;
    const pillH = 46;
    const pillX = cx - pillW / 2;

    // Pill shadow
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    if (ctx.roundRect) {
      ctx.beginPath();
      ctx.roundRect(pillX, pillY + 4, pillW, pillH, 23);
      ctx.fill();
    }

    // Pill background matching accent ring
    ctx.fillStyle = meta.ring;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;
    if (ctx.roundRect) {
      ctx.beginPath();
      ctx.roundRect(pillX, pillY, pillW, pillH, 23);
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.fillRect(pillX, pillY, pillW, pillH);
    }

    // Label Text
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 24px "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 5;
    ctx.strokeStyle = '#0f172a';
    ctx.strokeText(meta.label, cx, pillY + pillH / 2);
    ctx.fillText(meta.label, cx, pillY + pillH / 2);

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
      // 3D Cartoon Swiss Cheese Wedge with Large Holes & Depth
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.beginPath();
      ctx.ellipse(2, 16, 52, 20, 0, 0, Math.PI * 2);
      ctx.fill();

      // Cheese front thickness face
      ctx.fillStyle = '#ca8a04';
      ctx.strokeStyle = '#451a03';
      ctx.lineWidth = 5.5;
      ctx.beginPath();
      ctx.moveTo(-42, 6);
      ctx.lineTo(44, 10);
      ctx.lineTo(44, 26);
      ctx.lineTo(-42, 22);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Cheese top triangular face
      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.moveTo(-42, 6);
      ctx.lineTo(44, 10);
      ctx.lineTo(12, -38);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Circular Swiss Cheese Holes with 3D bevels
      const holes = [
        [-12, -10, 8.5],
        [16, -6, 7],
        [6, -24, 6],
        [-24, -2, 5.5],
        [32, 6, 5]
      ];
      holes.forEach(([hx, hy, hr]) => {
        ctx.fillStyle = '#b45309';
        ctx.beginPath();
        ctx.arc(hx, hy, hr, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#78350f';
        ctx.lineWidth = 2.5;
        ctx.stroke();
      });

      // Highlight sheen
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-32, 4);
      ctx.lineTo(8, -32);
      ctx.stroke();
    } else if (crateType === 'crate_mushroom') {
      // Cartoon Mushroom Cap & Stem
      // Stem
      ctx.fillStyle = '#fef08a';
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.roundRect(-14, 6, 28, 28, [4, 4, 10, 10]);
      ctx.fill();
      ctx.stroke();

      // Cap
      ctx.fillStyle = '#b45309';
      ctx.beginPath();
      ctx.arc(0, 8, 44, Math.PI, 0, false);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // White spots
      ctx.fillStyle = '#ffffff';
      const spots = [[-20, -12, 7], [0, -22, 9], [22, -10, 6], [-2, -6, 6]];
      spots.forEach(([sx, sy, sr]) => {
        ctx.beginPath();
        ctx.arc(sx, sy, sr, 0, Math.PI * 2);
        ctx.fill();
      });
    } else if (crateType === 'crate_onion') {
      // Cartoon Red/Purple Onion
      ctx.fillStyle = '#9333ea';
      ctx.strokeStyle = '#581c87';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.ellipse(0, 6, 38, 36, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Onion Sprout
      ctx.fillStyle = '#22c55e';
      ctx.strokeStyle = '#14532d';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(-6, -26);
      ctx.lineTo(0, -42);
      ctx.lineTo(6, -26);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (crateType === 'crate_potato') {
      // Cartoon Golden Potato
      ctx.fillStyle = '#ca8a04';
      ctx.strokeStyle = '#713f12';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.ellipse(0, 2, 44, 32, -0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Potato spots
      ctx.fillStyle = '#854d0e';
      [[-16, -10], [12, -8], [-4, 12], [22, 8]].forEach(([px, py]) => {
        ctx.beginPath();
        ctx.arc(px, py, 3.5, 0, Math.PI * 2);
        ctx.fill();
      });
    } else if (crateType === 'crate_fish') {
      // Cartoon Ocean Fish
      ctx.fillStyle = '#0284c7';
      ctx.strokeStyle = '#075985';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.ellipse(-6, 2, 38, 24, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Tail fin
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.moveTo(26, 2);
      ctx.lineTo(44, -16);
      ctx.lineTo(44, 20);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Eye
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(-26, -4, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(-27, -4, 3, 0, Math.PI * 2);
      ctx.fill();
    } else if (crateType === 'crate_shrimp') {
      // Cartoon Pink Shrimp / Prawn
      ctx.fillStyle = '#f87171';
      ctx.strokeStyle = '#991b1b';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(0, 0, 32, -Math.PI * 0.8, Math.PI * 0.5, false);
      ctx.lineWidth = 14;
      ctx.stroke();

      // Head & eye
      ctx.lineWidth = 6;
      ctx.fillStyle = '#fca5a5';
      ctx.beginPath();
      ctx.arc(-18, -14, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.arc(-20, -16, 3, 0, Math.PI * 2);
      ctx.fill();
    } else if (crateType === 'crate_chicken') {
      // Cartoon Golden Roast Drumstick
      ctx.fillStyle = '#f59e0b';
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.ellipse(8, -4, 34, 24, 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Bone
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(-26, 16, 10, 6, -0.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
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
