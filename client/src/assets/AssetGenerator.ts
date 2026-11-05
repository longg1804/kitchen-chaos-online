import Phaser from 'phaser';

export class AssetGenerator {
  public static generateAll(scene: Phaser.Scene) {
    const textures = scene.textures;

    // Helper to register canvas as Phaser texture
    const registerCanvas = (key: string, canvas: HTMLCanvasElement) => {
      if (textures.exists(key)) {
        textures.remove(key);
      }
      textures.addCanvas(key, canvas);
    };

    // 1. FLOOR TILE (Kitchen Checkerboard / Light Tile)
    {
      const canvas = document.createElement('canvas');
      canvas.width = 64;
      canvas.height = 64;
      const ctx = canvas.getContext('2d')!;
      
      ctx.fillStyle = '#f3f4f6';
      ctx.fillRect(0, 0, 64, 64);
      ctx.fillStyle = '#e5e7eb';
      ctx.fillRect(0, 0, 32, 32);
      ctx.fillRect(32, 32, 32, 32);

      // Subtle tile borders
      ctx.strokeStyle = '#d1d5db';
      ctx.lineWidth = 1;
      ctx.strokeRect(0, 0, 64, 64);

      registerCanvas('floor_tile', canvas);
    }

    // 2. WALL TILE
    {
      const canvas = document.createElement('canvas');
      canvas.width = 64;
      canvas.height = 64;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#374151';
      ctx.fillRect(0, 0, 64, 64);
      ctx.fillStyle = '#4b5563';
      ctx.fillRect(2, 2, 60, 28);
      ctx.fillRect(2, 34, 60, 28);
      registerCanvas('wall_tile', canvas);
    }

    // 3. BASE KITCHEN COUNTER (Wooden Counter Top with Steel border)
    {
      const canvas = document.createElement('canvas');
      canvas.width = 64;
      canvas.height = 64;
      const ctx = canvas.getContext('2d')!;

      // Counter body / shadow
      ctx.fillStyle = '#1f2937';
      ctx.fillRect(0, 0, 64, 64);

      // Counter steel/wood surface
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(2, 2, 60, 56);

      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(4, 4, 56, 50);

      // Bevel edge
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 2;
      ctx.strokeRect(4, 4, 56, 50);

      registerCanvas('counter_clear', canvas);
    }

    // 4. CUTTING BOARD COUNTER
    {
      const canvas = document.createElement('canvas');
      canvas.width = 64;
      canvas.height = 64;
      const ctx = canvas.getContext('2d')!;

      // Draw base counter
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(2, 2, 60, 60);

      // Cutting board (wood)
      ctx.fillStyle = '#d97706';
      ctx.beginPath();
      ctx.roundRect(10, 12, 44, 40, 6);
      ctx.fill();

      // Wood grain / inner surface
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.roundRect(12, 14, 40, 36, 4);
      ctx.fill();

      // Chef's Knife on cutting board
      ctx.fillStyle = '#94a3b8'; // Blade
      ctx.beginPath();
      ctx.moveTo(18, 40);
      ctx.lineTo(44, 40);
      ctx.lineTo(40, 34);
      ctx.lineTo(24, 34);
      ctx.closePath();
      ctx.fill();

      // Knife handle
      ctx.fillStyle = '#78350f';
      ctx.fillRect(14, 35, 8, 4);

      registerCanvas('counter_cutting', canvas);
    }

    // 5. STOVE COUNTER (With Cooktop & Frying Pan)
    {
      const canvas = document.createElement('canvas');
      canvas.width = 64;
      canvas.height = 64;
      const ctx = canvas.getContext('2d')!;

      // Base counter
      ctx.fillStyle = '#334155';
      ctx.fillRect(2, 2, 60, 60);

      // Stove metal ring
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(32, 32, 20, 0, Math.PI * 2);
      ctx.stroke();

      // Frying Pan base
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.arc(32, 32, 16, 0, Math.PI * 2);
      ctx.fill();

      // Pan handle
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(44, 29, 14, 6);

      registerCanvas('counter_stove', canvas);
    }

    // 6. DELIVERY COUNTER
    {
      const canvas = document.createElement('canvas');
      canvas.width = 64;
      canvas.height = 64;
      const ctx = canvas.getContext('2d')!;

      // Green serving counter
      ctx.fillStyle = '#059669';
      ctx.fillRect(2, 2, 60, 60);

      ctx.fillStyle = '#10b981';
      ctx.fillRect(6, 6, 52, 52);

      // Arrow pointing up/out
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(32, 14);
      ctx.lineTo(44, 30);
      ctx.lineTo(36, 30);
      ctx.lineTo(36, 48);
      ctx.lineTo(28, 48);
      ctx.lineTo(28, 30);
      ctx.lineTo(20, 30);
      ctx.closePath();
      ctx.fill();

      registerCanvas('counter_delivery', canvas);
    }

    // 7. TRASH CAN
    {
      const canvas = document.createElement('canvas');
      canvas.width = 64;
      canvas.height = 64;
      const ctx = canvas.getContext('2d')!;

      // Red/Orange Trash bin
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(8, 8, 48, 48);

      ctx.fillStyle = '#b91c1c';
      ctx.fillRect(12, 12, 40, 40);

      // Trash lid handle
      ctx.fillStyle = '#f87171';
      ctx.fillRect(24, 6, 16, 4);

      // Trash symbol icon
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(22, 24);
      ctx.lineTo(22, 42);
      ctx.moveTo(32, 24);
      ctx.lineTo(32, 42);
      ctx.moveTo(42, 24);
      ctx.lineTo(42, 42);
      ctx.stroke();

      registerCanvas('counter_trash', canvas);
    }

    // 8. CRATE COUNTERS (Bread, Meat, Lettuce, Tomato, Plate)
    const createCrate = (key: string, label: string, color: string, iconDrawer: (ctx: CanvasRenderingContext2D) => void) => {
      const canvas = document.createElement('canvas');
      canvas.width = 64;
      canvas.height = 64;
      const ctx = canvas.getContext('2d')!;

      // Wood crate border
      ctx.fillStyle = '#78350f';
      ctx.fillRect(2, 2, 60, 60);
      ctx.fillStyle = color;
      ctx.fillRect(6, 6, 52, 52);

      // Draw item icon inside crate
      iconDrawer(ctx);

      // Small label bottom
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(6, 46, 52, 14);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(label, 32, 57);

      registerCanvas(key, canvas);
    };

    // Crate: Bread
    createCrate('counter_crate_bread', 'BÁNH MÌ', '#fef3c7', (c) => {
      c.fillStyle = '#d97706';
      c.beginPath();
      c.arc(32, 28, 14, Math.PI, 0, false);
      c.closePath();
      c.fill();
    });

    // Crate: Meat
    createCrate('counter_crate_meat', 'THỊT BÒ', '#fee2e2', (c) => {
      c.fillStyle = '#dc2626';
      c.beginPath();
      c.ellipse(32, 28, 14, 10, 0, 0, Math.PI * 2);
      c.fill();
    });

    // Crate: Lettuce
    createCrate('counter_crate_lettuce', 'XÀ LÁCH', '#dcfce7', (c) => {
      c.fillStyle = '#22c55e';
      c.beginPath();
      c.arc(32, 28, 12, 0, Math.PI * 2);
      c.fill();
    });

    // Crate: Tomato
    createCrate('counter_crate_tomato', 'CÀ CHUA', '#ffe4e6', (c) => {
      c.fillStyle = '#ef4444';
      c.beginPath();
      c.arc(32, 28, 12, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = '#15803d';
      c.fillRect(30, 14, 4, 4);
    });

    // Crate: Plate
    createCrate('counter_crate_plate', 'ĐĨA ĂN', '#e0f2fe', (c) => {
      c.fillStyle = '#ffffff';
      c.strokeStyle = '#38bdf8';
      c.lineWidth = 2;
      c.beginPath();
      c.arc(32, 28, 14, 0, Math.PI * 2);
      c.fill();
      c.stroke();
    });

    // 9. FOOD ITEMS (For holding and putting on counters)
    // Item: Bread Bun
    {
      const canvas = document.createElement('canvas');
      canvas.width = 36;
      canvas.height = 36;
      const ctx = canvas.getContext('2d')!;

      ctx.fillStyle = '#b45309';
      ctx.beginPath();
      ctx.arc(18, 18, 14, Math.PI, 0, false);
      ctx.lineTo(32, 22);
      ctx.arcTo(18, 26, 4, 22, 4);
      ctx.closePath();
      ctx.fill();

      // Sesame seeds
      ctx.fillStyle = '#fef3c7';
      [ [14, 12], [18, 10], [22, 13], [16, 16], [21, 16] ].forEach(([x, y]) => {
        ctx.fillRect(x, y, 2, 2);
      });

      registerCanvas('item_bread', canvas);
    }

    // Item: Raw Meat
    {
      const canvas = document.createElement('canvas');
      canvas.width = 36;
      canvas.height = 36;
      const ctx = canvas.getContext('2d')!;

      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.ellipse(18, 18, 13, 9, 0, 0, Math.PI * 2);
      ctx.fill();

      // Fat marbling
      ctx.strokeStyle = '#fecaca';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(10, 17);
      ctx.lineTo(24, 19);
      ctx.stroke();

      registerCanvas('item_raw_meat', canvas);
    }

    // Item: Cooked Meat Patty
    {
      const canvas = document.createElement('canvas');
      canvas.width = 36;
      canvas.height = 36;
      const ctx = canvas.getContext('2d')!;

      ctx.fillStyle = '#78350f';
      ctx.beginPath();
      ctx.ellipse(18, 18, 13, 9, 0, 0, Math.PI * 2);
      ctx.fill();

      // Grill marks
      ctx.strokeStyle = '#451a03';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(12, 14);
      ctx.lineTo(24, 22);
      ctx.moveTo(14, 12);
      ctx.lineTo(22, 24);
      ctx.stroke();

      registerCanvas('item_cooked_patty', canvas);
    }

    // Item: Burnt Patty
    {
      const canvas = document.createElement('canvas');
      canvas.width = 36;
      canvas.height = 36;
      const ctx = canvas.getContext('2d')!;

      ctx.fillStyle = '#171717';
      ctx.beginPath();
      ctx.ellipse(18, 18, 13, 9, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#404040';
      ctx.fillRect(14, 16, 8, 4);

      registerCanvas('item_burnt_patty', canvas);
    }

    // Item: Lettuce (Raw)
    {
      const canvas = document.createElement('canvas');
      canvas.width = 36;
      canvas.height = 36;
      const ctx = canvas.getContext('2d')!;

      ctx.fillStyle = '#22c55e';
      ctx.beginPath();
      ctx.arc(18, 18, 12, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#86efac';
      ctx.beginPath();
      ctx.arc(16, 16, 6, 0, Math.PI * 2);
      ctx.fill();

      registerCanvas('item_lettuce', canvas);
    }

    // Item: Chopped Lettuce
    {
      const canvas = document.createElement('canvas');
      canvas.width = 36;
      canvas.height = 36;
      const ctx = canvas.getContext('2d')!;

      ctx.fillStyle = '#16a34a';
      ctx.fillRect(8, 12, 6, 12);
      ctx.fillRect(16, 10, 6, 15);
      ctx.fillRect(24, 14, 6, 11);

      ctx.fillStyle = '#4ade80';
      ctx.fillRect(10, 15, 3, 7);
      ctx.fillRect(18, 13, 3, 9);

      registerCanvas('item_chopped_lettuce', canvas);
    }

    // Item: Tomato (Raw)
    {
      const canvas = document.createElement('canvas');
      canvas.width = 36;
      canvas.height = 36;
      const ctx = canvas.getContext('2d')!;

      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(18, 19, 12, 0, Math.PI * 2);
      ctx.fill();

      // Green stem
      ctx.fillStyle = '#15803d';
      ctx.fillRect(16, 5, 4, 5);

      registerCanvas('item_tomato', canvas);
    }

    // Item: Sliced Tomato
    {
      const canvas = document.createElement('canvas');
      canvas.width = 36;
      canvas.height = 36;
      const ctx = canvas.getContext('2d')!;

      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(18, 18, 12, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#f87171';
      ctx.beginPath();
      ctx.arc(18, 18, 8, 0, Math.PI * 2);
      ctx.fill();

      // Seeds
      ctx.fillStyle = '#fef08a';
      [ [15, 15], [21, 15], [18, 21] ].forEach(([x, y]) => {
        ctx.fillRect(x, y, 2, 2);
      });

      registerCanvas('item_sliced_tomato', canvas);
    }

    // Item: Plate
    {
      const canvas = document.createElement('canvas');
      canvas.width = 40;
      canvas.height = 40;
      const ctx = canvas.getContext('2d')!;

      // Plate outer rim shadow
      ctx.fillStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.arc(20, 20, 18, 0, Math.PI * 2);
      ctx.fill();

      // Plate white porcelain
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(20, 20, 16, 0, Math.PI * 2);
      ctx.fill();

      // Blue ornamental rim
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(20, 20, 13, 0, Math.PI * 2);
      ctx.stroke();

      registerCanvas('item_plate', canvas);
    }

    // Item: Complete Burger
    {
      const canvas = document.createElement('canvas');
      canvas.width = 44;
      canvas.height = 44;
      const ctx = canvas.getContext('2d')!;

      // Plate underneath
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(22, 22, 20, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Bottom Bun
      ctx.fillStyle = '#d97706';
      ctx.beginPath();
      ctx.ellipse(22, 27, 13, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Cooked Patty
      ctx.fillStyle = '#78350f';
      ctx.beginPath();
      ctx.ellipse(22, 23, 12, 4, 0, 0, Math.PI * 2);
      ctx.fill();

      // Sliced Tomato
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.ellipse(20, 20, 11, 3, 0, 0, Math.PI * 2);
      ctx.fill();

      // Chopped Lettuce
      ctx.fillStyle = '#22c55e';
      ctx.beginPath();
      ctx.ellipse(23, 18, 12, 3, 0, 0, Math.PI * 2);
      ctx.fill();

      // Top Bun
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(22, 16, 12, Math.PI, 0, false);
      ctx.closePath();
      ctx.fill();

      // Sesame seeds
      ctx.fillStyle = '#fef3c7';
      ctx.fillRect(19, 10, 2, 2);
      ctx.fillRect(24, 11, 2, 2);
      ctx.fillRect(21, 13, 2, 2);

      registerCanvas('item_burger', canvas);
    }

    // 10. CHEF CHARACTER (Front, Back, Side, Hat)
    {
      const canvas = document.createElement('canvas');
      canvas.width = 48;
      canvas.height = 48;
      const ctx = canvas.getContext('2d')!;

      // Drop shadow
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.beginPath();
      ctx.ellipse(24, 43, 16, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Chef Red Scarf / Torso
      ctx.fillStyle = '#2563eb'; // Blue apron/jacket
      ctx.beginPath();
      ctx.roundRect(14, 24, 20, 18, 4);
      ctx.fill();

      // Apron white
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(18, 25, 12, 16);

      // Red necktie
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.moveTo(22, 24);
      ctx.lineTo(26, 24);
      ctx.lineTo(24, 29);
      ctx.closePath();
      ctx.fill();

      // Head (Cute rounded)
      ctx.fillStyle = '#fed7aa';
      ctx.beginPath();
      ctx.arc(24, 20, 11, 0, Math.PI * 2);
      ctx.fill();

      // Cute Eyes
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.arc(20, 20, 2, 0, Math.PI * 2);
      ctx.arc(28, 20, 2, 0, Math.PI * 2);
      ctx.fill();

      // Rosy Cheeks
      ctx.fillStyle = '#fca5a5';
      ctx.beginPath();
      ctx.arc(17, 23, 2, 0, Math.PI * 2);
      ctx.arc(31, 23, 2, 0, Math.PI * 2);
      ctx.fill();

      // Chef Hat (Toque Blanche)
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.roundRect(15, 11, 18, 5, 2); // band
      ctx.fill();
      ctx.strokeStyle = '#cbd5e1';
      ctx.strokeRect(15, 11, 18, 5);

      // Hat puffy top
      ctx.beginPath();
      ctx.arc(18, 7, 6, 0, Math.PI * 2);
      ctx.arc(24, 5, 7, 0, Math.PI * 2);
      ctx.arc(30, 7, 6, 0, Math.PI * 2);
      ctx.fill();

      registerCanvas('chef_player', canvas);
    }
  }
}
