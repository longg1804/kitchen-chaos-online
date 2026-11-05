import * as THREE from 'three';
import { IngredientType, KitchenItem } from '../../game/types';

export class Ingredient3DFactory {
  // PBR Stylized Cartoon Materials for Ingredients
  private static breadCrustMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.45, metalness: 0.05 });
  private static breadCrumbMat = new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.6 });
  private static sesameMat = new THREE.MeshStandardMaterial({ color: 0xfef9c3, roughness: 0.3 });

  private static rawMeatMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.35, metalness: 0.05 });
  private static fatMarblingMat = new THREE.MeshStandardMaterial({ color: 0xfecaca, roughness: 0.5 });
  private static cookedMeatMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.5, metalness: 0.1 });
  private static grillMarkMat = new THREE.MeshStandardMaterial({ color: 0x1c0c05, roughness: 0.7 });
  private static burntMeatMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.85, metalness: 0.1 });

  private static lettuceHeadMat = new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.4 });
  private static lettuceLeafMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.35 });
  private static lettuceLightMat = new THREE.MeshStandardMaterial({ color: 0x86efac, roughness: 0.45 });

  private static tomatoGlossMat = new THREE.MeshStandardMaterial({ color: 0xef233c, roughness: 0.2, metalness: 0.05 });
  private static tomatoPulpMat = new THREE.MeshStandardMaterial({ color: 0xf87171, roughness: 0.4 });
  private static tomatoSeedMat = new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.3 });
  private static stemGreenMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.5 });

  private static cheeseMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, roughness: 0.35, metalness: 0.05 });
  private static cheeseHoleMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.5 });

  private static chickenRawMat = new THREE.MeshStandardMaterial({ color: 0xfbcfe8, roughness: 0.4 });
  private static chickenCookedMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.4 });
  private static boneMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3 });

  private static fishScaleMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.25, metalness: 0.3 });
  private static fishCookedMat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.4 });
  private static shrimpMat = new THREE.MeshStandardMaterial({ color: 0xf43f5e, roughness: 0.3 });

  private static onionMat = new THREE.MeshStandardMaterial({ color: 0x831843, roughness: 0.35 });
  private static potatoMat = new THREE.MeshStandardMaterial({ color: 0xa16207, roughness: 0.65 });
  private static eggWhiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.2 });
  private static eggYolkMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.2, metalness: 0.1 });

  private static plateCeramicMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.15, metalness: 0.15 });

  /**
   * Creates a 3D Item mesh with pivot aligned:
   * Y = 0 is ALWAYS the bottom contact surface!
   */
  public static createMesh(item: KitchenItem): THREE.Group {
    const group = new THREE.Group();

    if (item.type === IngredientType.PLATE) {
      this.buildPlate(group);
      if (item.plateContents && item.plateContents.length > 0) {
        this.buildStackedMeal(group, item.plateContents);
      }
      return group;
    }

    return this.createMeshFromType(item.type);
  }

  public static createMeshFromType(type: IngredientType): THREE.Group {
    const group = new THREE.Group();

    switch (type) {
      case IngredientType.PLATE:
        this.buildPlate(group);
        break;
      case IngredientType.BREAD:
        this.buildBread(group, false);
        break;
      case IngredientType.RAW_MEAT:
        this.buildMeat(group, 'raw');
        break;
      case IngredientType.COOKED_PATTY:
        this.buildMeat(group, 'cooked');
        break;
      case IngredientType.BURNT_PATTY:
        this.buildMeat(group, 'burnt');
        break;
      case IngredientType.LETTUCE:
        this.buildLettuce(group, false);
        break;
      case IngredientType.CHOPPED_LETTUCE:
        this.buildLettuce(group, true);
        break;
      case IngredientType.TOMATO:
        this.buildTomato(group, false);
        break;
      case IngredientType.SLICED_TOMATO:
        this.buildTomato(group, true);
        break;
      case IngredientType.CHEESE:
        this.buildCheese(group, false);
        break;
      case IngredientType.SLICED_CHEESE:
        this.buildCheese(group, true);
        break;
      case IngredientType.CHICKEN:
        this.buildChicken(group, false);
        break;
      case IngredientType.COOKED_CHICKEN:
        this.buildChicken(group, true);
        break;
      case IngredientType.FISH:
        this.buildFish(group, false);
        break;
      case IngredientType.COOKED_FISH:
        this.buildFish(group, true);
        break;
      case IngredientType.SHRIMP:
      case IngredientType.COOKED_SHRIMP:
        this.buildShrimp(group);
        break;
      case IngredientType.ONION:
        this.buildOnion(group, false);
        break;
      case IngredientType.SLICED_ONION:
        this.buildOnion(group, true);
        break;
      case IngredientType.POTATO:
        this.buildPotato(group, false);
        break;
      case IngredientType.CHOPPED_POTATO:
        this.buildPotato(group, true);
        break;
      case IngredientType.EGG:
        this.buildEgg(group, false);
        break;
      case IngredientType.FRIED_EGG:
        this.buildEgg(group, true);
        break;
      default:
        this.buildBread(group, false);
        break;
    }

    return group;
  }

  // 1. CERAMIC PLATE (Bottom resting on y = 0)
  private static buildPlate(group: THREE.Group) {
    const plateGeo = new THREE.CylinderGeometry(0.32, 0.28, 0.04, 24);
    const plate = new THREE.Mesh(plateGeo, this.plateCeramicMat);
    plate.position.y = 0.02; // Bottom at y = 0
    plate.castShadow = true;
    plate.receiveShadow = true;
    group.add(plate);

    // Inner rim depression
    const innerGeo = new THREE.CylinderGeometry(0.25, 0.25, 0.015, 24);
    const inner = new THREE.Mesh(innerGeo, this.plateCeramicMat);
    inner.position.y = 0.025;
    group.add(inner);
  }

  // Multi-tier gourmet burger stacking on plate
  private static buildStackedMeal(group: THREE.Group, contents: IngredientType[]) {
    let currentY = 0.035;

    // Check if meal includes bun
    const hasBread = contents.includes(IngredientType.BREAD);

    if (hasBread) {
      // Bottom Bun slice
      const botBun = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.04, 18), this.breadCrustMat);
      botBun.position.y = currentY + 0.02;
      botBun.castShadow = true;
      group.add(botBun);
      currentY += 0.045;
    }

    // Cooked Patty
    if (contents.includes(IngredientType.COOKED_PATTY) || contents.includes(IngredientType.RAW_MEAT)) {
      const pattyMat = contents.includes(IngredientType.COOKED_PATTY) ? this.cookedMeatMat : this.rawMeatMat;
      const patty = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.05, 18), pattyMat);
      patty.position.y = currentY + 0.025;
      patty.castShadow = true;
      group.add(patty);
      currentY += 0.055;
    }

    // Cheese Slice (with slight corner droop)
    if (contents.includes(IngredientType.SLICED_CHEESE) || contents.includes(IngredientType.CHEESE)) {
      const cheese = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.025, 0.32), this.cheeseMat);
      cheese.rotation.y = Math.PI / 4;
      cheese.position.y = currentY + 0.012;
      cheese.castShadow = true;
      group.add(cheese);
      currentY += 0.03;
    }

    // Sliced Tomato
    if (contents.includes(IngredientType.SLICED_TOMATO) || contents.includes(IngredientType.TOMATO)) {
      const tomato = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.035, 18), this.tomatoGlossMat);
      tomato.position.y = currentY + 0.018;
      tomato.castShadow = true;
      group.add(tomato);
      currentY += 0.04;
    }

    // Chopped Lettuce
    if (contents.includes(IngredientType.CHOPPED_LETTUCE) || contents.includes(IngredientType.LETTUCE)) {
      for (let i = 0; i < 3; i++) {
        const leaf = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.02, 0.14), this.lettuceLeafMat);
        leaf.rotation.y = (i * Math.PI) / 3;
        leaf.position.set((Math.random() - 0.5) * 0.04, currentY + 0.01, (Math.random() - 0.5) * 0.04);
        group.add(leaf);
      }
      currentY += 0.035;
    }

    if (hasBread) {
      // Top Bun with Sesame Seeds
      const topBun = new THREE.Mesh(
        new THREE.SphereGeometry(0.25, 18, 14, 0, Math.PI * 2, 0, Math.PI / 1.8),
        this.breadCrustMat
      );
      topBun.position.y = currentY;
      topBun.castShadow = true;
      group.add(topBun);

      // Sesame Seeds
      const sGeo = new THREE.SphereGeometry(0.014, 6, 6);
      for (let s = 0; s < 7; s++) {
        const seed = new THREE.Mesh(sGeo, this.sesameMat);
        const ang = (s / 7) * Math.PI * 2;
        seed.position.set(Math.cos(ang) * 0.13, currentY + 0.16, Math.sin(ang) * 0.13);
        group.add(seed);
      }
    }
  }

  // 2. BRIOCHE BREAD BUN (Bottom at y = 0)
  private static buildBread(group: THREE.Group, isChopped: boolean) {
    if (isChopped) {
      // Bottom half
      const bot = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.23, 0.05, 18), this.breadCrustMat);
      bot.position.y = 0.025;
      bot.castShadow = true;
      group.add(bot);

      // Top dome separated slightly
      const top = new THREE.Mesh(
        new THREE.SphereGeometry(0.24, 18, 12, 0, Math.PI * 2, 0, Math.PI / 1.8),
        this.breadCrustMat
      );
      top.position.y = 0.08;
      top.castShadow = true;
      group.add(top);
    } else {
      // Golden Brioche Bun
      const bun = new THREE.Mesh(
        new THREE.SphereGeometry(0.25, 18, 14, 0, Math.PI * 2, 0, Math.PI / 1.7),
        this.breadCrustMat
      );
      bun.position.y = 0.03;
      bun.castShadow = true;
      group.add(bun);

      // Sesame seeds
      const sGeo = new THREE.SphereGeometry(0.015, 6, 6);
      for (let i = 0; i < 7; i++) {
        const seed = new THREE.Mesh(sGeo, this.sesameMat);
        const ang = (i / 7) * Math.PI * 2;
        seed.position.set(Math.cos(ang) * 0.13, 0.18, Math.sin(ang) * 0.13);
        group.add(seed);
      }
    }
  }

  // 3. BEEF PATTY (Bottom at y = 0)
  private static buildMeat(group: THREE.Group, state: 'raw' | 'cooked' | 'burnt') {
    if (state === 'raw') {
      // Raw Marbled Steak Cutlet
      const steak = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.25, 0.07, 16), this.rawMeatMat);
      steak.position.y = 0.035;
      steak.castShadow = true;
      group.add(steak);

      // White fat marbling stripes
      for (let f = -1; f <= 1; f++) {
        const fat = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.005, 0.04), this.fatMarblingMat);
        fat.rotation.y = f * 0.4;
        fat.position.set(f * 0.06, 0.071, 0);
        steak.add(fat);
      }
    } else {
      // Cooked or Burnt Patty
      const mat = state === 'cooked' ? this.cookedMeatMat : this.burntMeatMat;
      const patty = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.065, 18), mat);
      patty.position.y = 0.0325;
      patty.castShadow = true;
      group.add(patty);

      if (state === 'cooked') {
        // Scored grill marks
        for (let g = -1; g <= 1; g++) {
          const mark = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.005, 0.025), this.grillMarkMat);
          mark.rotation.y = Math.PI / 4;
          mark.position.set(0, 0.033, g * 0.09);
          patty.add(mark);
        }
      }
    }
  }

  // 4. LETTUCE (Bottom at y = 0)
  private static buildLettuce(group: THREE.Group, isChopped: boolean) {
    if (isChopped) {
      // Crisp ruffled salad leaves
      for (let i = 0; i < 5; i++) {
        const leaf = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.02, 0.14), this.lettuceLeafMat);
        leaf.rotation.y = (i * Math.PI) / 3;
        leaf.position.set((Math.random() - 0.5) * 0.05, 0.015 + i * 0.022, (Math.random() - 0.5) * 0.05);
        leaf.castShadow = true;
        group.add(leaf);
      }
    } else {
      // Plump layered cabbage head
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.23, 14, 14), this.lettuceHeadMat);
      head.position.y = 0.23;
      head.castShadow = true;
      group.add(head);

      // Outer wrapping leaves
      const outerMat = this.lettuceLightMat;
      const wrap = new THREE.Mesh(
        new THREE.SphereGeometry(0.24, 12, 12, 0, Math.PI * 1.6, 0, Math.PI / 1.4),
        outerMat
      );
      wrap.position.y = 0.23;
      group.add(wrap);
    }
  }

  // 5. TOMATO (Bottom at y = 0)
  private static buildTomato(group: THREE.Group, isChopped: boolean) {
    if (isChopped) {
      // Two thick juicy slices
      for (let i = 0; i < 2; i++) {
        const slice = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.20, 0.04, 18), this.tomatoGlossMat);
        slice.position.y = 0.02 + i * 0.05;
        slice.castShadow = true;
        group.add(slice);

        // Pulp & seed chambers
        const pulp = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.042, 6), this.tomatoPulpMat);
        slice.add(pulp);

        // Seed specks
        for (let s = 0; s < 4; s++) {
          const seed = new THREE.Mesh(new THREE.SphereGeometry(0.018, 6, 6), this.tomatoSeedMat);
          const ang = (s / 4) * Math.PI * 2;
          seed.position.set(Math.cos(ang) * 0.08, 0.022, Math.sin(ang) * 0.08);
          slice.add(seed);
        }
      }
    } else {
      // Whole glossy red tomato
      const tom = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 16), this.tomatoGlossMat);
      tom.position.y = 0.22;
      tom.castShadow = true;
      group.add(tom);

      // Green star calyx & stem
      const calyxGeo = new THREE.ConeGeometry(0.08, 0.04, 5);
      const calyx = new THREE.Mesh(calyxGeo, this.stemGreenMat);
      calyx.position.set(0, 0.44, 0);
      calyx.rotation.x = Math.PI;
      group.add(calyx);

      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.08), this.stemGreenMat);
      stem.position.set(0, 0.46, 0);
      group.add(stem);
    }
  }

  // 6. CHEDDAR CHEESE (Bottom at y = 0)
  private static buildCheese(group: THREE.Group, isChopped: boolean) {
    if (isChopped) {
      // Square slice
      const slice = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.03, 0.34), this.cheeseMat);
      slice.position.y = 0.015;
      slice.castShadow = true;
      group.add(slice);
    } else {
      // Triangular wedge block
      const wedgeShape = new THREE.Shape();
      wedgeShape.moveTo(0, 0);
      wedgeShape.lineTo(0.35, 0);
      wedgeShape.lineTo(0, 0.35);
      wedgeShape.closePath();

      const extrudeSettings = { depth: 0.18, bevelEnabled: true, bevelSegments: 3, steps: 1, bevelSize: 0.015, bevelThickness: 0.015 };
      const wedgeGeo = new THREE.ExtrudeGeometry(wedgeShape, extrudeSettings);
      const wedge = new THREE.Mesh(wedgeGeo, this.cheeseMat);
      wedge.rotation.x = -Math.PI / 2;
      wedge.position.set(-0.15, 0, 0.1);
      wedge.castShadow = true;
      group.add(wedge);
    }
  }

  // 7. CHICKEN
  private static buildChicken(group: THREE.Group, isCooked: boolean) {
    const mat = isCooked ? this.chickenCookedMat : this.chickenRawMat;
    const legGroup = new THREE.Group();

    // Drumstick meat bulb
    const meat = new THREE.Mesh(new THREE.SphereGeometry(0.18, 14, 14), mat);
    meat.position.set(0, 0.18, 0);
    meat.scale.set(1, 1.4, 0.9);
    meat.castShadow = true;
    legGroup.add(meat);

    // White bone end
    const bone = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.18), this.boneMat);
    bone.position.set(0, 0.05, 0);
    legGroup.add(bone);

    legGroup.rotation.z = Math.PI / 4;
    legGroup.position.set(0, 0.08, 0);
    group.add(legGroup);
  }

  // 8. FISH
  private static buildFish(group: THREE.Group, isCooked: boolean) {
    const mat = isCooked ? this.fishCookedMat : this.fishScaleMat;
    // Tapered fish body
    const body = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.5, 12), mat);
    body.rotation.z = Math.PI / 2;
    body.position.set(0, 0.14, 0);
    body.castShadow = true;
    group.add(body);

    // Tail fin
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.22, 0.02), mat);
    fin.position.set(0.28, 0.14, 0);
    group.add(fin);
  }

  // 9. SHRIMP
  private static buildShrimp(group: THREE.Group) {
    const torus = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.06, 8, 16, Math.PI * 1.3), this.shrimpMat);
    torus.rotation.x = Math.PI / 2;
    torus.position.set(0, 0.06, 0);
    torus.castShadow = true;
    group.add(torus);
  }

  // 10. ONION
  private static buildOnion(group: THREE.Group, isChopped: boolean) {
    if (isChopped) {
      for (let i = 0; i < 3; i++) {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.18 - i * 0.04, 0.02, 6, 16), this.onionMat);
        ring.rotation.x = Math.PI / 2;
        ring.position.y = 0.02 + i * 0.03;
        group.add(ring);
      }
    } else {
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.20, 14, 14), this.onionMat);
      bulb.scale.set(1, 1.25, 1);
      bulb.position.y = 0.22;
      bulb.castShadow = true;
      group.add(bulb);
    }
  }

  // 11. POTATO
  private static buildPotato(group: THREE.Group, isChopped: boolean) {
    if (isChopped) {
      // Golden french fry batons
      for (let i = 0; i < 5; i++) {
        const fry = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.24), this.breadCrustMat);
        fry.rotation.y = (i * Math.PI) / 4;
        fry.position.set((Math.random() - 0.5) * 0.06, 0.02 + i * 0.02, 0);
        group.add(fry);
      }
    } else {
      const pot = new THREE.Mesh(new THREE.SphereGeometry(0.20, 12, 12), this.potatoMat);
      pot.scale.set(1.3, 0.9, 0.9);
      pot.position.y = 0.16;
      pot.castShadow = true;
      group.add(pot);
    }
  }

  // 12. EGG
  private static buildEgg(group: THREE.Group, isFried: boolean) {
    if (isFried) {
      // Fried egg white puddle
      const eggWhite = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.26, 0.02, 16), this.eggWhiteMat);
      eggWhite.position.y = 0.01;
      group.add(eggWhite);

      // Golden yolk dome
      const yolk = new THREE.Mesh(new THREE.SphereGeometry(0.10, 12, 12, 0, Math.PI * 2, 0, Math.PI / 2), this.eggYolkMat);
      yolk.position.y = 0.02;
      group.add(yolk);
    } else {
      const egg = new THREE.Mesh(new THREE.SphereGeometry(0.18, 14, 14), this.eggWhiteMat);
      egg.scale.set(0.9, 1.3, 0.9);
      egg.position.y = 0.20;
      egg.castShadow = true;
      group.add(egg);
    }
  }
}

