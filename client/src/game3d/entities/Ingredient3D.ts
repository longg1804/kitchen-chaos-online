import * as THREE from 'three';
import { IngredientType, KitchenItem } from '../../game/types';

export class Ingredient3DFactory {
  // PBR Stylized Cartoon Materials for Ingredients
  private static breadCrustMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.45, metalness: 0.05 });
  private static breadCrumbMat = new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.6 });
  private static sesameMat = new THREE.MeshStandardMaterial({ color: 0xfef9c3, roughness: 0.3 });

  private static rawMeatMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.35, metalness: 0.05 });
  private static fatMarblingMat = new THREE.MeshStandardMaterial({ color: 0xfecaca, roughness: 0.5 });
  // Appetizing warm golden-brown seared steak/patty (clearly distinct from charcoal black burnt meat!)
  private static cookedMeatMat = new THREE.MeshStandardMaterial({
    color: 0xc26a1b,
    emissive: 0x451a03,
    emissiveIntensity: 0.18,
    roughness: 0.38,
    metalness: 0.08
  });
  private static cookedEdgeMat = new THREE.MeshStandardMaterial({
    color: 0xd97706,
    roughness: 0.35,
    metalness: 0.05
  });
  private static grillMarkMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.55 });
  private static burntMeatMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.9, metalness: 0.05 });
  private static burntAshMat = new THREE.MeshStandardMaterial({ color: 0x27272a, roughness: 0.95 });

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
      case IngredientType.FIRE_EXTINGUISHER:
        this.buildFireExtinguisher(group);
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

  // 2. BRIOCHE BREAD BUN (Bottom at y = 0) - Distinct golden crust, crumb base, score cuts & sesame seeds
  private static buildBread(group: THREE.Group, isChopped: boolean) {
    // Lighter golden-cream bottom base ring
    const baseRing = new THREE.Mesh(
      new THREE.CylinderGeometry(0.25, 0.23, 0.06, 20),
      this.breadCrumbMat
    );
    baseRing.position.y = 0.03;
    baseRing.castShadow = true;
    group.add(baseRing);

    if (isChopped) {
      // Top dome separated slightly showing soft interior crumb
      const top = new THREE.Mesh(
        new THREE.SphereGeometry(0.25, 20, 14, 0, Math.PI * 2, 0, Math.PI / 1.8),
        this.breadCrustMat
      );
      top.position.set(0.03, 0.08, 0);
      top.castShadow = true;
      group.add(top);
    } else {
      // Plump Golden Brioche Crown
      const bun = new THREE.Mesh(
        new THREE.SphereGeometry(0.26, 22, 16, 0, Math.PI * 2, 0, Math.PI / 1.75),
        this.breadCrustMat
      );
      bun.position.y = 0.05;
      bun.scale.set(1.08, 0.88, 0.96);
      bun.castShadow = true;
      group.add(bun);

      // 3 Bakery Score Cuts across top crust (very recognizable from top-down camera)
      for (let c = -1; c <= 1; c++) {
        const scoreCut = new THREE.Mesh(
          new THREE.BoxGeometry(0.22, 0.022, 0.032),
          this.breadCrumbMat
        );
        scoreCut.position.set(0, 0.255 - Math.abs(c) * 0.015, c * 0.085);
        scoreCut.rotation.y = 0.25;
        group.add(scoreCut);
      }

      // Sesame seeds
      const sGeo = new THREE.SphereGeometry(0.018, 6, 6);
      for (let i = 0; i < 8; i++) {
        const seed = new THREE.Mesh(sGeo, this.sesameMat);
        const ang = (i / 8) * Math.PI * 2;
        seed.scale.set(1.4, 0.7, 1);
        seed.position.set(Math.cos(ang) * 0.15, 0.21, Math.sin(ang) * 0.14);
        group.add(seed);
      }
    }
  }

  // 3. BEEF STEAK / PATTY (Bottom at y = 0)
  // Distinct models & materials for RAW (ruby red), COOKING (gradual color transition), COOKED (appetizing golden-brown with herb butter), and BURNT (charred black ash)
  private static buildMeat(group: THREE.Group, state: 'raw' | 'cooked' | 'burnt') {
    if (state === 'raw') {
      // Distinct Ribeye Steak silhouette (main lobe + white fat rim + T-bone)
      // Uses cloned materials tagged with userData so COOKING state can smoothly transition color from red -> golden-brown!
      const steakGroup = new THREE.Group();
      const dynamicRawMat = this.rawMeatMat.clone();
      const dynamicFatMat = this.fatMarblingMat.clone();

      // Outer white fat cap rim
      const fatCap = new THREE.Mesh(
        new THREE.CylinderGeometry(0.265, 0.265, 0.072, 20),
        dynamicFatMat
      );
      fatCap.userData.isCookingFat = true;
      fatCap.scale.set(1.12, 1, 0.88);
      fatCap.position.y = 0.036;
      fatCap.castShadow = true;
      steakGroup.add(fatCap);

      // Rich crimson raw beef interior
      const steak = new THREE.Mesh(
        new THREE.CylinderGeometry(0.24, 0.24, 0.078, 20),
        dynamicRawMat
      );
      steak.userData.isCookingMeat = true;
      steak.scale.set(1.1, 1, 0.85);
      steak.position.set(0.01, 0.039, 0);
      steak.castShadow = true;
      steakGroup.add(steak);

      // White bone eye & marbling streaks on top surface (y = 0.08)
      const boneRing = new THREE.Mesh(
        new THREE.CylinderGeometry(0.055, 0.055, 0.082, 12),
        this.boneMat
      );
      boneRing.position.set(-0.11, 0.041, -0.03);
      steakGroup.add(boneRing);

      for (let f = -1; f <= 1; f++) {
        const fat = new THREE.Mesh(
          new THREE.BoxGeometry(0.26, 0.008, 0.028),
          dynamicFatMat
        );
        fat.userData.isCookingFat = true;
        fat.rotation.y = 0.35 + f * 0.25;
        fat.position.set(0.03, 0.079, f * 0.065);
        steakGroup.add(fat);
      }

      group.add(steakGroup);
    } else if (state === 'cooked') {
      // Appetizing Golden-Brown Seared Steak / Burger Patty (Warm amber-brown crust + golden rim + herb butter pat)
      const outerCrust = new THREE.Mesh(
        new THREE.CylinderGeometry(0.265, 0.27, 0.082, 24),
        this.cookedEdgeMat
      );
      outerCrust.scale.set(1.06, 1, 0.94);
      outerCrust.position.y = 0.041;
      outerCrust.castShadow = true;
      group.add(outerCrust);

      const patty = new THREE.Mesh(
        new THREE.CylinderGeometry(0.245, 0.25, 0.088, 24),
        this.cookedMeatMat
      );
      patty.scale.set(1.06, 1, 0.94);
      patty.position.y = 0.044;
      patty.castShadow = true;
      group.add(patty);

      // Warm caramel-brown cross-hatch grill sear marks across top
      for (let g = -1; g <= 1; g += 1) {
        const mark = new THREE.Mesh(
          new THREE.BoxGeometry(0.36, 0.01, 0.024),
          this.grillMarkMat
        );
        mark.rotation.y = Math.PI / 4;
        mark.position.set(0, 0.089, g * 0.075);
        group.add(mark);
      }

      // Melted Golden Maitre d'Hotel Herb Butter Pat in center for instant "COOKED & DELICIOUS" visual clarity!
      const butterPat = new THREE.Mesh(
        new THREE.CylinderGeometry(0.075, 0.085, 0.018, 14),
        this.cheeseMat
      );
      butterPat.position.set(0.02, 0.095, 0.01);
      group.add(butterPat);

      const herbLeaf = new THREE.Mesh(
        new THREE.BoxGeometry(0.045, 0.008, 0.045),
        this.lettuceLeafMat
      );
      herbLeaf.rotation.y = 0.4;
      herbLeaf.position.set(0.02, 0.105, 0.01);
      group.add(herbLeaf);
    } else {
      // BURNT: Shrunken, jagged charcoal-black puck with dark ash chunks
      const burntPuck = new THREE.Mesh(
        new THREE.CylinderGeometry(0.21, 0.23, 0.065, 14),
        this.burntMeatMat
      );
      burntPuck.position.y = 0.033;
      burntPuck.castShadow = true;
      group.add(burntPuck);

      for (let b = 0; b < 6; b++) {
        const ash = new THREE.Mesh(
          new THREE.DodecahedronGeometry(0.048, 0),
          b % 2 === 0 ? this.burntAshMat : this.burntMeatMat
        );
        const ang = (b / 6) * Math.PI * 2;
        ash.position.set(Math.cos(ang) * 0.11, 0.07, Math.sin(ang) * 0.11);
        group.add(ash);
      }
    }
  }

  // 4. LETTUCE (Bottom at y = 0) - Multi-layered open leafy rosette (never a plain sphere!)
  private static buildLettuce(group: THREE.Group, isChopped: boolean) {
    if (isChopped) {
      // Crisp pile of shredded salad ribbons in two shades of green
      for (let i = 0; i < 8; i++) {
        const mat = i % 2 === 0 ? this.lettuceLeafMat : this.lettuceLightMat;
        const leaf = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.024, 0.09), mat);
        const angle = (i / 8) * Math.PI * 2;
        leaf.rotation.set(0.15 * Math.sin(i), angle, 0.12 * Math.cos(i));
        leaf.position.set(
          Math.cos(angle) * 0.07,
          0.02 + (i % 4) * 0.022,
          Math.sin(angle) * 0.07
        );
        leaf.castShadow = true;
        group.add(leaf);
      }
    } else {
      // Open rosette of 7 outer ruffled leaves + 5 inner leaves + bright heart core
      for (let i = 0; i < 7; i++) {
        const angle = (i / 7) * Math.PI * 2;
        const outerLeaf = new THREE.Mesh(
          new THREE.SphereGeometry(0.16, 12, 10),
          i % 2 === 0 ? this.lettuceHeadMat : this.lettuceLeafMat
        );
        outerLeaf.scale.set(1.25, 0.38, 0.85);
        outerLeaf.position.set(Math.cos(angle) * 0.14, 0.09, Math.sin(angle) * 0.14);
        outerLeaf.rotation.y = -angle;
        outerLeaf.rotation.z = 0.45;
        outerLeaf.castShadow = true;
        group.add(outerLeaf);
      }

      for (let i = 0; i < 5; i++) {
        const angle = (i / 5) * Math.PI * 2 + 0.3;
        const innerLeaf = new THREE.Mesh(
          new THREE.SphereGeometry(0.14, 12, 10),
          this.lettuceLeafMat
        );
        innerLeaf.scale.set(1.1, 0.55, 0.85);
        innerLeaf.position.set(Math.cos(angle) * 0.09, 0.16, Math.sin(angle) * 0.09);
        innerLeaf.rotation.y = -angle;
        innerLeaf.rotation.z = 0.7;
        innerLeaf.castShadow = true;
        group.add(innerLeaf);
      }

      // Crisp light-green lettuce heart bud in center
      const core = new THREE.Mesh(new THREE.SphereGeometry(0.14, 14, 12), this.lettuceLightMat);
      core.scale.set(1, 0.95, 1);
      core.position.y = 0.17;
      core.castShadow = true;
      group.add(core);
    }
  }

  // 5. TOMATO (Bottom at y = 0) - Plump segmented body with large 5-pointed green leaf calyx
  private static buildTomato(group: THREE.Group, isChopped: boolean) {
    if (isChopped) {
      // Three overlapping juicy tomato slices fanned out clearly
      const offsets = [
        { x: -0.07, y: 0.02, z: 0.04 },
        { x: 0.07, y: 0.045, z: -0.03 },
        { x: 0, y: 0.07, z: 0.02 }
      ];
      offsets.forEach((pos) => {
        const slice = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.032, 20), this.tomatoGlossMat);
        slice.position.set(pos.x, pos.y, pos.z);
        slice.castShadow = true;
        group.add(slice);

        const pulp = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.035, 16), this.tomatoPulpMat);
        slice.add(pulp);

        for (let s = 0; s < 5; s++) {
          const seed = new THREE.Mesh(new THREE.SphereGeometry(0.018, 6, 6), this.tomatoSeedMat);
          const ang = (s / 5) * Math.PI * 2;
          seed.position.set(Math.cos(ang) * 0.085, 0.018, Math.sin(ang) * 0.085);
          slice.add(seed);
        }
      });
    } else {
      // Plump slightly flattened vine tomato
      const tom = new THREE.Mesh(new THREE.SphereGeometry(0.25, 20, 16), this.tomatoGlossMat);
      tom.scale.set(1.06, 0.84, 1.06);
      tom.position.y = 0.20;
      tom.castShadow = true;
      group.add(tom);

      // 5-Pointed Green Star Sepals (Calyx) radiating on top
      for (let i = 0; i < 5; i++) {
        const angle = (i / 5) * Math.PI * 2;
        const sepal = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.022, 0.045), this.stemGreenMat);
        sepal.position.set(Math.cos(angle) * 0.08, 0.395, Math.sin(angle) * 0.08);
        sepal.rotation.y = -angle;
        sepal.rotation.z = -0.18;
        group.add(sepal);
      }

      // Green vine stem in center
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.032, 0.09, 8), this.stemGreenMat);
      stem.position.set(0, 0.43, 0);
      stem.rotation.z = 0.15;
      group.add(stem);
    }
  }

  // 6. SWISS / CHEDDAR CHEESE (Bottom at y = 0) - Distinct triangular wedge with cheese holes
  private static buildCheese(group: THREE.Group, isChopped: boolean) {
    if (isChopped) {
      // Two golden cheese slices fanned at an angle with Swiss holes
      for (let s = 0; s < 2; s++) {
        const slice = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.028, 0.34), this.cheeseMat);
        slice.position.set(s * 0.03 - 0.015, 0.015 + s * 0.028, 0);
        slice.rotation.y = s * 0.35;
        slice.castShadow = true;

        // Characteristic cheese holes on top of slice
        const holePositions = [
          [-0.08, 0.06],
          [0.07, -0.05],
          [-0.02, -0.08]
        ];
        holePositions.forEach(([hx, hz]) => {
          const hole = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.03, 12), this.cheeseHoleMat);
          hole.position.set(hx, 0.002, hz);
          slice.add(hole);
        });

        group.add(slice);
      }
    } else {
      // Classic triangular Swiss cheese wedge centered on origin
      const wedgeShape = new THREE.Shape();
      wedgeShape.moveTo(-0.22, -0.16);
      wedgeShape.lineTo(0.24, -0.16);
      wedgeShape.lineTo(-0.22, 0.22);
      wedgeShape.closePath();

      const extrudeSettings = {
        depth: 0.18,
        bevelEnabled: true,
        bevelSegments: 2,
        steps: 1,
        bevelSize: 0.012,
        bevelThickness: 0.012
      };
      const wedgeGeo = new THREE.ExtrudeGeometry(wedgeShape, extrudeSettings);
      const wedge = new THREE.Mesh(wedgeGeo, this.cheeseMat);
      wedge.rotation.x = -Math.PI / 2;
      wedge.position.set(0.04, 0.012, 0.02);
      wedge.castShadow = true;
      group.add(wedge);

      // Characteristic dark-gold Swiss holes on the top surface
      const holes = [
        { x: -0.08, z: -0.04, r: 0.042 },
        { x: 0.06, z: -0.08, r: 0.034 },
        { x: -0.10, z: 0.08, r: 0.032 }
      ];
      holes.forEach((h) => {
        const holeMesh = new THREE.Mesh(
          new THREE.CylinderGeometry(h.r, h.r, 0.02, 14),
          this.cheeseHoleMat
        );
        holeMesh.position.set(h.x, 0.198, h.z);
        group.add(holeMesh);
      });
    }
  }

  // 7. CHICKEN DRUMSTICK (Stylized cartoon poultry leg with bone knuckle & paper frill)
  private static buildChicken(group: THREE.Group, isCooked: boolean) {
    const mat = isCooked ? this.chickenCookedMat : this.chickenRawMat;
    const legGroup = new THREE.Group();

    // Plump drumstick bulb
    const meat = new THREE.Mesh(new THREE.SphereGeometry(0.19, 16, 14), mat);
    meat.position.set(-0.04, 0.14, 0);
    meat.scale.set(1.35, 0.92, 0.95);
    meat.castShadow = true;
    legGroup.add(meat);

    // Tapered shank connecting to bone
    const shank = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.22, 14), mat);
    shank.rotation.z = -Math.PI / 2;
    shank.position.set(0.10, 0.14, 0);
    legGroup.add(shank);

    // White bone shaft & double knuckle ends
    const bone = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.22, 10), this.boneMat);
    bone.rotation.z = Math.PI / 2;
    bone.position.set(0.22, 0.14, 0);
    legGroup.add(bone);

    const k1 = new THREE.Mesh(new THREE.SphereGeometry(0.048, 10, 10), this.boneMat);
    k1.position.set(0.32, 0.14, 0.035);
    legGroup.add(k1);
    const k2 = new THREE.Mesh(new THREE.SphereGeometry(0.048, 10, 10), this.boneMat);
    k2.position.set(0.32, 0.14, -0.035);
    legGroup.add(k2);

    legGroup.rotation.y = 0.35;
    group.add(legGroup);
  }

  // 8. CARTOON FISH (Plump rounded body, tail fin, dorsal fin & cute eye)
  private static buildFish(group: THREE.Group, isCooked: boolean) {
    const mat = isCooked ? this.fishCookedMat : this.fishScaleMat;

    const body = new THREE.Mesh(new THREE.SphereGeometry(0.20, 18, 14), mat);
    body.scale.set(1.45, 0.55, 0.82);
    body.position.set(-0.04, 0.11, 0);
    body.castShadow = true;
    group.add(body);

    // V-shaped cartoon tail fin
    const tailTop = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.18, 10), mat);
    tailTop.rotation.z = Math.PI / 2.4;
    tailTop.position.set(0.26, 0.12, 0.05);
    group.add(tailTop);

    const tailBot = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.18, 10), mat);
    tailBot.rotation.z = Math.PI / 1.7;
    tailBot.position.set(0.26, 0.12, -0.05);
    group.add(tailBot);

    if (!isCooked) {
      const eyeWhite = new THREE.Mesh(new THREE.SphereGeometry(0.036, 10, 10), this.boneMat);
      eyeWhite.position.set(-0.19, 0.16, 0.09);
      group.add(eyeWhite);
    } else {
      // Grill sear marks on cooked fish
      for (let g = -1; g <= 1; g++) {
        const mark = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.01, 0.22), this.grillMarkMat);
        mark.position.set(g * 0.08, 0.215, 0);
        group.add(mark);
      }
    }
  }

  // 9. CARTOON SHRIMP / PRAWN (Curved segmented body with tail fan)
  private static buildShrimp(group: THREE.Group) {
    const torus = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.065, 12, 20, Math.PI * 1.35), this.shrimpMat);
    torus.rotation.x = Math.PI / 2;
    torus.position.set(0, 0.07, 0);
    torus.castShadow = true;
    group.add(torus);

    // White stripe bands
    for (let s = 0; s < 3; s++) {
      const ang = 0.5 + s * 0.9;
      const band = new THREE.Mesh(new THREE.SphereGeometry(0.068, 10, 10), this.boneMat);
      band.scale.set(0.35, 1, 1);
      band.position.set(Math.cos(ang) * 0.14, 0.07, Math.sin(ang) * 0.14);
      band.rotation.y = -ang;
      group.add(band);
    }
  }

  // 10. CARTOON ONION (Plump purple bulb with sprout tip, or concentric rings when sliced)
  private static buildOnion(group: THREE.Group, isChopped: boolean) {
    if (isChopped) {
      for (let i = 0; i < 3; i++) {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.19 - i * 0.04, 0.024, 10, 20), this.onionMat);
        ring.rotation.x = Math.PI / 2;
        ring.position.set((i - 1) * 0.03, 0.025 + i * 0.025, 0);
        ring.castShadow = true;
        group.add(ring);
      }
    } else {
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.22, 18, 14), this.onionMat);
      bulb.scale.set(1.05, 0.92, 1.05);
      bulb.position.y = 0.20;
      bulb.castShadow = true;
      group.add(bulb);

      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.12, 10), this.stemGreenMat);
      tip.position.y = 0.42;
      group.add(tip);
    }
  }

  // 11. CARTOON POTATO (Rounded spud with dimples, or golden french fry stack)
  private static buildPotato(group: THREE.Group, isChopped: boolean) {
    if (isChopped) {
      for (let i = 0; i < 6; i++) {
        const fry = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.045, 0.28), this.cheeseMat);
        fry.rotation.y = (i % 3) * 0.28 - 0.28;
        fry.position.set(((i % 3) - 1) * 0.065, 0.025 + Math.floor(i / 3) * 0.045, 0);
        fry.castShadow = true;
        group.add(fry);
      }
    } else {
      const pot = new THREE.Mesh(new THREE.SphereGeometry(0.21, 16, 14), this.potatoMat);
      pot.scale.set(1.28, 0.82, 0.95);
      pot.position.y = 0.17;
      pot.castShadow = true;
      group.add(pot);
    }
  }

  // 12. CARTOON EGG (Plump shell egg or sunny-side-up fried egg)
  private static buildEgg(group: THREE.Group, isFried: boolean) {
    if (isFried) {
      const eggWhite = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.27, 0.028, 20), this.eggWhiteMat);
      eggWhite.scale.set(1.08, 1, 0.94);
      eggWhite.position.y = 0.014;
      eggWhite.castShadow = true;
      group.add(eggWhite);

      const yolk = new THREE.Mesh(
        new THREE.SphereGeometry(0.11, 16, 14, 0, Math.PI * 2, 0, Math.PI / 1.8),
        this.eggYolkMat
      );
      yolk.position.set(0.02, 0.025, 0);
      yolk.castShadow = true;
      group.add(yolk);
    } else {
      const egg = new THREE.Mesh(new THREE.SphereGeometry(0.19, 16, 14), this.eggWhiteMat);
      egg.scale.set(0.88, 1.22, 0.88);
      egg.position.y = 0.22;
      egg.castShadow = true;
      group.add(egg);
    }
  }

  // 13. 3D CARTOON FIRE EXTINGUISHER (Phase 3.1 - Red tank, valve handle, pressure gauge, label & forward nozzle)
  private static buildFireExtinguisher(group: THREE.Group) {
    const redTankMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.25, metalness: 0.2 });
    const darkRubberMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.65, metalness: 0.1 });
    const chromeMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.15, metalness: 0.88 });
    const labelWhiteMat = new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.4 });
    const gaugeGreenMat = new THREE.MeshBasicMaterial({ color: 0x22c55e });

    // 1. Black protective bottom boot resting at Y = 0
    const boot = new THREE.Mesh(new THREE.CylinderGeometry(0.155, 0.16, 0.06, 20), darkRubberMat);
    boot.position.y = 0.03;
    boot.castShadow = true;
    group.add(boot);

    // 2. Main Red Cylinder Body
    const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.145, 0.145, 0.42, 22), redTankMat);
    tank.position.y = 0.25;
    tank.castShadow = true;
    group.add(tank);

    // 3. Rounded Dome Shoulder Top
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(0.145, 22, 16, 0, Math.PI * 2, 0, Math.PI / 2),
      redTankMat
    );
    dome.position.y = 0.46;
    dome.castShadow = true;
    group.add(dome);

    // 4. High-Contrast Instructional Safety Label Band around tank middle
    const labelBand = new THREE.Mesh(
      new THREE.CylinderGeometry(0.149, 0.149, 0.16, 22, 1, true),
      labelWhiteMat
    );
    labelBand.position.y = 0.27;
    group.add(labelBand);

    // Red stripe accent on label
    const stripe = new THREE.Mesh(
      new THREE.CylinderGeometry(0.151, 0.151, 0.035, 22, 1, true),
      redTankMat
    );
    stripe.position.y = 0.27;
    group.add(stripe);

    // 5. Chrome Neck & Valve Assembly
    const valveNeck = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.055, 0.09, 14), chromeMat);
    valveNeck.position.y = 0.61;
    group.add(valveNeck);

    // Bottom fixed carry handle & top squeeze trigger lever (angled backward -Z)
    const bottomHandle = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.022, 0.18), chromeMat);
    bottomHandle.position.set(0, 0.64, -0.07);
    group.add(bottomHandle);

    const topLever = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.022, 0.20), redTankMat);
    topLever.position.set(0, 0.69, -0.07);
    topLever.rotation.x = 0.28;
    group.add(topLever);

    // 6. Pressure Gauge Dial on side
    const gaugeBody = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.036, 0.025, 12), chromeMat);
    gaugeBody.rotation.z = Math.PI / 2;
    gaugeBody.position.set(0.06, 0.61, 0);
    group.add(gaugeBody);

    const gaugeFace = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.028, 12), gaugeGreenMat);
    gaugeFace.rotation.z = Math.PI / 2;
    gaugeFace.position.set(0.062, 0.61, 0);
    group.add(gaugeFace);

    // 7. Forward-Facing Black Hose & Flared CO2 Horn Nozzle (+Z direction)
    const hoseElbow = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.12, 10), darkRubberMat);
    hoseElbow.rotation.x = Math.PI / 2.3;
    hoseElbow.position.set(0, 0.59, 0.08);
    group.add(hoseElbow);

    // Flared discharge horn pointing forward (+Z) so foam sprays in front of chef
    const horn = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.20, 14), darkRubberMat);
    horn.rotation.x = -Math.PI / 2.2;
    horn.position.set(0, 0.55, 0.20);
    horn.castShadow = true;
    group.add(horn);
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
