import Phaser from 'phaser';

export class AssetGenerator {
  public static generateAll(scene: Phaser.Scene) {
    const textures = scene.textures;

    const registerCanvas = (key: string, canvas: HTMLCanvasElement) => {
      if (textures.exists(key)) {
        textures.remove(key);
      }
      textures.addCanvas(key, canvas);
    };

    // 1. FLOOR TILES
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
      ctx.strokeStyle = '#d1d5db';
      ctx.lineWidth = 1;
      ctx.strokeRect(0, 0, 64, 64);
      registerCanvas('floor_tile', canvas);
    }

    // 2. BASE KITCHEN COUNTER
    {
      const canvas = document.createElement('canvas');
      canvas.width = 64;
      canvas.height = 64;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#1f2937';
      ctx.fillRect(0, 0, 64, 64);
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(2, 2, 60, 56);
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(4, 4, 56, 50);
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 2;
      ctx.strokeRect(4, 4, 56, 50);
      registerCanvas('counter_clear', canvas);
    }

    // 3. CUTTING BOARD COUNTER
    {
      const canvas = document.createElement('canvas');
      canvas.width = 64;
      canvas.height = 64;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(2, 2, 60, 60);
      ctx.fillStyle = '#d97706';
      ctx.beginPath();
      ctx.roundRect(10, 12, 44, 40, 6);
      ctx.fill();
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.roundRect(12, 14, 40, 36, 4);
      ctx.fill();
      // Knife
      ctx.fillStyle = '#94a3b8';
      ctx.beginPath();
      ctx.moveTo(18, 40);
      ctx.lineTo(44, 40);
      ctx.lineTo(40, 34);
      ctx.lineTo(24, 34);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#78350f';
      ctx.fillRect(14, 35, 8, 4);
      registerCanvas('counter_cutting', canvas);
    }

