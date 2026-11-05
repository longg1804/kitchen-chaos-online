import * as THREE from 'three';
import { IngredientType, KitchenItem } from '../../game/types';
import { ExternalModelLoader } from '../assets/ExternalModelLoader';

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
    const fallback = new THREE.Group();
    const plateGeo = new THREE.CylinderGeometry(0.32, 0.28, 0.04, 24);
    const plate = new THREE.Mesh(plateGeo, this.plateCeramicMat);
    plate.position.y = 0.02; // Bottom at y = 0
    plate.castShadow = true;
    plate.receiveShadow = true;
    fallback.add(plate);

    // Inner rim depression
    const innerGeo = new THREE.CylinderGeometry(0.25, 0.25, 0.015, 24);
    const inner = new THREE.Mesh(innerGeo, this.plateCeramicMat);
    inner.position.y = 0.025;
    fallback.add(inner);

    ExternalModelLoader.attachModel(
      group,
      ExternalModelLoader.PATHS.PLATE,
      { targetWidth: 0.64 },
      fallback
    );
  }

  // Multi-tier gourmet burger & salad stacking on plate using external CC0 3D models
  private static buildStackedMeal(group: THREE.Group, contents: IngredientType[]) {
    const fallback = new THREE.Group();
    let currentY = 0.035;

    // Check if meal includes bun
    const hasBread = contents.includes(IngredientType.BREAD);
    const hasPatty =
      contents.includes(IngredientType.COOKED_PATTY) || contents.includes(IngredientType.RAW_MEAT);
    const hasCheese =
      contents.includes(IngredientType.SLICED_CHEESE) || contents.includes(IngredientType.CHEESE);
    const hasTomato =
      contents.includes(IngredientType.SLICED_TOMATO) || contents.includes(IngredientType.TOMATO);
    const hasLettuce =
      contents.includes(IngredientType.CHOPPED_LETTUCE) || contents.includes(IngredientType.LETTUCE);

    if (hasBread) {
      // Bottom Bun slice
      const botBun = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.04, 18), this.breadCrustMat);
      botBun.position.y = currentY + 0.02;
      botBun.castShadow = true;
      fallback.add(botBun);
      currentY += 0.045;
    }

    // Cooked Patty
    if (hasPatty) {
      const pattyMat = contents.includes(IngredientType.COOKED_PATTY) ? this.cookedMeatMat : this.rawMeatMat;
      const patty = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.05, 18), pattyMat);
      patty.position.y = currentY + 0.025;
      patty.castShadow = true;
      fallback.add(patty);
      currentY += 0.055;
    }

    // Cheese Slice (with slight corner droop)
    if (hasCheese) {
      const cheese = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.025, 0.32), this.cheeseMat);
      cheese.rotation.y = Math.PI / 4;
      cheese.position.y = currentY + 0.012;
      cheese.castShadow = true;
      fallback.add(cheese);
      currentY += 0.03;
    }

    // Sliced Tomato
    if (hasTomato) {
      const tomato = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.035, 18), this.tomatoGlossMat);
      tomato.position.y = currentY + 0.018;
      tomato.castShadow = true;
      fallback.add(tomato);
      currentY += 0.04;
    }

    // Chopped Lettuce
    if (hasLettuce) {
      for (let i = 0; i < 3; i++) {
        const leaf = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.02, 0.14), this.lettuceLeafMat);
        leaf.rotation.y = (i * Math.PI) / 3;
        leaf.position.set((Math.random() - 0.5) * 0.04, currentY + 0.01, (Math.random() - 0.5) * 0.04);
        fallback.add(leaf);
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
      fallback.add(topBun);

      // Sesame Seeds
      const sGeo = new THREE.SphereGeometry(0.014, 6, 6);
      for (let s = 0; s < 7; s++) {
        const seed = new THREE.Mesh(sGeo, this.sesameMat);
        const ang = (s / 7) * Math.PI * 2;
        seed.position.set(Math.cos(ang) * 0.13, currentY + 0.16, Math.sin(ang) * 0.13);
        fallback.add(seed);
      }
    }

    // Use modular nodes from Kenney burger.glb to assemble the exact plated combination!
    ExternalModelLoader.attachModel(
      group,
      ExternalModelLoader.PATHS.BURGER,
      {
        targetWidth: 0.48,
        offsetY: 0.04,
        onBeforeNormalize: (root) => {
          let stackY = 0;
          const setLayer = (name: string, show: boolean, heightStep: number) => {
            const node = root.getObjectByName(name);
            if (!node) return;
            node.visible = show;
            if (show) {
              node.position.y = stackY;
              stackY += heightStep;
            }
          };

          setLayer('bun-bottom', hasBread, 0.04);
          setLayer('salad', hasLettuce, 0.035);
          setLayer('patty', hasPatty, 0.045);
          setLayer('cheese', hasCheese, 0.025);
          setLayer('tomato', hasTomato, 0.035);
          setLayer('bun-top', hasBread, 0.05);
        }
      },
      fallback
    );
  }

  // 2. BRIOCHE BREAD BUN (Bottom at y = 0) - Modular 3D Burger Bun from Kenney Food Kit
  private static buildBread(group: THREE.Group, isChopped: boolean) {
    const fallback = new THREE.Group();
    const baseRing = new THREE.Mesh(
      new THREE.CylinderGeometry(0.25, 0.23, 0.06, 20),
      this.breadCrumbMat
    );
    baseRing.position.y = 0.03;
    baseRing.castShadow = true;
    fallback.add(baseRing);

    if (isChopped) {
      const top = new THREE.Mesh(
        new THREE.SphereGeometry(0.25, 20, 14, 0, Math.PI * 2, 0, Math.PI / 1.8),
        this.breadCrustMat
      );
      top.position.set(0.03, 0.08, 0);
      top.castShadow = true;
      fallback.add(top);
    } else {
      const bun = new THREE.Mesh(
        new THREE.SphereGeometry(0.26, 22, 16, 0, Math.PI * 2, 0, Math.PI / 1.75),
        this.breadCrustMat
      );
      bun.position.y = 0.05;
      bun.scale.set(1.08, 0.88, 0.96);
      bun.castShadow = true;
      fallback.add(bun);
    }

    ExternalModelLoader.attachModel(
      group,
      ExternalModelLoader.PATHS.BURGER,
      {
        targetWidth: 0.48,
        onBeforeNormalize: (root) => {
          const hideNames = ['patty', 'cheese', 'salad', 'tomato'];
          hideNames.forEach((n) => {
            const obj = root.getObjectByName(n);
            if (obj) obj.visible = false;
          });
          const bunTop = root.getObjectByName('bun-top');
          if (bunTop) {
            bunTop.position.y = 0.048;
          }
        }
      },
      fallback
    );
  }

  // 3. BEEF STEAK / PATTY (Bottom at y = 0)
  // Distinct external 3D models & materials for RAW (meat-raw.glb), COOKED (meat-cooked.glb + herb butter), and BURNT (charred black meat-patty.glb)
  private static buildMeat(group: THREE.Group, state: 'raw' | 'cooked' | 'burnt') {
    const fallback = new THREE.Group();
    if (state === 'raw') {
      const steakGroup = new THREE.Group();
      const dynamicRawMat = this.rawMeatMat.clone();
      const dynamicFatMat = this.fatMarblingMat.clone();

      const fatCap = new THREE.Mesh(
        new THREE.CylinderGeometry(0.265, 0.265, 0.072, 20),
        dynamicFatMat
      );
      fatCap.userData.isCookingFat = true;
      fatCap.scale.set(1.12, 1, 0.88);
      fatCap.position.y = 0.036;
      fatCap.castShadow = true;
      steakGroup.add(fatCap);

      const steak = new THREE.Mesh(
        new THREE.CylinderGeometry(0.24, 0.24, 0.078, 20),
        dynamicRawMat
      );
      steak.userData.isCookingMeat = true;
      steak.scale.set(1.1, 1, 0.85);
      steak.position.set(0.01, 0.039, 0);
      steak.castShadow = true;
      steakGroup.add(steak);

      fallback.add(steakGroup);

      ExternalModelLoader.attachModel(
        group,
        ExternalModelLoader.PATHS.MEAT_RAW,
        {
          targetWidth: 0.52,
          cloneMaterials: true,
          onBeforeNormalize: (root) => {
            root.traverse((child) => {
              if (child instanceof THREE.Mesh) {
                child.userData.isCookingMeat = true;
                child.userData.hasTextureMap = true;
              }
            });
          }
        },
        fallback
      );
    } else if (state === 'cooked') {
      const outerCrust = new THREE.Mesh(
        new THREE.CylinderGeometry(0.265, 0.27, 0.082, 24),
        this.cookedEdgeMat
      );
      outerCrust.scale.set(1.06, 1, 0.94);
      outerCrust.position.y = 0.041;
      outerCrust.castShadow = true;
      fallback.add(outerCrust);

      const patty = new THREE.Mesh(
        new THREE.CylinderGeometry(0.245, 0.25, 0.088, 24),
        this.cookedMeatMat
      );
      patty.scale.set(1.06, 1, 0.94);
      patty.position.y = 0.044;
      patty.castShadow = true;
      fallback.add(patty);

      ExternalModelLoader.attachModel(
        group,
        ExternalModelLoader.PATHS.MEAT_COOKED,
        {
          targetWidth: 0.52,
          cloneMaterials: true,
          onBeforeNormalize: (root) => {
            root.traverse((child) => {
              if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
                // Warm golden-amber emissive highlight so COOKED steak is brightly distinct from BURNT!
                child.material.emissive.setHex(0x451a03);
                child.material.emissiveIntensity = 0.25;
                child.material.roughness = 0.35;
              }
            });
          },
          onAfterNormalize: (wrapper) => {
            // Add signature melted golden Herb Butter Pat on top of cooked steak
            const butterPat = new THREE.Mesh(
              new THREE.CylinderGeometry(0.068, 0.078, 0.018, 14),
              this.cheeseMat
            );
            butterPat.position.set(0.02, 0.115, 0.01);
            wrapper.add(butterPat);

            const herbLeaf = new THREE.Mesh(
              new THREE.BoxGeometry(0.042, 0.008, 0.042),
              this.lettuceLeafMat
            );
            herbLeaf.rotation.y = 0.4;
            herbLeaf.position.set(0.02, 0.125, 0.01);
            wrapper.add(herbLeaf);
          }
        },
        fallback
      );
    } else {
      // BURNT: Shrunken, jagged charcoal-black puck with dark ash chunks
      const burntPuck = new THREE.Mesh(
        new THREE.CylinderGeometry(0.21, 0.23, 0.065, 14),
        this.burntMeatMat
      );
      burntPuck.position.y = 0.033;
      burntPuck.castShadow = true;
      fallback.add(burntPuck);

      ExternalModelLoader.attachModel(
        group,
        ExternalModelLoader.PATHS.MEAT_PATTY,
        {
          targetWidth: 0.44,
          cloneMaterials: true,
          onBeforeNormalize: (root) => {
            root.traverse((child) => {
              if (child instanceof THREE.Mesh) {
                child.material = this.burntMeatMat;
              }
            });
          },
          onAfterNormalize: (wrapper) => {
            for (let b = 0; b < 6; b++) {
              const ash = new THREE.Mesh(
                new THREE.DodecahedronGeometry(0.045, 0),
                b % 2 === 0 ? this.burntAshMat : this.burntMeatMat
              );
              const ang = (b / 6) * Math.PI * 2;
              ash.position.set(Math.cos(ang) * 0.11, 0.075, Math.sin(ang) * 0.11);
              wrapper.add(ash);
            }
          }
        },
        fallback
      );
    }
  }

  // 4. LETTUCE (Bottom at y = 0) - Whole cabbage/lettuce head (cabbage.glb) vs Chopped salad (salad.glb)
  private static buildLettuce(group: THREE.Group, isChopped: boolean) {
    const fallback = new THREE.Group();
    if (isChopped) {
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
        fallback.add(leaf);
      }

      ExternalModelLoader.attachModel(
        group,
        ExternalModelLoader.PATHS.SALAD_CHOPPED,
        { targetWidth: 0.50 },
        fallback
      );
    } else {
      const core = new THREE.Mesh(new THREE.SphereGeometry(0.22, 14, 12), this.lettuceLeafMat);
      core.position.y = 0.20;
      core.castShadow = true;
      fallback.add(core);

      ExternalModelLoader.attachModel(
        group,
        ExternalModelLoader.PATHS.LETTUCE_HEAD,
        { targetWidth: 0.48 },
        fallback
      );
    }
  }

  // 5. TOMATO (Bottom at y = 0) - Whole vine tomato (tomato.glb) vs Sliced tomato (tomato-slice.glb)
  private static buildTomato(group: THREE.Group, isChopped: boolean) {
    const fallback = new THREE.Group();
    if (isChopped) {
      const slice = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.032, 20), this.tomatoGlossMat);
      slice.position.y = 0.02;
      fallback.add(slice);

      ExternalModelLoader.attachModel(
        group,
        ExternalModelLoader.PATHS.TOMATO_SLICE,
        {
          targetWidth: 0.46,
          scaleY: 1.35
        },
        fallback
      );
    } else {
      const tom = new THREE.Mesh(new THREE.SphereGeometry(0.25, 20, 16), this.tomatoGlossMat);
      tom.scale.set(1.06, 0.84, 1.06);
      tom.position.y = 0.20;
      tom.castShadow = true;
      fallback.add(tom);

      ExternalModelLoader.attachModel(
        group,
        ExternalModelLoader.PATHS.TOMATO_WHOLE,
        { targetWidth: 0.46 },
        fallback
      );
    }
  }

  // 6. SWISS / CHEDDAR CHEESE (Bottom at y = 0) - Wedge (cheese-cut.glb) vs Sliced cheese
  private static buildCheese(group: THREE.Group, isChopped: boolean) {
    const fallback = new THREE.Group();
    if (isChopped) {
      for (let s = 0; s < 2; s++) {
        const slice = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.028, 0.34), this.cheeseMat);
        slice.position.set(s * 0.03 - 0.015, 0.015 + s * 0.028, 0);
        slice.rotation.y = s * 0.35;
        slice.castShadow = true;
        fallback.add(slice);
      }

      ExternalModelLoader.attachModel(
        group,
        ExternalModelLoader.PATHS.BURGER,
        {
          targetWidth: 0.48,
          scaleY: 1.8,
          onBeforeNormalize: (root) => {
            const hideNames = ['bun-bottom', 'bun-top', 'patty', 'salad', 'tomato'];
            hideNames.forEach((n) => {
              const obj = root.getObjectByName(n);
              if (obj) obj.visible = false;
            });
          }
        },
        fallback
      );
    } else {
      const wedge = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.18, 0.28), this.cheeseMat);
      wedge.position.y = 0.09;
      fallback.add(wedge);

      ExternalModelLoader.attachModel(
        group,
        ExternalModelLoader.PATHS.CHEESE_WEDGE,
        { targetWidth: 0.48 },
        fallback
      );
    }
  }

  // 7. CHICKEN / POULTRY (turkey.glb)
  private static buildChicken(group: THREE.Group, isCooked: boolean) {
    const fallback = new THREE.Group();
    const mat = isCooked ? this.chickenCookedMat : this.chickenRawMat;
    const meat = new THREE.Mesh(new THREE.SphereGeometry(0.19, 16, 14), mat);
    meat.position.set(0, 0.14, 0);
    fallback.add(meat);

    ExternalModelLoader.attachModel(
      group,
      ExternalModelLoader.PATHS.CHICKEN_WHOLE,
      {
        targetWidth: 0.50,
        cloneMaterials: !isCooked,
        onBeforeNormalize: (root) => {
          if (!isCooked) {
            root.traverse((child) => {
              if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
                child.material.color.setHex(0xfbcfe8);
              }
            });
          }
        }
      },
      fallback
    );
  }

  // 8. CARTOON FISH (fish.glb / sushi-salmon.glb)
  private static buildFish(group: THREE.Group, isCooked: boolean) {
    const fallback = new THREE.Group();
    const mat = isCooked ? this.fishCookedMat : this.fishScaleMat;
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.20, 18, 14), mat);
    body.scale.set(1.45, 0.55, 0.82);
    body.position.set(0, 0.11, 0);
    fallback.add(body);

    ExternalModelLoader.attachModel(
      group,
      isCooked ? ExternalModelLoader.PATHS.SUSHI_SALMON : ExternalModelLoader.PATHS.FISH_WHOLE,
      { targetWidth: 0.52 },
      fallback
    );
  }

  // 9. CARTOON SHRIMP / PRAWN (Curved segmented body with tail fan)
  private static buildShrimp(group: THREE.Group) {
    const torus = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.065, 12, 20, Math.PI * 1.35), this.shrimpMat);
    torus.rotation.x = Math.PI / 2;
    torus.position.set(0, 0.07, 0);
    torus.castShadow = true;
    group.add(torus);

    for (let s = 0; s < 3; s++) {
      const ang = 0.5 + s * 0.9;
      const band = new THREE.Mesh(new THREE.SphereGeometry(0.068, 10, 10), this.boneMat);
      band.scale.set(0.35, 1, 1);
      band.position.set(Math.cos(ang) * 0.14, 0.07, Math.sin(ang) * 0.14);
      band.rotation.y = -ang;
      group.add(band);
    }
  }

  // 10. CARTOON ONION (onion.glb / onion-half.glb)
  private static buildOnion(group: THREE.Group, isChopped: boolean) {
    const fallback = new THREE.Group();
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.22, 18, 14), this.onionMat);
    bulb.position.y = 0.20;
    fallback.add(bulb);

    ExternalModelLoader.attachModel(
      group,
      isChopped ? ExternalModelLoader.PATHS.ONION_HALF : ExternalModelLoader.PATHS.ONION_WHOLE,
      { targetWidth: 0.46 },
      fallback
    );
  }

  // 11. CARTOON POTATO / FRIES (fries.glb when chopped)
  private static buildPotato(group: THREE.Group, isChopped: boolean) {
    if (isChopped) {
      const fallback = new THREE.Group();
      const fry = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.1, 0.28), this.cheeseMat);
      fry.position.y = 0.05;
      fallback.add(fry);

      ExternalModelLoader.attachModel(
        group,
        ExternalModelLoader.PATHS.FRIES,
        { targetWidth: 0.44 },
        fallback
      );
    } else {
      const pot = new THREE.Mesh(new THREE.SphereGeometry(0.21, 16, 14), this.potatoMat);
      pot.scale.set(1.28, 0.82, 0.95);
      pot.position.y = 0.17;
      pot.castShadow = true;
      group.add(pot);
    }
  }

  // 12. CARTOON EGG (egg.glb / egg-cooked.glb)
  private static buildEgg(group: THREE.Group, isFried: boolean) {
    const fallback = new THREE.Group();
    const egg = new THREE.Mesh(new THREE.SphereGeometry(0.19, 16, 14), this.eggWhiteMat);
    egg.position.y = 0.18;
    fallback.add(egg);

    ExternalModelLoader.attachModel(
      group,
      isFried ? ExternalModelLoader.PATHS.EGG_COOKED : ExternalModelLoader.PATHS.EGG_WHOLE,
      { targetWidth: isFried ? 0.46 : 0.34 },
      fallback
    );
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