export class ThrownItem3D {
  public mesh: THREE.Group;
  public item: KitchenItem;
  public startX: number;
  public startZ: number;
  public targetX: number;
  public targetZ: number;
  public progress: number = 0;
  public speed: number = 2.4;
  public isDone: boolean = false;

  constructor(item: KitchenItem, fromX: number, fromZ: number, toX: number, toZ: number) {
    this.item = item;
    this.startX = fromX;
    this.startZ = fromZ;
    this.targetX = toX;
    this.targetZ = toZ;

    this.mesh = Ingredient3DFactory.createMesh(item);
    this.mesh.position.set(fromX, 0.6, fromZ);
  }

  public update(delta: number): boolean {
    this.progress += delta * this.speed;
    if (this.progress >= 1) {
      this.progress = 1;
      this.isDone = true;
    }

    const currentX = THREE.MathUtils.lerp(this.startX, this.targetX, this.progress);
    const currentZ = THREE.MathUtils.lerp(this.startZ, this.targetZ, this.progress);
    const arcHeight = Math.sin(this.progress * Math.PI) * 1.2;
    const currentY = 0.6 + arcHeight;

    this.mesh.position.set(currentX, currentY, currentZ);
    this.mesh.rotation.x += delta * 10;
    this.mesh.rotation.y += delta * 8;

    return this.isDone;
  }
}