    // 4. STOVE COUNTER
    {
      const canvas = document.createElement('canvas');
      canvas.width = 64;
      canvas.height = 64;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#334155';
      ctx.fillRect(2, 2, 60, 60);
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(32, 32, 20, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.arc(32, 32, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(44, 29, 14, 6);
      registerCanvas('counter_stove', canvas);
    }

    // 5. DELIVERY COUNTER
    {
      const canvas = document.createElement('canvas');
      canvas.width = 64;
      canvas.height = 64;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#059669';
      ctx.fillRect(2, 2, 60, 60);
      ctx.fillStyle = '#10b981';
      ctx.fillRect(6, 6, 52, 52);
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

    // 6. TRASH CAN
    {
      const canvas = document.createElement('canvas');
      canvas.width = 64;
      canvas.height = 64;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(8, 8, 48, 48);
      ctx.fillStyle = '#b91c1c';
      ctx.fillRect(12, 12, 40, 40);
      ctx.fillStyle = '#f87171';
      ctx.fillRect(24, 6, 16, 4);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(22, 24); ctx.lineTo(22, 42);
      ctx.moveTo(32, 24); ctx.lineTo(32, 42);
      ctx.moveTo(42, 24); ctx.lineTo(42, 42);
      ctx.stroke();
      registerCanvas('counter_trash', canvas);
    }

    // 7. CONVEYOR BELTS (Left & Right)
    const createConveyor = (key: string, isLeft: boolean) => {
      const canvas = document.createElement('canvas');
      canvas.width = 64;
      canvas.height = 64;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(2, 2, 60, 60);
      ctx.fillStyle = '#334155';
      ctx.fillRect(6, 12, 52, 40);
      // Rollers & arrow
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      if (isLeft) {
        ctx.moveTo(40, 20); ctx.lineTo(24, 32); ctx.lineTo(40, 44);
      } else {
        ctx.moveTo(24, 20); ctx.lineTo(40, 32); ctx.lineTo(24, 44);
      }
      ctx.fill();
      registerCanvas(key, canvas);
    };
    createConveyor('counter_conveyor_left', true);
    createConveyor('counter_conveyor_right', false);

    // 8. CRATE COUNTERS (Bread, Meat, Lettuce, Tomato, Cheese, Plate)
    const createCrate = (key: string, label: string, color: string, iconDrawer: (ctx: CanvasRenderingContext2D) => void) => {
      const canvas = document.createElement('canvas');
      canvas.width = 64;
      canvas.height = 64;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#78350f';
      ctx.fillRect(2, 2, 60, 60);
      ctx.fillStyle = color;
      ctx.fillRect(6, 6, 52, 52);
      iconDrawer(ctx);
      ctx.fillStyle = 'rgba(0,0,0,0.65)';
      ctx.fillRect(6, 46, 52, 14);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(label, 32, 57);
      registerCanvas(key, canvas);
    };

    createCrate('counter_crate_bread', 'BÁNH MÌ', '#fef3c7', (c) => {
      c.fillStyle = '#d97706';
      c.beginPath(); c.arc(32, 28, 14, Math.PI, 0, false); c.closePath(); c.fill();
    });

    createCrate('counter_crate_meat', 'THỊT BÒ', '#fee2e2', (c) => {
      c.fillStyle = '#dc2626';
      c.beginPath(); c.ellipse(32, 28, 14, 10, 0, 0, Math.PI * 2); c.fill();
    });

    createCrate('counter_crate_lettuce', 'XÀ LÁCH', '#dcfce7', (c) => {
      c.fillStyle = '#22c55e';
      c.beginPath(); c.arc(32, 28, 12, 0, Math.PI * 2); c.fill();
    });

    createCrate('counter_crate_tomato', 'CÀ CHUA', '#ffe4e6', (c) => {
      c.fillStyle = '#ef4444';
      c.beginPath(); c.arc(32, 28, 12, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#15803d'; c.fillRect(30, 14, 4, 4);
    });

    createCrate('counter_crate_cheese', 'PHÔ MAI', '#fef08a', (c) => {
      c.fillStyle = '#eab308';
      c.beginPath();
      c.moveTo(22, 38); c.lineTo(44, 38); c.lineTo(33, 16); c.closePath();
      c.fill();
      c.fillStyle = '#ca8a04';
      c.beginPath(); c.arc(30, 30, 3, 0, Math.PI * 2); c.arc(36, 33, 2, 0, Math.PI * 2); c.fill();
    });

    createCrate('counter_crate_plate', 'ĐĨA ĂN', '#e0f2fe', (c) => {
      c.fillStyle = '#ffffff';
      c.strokeStyle = '#38bdf8';
      c.lineWidth = 2;
      c.beginPath(); c.arc(32, 28, 14, 0, Math.PI * 2); c.fill(); c.stroke();
    });

    // 9. FOOD ITEMS
    // Item: Bread Bun
    {
      const canvas = document.createElement('canvas');
      canvas.width = 36; canvas.height = 36;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#b45309';
      ctx.beginPath();
      ctx.arc(18, 18, 14, Math.PI, 0, false);
      ctx.lineTo(32, 22); ctx.arcTo(18, 26, 4, 22, 4); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#fef3c7';
      [ [14, 12], [18, 10], [22, 13], [16, 16], [21, 16] ].forEach(([x, y]) => ctx.fillRect(x, y, 2, 2));
      registerCanvas('item_bread', canvas);
    }

    // Item: Raw Meat
    {
      const canvas = document.createElement('canvas');
      canvas.width = 36; canvas.height = 36;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#dc2626';
      ctx.beginPath(); ctx.ellipse(18, 18, 13, 9, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#fecaca'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(10, 17); ctx.lineTo(24, 19); ctx.stroke();
      registerCanvas('item_raw_meat', canvas);
    }

    // Item: Cooked Meat Patty
    {
      const canvas = document.createElement('canvas');
      canvas.width = 36; canvas.height = 36;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#78350f';
      ctx.beginPath(); ctx.ellipse(18, 18, 13, 9, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#451a03'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(12, 14); ctx.lineTo(24, 22); ctx.moveTo(14, 12); ctx.lineTo(22, 24); ctx.stroke();
      registerCanvas('item_cooked_patty', canvas);
    }

    // Item: Burnt Patty
    {
      const canvas = document.createElement('canvas');
      canvas.width = 36; canvas.height = 36;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#171717';
      ctx.beginPath(); ctx.ellipse(18, 18, 13, 9, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#404040'; ctx.fillRect(14, 16, 8, 4);
      registerCanvas('item_burnt_patty', canvas);
    }

    // Item: Lettuce & Chopped Lettuce
    {
      const canvas = document.createElement('canvas');
      canvas.width = 36; canvas.height = 36;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#22c55e';
      ctx.beginPath(); ctx.arc(18, 18, 12, 0, Math.PI * 2); ctx.fill();
      registerCanvas('item_lettuce', canvas);
    }
    {
      const canvas = document.createElement('canvas');
      canvas.width = 36; canvas.height = 36;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#16a34a';
      ctx.fillRect(8, 12, 6, 12); ctx.fillRect(16, 10, 6, 15); ctx.fillRect(24, 14, 6, 11);
      registerCanvas('item_chopped_lettuce', canvas);
    }

    // Item: Tomato & Sliced Tomato
    {
      const canvas = document.createElement('canvas');
      canvas.width = 36; canvas.height = 36;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#ef4444';
      ctx.beginPath(); ctx.arc(18, 19, 12, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#15803d'; ctx.fillRect(16, 5, 4, 5);
      registerCanvas('item_tomato', canvas);
    }
    {
      const canvas = document.createElement('canvas');
      canvas.width = 36; canvas.height = 36;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#ef4444';
      ctx.beginPath(); ctx.arc(18, 18, 12, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#f87171';
      ctx.beginPath(); ctx.arc(18, 18, 8, 0, Math.PI * 2); ctx.fill();
      registerCanvas('item_sliced_tomato', canvas);
    }

    // Item: Cheese & Sliced Cheese
    {
      const canvas = document.createElement('canvas');
      canvas.width = 36; canvas.height = 36;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#eab308';
      ctx.beginPath(); ctx.moveTo(8, 28); ctx.lineTo(28, 28); ctx.lineTo(18, 8); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ca8a04';
      ctx.beginPath(); ctx.arc(15, 20, 2.5, 0, Math.PI * 2); ctx.fill();
      registerCanvas('item_cheese', canvas);
    }
    {
      const canvas = document.createElement('canvas');
      canvas.width = 36; canvas.height = 36;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#facc15';
      ctx.beginPath(); ctx.roundRect(8, 12, 20, 14, 3); ctx.fill();
      registerCanvas('item_sliced_cheese', canvas);
    }

    // Item: Plate
    {
      const canvas = document.createElement('canvas');
      canvas.width = 40; canvas.height = 40;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#cbd5e1';
      ctx.beginPath(); ctx.arc(20, 20, 18, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(20, 20, 16, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#0284c7'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(20, 20, 13, 0, Math.PI * 2); ctx.stroke();
      registerCanvas('item_plate', canvas);
    }

    // Item: Complete Burger
    {
      const canvas = document.createElement('canvas');
      canvas.width = 44; canvas.height = 44;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#38bdf8'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(22, 22, 20, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#d97706';
      ctx.beginPath(); ctx.ellipse(22, 27, 13, 5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#78350f';
      ctx.beginPath(); ctx.ellipse(22, 23, 12, 4, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#facc15'; // cheese
      ctx.fillRect(12, 20, 20, 3);
      ctx.fillStyle = '#ef4444';
      ctx.beginPath(); ctx.ellipse(20, 19, 11, 3, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#22c55e';
      ctx.beginPath(); ctx.ellipse(23, 17, 12, 3, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath(); ctx.arc(22, 15, 12, Math.PI, 0, false); ctx.closePath(); ctx.fill();
      registerCanvas('item_burger', canvas);
    }

    // Item: Fresh Salad
    {
      const canvas = document.createElement('canvas');
      canvas.width = 44; canvas.height = 44;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#10b981'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(22, 22, 20, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#22c55e';
      ctx.beginPath(); ctx.arc(22, 22, 14, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ef4444';
      ctx.beginPath(); ctx.arc(17, 18, 5, 0, Math.PI * 2); ctx.arc(26, 24, 5, 0, Math.PI * 2); ctx.fill();
      registerCanvas('item_salad', canvas);
    }

    // 10. MULTIPLE CHEF SKINS
    // A. Classic Chef
    const createChef = (key: string, bodyColor: string, hatColor: string, drawFace: (ctx: CanvasRenderingContext2D) => void) => {
      const canvas = document.createElement('canvas');
      canvas.width = 48; canvas.height = 48;
      const ctx = canvas.getContext('2d')!;

      // Drop shadow
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.beginPath(); ctx.ellipse(24, 43, 16, 5, 0, 0, Math.PI * 2); ctx.fill();

      // Body / Apron
      ctx.fillStyle = bodyColor;
      ctx.beginPath(); ctx.roundRect(14, 24, 20, 18, 4); ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(18, 25, 12, 16);

      // Face custom
      drawFace(ctx);

      // Chef Hat
      ctx.fillStyle = hatColor;
      ctx.beginPath(); ctx.roundRect(15, 11, 18, 5, 2); ctx.fill();
      ctx.beginPath();
      ctx.arc(18, 7, 6, 0, Math.PI * 2);
      ctx.arc(24, 5, 7, 0, Math.PI * 2);
      ctx.arc(30, 7, 6, 0, Math.PI * 2);
      ctx.fill();

      registerCanvas(key, canvas);
    };

    // 1. Classic Human Chef
    createChef('chef_classic', '#2563eb', '#ffffff', (ctx) => {
      ctx.fillStyle = '#fed7aa';
      ctx.beginPath(); ctx.arc(24, 20, 11, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#1e293b';
      ctx.beginPath(); ctx.arc(20, 20, 2, 0, Math.PI * 2); ctx.arc(28, 20, 2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fca5a5';
      ctx.beginPath(); ctx.arc(17, 23, 2, 0, Math.PI * 2); ctx.arc(31, 23, 2, 0, Math.PI * 2); ctx.fill();
    });

    // 2. Panda Chef
    createChef('chef_panda', '#1e293b', '#ffffff', (ctx) => {
      // Ears
      ctx.fillStyle = '#1e293b';
      ctx.beginPath(); ctx.arc(15, 11, 5, 0, Math.PI * 2); ctx.arc(33, 11, 5, 0, Math.PI * 2); ctx.fill();
      // Face
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(24, 20, 11, 0, Math.PI * 2); ctx.fill();
      // Eye patches
      ctx.fillStyle = '#1e293b';
      ctx.beginPath(); ctx.ellipse(19, 19, 4, 3, -0.2, 0, Math.PI * 2); ctx.ellipse(29, 19, 4, 3, 0.2, 0, Math.PI * 2); ctx.fill();
      // Eyes white
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(19, 19, 1.5, 0, Math.PI * 2); ctx.arc(29, 19, 1.5, 0, Math.PI * 2); ctx.fill();
      // Nose
      ctx.fillStyle = '#1e293b';
      ctx.beginPath(); ctx.arc(24, 23, 2, 0, Math.PI * 2); ctx.fill();
    });

    // 3. Fox Chef
    createChef('chef_fox', '#ea580c', '#ffffff', (ctx) => {
      // Fox pointy ears
      ctx.fillStyle = '#ea580c';
      ctx.beginPath(); ctx.moveTo(13, 14); ctx.lineTo(18, 6); ctx.lineTo(21, 14); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(27, 14); ctx.lineTo(30, 6); ctx.lineTo(35, 14); ctx.closePath(); ctx.fill();
      // Face orange
      ctx.fillStyle = '#f97316';
      ctx.beginPath(); ctx.arc(24, 20, 11, 0, Math.PI * 2); ctx.fill();
      // White muzzle
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.ellipse(24, 23, 7, 4, 0, 0, Math.PI * 2); ctx.fill();
      // Eyes
      ctx.fillStyle = '#1e293b';
      ctx.beginPath(); ctx.arc(19, 19, 2, 0, Math.PI * 2); ctx.arc(29, 19, 2, 0, Math.PI * 2); ctx.fill();
      // Nose
      ctx.beginPath(); ctx.arc(24, 23, 2, 0, Math.PI * 2); ctx.fill();
    });

    // 4. Robot Chef
    createChef('chef_robot', '#475569', '#38bdf8', (ctx) => {
      // Metallic head
      ctx.fillStyle = '#94a3b8';
      ctx.beginPath(); ctx.roundRect(14, 11, 20, 18, 4); ctx.fill();
      // Cyan Visor / Eyes
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath(); ctx.roundRect(17, 17, 14, 6, 2); ctx.fill();
    });

    // Register alias for default
    registerCanvas('chef_player', textures.get('chef_classic').getSourceImage() as HTMLCanvasElement);
  }
}
