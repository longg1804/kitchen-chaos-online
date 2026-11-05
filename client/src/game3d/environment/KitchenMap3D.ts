import * as THREE from 'three';
import { CounterType, IngredientType, KitchenItem, StoveState } from '../../game/types';
import { CookingConfig } from '../../game/config/CookingConfig';
import { MaterialFactory } from './MaterialFactory';
import { Physics3D } from '../core/Physics3D';
import { TextureGenerator3D } from './TextureGenerator3D';
import { Ingredient3DFactory } from '../entities/Ingredient3D';
import { ExternalModelLoader } from '../assets/ExternalModelLoader';
import { QualityManager3D } from '../core/QualityManager3D';

export interface Counter3DData {
  id: string;
  type: CounterType;
  x: number;
  z: number;
  group: THREE.Group;
  itemHolder: THREE.Group;
  baseSlotY: number;
  baseSlotZ: number;
  surfaceSlotGroups: THREE.Group[];
  surfaceItems: KitchenItem[];
  surfaceBounceTimers: number[];
  crateDisplayGroup?: THREE.Group;
  boardKnifeGroup?: THREE.Group;
  trashLidGroup?: THREE.Group;
  trashLidTimer?: number;
  sinkBubblesGroup?: THREE.Group;
  deliveryArrowMesh?: THREE.Mesh;
  heatRingMat?: THREE.MeshStandardMaterial;
  isActivelyChopping?: boolean;
  bounceTimer?: number;
  itemPlaceBounceTimer?: number;
  progressGroup?: THREE.Group;
  progressFillMesh?: THREE.Mesh;
  progressFillMat?: THREE.MeshBasicMaterial;
  statusSprite?: THREE.Sprite;
  fireGroup?: THREE.Group;
  isOnFire?: boolean;
  fireIntensity?: number;
  fireSpreadTimer?: number;
  beepTimer?: number;
  currentItem?: KitchenItem | null;
  cutProgress: number;
  stoveState: StoveState;
  cookTimer: number;
  burnTimer: number;
  cookingTimer: number;
}

export class KitchenMap3D {
  public scene: THREE.Scene;
  public physics: Physics3D;
  public counters: Map<string, Counter3DData> = new Map();
  public floorMesh!: THREE.Mesh;
  private roomGroup: THREE.Group = new THREE.Group();
  private statusMaterials: Record<string, THREE.SpriteMaterial> = {};

  // Pre-allocated colors for cooking transitions (prevents 6x new THREE.Color allocations every frame!)
  private readonly rawMeatColor = new THREE.Color(0xef4444);
  private readonly cookedMeatColor = new THREE.Color(0xc26a1b);
  private readonly whiteTintColor = new THREE.Color(0xffffff);
  private readonly searedTintColor = new THREE.Color(0xd97706);
  private readonly rawFatColor = new THREE.Color(0xfecaca);
  private readonly cookedFatColor = new THREE.Color(0xfde68a);

  constructor(scene: THREE.Scene, physics: Physics3D) {
    this.scene = scene;
    this.physics = physics;
    this.scene.add(this.roomGroup);
    this.initStatusBadgeMaterials();
  }

  private initStatusBadgeMaterials() {
    const makeBadgeMat = (emoji: string, bgColor: string, borderColor: string) => {
      const canvas = document.createElement('canvas');
      canvas.width = 128;
      canvas.height = 128;
      const ctx = canvas.getContext('2d')!;

      ctx.fillStyle = bgColor;
      ctx.beginPath();
      ctx.arc(64, 64, 54, 0, Math.PI * 2);
      ctx.fill();

      ctx.lineWidth = 10;
      ctx.strokeStyle = borderColor;
      ctx.stroke();

      ctx.font = '62px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(emoji, 64, 68);

      const tex = new THREE.CanvasTexture(canvas);
      return new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
    };

    this.statusMaterials['COOKED'] = makeBadgeMat('✅', 'rgba(6, 78, 59, 0.95)', '#10b981');
    this.statusMaterials['WARNING'] = makeBadgeMat('⚠️', 'rgba(120, 53, 15, 0.95)', '#f59e0b');
    this.statusMaterials['DANGER'] = makeBadgeMat('🔥', 'rgba(127, 29, 29, 0.95)', '#ef4444');
  }

  public buildMap(mapType: string = 'traditional') {
    this.clear();
    this.buildRoomShell();
    this.buildCountersLayout(mapType);
  }

  public clear() {
    this.counters.forEach(c => {
      this.scene.remove(c.group);
    });
    this.counters.clear();
    this.physics.clear();

    while (this.roomGroup.children.length > 0) {
      this.roomGroup.remove(this.roomGroup.children[0]);
    }
  }

  private buildRoomShell() {
    // 1. Cozy Stylized Checkered Tile Floor with per-tile variation & satin/matte roughness map
    const floorGeo = new THREE.PlaneGeometry(12.6, 9.6);
    const floorMat = new THREE.MeshStandardMaterial({
      map: TextureGenerator3D.getFloorTexture(),
      roughnessMap: TextureGenerator3D.getFloorRoughnessMap(),
      roughness: 0.55,
      metalness: 0.08
    });
    this.floorMesh = new THREE.Mesh(floorGeo, floorMat);
    this.floorMesh.rotation.x = -Math.PI / 2;
    this.floorMesh.position.set(0, 0, 0);
    this.floorMesh.receiveShadow = true;
    this.roomGroup.add(this.floorMesh);

    // Warm Wooden Baseboards & Wainscoting Trim around the kitchen perimeter
    const baseboardMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.45 });
    const trimGoldMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.35, metalness: 0.3 });

    const bbBack = new THREE.Mesh(new THREE.BoxGeometry(12.6, 0.28, 0.26), baseboardMat);
    bbBack.position.set(0, 0.14, -4.55);
    this.roomGroup.add(bbBack);

    const bbLeft = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.28, 9.6), baseboardMat);
    bbLeft.position.set(-6.15, 0.14, 0);
    this.roomGroup.add(bbLeft);

    const bbRight = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.28, 9.6), baseboardMat);
    bbRight.position.set(6.15, 0.14, 0);
    this.roomGroup.add(bbRight);

    // 2. Artisanal Subway Tile Back Wall & Warm Wainscoted Side Walls
    const backWallMat = new THREE.MeshStandardMaterial({
      map: TextureGenerator3D.getSubwayTileTexture(),
      roughness: 0.28,
      metalness: 0.08
    });
    const backWall = new THREE.Mesh(new THREE.BoxGeometry(12.6, 3.8, 0.3), backWallMat);
    backWall.position.set(0, 1.9, -4.7);
    backWall.receiveShadow = true;
    this.roomGroup.add(backWall);

    // Upper Crown Molding Beam along Back & Side Walls
    const crownBack = new THREE.Mesh(new THREE.BoxGeometry(12.8, 0.18, 0.38), baseboardMat);
    crownBack.position.set(0, 3.72, -4.66);
    this.roomGroup.add(crownBack);

    const sideWallMat = new THREE.MeshStandardMaterial({ color: 0xfde68a, roughness: 0.55 });
    const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.3, 3.8, 9.6), sideWallMat);
    leftWall.position.set(-6.3, 1.9, 0);
    leftWall.receiveShadow = true;
    this.roomGroup.add(leftWall);

    const rightWall = new THREE.Mesh(new THREE.BoxGeometry(0.3, 3.8, 9.6), sideWallMat);
    rightWall.position.set(6.3, 1.9, 0);
    rightWall.receiveShadow = true;
    this.roomGroup.add(rightWall);

    // Wainscoting chair-rail along side walls
    const railLeft = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.10, 9.5), trimGoldMat);
    railLeft.position.set(-6.12, 1.35, 0);
    this.roomGroup.add(railLeft);

    const railRight = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.10, 9.5), trimGoldMat);
    railRight.position.set(6.12, 1.35, 0);
    this.roomGroup.add(railRight);

    // 3. Decorative Stainless Steel Kitchen Shelf on Back Wall
    const shelfMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8, roughness: 0.2 });
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(11.2, 0.08, 0.58), shelfMat);
    shelf.position.set(0, 2.25, -4.32);
    shelf.castShadow = true;
    this.roomGroup.add(shelf);

    for (let bx = -4.5; bx <= 4.5; bx += 3) {
      const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.38, 0.48), shelfMat);
      bracket.position.set(bx, 2.05, -4.36);
      this.roomGroup.add(bracket);
    }

    // Decorative CC0 3D bottles, shakers, stew pot & appliances on back shelf
    const shelfProps = [
      { path: ExternalModelLoader.PATHS.BOTTLE_KETCHUP, width: 0.22 },
      { path: ExternalModelLoader.PATHS.BOTTLE_MUSTARD, width: 0.22 },
      { path: ExternalModelLoader.PATHS.BOTTLE_OIL, width: 0.22 },
      { path: ExternalModelLoader.PATHS.SHAKER_SALT, width: 0.18 },
      { path: ExternalModelLoader.PATHS.SHAKER_PEPPER, width: 0.18 },
      { path: ExternalModelLoader.PATHS.POT_STEW, width: 0.42 },
      { path: ExternalModelLoader.PATHS.BLENDER, width: 0.34 },
      { path: ExternalModelLoader.PATHS.COFFEE_MACHINE, width: 0.36 }
    ];
    const jarColors = [0xef4444, 0x22c55e, 0xfacc15, 0x0284c7, 0xf97316];
    for (let j = 0; j < shelfProps.length; j++) {
      const propSlot = new THREE.Group();
      propSlot.position.set(-3.5 + j * 0.95, 2.29, -4.32);
      this.roomGroup.add(propSlot);

      const fallbackJar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.1, 0.1, 0.28, 12),
        new THREE.MeshStandardMaterial({ color: jarColors[j % jarColors.length], roughness: 0.3 })
      );
      fallbackJar.position.y = 0.14;
      fallbackJar.castShadow = true;

      ExternalModelLoader.attachModel(
        propSlot,
        shelfProps[j].path,
        { targetWidth: shelfProps[j].width },
        fallbackJar
      );
    }

    // 4. Wrought-Iron & Brass Hanging Kitchen Utensil Rack (Pots, Pans, Spatulas, Knives)
    this.buildHangingUtensilRack();

    // 5. Bistro Chalkboard Menu & Decorative Zone Signs on Walls
    this.buildWallSignsAndMenu();

    // 6. Warm Overhead Bistro Pendant Lamps with PointLight Pools
    this.buildPendantLamps();
  }

  private buildHangingUtensilRack() {
    const ironMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.35, metalness: 0.85 });
    const copperMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.25, metalness: 0.78 });

    // Horizontal hanging bar mounted below the upper shelf
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 8.6, 12), ironMat);
    bar.rotation.z = Math.PI / 2;
    bar.position.set(0.4, 1.78, -4.46);
    this.roomGroup.add(bar);

    const hangingUtensils = [
      { x: -2.8, path: ExternalModelLoader.PATHS.FRYING_PAN, width: 0.38, rotX: Math.PI / 2 },
      { x: -0.3, path: ExternalModelLoader.PATHS.POT, width: 0.34, rotX: 0.25 },
      { x: 0.6, path: ExternalModelLoader.PATHS.CHEF_KNIFE, width: 0.30, rotX: 0 },
      { x: 2.1, path: ExternalModelLoader.PATHS.FRYING_PAN, width: 0.36, rotX: Math.PI / 2 },
      { x: 3.8, path: ExternalModelLoader.PATHS.POT_STEW, width: 0.36, rotX: 0.25 }
    ];

    hangingUtensils.forEach((u) => {
      // S-Hook on rail
      const hook = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.14, 0.04), copperMat);
      hook.position.set(u.x, 1.72, -4.44);
      this.roomGroup.add(hook);

      const holder = new THREE.Group();
      holder.position.set(u.x, 1.46, -4.42);
      this.roomGroup.add(holder);

      const fallbackPan = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.12, 0.05, 14), copperMat);
      fallbackPan.rotation.x = Math.PI / 2;

      ExternalModelLoader.attachModel(
        holder,
        u.path,
        { targetWidth: u.width, rotationX: u.rotX },
        fallbackPan
      );
    });
  }

  private buildWallSignsAndMenu() {
    // 1. Back Wall Framed Bistro Menu Chalkboard
    const menuCanvas = document.createElement('canvas');
    menuCanvas.width = 512;
    menuCanvas.height = 192;
    const ctx = menuCanvas.getContext('2d')!;

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, 512, 192);
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 10;
    ctx.strokeRect(8, 8, 496, 176);

    ctx.fillStyle = '#fbbf24';
    ctx.font = '900 32px "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🍔 KITCHEN CHAOS BISTRO 🥗', 256, 56);

    ctx.fillStyle = '#f8fafc';
    ctx.font = '700 22px "Segoe UI", system-ui, sans-serif';
    ctx.fillText('TODAY SPECIAL: BURGER • CHEESEBURGER • SALAD', 256, 108);

    ctx.fillStyle = '#38bdf8';
    ctx.font = '800 20px "Segoe UI", system-ui, sans-serif';
    ctx.fillText('⚡ PHỐI HỢP NHANH • GIAO MÓN ĐÚNG GIỜ • DẬP LỬA KỊP THỜI!', 256, 152);

    const menuTex = new THREE.CanvasTexture(menuCanvas);
    menuTex.colorSpace = THREE.SRGBColorSpace;
    const menuBoard = new THREE.Mesh(
      new THREE.BoxGeometry(3.4, 1.05, 0.08),
      new THREE.MeshStandardMaterial({ map: menuTex, roughness: 0.4 })
    );
    menuBoard.position.set(0.5, 3.05, -4.52);
    menuBoard.castShadow = true;
    this.roomGroup.add(menuBoard);

    // 2. Side Wall Zone Plaque Signs (Cooking Zone on Left, Prep Zone on Right)
    const makeZoneSign = (text: string, bgHex: string, borderHex: string) => {
      const c = document.createElement('canvas');
      c.width = 384;
      c.height = 96;
      const g = c.getContext('2d')!;
      g.fillStyle = bgHex;
      g.fillRect(0, 0, 384, 96);
      g.strokeStyle = borderHex;
      g.lineWidth = 8;
      g.strokeRect(6, 6, 372, 84);
      g.fillStyle = '#ffffff';
      g.font = '900 30px "Segoe UI", system-ui, sans-serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(text, 192, 50);
      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      return new THREE.Mesh(
        new THREE.BoxGeometry(2.2, 0.55, 0.06),
        new THREE.MeshStandardMaterial({ map: tex, roughness: 0.35 })
      );
    };

    const leftSign = makeZoneSign('🔥 KHU BẾP NƯỚNG', '#7c2d12', '#f97316');
    leftSign.rotation.y = Math.PI / 2;
    leftSign.position.set(-6.12, 2.55, 0.2);
    this.roomGroup.add(leftSign);

    const rightSign = makeZoneSign('🔪 KHU SƠ CHẾ & RAU', '#14532d', '#22c55e');
    rightSign.rotation.y = -Math.PI / 2;
    rightSign.position.set(6.12, 2.55, 0.2);
    this.roomGroup.add(rightSign);
  }

  private buildPendantLamps() {
    const shadeMat = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      roughness: 0.3,
      metalness: 0.5,
      side: THREE.DoubleSide
    });
    const cordMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6 });
    const bulbMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });

    const lampSpots = [
      { x: -3.5, z: 0.4, color: 0xffedd5, intensity: 0.65 }, // Warm glow over Stoves
      { x: 0.0, z: -0.2, color: 0xfffbeb, intensity: 0.55 }, // Warm glow over Center Island
      { x: 3.5, z: 0.8, color: 0xfef3c7, intensity: 0.60 }   // Warm glow over Cutting Station
    ];

    lampSpots.forEach((spot) => {
      const lampGroup = new THREE.Group();
      lampGroup.position.set(spot.x, 3.55, spot.z);

      const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.6, 8), cordMat);
      cord.position.y = 0.3;
      lampGroup.add(cord);

      const shade = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.22, 18, 1, true), shadeMat);
      lampGroup.add(shade);

      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 10), bulbMat);
      bulb.position.y = -0.05;
      lampGroup.add(bulb);

      if (QualityManager3D.getProfile().enablePendantPointLights) {
        const light = new THREE.PointLight(spot.color, spot.intensity, 6.5, 1.5);
        light.position.set(0, -0.25, 0);
        lampGroup.add(light);
      }

      this.roomGroup.add(lampGroup);
    });
  }

  private buildCountersLayout(mapType: string) {
    const add = (c: number, r: number, type: CounterType) => {
      // Grid: 9 columns (c: -4 to 4), 7 rows (r: -3 to 3)
      const x = c * 1.05;
      const z = r * 1.05;
      const id = `counter_${c}_${r}`;
      this.createCounter(id, type, x, z);
    };

    if (mapType === 'farm') {
      // WORLD 2: FARM & SALAD KITCHEN
      // Top row
      add(-4, -3, CounterType.CLEAR);
      add(-3, -3, CounterType.CLEAR);
      add(-2, -3, CounterType.DELIVERY);
      add(-1, -3, CounterType.DELIVERY);
      add(0, -3, CounterType.CLEAR);
      add(1, -3, CounterType.CLEAR);
      add(2, -3, CounterType.TRASH);
      add(3, -3, CounterType.CLEAR);
      add(4, -3, CounterType.CLEAR);

      // Left column: fresh farm veggies & cheese
      add(-4, -2, CounterType.CRATE_LETTUCE);
      add(-4, -1, CounterType.CRATE_TOMATO);
      add(-4, 0, CounterType.CRATE_ONION);
      add(-4, 1, CounterType.CRATE_POTATO);
      add(-4, 2, CounterType.CRATE_CHEESE);

      // Right column: 4 cutting boards for team chopping
      add(4, -2, CounterType.CUTTING_BOARD);
      add(4, -1, CounterType.CUTTING_BOARD);
      add(4, 0, CounterType.CUTTING_BOARD);
      add(4, 1, CounterType.CUTTING_BOARD);
      add(4, 2, CounterType.CLEAR);

      // Bottom row: plate station & tables
      add(-4, 3, CounterType.CLEAR);
      add(-3, 3, CounterType.CRATE_PLATE);
      add(-2, 3, CounterType.CRATE_PLATE);
      add(-1, 3, CounterType.CLEAR);
      add(0, 3, CounterType.CLEAR);
      add(1, 3, CounterType.CLEAR);
      add(2, 3, CounterType.CLEAR);
      add(3, 3, CounterType.CLEAR);
      add(4, 3, CounterType.CLEAR);

      // Center pass-through
      add(-1, 0, CounterType.CLEAR);
      add(0, 0, CounterType.CLEAR);
      add(1, 0, CounterType.CLEAR);
    } else if (mapType === 'pizza') {
      // WORLD 3: PIZZA HOUSE KITCHEN
      // Top row
      add(-4, -3, CounterType.CLEAR);
      add(-3, -3, CounterType.CLEAR);
      add(-2, -3, CounterType.DELIVERY);
      add(-1, -3, CounterType.DELIVERY);
      add(0, -3, CounterType.CLEAR);
      add(1, -3, CounterType.CLEAR);
      add(2, -3, CounterType.TRASH);
      add(3, -3, CounterType.CLEAR);
      add(4, -3, CounterType.CLEAR);

      // Left column: Dough & Ovens/Stoves
      add(-4, -2, CounterType.CRATE_BREAD);
      add(-4, -1, CounterType.STOVE);
      add(-4, 0, CounterType.STOVE);
      add(-4, 1, CounterType.STOVE);
      add(-4, 2, CounterType.CLEAR);

      // Right column: Cheese, Tomato, Mushroom & Cutting Boards
      add(4, -2, CounterType.CRATE_CHEESE);
      add(4, -1, CounterType.CRATE_TOMATO);
      add(4, 0, CounterType.CRATE_MUSHROOM);
      add(4, 1, CounterType.CUTTING_BOARD);
      add(4, 2, CounterType.CUTTING_BOARD);

      // Bottom row: plate station
      add(-4, 3, CounterType.CLEAR);
      add(-3, 3, CounterType.CRATE_PLATE);
      add(-2, 3, CounterType.CRATE_PLATE);
      add(-1, 3, CounterType.CLEAR);
      add(0, 3, CounterType.CLEAR);
      add(1, 3, CounterType.CLEAR);
      add(2, 3, CounterType.CLEAR);
      add(3, 3, CounterType.CLEAR);
      add(4, 3, CounterType.CLEAR);

      // Center pass-through
      add(-1, 0, CounterType.CLEAR);
      add(0, 0, CounterType.CLEAR);
      add(1, 0, CounterType.CLEAR);
    } else if (mapType === 'sushi') {
      // WORLD 4: SUSHI & SEAFOOD KITCHEN
      // Top row
      add(-4, -3, CounterType.CLEAR);
      add(-3, -3, CounterType.CLEAR);
      add(-2, -3, CounterType.DELIVERY);
      add(-1, -3, CounterType.DELIVERY);
      add(0, -3, CounterType.CLEAR);
      add(1, -3, CounterType.CLEAR);
      add(2, -3, CounterType.TRASH);
      add(3, -3, CounterType.CLEAR);
      add(4, -3, CounterType.CLEAR);

      // Left column: Fresh Seafood & Stoves
      add(-4, -2, CounterType.CRATE_FISH);
      add(-4, -1, CounterType.CRATE_SHRIMP);
      add(-4, 0, CounterType.STOVE);
      add(-4, 1, CounterType.STOVE);
      add(-4, 2, CounterType.CLEAR);

      // Right column: Veggies & Cutting Boards
      add(4, -2, CounterType.CRATE_LETTUCE);
      add(4, -1, CounterType.CRATE_TOMATO);
      add(4, 0, CounterType.CUTTING_BOARD);
      add(4, 1, CounterType.CUTTING_BOARD);
      add(4, 2, CounterType.CLEAR);

      // Bottom row: plate station
      add(-4, 3, CounterType.CLEAR);
      add(-3, 3, CounterType.CRATE_PLATE);
      add(-2, 3, CounterType.CRATE_PLATE);
      add(-1, 3, CounterType.CLEAR);
      add(0, 3, CounterType.CLEAR);
      add(1, 3, CounterType.CLEAR);
      add(2, 3, CounterType.CLEAR);
      add(3, 3, CounterType.CLEAR);
      add(4, 3, CounterType.CLEAR);

      // Center pass-through
      add(-1, 0, CounterType.CLEAR);
      add(0, 0, CounterType.CLEAR);
      add(1, 0, CounterType.CLEAR);
    } else if (mapType === 'split_kitchen' || mapType === 'chaotic') {
      // WORLD 5: SPLIT CHAOTIC KITCHEN WITH CENTER CONVEYOR / DIVIDER
      // Top row
      add(-4, -3, CounterType.CLEAR);
      add(-3, -3, CounterType.CLEAR);
      add(-2, -3, CounterType.DELIVERY);
      add(-1, -3, CounterType.DELIVERY);
      add(0, -3, CounterType.CLEAR);
      add(1, -3, CounterType.CLEAR);
      add(2, -3, CounterType.TRASH);
      add(3, -3, CounterType.CLEAR);
      add(4, -3, CounterType.CLEAR);

      // Left column: Ingredients
      add(-4, -2, CounterType.CRATE_BREAD);
      add(-4, -1, CounterType.CRATE_MEAT);
      add(-4, 0, CounterType.CRATE_CHEESE);
      add(-4, 1, CounterType.CRATE_TOMATO);
      add(-4, 2, CounterType.CRATE_CHICKEN);

      // Right column: Prep & Stoves
      add(4, -2, CounterType.STOVE);
      add(4, -1, CounterType.STOVE);
      add(4, 0, CounterType.CUTTING_BOARD);
      add(4, 1, CounterType.CUTTING_BOARD);
      add(4, 2, CounterType.CLEAR);

      // Bottom row
      add(-4, 3, CounterType.CLEAR);
      add(-3, 3, CounterType.CRATE_PLATE);
      add(-2, 3, CounterType.CRATE_PLATE);
      add(-1, 3, CounterType.CLEAR);
      add(0, 3, CounterType.CLEAR);
      add(1, 3, CounterType.CLEAR);
      add(2, 3, CounterType.CLEAR);
      add(3, 3, CounterType.CLEAR);
      add(4, 3, CounterType.CLEAR);

      // Center Divider Pass (Players must toss items across!)
      add(0, -2, CounterType.CLEAR);
      add(0, -1, CounterType.CLEAR);
      add(0, 0, CounterType.CLEAR);
      add(0, 1, CounterType.CLEAR);
      add(0, 2, CounterType.CLEAR);
    } else {
      // Standard Overcooked Kitchen Layout in 3D Space (Traditional / Burger)
      // TOP ROW (r = -3, along the back subway wall)
      add(-4, -3, CounterType.CLEAR);
      add(-3, -3, CounterType.CLEAR);
      add(-2, -3, CounterType.DELIVERY);
      add(-1, -3, CounterType.DELIVERY);
      add(0, -3, CounterType.CLEAR);
      add(1, -3, CounterType.CLEAR);
      add(2, -3, CounterType.TRASH);
      add(3, -3, CounterType.CLEAR);
      add(4, -3, CounterType.CLEAR);

      // LEFT COLUMN (c = -4, cooking & raw meat/bread)
      add(-4, -2, CounterType.CRATE_BREAD);
      add(-4, -1, CounterType.CRATE_MEAT);
      add(-4, 0, CounterType.STOVE);
      add(-4, 1, CounterType.STOVE);
      add(-4, 2, CounterType.CLEAR);

      // RIGHT COLUMN (c = 4, veggies, cheese & prep thớt)
      add(4, -2, CounterType.CRATE_LETTUCE);
      add(4, -1, CounterType.CRATE_TOMATO);
      add(4, 0, CounterType.CRATE_CHEESE);
      add(4, 1, CounterType.CUTTING_BOARD);
      add(4, 2, CounterType.CUTTING_BOARD);

      // BOTTOM ROW (r = 3, plate station & prep counter)
      add(-4, 3, CounterType.CLEAR);
      add(-3, 3, CounterType.CRATE_PLATE);
      add(-2, 3, CounterType.CRATE_PLATE);
      add(-1, 3, CounterType.CLEAR);
      add(0, 3, CounterType.CLEAR);
      add(1, 3, CounterType.CLEAR);
      add(2, 3, CounterType.CLEAR);
      add(3, 3, CounterType.CLEAR);
      add(4, 3, CounterType.CLEAR);

      // CENTER PASS-THROUGH ISLAND
      add(-1, 0, CounterType.CLEAR);
      add(0, 0, CounterType.CLEAR);
      add(1, 0, CounterType.CLEAR);
    }
  }

  public createCounter(id: string, type: CounterType, x: number, z: number): Counter3DData {
    const group = new THREE.Group();
    group.position.set(x, 0, z);

    // 1. Base Counter Body (Designed to match Reference Image 1!)
    const isStove = type === CounterType.STOVE;
    const isDelivery = type === CounterType.DELIVERY;
    const isTrash = type === CounterType.TRASH;
    const isSink = id === 'counter_1_-3';
    const isCrate = type.startsWith('crate_');
    // Alternate between Drawer Cabinets and 4-Legged Open Wooden Tables just like Reference Image 1!
    const isDrawerTable =
      type === CounterType.CRATE_PLATE ||
      (type === CounterType.CLEAR && Math.abs(Math.round(x + z)) % 2 === 1);

    const woodTopMat = new THREE.MeshStandardMaterial({ color: 0x7c4a27, roughness: 0.52, metalness: 0.06 });
    const woodBodyMat = new THREE.MeshStandardMaterial({ color: 0x5c3418, roughness: 0.58, metalness: 0.05 });
    const woodDarkMat = new THREE.MeshStandardMaterial({ color: 0x43230e, roughness: 0.65 });
    const chromeHandleMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.2, metalness: 0.85 });

    if (isStove) {
      // Bright Crimson-Red Metallic Stove Body & Top Slab (Matches Reference Image 1 Row 2/3 Right!)
      const stoveBodyMat = new THREE.MeshStandardMaterial({ color: 0x9e1b18, roughness: 0.35, metalness: 0.28 });
      const stoveTopMat = new THREE.MeshStandardMaterial({ color: 0xd62828, roughness: 0.28, metalness: 0.25 });

      const bodyMesh = new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.76, 0.96), stoveBodyMat);
      bodyMesh.position.y = 0.38;
      bodyMesh.castShadow = true;
      bodyMesh.receiveShadow = true;
      group.add(bodyMesh);

      const topMesh = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.08, 1.0), stoveTopMat);
      topMesh.position.y = 0.80;
      topMesh.castShadow = true;
      topMesh.receiveShadow = true;
      group.add(topMesh);
    } else if (isDelivery) {
      // Dark Charcoal Metal Pass-Through Base & Brushed Silver Tray Top (Matches Reference Image 1 Row 1 Right!)
      const delivBaseMat = new THREE.MeshStandardMaterial({ color: 0x333942, roughness: 0.45, metalness: 0.5 });
      const delivTopMat = new THREE.MeshStandardMaterial({ color: 0xd1d5db, roughness: 0.22, metalness: 0.72 });

      const bodyMesh = new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.76, 0.96), delivBaseMat);
      bodyMesh.position.y = 0.38;
      bodyMesh.castShadow = true;
      bodyMesh.receiveShadow = true;
      group.add(bodyMesh);

      const topMesh = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.08, 1.0), delivTopMat);
      topMesh.position.y = 0.80;
      topMesh.castShadow = true;
      topMesh.receiveShadow = true;
      group.add(topMesh);
    } else if (isSink) {
      // Warm Brown Cabinet Base with Two Front Doors + Silver Vertical Handles & Brushed Metal Sink Top (Matches Image 1 Row 1 Left!)
      const bodyMesh = new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.76, 0.96), woodBodyMat);
      bodyMesh.position.y = 0.38;
      bodyMesh.castShadow = true;
      bodyMesh.receiveShadow = true;
      group.add(bodyMesh);

      // Front door center seam & 2 silver vertical handles
      const doorSeam = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.62, 0.02), woodDarkMat);
      doorSeam.position.set(0, 0.36, 0.482);
      group.add(doorSeam);

      [-0.06, 0.06].forEach((hx) => {
        const handle = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.16, 0.04), chromeHandleMat);
        handle.position.set(hx, 0.36, 0.495);
        group.add(handle);
      });

      const sinkTopMat = new THREE.MeshStandardMaterial({ color: 0x8d7b6d, roughness: 0.28, metalness: 0.55 });
      const topMesh = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.08, 1.0), sinkTopMat);
      topMesh.position.y = 0.80;
      topMesh.castShadow = true;
      topMesh.receiveShadow = true;
      group.add(topMesh);
    } else if (!isTrash && !isCrate) {
      // Warm Brown Wooden Tabletop (Matches Reference Image 1!)
      const topMesh = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.08, 1.0), woodTopMat);
      topMesh.position.y = 0.80;
      topMesh.castShadow = true;
      topMesh.receiveShadow = true;
      group.add(topMesh);

      if (isDrawerTable) {
        // Wooden Drawer Cabinet Body with Front Silver Pull Handle (Matches Image 1 Row 2 Col 4 & Row 3 Col 1)
        const bodyMesh = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.76, 0.92), woodBodyMat);
        bodyMesh.position.y = 0.38;
        bodyMesh.castShadow = true;
        bodyMesh.receiveShadow = true;
        group.add(bodyMesh);

        const drawerFace = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.26, 0.025), woodDarkMat);
        drawerFace.position.set(0, 0.24, 0.465);
        group.add(drawerFace);

        const uHandle = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.026, 0.045), chromeHandleMat);
        uHandle.position.set(0, 0.24, 0.485);
        group.add(uHandle);
      } else {
        // 4-Legged Open Wooden Table with Under-Table Apron Skirt (Matches Image 1 Row 2 Col 1 & Row 3 Col 2/3)
        const apron = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.14, 0.88), woodBodyMat);
        apron.position.y = 0.70;
        apron.castShadow = true;
        group.add(apron);

        const legCoords = [
          [-0.38, -0.38],
          [0.38, -0.38],
          [-0.38, 0.38],
          [0.38, 0.38]
        ];
        legCoords.forEach(([lx, lz]) => {
          const leg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.74, 0.12), woodBodyMat);
          leg.position.set(lx, 0.37, lz);
          leg.castShadow = true;
          leg.receiveShadow = true;
          group.add(leg);
        });
      }
    }

    // Calibrated Snap-to-Slot Item Holder (Item bottom plane rests exactly at surface center)
    let slotY = 0.845; // Plain flat countertop
    let slotZ = 0;
    if (type === CounterType.CUTTING_BOARD) {
      slotY = 0.895; // On top of butcher block
      slotZ = 0.0;
    } else if (type === CounterType.STOVE) {
      slotY = 0.905; // Centered inside cast iron frying pan
      slotZ = 0.0;
    } else if (type === CounterType.DELIVERY) {
      slotY = 0.875; // On top of delivery pass-through tray
      slotZ = 0.0;
    }

    const itemHolder = new THREE.Group();
    itemHolder.position.set(0, slotY, slotZ);
    group.add(itemHolder);

    // PHẦN 2.3: 6 Multi-Item Placement Surface Slots on the Flat Countertop (y = 0.845)
    // Arranged in a 3x2 non-overlapping grid so up to 6 items of different sizes can sit on a Storage Bin!
    const slotOffsets = [
      { x: -0.27, z: -0.21 },
      { x: 0.27, z: -0.21 },
      { x: -0.27, z: 0.21 },
      { x: 0.27, z: 0.21 },
      { x: 0.0, z: -0.23 },
      { x: 0.0, z: 0.23 }
    ];
    const surfaceSlotGroups: THREE.Group[] = [];
    for (const off of slotOffsets) {
      const sg = new THREE.Group();
      sg.position.set(off.x, 0.845, off.z);
      group.add(sg);
      surfaceSlotGroups.push(sg);
    }

    // Equipment on top based on Type
    const extraRefs = this.decorateCounter(group, type, id, x, z);

    // 3D Cartoon Fire Group (Hidden unless counter catches fire or fire spreads to it)
    const fireGroup = this.createFireMesh3D();
    group.add(fireGroup);

    // Ensure every counter has a progress bar group so fire extinguishing progress can also be shown
    let progressGroup = extraRefs.progressGroup;
    let progressFillMesh = extraRefs.progressFillMesh;
    let progressFillMat = extraRefs.progressFillMat;
    let statusSprite = extraRefs.statusSprite;
    if (!progressGroup) {
      const prog = this.createProgressBar3D();
      group.add(prog.progressGroup);
      progressGroup = prog.progressGroup;
      progressFillMesh = prog.progressFillMesh;
      progressFillMat = prog.progressFillMat;
      statusSprite = prog.statusSprite;
    }

    this.scene.add(group);
    this.physics.addBox(id, x, z, 1.0, 1.0);

    const counterData: Counter3DData = {
      id,
      type,
      x,
      z,
      group,
      itemHolder,
      baseSlotY: slotY,
      baseSlotZ: slotZ,
      surfaceSlotGroups,
      surfaceItems: [],
      surfaceBounceTimers: [],
      crateDisplayGroup: extraRefs.crateDisplayGroup,
      boardKnifeGroup: extraRefs.boardKnifeGroup,
      trashLidGroup: extraRefs.trashLidGroup,
      trashLidTimer: 0,
      sinkBubblesGroup: extraRefs.sinkBubblesGroup,
      deliveryArrowMesh: extraRefs.deliveryArrowMesh,
      heatRingMat: extraRefs.heatRingMat,
      isActivelyChopping: false,
      bounceTimer: 0,
      itemPlaceBounceTimer: 0,
      progressGroup,
      progressFillMesh,
      progressFillMat,
      statusSprite,
      fireGroup,
      isOnFire: false,
      fireIntensity: 0,
      fireSpreadTimer: 0,
      beepTimer: 0,
      cutProgress: 0,
      stoveState: StoveState.IDLE,
      cookTimer: 0,
      burnTimer: 0,
      cookingTimer: 0
    };

    // Spawn 3D Fire Extinguisher on dedicated Fire Station counter (counter_3_-3)
    if (id === 'counter_3_-3') {
      const extItem: KitchenItem = {
        id: 'fire_extinguisher_main',
        type: IngredientType.FIRE_EXTINGUISHER
      };
      this.placeItemInCenterSlot(counterData, extItem);
    }

    this.counters.set(id, counterData);
    return counterData;
  }

  /**
   * PHẦN 5: Unified Snap-to-Anchor Item Placement System.
   * Guarantees every placed plate, dish, or ingredient snaps cleanly to the exact center anchor
   * of the counter without position offset, rotation drift, or surface penetration.
   */
  public placeItemInCenterSlot(c: Counter3DData, item: KitchenItem | null) {
    c.currentItem = item;
    c.itemHolder.clear();
    c.itemHolder.position.set(0, c.baseSlotY, c.baseSlotZ);
    c.itemHolder.rotation.set(0, 0, 0);
    c.itemHolder.scale.set(1, 1, 1);

    if (item) {
      const mesh = Ingredient3DFactory.createMesh(item);
      mesh.position.set(0, 0, 0);
      mesh.rotation.set(0, 0, 0);
      c.itemHolder.add(mesh);
    }
  }

  public triggerCounterBounce(counterId: string) {
    const c = this.counters.get(counterId);
    if (c) {
      c.bounceTimer = 0.24;
      c.itemPlaceBounceTimer = 0.26;
      if (c.type === CounterType.TRASH) {
        c.trashLidTimer = 0.55;
      }
    }
  }

  /**
   * Rebuilds the 3D meshes for all items placed on top of a Storage Bin's flat countertop surface.
   * Dynamically arranges 1 to 6 items across the 1.0x1.0 surface with size-aware scaling and drop-bounce!
   */
  public rebuildSurfaceMeshes(c: Counter3DData, newlyAddedIndex?: number) {
    c.surfaceSlotGroups.forEach((sg) => sg.clear());
    const count = c.surfaceItems.length;
    if (count === 0) {
      c.surfaceBounceTimers = [];
      return;
    }

    // Dynamic non-overlapping slot coordinates depending on how many items are on the surface
    const layoutCoords =
      count === 1
        ? [{ x: 0, z: 0 }]
        : count === 2
        ? [
            { x: -0.23, z: 0 },
            { x: 0.23, z: 0 }
          ]
        : count <= 4
        ? [
            { x: -0.23, z: -0.21 },
            { x: 0.23, z: -0.21 },
            { x: -0.23, z: 0.21 },
            { x: 0.23, z: 0.21 }
          ]
        : [
            { x: -0.28, z: -0.21 },
            { x: 0.0, z: -0.21 },
            { x: 0.28, z: -0.21 },
            { x: -0.28, z: 0.21 },
            { x: 0.0, z: 0.21 },
            { x: 0.28, z: 0.21 }
          ];

    for (let i = 0; i < count && i < c.surfaceSlotGroups.length; i++) {
      const item = c.surfaceItems[i];
      if (!item) continue;
      const slotGroup = c.surfaceSlotGroups[i];
      const coord = layoutCoords[i] || { x: 0, z: 0 };
      slotGroup.position.set(coord.x, 0.845, coord.z);
      slotGroup.rotation.set(0, 0, 0);

      const mesh = Ingredient3DFactory.createMesh(item);
      mesh.position.set(0, 0, 0);
      mesh.rotation.set(0, 0, 0);
      const isPlate = item.type === IngredientType.PLATE;
      const baseScale =
        count === 1
          ? 0.94
          : count <= 2
          ? isPlate
            ? 0.78
            : 0.86
          : count <= 4
          ? isPlate
            ? 0.72
            : 0.78
          : 0.64;
      mesh.scale.setScalar(baseScale);
      mesh.userData.baseScale = baseScale;
      slotGroup.add(mesh);

      if (newlyAddedIndex === i) {
        c.surfaceBounceTimers[i] = 0.28;
      }
    }
  }

  /**
   * Finds the index of the surface item on `c` that is closest to the given world (x, z) point.
   */
  public getNearestSurfaceItemIndex(c: Counter3DData, worldX: number, worldZ: number): number {
    if (c.surfaceItems.length === 0) return -1;
    let bestIdx = c.surfaceItems.length - 1;
    let bestDist = Infinity;
    for (let i = 0; i < c.surfaceItems.length && i < c.surfaceSlotGroups.length; i++) {
      const sg = c.surfaceSlotGroups[i];
      const sx = c.x + sg.position.x;
      const sz = c.z + sg.position.z;
      const d = Math.hypot(sx - worldX, sz - worldZ);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    }
    return bestIdx;
  }

  public updateStations(delta: number) {
    const now = performance.now() * 0.001;
    this.counters.forEach((c) => {
      // 1. Crate / Plate Station bounce & active chopping vibration (Keeps crateDisplayGroup & itemHolder 100% centered!)
      if (c.bounceTimer && c.bounceTimer > 0) {
        c.bounceTimer = Math.max(0, c.bounceTimer - delta);
        const t = c.bounceTimer / 0.24;
        const pulse = 1 + Math.sin(t * Math.PI) * 0.14;
        const hopY = Math.sin(t * Math.PI) * 0.04;
        if (c.crateDisplayGroup) {
          c.crateDisplayGroup.scale.set(pulse, pulse, pulse);
          c.crateDisplayGroup.position.set(0, 0.846 + hopY, 0);
        } else {
          c.itemHolder.scale.set(pulse, pulse, pulse);
          c.itemHolder.position.set(0, c.baseSlotY + hopY, c.baseSlotZ);
        }
      } else if (c.isActivelyChopping && c.currentItem) {
        // Subtle rhythmic squash-and-stretch on food while being chopped on board!
        const chopSquash = Math.sin(now * 26) * 0.07;
        c.itemHolder.scale.set(1 + chopSquash, 1 - chopSquash, 1 + chopSquash);
        c.itemHolder.position.set(0, c.baseSlotY, c.baseSlotZ);
      } else {
        if (c.crateDisplayGroup) {
          c.crateDisplayGroup.scale.set(1, 1, 1);
          c.crateDisplayGroup.position.set(0, 0.846, 0);
        }
        c.itemHolder.scale.set(1, 1, 1);
        c.itemHolder.position.set(0, c.baseSlotY, c.baseSlotZ);
      }

      // 1B. Individual Surface Slot Drop-Bounce Animation on Storage Bins
      for (let i = 0; i < c.surfaceSlotGroups.length; i++) {
        const bt = c.surfaceBounceTimers[i] || 0;
        const sg = c.surfaceSlotGroups[i];
        if (bt > 0) {
          c.surfaceBounceTimers[i] = Math.max(0, bt - delta);
          const prog = 1 - c.surfaceBounceTimers[i] / 0.28;
          const hopY = Math.sin(prog * Math.PI) * 0.11;
          const squash = 1 + Math.sin(prog * Math.PI * 2) * 0.12;
          sg.position.y = 0.845 + hopY;
          sg.scale.set(squash, 2 - squash, squash);
        } else {
          sg.position.y = 0.845;
          sg.scale.set(1, 1, 1);
        }
      }

      // 1C. Trash Bin Swing Lid Animation when disposing items
      if (c.trashLidGroup) {
        if (c.trashLidTimer && c.trashLidTimer > 0) {
          c.trashLidTimer = Math.max(0, c.trashLidTimer - delta);
          const swing = Math.sin((c.trashLidTimer / 0.55) * Math.PI) * 0.85;
          c.trashLidGroup.rotation.x = -swing;
        } else {
          c.trashLidGroup.rotation.x = 0;
        }
      }

      // 1D. Sink Soap Bubbles Animation & Delivery Arrow Pulse
      if (c.sinkBubblesGroup) {
        c.sinkBubblesGroup.children.forEach((b, idx) => {
          b.position.y = 0.86 + ((now * 0.12 + idx * 0.17) % 0.14);
          const s = 0.85 + Math.sin(now * 4 + idx) * 0.2;
          b.scale.setScalar(s);
        });
      }
      if (c.deliveryArrowMesh) {
        c.deliveryArrowMesh.position.z = -0.06 - Math.sin(now * 5) * 0.07;
      }

      // Hide resting knife on cutting board while chef is actively holding the knife to chop
      if (c.boardKnifeGroup) {
        c.boardKnifeGroup.visible = !c.isActivelyChopping;
      }

      // Dynamic Stove Burner Heat Glow when cooking
      if (c.heatRingMat) {
        if (c.isOnFire) {
          c.heatRingMat.emissiveIntensity = 2.0 + Math.sin(now * 20) * 0.6;
        } else if (c.currentItem && c.stoveState !== StoveState.IDLE) {
          c.heatRingMat.emissiveIntensity = 1.2 + Math.sin(now * 10) * 0.35;
        } else {
          c.heatRingMat.emissiveIntensity = 0.45;
        }
      }

      // 2. Dynamic 3D Fire Animation on Burning Counters (Scales with fireIntensity!)
      if (c.fireGroup) {
        if (c.isOnFire && (c.fireIntensity ?? 0) > 0.01) {
          c.fireGroup.visible = true;
          const intensity = Math.max(0.15, Math.min(1.0, c.fireIntensity ?? 1.0));
          const flickerX = intensity * (1.0 + Math.sin(now * 19 + c.x) * 0.12);
          const flickerY = intensity * (1.0 + Math.cos(now * 23 + c.z) * 0.18);
          const flickerZ = intensity * (1.0 + Math.sin(now * 17 - c.x) * 0.12);
          c.fireGroup.scale.set(flickerX, flickerY, flickerZ);
          c.fireGroup.rotation.y = Math.sin(now * 6 + c.x) * 0.25;
        } else {
          c.fireGroup.visible = false;
        }
      }

      // 3. 3D Floating Progress Bar & Status Badges for Cutting Boards, Stoves & Fires
      if (c.progressGroup && c.progressFillMesh && c.progressFillMat) {
        // Priority A: Counter is currently ON FIRE -> Show Fire Intensity / Extinguish Bar & 🔥 Badge!
        if (c.isOnFire && (c.fireIntensity ?? 0) > 0.01) {
          c.progressGroup.visible = true;
          const clamped = Math.max(0.04, Math.min(1, c.fireIntensity ?? 1.0));
          c.progressFillMesh.scale.x = clamped;
          c.progressFillMesh.position.x = -0.34 * (1 - clamped);
          const blink = Math.floor(Date.now() / 110) % 2 === 0;
          c.progressFillMat.color.setHex(blink ? 0xef4444 : 0xf97316);

          if (c.statusSprite) {
            c.statusSprite.visible = true;
            c.statusSprite.material = this.statusMaterials['DANGER'];
            const s = 0.40 + Math.sin(now * 22) * 0.06;
            c.statusSprite.scale.set(s, s, 1);
          }
        } else if (c.type === CounterType.CUTTING_BOARD) {
          if (c.statusSprite) c.statusSprite.visible = false;
          if (c.cutProgress > 0.01 && c.cutProgress < 1.0) {
            c.progressGroup.visible = true;
            const ratio = Math.max(0.02, Math.min(1, c.cutProgress));
            c.progressFillMesh.scale.x = ratio;
            c.progressFillMesh.position.x = -0.34 * (1 - ratio);
            c.progressFillMat.color.setHex(c.isActivelyChopping ? 0x22c55e : 0xfacc15);
          } else {
            c.progressGroup.visible = false;
          }
        } else if (c.type === CounterType.STOVE) {
          if (c.currentItem && c.stoveState !== StoveState.IDLE && c.stoveState !== StoveState.BURNT) {
            c.progressGroup.visible = true;
            const cookDuration = CookingConfig.getCookDuration(c.currentItem.type);
            const safeDur = CookingConfig.burnTimeline.safeDuration;       // 5.0s
            const warnDur = CookingConfig.burnTimeline.warningDuration;    // 5.0s
            const dangerDur = CookingConfig.burnTimeline.dangerDuration;   // 3.0s
            const totalBurnDur = CookingConfig.burnTimeline.totalPostCookedTime; // 13.0s

            let ratio = 0;
            if (c.stoveState === StoveState.COOKING) {
              ratio = Math.min(1, c.cookTimer / cookDuration);
              c.progressFillMat.color.setHex(0x22c55e); // Green cooking bar (0 -> 100%)
              if (c.statusSprite) c.statusSprite.visible = false;

              // Gradual visual color transition on RAW_MEAT while COOKING (Reuses pre-allocated Colors!)
              c.itemHolder.traverse((child) => {
                if (child instanceof THREE.Mesh) {
                  if (child.userData.isCookingMeat && child.material instanceof THREE.MeshStandardMaterial) {
                    if (child.userData.hasTextureMap) {
                      child.material.color.lerpColors(this.whiteTintColor, this.searedTintColor, ratio * 0.85);
                      child.material.emissive.setHex(0x451a03);
                      child.material.emissiveIntensity = ratio * 0.25;
                    } else {
                      child.material.color.lerpColors(this.rawMeatColor, this.cookedMeatColor, ratio * 0.85);
                    }
                  } else if (child.userData.isCookingFat && child.material instanceof THREE.MeshStandardMaterial) {
                    child.material.color.lerpColors(this.rawFatColor, this.cookedFatColor, ratio * 0.85);
                  }
                }
              });
              // Gentle sizzle vibration while cooking
              const sizzle = Math.sin(now * 28) * 0.025;
              c.itemHolder.scale.set(1 + sizzle, 1 - sizzle, 1 + sizzle);
            } else if (c.stoveState === StoveState.COOKED) {
              // 0–5s after cooked (burnTimer: 0..5s): Safe green bar + ✅ Checkmark icon
              ratio = Math.max(0.1, 1 - c.burnTimer / totalBurnDur);
              c.progressFillMat.color.setHex(0x10b981);
              if (c.statusSprite) {
                c.statusSprite.visible = true;
                c.statusSprite.material = this.statusMaterials['COOKED'];
                const s = 0.36 + Math.sin(now * 6) * 0.03;
                c.statusSprite.scale.set(s, s, 1);
              }
            } else if (c.stoveState === StoveState.WARNING) {
              // 5–10s after cooked (burnTimer: 5..10s): Warning amber bar + pulsing ⚠️ icon
              const warnElapsed = Math.max(0, c.burnTimer - safeDur);
              ratio = Math.min(1, warnElapsed / warnDur);
              const pulse = Math.floor(Date.now() / 240) % 2 === 0;
              c.progressFillMat.color.setHex(pulse ? 0xf59e0b : 0xfacc15);
              if (c.statusSprite) {
                c.statusSprite.visible = true;
                c.statusSprite.material = this.statusMaterials['WARNING'];
                const s = 0.38 + Math.sin(now * 12) * 0.05;
                c.statusSprite.scale.set(s, s, 1);
              }
            } else if (c.stoveState === StoveState.DANGER || c.stoveState === StoveState.BURNING) {
              // 10–13s after cooked (burnTimer: 10..13s): Urgent flashing red bar + rapid flashing 🔥 icon
              const dangerElapsed = Math.max(0, c.burnTimer - (safeDur + warnDur));
              ratio = Math.min(1, dangerElapsed / Math.max(1, dangerDur));
              const blink = Math.floor(Date.now() / 110) % 2 === 0;
              c.progressFillMat.color.setHex(blink ? 0xef4444 : 0xf97316);
              if (c.statusSprite) {
                c.statusSprite.visible = true;
                c.statusSprite.material = this.statusMaterials['DANGER'];
                const s = 0.42 + Math.sin(now * 22) * 0.07;
                c.statusSprite.scale.set(s, s, 1);
              }
            }
            const clamped = Math.max(0.04, Math.min(1, ratio));
            c.progressFillMesh.scale.x = clamped;
            c.progressFillMesh.position.x = -0.34 * (1 - clamped);
          } else {
            c.progressGroup.visible = false;
            if (c.statusSprite) c.statusSprite.visible = false;
          }
        } else {
          c.progressGroup.visible = false;
          if (c.statusSprite) c.statusSprite.visible = false;
        }
      }
    });
  }

  private createFireMesh3D(): THREE.Group {
    const fireGroup = new THREE.Group();
    fireGroup.position.set(0, 0.88, 0);
    fireGroup.visible = false;

    const outerFlameMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    const midFlameMat = new THREE.MeshBasicMaterial({ color: 0xf97316 });
    const innerCoreMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });

    // Central main flame cone
    const mainCone = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.72, 10), outerFlameMat);
    mainCone.position.y = 0.34;
    fireGroup.add(mainCone);

    // 4 surrounding dancing flame tongues
    const offsets = [
      { x: -0.15, z: 0.12, h: 0.55, r: 0.18, tiltX: 0.15, tiltZ: 0.2 },
      { x: 0.16, z: -0.10, h: 0.58, r: 0.19, tiltX: -0.15, tiltZ: -0.2 },
      { x: -0.12, z: -0.15, h: 0.50, r: 0.17, tiltX: -0.2, tiltZ: 0.15 },
      { x: 0.14, z: 0.14, h: 0.52, r: 0.17, tiltX: 0.18, tiltZ: -0.18 }
    ];
    offsets.forEach((o) => {
      const tongue = new THREE.Mesh(new THREE.ConeGeometry(o.r, o.h, 8), midFlameMat);
      tongue.position.set(o.x, o.h * 0.45, o.z);
      tongue.rotation.set(o.tiltX, 0, o.tiltZ);
      fireGroup.add(tongue);
    });

    // Bright yellow inner core
    const coreCone = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.46, 8), innerCoreMat);
    coreCone.position.set(0, 0.24, 0.04);
    fireGroup.add(coreCone);

    // Warm orange firelight (enabled on Desktop High & Mobile Medium)
    if (QualityManager3D.getProfile().enableFirePointLight) {
      const fireLight = new THREE.PointLight(0xf97316, 1.8, 3.2);
      fireLight.position.set(0, 0.55, 0);
      fireGroup.add(fireLight);
    }

    return fireGroup;
  }

  private createProgressBar3D(): {
    progressGroup: THREE.Group;
    progressFillMesh: THREE.Mesh;
    progressFillMat: THREE.MeshBasicMaterial;
    statusSprite: THREE.Sprite;
  } {
    const progressGroup = new THREE.Group();
    progressGroup.position.set(0, 1.45, 0);
    // Tilt slightly toward the Overcooked top-down oblique camera
    progressGroup.rotation.x = -0.85;
    progressGroup.visible = false;

    const bgMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(0.74, 0.13),
      new THREE.MeshBasicMaterial({ color: 0x0f172a, depthTest: false })
    );
    bgMesh.renderOrder = 10;
    progressGroup.add(bgMesh);

    const progressFillMat = new THREE.MeshBasicMaterial({ color: 0x22c55e, depthTest: false });
    const progressFillMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(0.68, 0.08),
      progressFillMat
    );
    progressFillMesh.position.z = 0.002;
    progressFillMesh.renderOrder = 11;
    progressGroup.add(progressFillMesh);

    // Floating Status Badge Sprite above progress bar (✅ / ⚠️ / 🔥)
    const statusSprite = new THREE.Sprite(this.statusMaterials['COOKED']);
    statusSprite.position.set(0, 0.25, 0.02);
    statusSprite.scale.set(0.36, 0.36, 1);
    statusSprite.renderOrder = 12;
    statusSprite.visible = false;
    progressGroup.add(statusSprite);

    return { progressGroup, progressFillMesh, progressFillMat, statusSprite };
  }

  private decorateCounter(
    group: THREE.Group,
    type: CounterType,
    id: string = '',
    x: number = 0,
    z: number = 0
  ): {
    crateDisplayGroup?: THREE.Group;
    boardKnifeGroup?: THREE.Group;
    heatRingMat?: THREE.MeshStandardMaterial;
    progressGroup?: THREE.Group;
    progressFillMesh?: THREE.Mesh;
    progressFillMat?: THREE.MeshBasicMaterial;
    statusSprite?: THREE.Sprite;
    trashLidGroup?: THREE.Group;
    sinkBubblesGroup?: THREE.Group;
    deliveryArrowMesh?: THREE.Mesh;
  } {
    // Dedicated Fire Extinguisher Station on top-right counter (3, -3) — Clean wooden table like Image 1 Row 2 Col 1
    if (id === 'counter_3_-3') {
      return {};
    }

    // Top-left corner (-4, -3): Cartoon Commercial Refrigerator
    if (id === 'counter_-4_-3') {
      const fridgeGroup = new THREE.Group();
      const fallbackFridge = new THREE.Group();
      const fridgeMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.25, metalness: 0.45 });
      const handleMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.2, metalness: 0.8 });

      const fridgeBody = new THREE.Mesh(new THREE.BoxGeometry(0.92, 1.35, 0.88), fridgeMat);
      fridgeBody.position.y = 1.48;
      fridgeBody.castShadow = true;
      fallbackFridge.add(fridgeBody);

      const handleTop = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.35, 0.06), handleMat);
      handleTop.position.set(0.32, 1.80, 0.46);
      fallbackFridge.add(handleTop);

      const handleBot = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.42, 0.06), handleMat);
      handleBot.position.set(0.32, 1.25, 0.46);
      fallbackFridge.add(handleBot);

      ExternalModelLoader.attachModel(
        fridgeGroup,
        ExternalModelLoader.PATHS.FRIDGE,
        { targetWidth: 0.90, offsetY: 0.84 },
        fallbackFridge
      );

      group.add(fridgeGroup);
      return {};
    }

    // Back-wall counter (1, -3): Overcooked-Style Kitchen Sink (Matches Reference Image 1 Row 1 Left!)
    // - Left rounded cyan-blue water basin
    // - Center-back curved silver gooseneck faucet
    // - Right ribbed drainboard with 4 parallel drainage ridges
    if (id === 'counter_1_-3') {
      const basinWallMat = new THREE.MeshStandardMaterial({ color: 0x574c43, roughness: 0.35, metalness: 0.6 });
      const waterMat = new THREE.MeshStandardMaterial({
        color: 0x29abe2,
        emissive: 0x0284c7,
        emissiveIntensity: 0.24,
        roughness: 0.12
      });
      const chromeMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.18, metalness: 0.88 });
      const ridgeMat = new THREE.MeshStandardMaterial({ color: 0x6e5f53, roughness: 0.3, metalness: 0.55 });
      const foamMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: 0xe0f2fe,
        emissiveIntensity: 0.2,
        roughness: 0.25,
        transparent: true,
        opacity: 0.85
      });

      // Left recessed basin rim + cyan-blue water pool
      const basinRim = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.025, 0.62), basinWallMat);
      basinRim.position.set(-0.20, 0.842, 0.04);
      group.add(basinRim);

      const water = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.03, 0.54), waterMat);
      water.position.set(-0.20, 0.846, 0.04);
      group.add(water);

      // Right ribbed drainboard with 4 parallel horizontal grooves (Matches Image 1 Row 1 Left!)
      const drainFrame = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.018, 0.62), ridgeMat);
      drainFrame.position.set(0.22, 0.842, 0.04);
      group.add(drainFrame);

      for (let r = -1.5; r <= 1.5; r += 1) {
        const grooveBar = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.026, 0.04), basinWallMat);
        grooveBar.position.set(0.22, 0.848, 0.04 + r * 0.12);
        group.add(grooveBar);
      }

      // Curved Silver Gooseneck Faucet in center-back
      const faucetBase = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.04, 0.08), chromeMat);
      faucetBase.position.set(0.0, 0.86, -0.32);
      group.add(faucetBase);

      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.036, 0.26, 12), chromeMat);
      stem.position.set(0.0, 0.98, -0.32);
      group.add(stem);

      const spout = new THREE.Mesh(new THREE.TorusGeometry(0.10, 0.026, 10, 16, Math.PI), chromeMat);
      spout.rotation.y = Math.PI / 2;
      spout.position.set(0.0, 1.10, -0.22);
      group.add(spout);

      // Animated rising soap bubbles group
      const sinkBubblesGroup = new THREE.Group();
      sinkBubblesGroup.position.set(-0.20, 0.87, 0.04);
      const bubbleCoords = [
        [-0.08, 0.02, -0.08, 0.042],
        [0.06, 0.04, -0.04, 0.036],
        [-0.02, 0.06, 0.07, 0.045]
      ];
      bubbleCoords.forEach(([bx, by, bz, br]) => {
        const bMesh = new THREE.Mesh(new THREE.SphereGeometry(br, 10, 10), foamMat);
        bMesh.position.set(bx, by, bz);
        sinkBubblesGroup.add(bMesh);
      });
      group.add(sinkBubblesGroup);

      return { sinkBubblesGroup };
    }

    // 1. CUTTING BOARD (Matches Reference Image 1 Row 3 Center: White Rounded Board with 2 Handle Slots + Diagonal Chef Knife)
    if (type === CounterType.CUTTING_BOARD) {
      const boardGeo = new THREE.BoxGeometry(0.76, 0.032, 0.58);
      const boardMat = new THREE.MeshStandardMaterial({
        map: TextureGenerator3D.getButcherBlockTexture(),
        roughness: 0.38,
        metalness: 0.05
      });
      const boardMesh = new THREE.Mesh(boardGeo, boardMat);
      boardMesh.position.set(0, 0.856, 0.0);
      boardMesh.castShadow = true;
      boardMesh.receiveShadow = true;
      group.add(boardMesh);

      // Large White-Bladed Chef Knife with Brown Handle angled across the board (Matches Image 1 Row 3 Center!)
      const knifeGroup = new THREE.Group();
      knifeGroup.position.set(0.08, 0.882, 0.04);
      knifeGroup.rotation.y = -Math.PI / 2.8;

      const fallbackKnife = new THREE.Group();
      // Wide tapered white/silver chef blade
      const bladeShape = new THREE.Shape();
      bladeShape.moveTo(-0.22, -0.04);
      bladeShape.lineTo(0.10, -0.055);
      bladeShape.lineTo(0.10, 0.045);
      bladeShape.quadraticCurveTo(-0.08, 0.045, -0.22, -0.04);
      const bladeGeo = new THREE.ExtrudeGeometry(bladeShape, { depth: 0.012, bevelEnabled: false });
      const bladeMesh = new THREE.Mesh(
        bladeGeo,
        new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.18, metalness: 0.65 })
      );
      bladeMesh.rotation.x = Math.PI / 2;
      bladeMesh.position.y = 0.008;
      bladeMesh.castShadow = true;
      fallbackKnife.add(bladeMesh);

      // Warm brown wooden handle with 2 silver rivets
      const handle = new THREE.Mesh(
        new THREE.BoxGeometry(0.18, 0.028, 0.042),
        new THREE.MeshStandardMaterial({ color: 0x7c4a27, roughness: 0.55 })
      );
      handle.position.set(0.19, 0.008, -0.005);
      handle.castShadow = true;
      fallbackKnife.add(handle);

      knifeGroup.add(fallbackKnife);
      group.add(knifeGroup);

      const prog = this.createProgressBar3D();
      group.add(prog.progressGroup);
      return { ...prog, boardKnifeGroup: knifeGroup };
    }
    // 2. STOVE & FRYING PAN (Matches Reference Image 1 Row 2/3 Right: Bright Red Stove, Black Spider Burner Ring, Lower Front Grey Strip + Red Button + Black Knob, Dark Pan with Red Center Dot & Wood Handle)
    else if (type === CounterType.STOVE) {
      const blackIronMat = new THREE.MeshStandardMaterial({ color: 0x1e2024, roughness: 0.55, metalness: 0.65 });

      // Outer Circular Black Burner Ring on Red Stove Top
      const outerBurnerRing = new THREE.Mesh(
        new THREE.TorusGeometry(0.33, 0.026, 10, 32),
        blackIronMat
      );
      outerBurnerRing.rotation.x = Math.PI / 2;
      outerBurnerRing.position.y = 0.852;
      group.add(outerBurnerRing);

      // Central Black Burner Disc
      const centerBurnerDisc = new THREE.Mesh(
        new THREE.CylinderGeometry(0.19, 0.19, 0.022, 24),
        blackIronMat
      );
      centerBurnerDisc.position.y = 0.850;
      group.add(centerBurnerDisc);

      // 4 Radial Black Grate Prongs (Diagonal X-pattern like Reference Image 1!)
      [Math.PI / 4, -Math.PI / 4].forEach((rotY) => {
        const prong = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.028, 0.042), blackIronMat);
        prong.position.y = 0.856;
        prong.rotation.y = rotY;
        group.add(prong);
      });

      // Lower Front Recessed Grey Control Panel Strip + Left Red Switch + Right Chunky Black Dial Knob (Matches Image 1!)
      const controlStrip = new THREE.Mesh(
        new THREE.BoxGeometry(0.78, 0.16, 0.025),
        new THREE.MeshStandardMaterial({ color: 0x7c858e, roughness: 0.4, metalness: 0.5 })
      );
      controlStrip.position.set(0, 0.14, 0.475);
      group.add(controlStrip);

      // Small red indicator button on left of control strip
      const redSwitch = new THREE.Mesh(
        new THREE.CylinderGeometry(0.032, 0.032, 0.03, 14),
        new THREE.MeshStandardMaterial({ color: 0xd62828, emissive: 0x991b1b, emissiveIntensity: 0.3, roughness: 0.3 })
      );
      redSwitch.rotation.x = Math.PI / 2;
      redSwitch.position.set(-0.20, 0.13, 0.492);
      group.add(redSwitch);

      // Large chunky black rotary knob on right of control strip
      const blackKnob = new THREE.Mesh(
        new THREE.CylinderGeometry(0.068, 0.078, 0.06, 18),
        new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.35, metalness: 0.4 })
      );
      blackKnob.rotation.x = Math.PI / 2;
      blackKnob.position.set(0.20, 0.13, 0.505);
      group.add(blackKnob);

      // Cast-Iron Frying Pan sitting on burner with Glowing Red Center Heat Spot & Wooden Handle (Matches Image 1 Row 3 Right!)
      const panGroup = new THREE.Group();
      panGroup.position.set(0, 0.862, 0);

      const panMat = new THREE.MeshStandardMaterial({ color: 0x26292e, roughness: 0.42, metalness: 0.72 });
      const panBase = new THREE.Mesh(new THREE.CylinderGeometry(0.29, 0.25, 0.065, 24), panMat);
      panBase.position.y = 0.032;
      panBase.castShadow = true;
      panGroup.add(panBase);

      // Inner dark pan floor
      const panInner = new THREE.Mesh(
        new THREE.CylinderGeometry(0.25, 0.23, 0.01, 24),
        new THREE.MeshStandardMaterial({ color: 0x181a1d, roughness: 0.5, metalness: 0.6 })
      );
      panInner.position.y = 0.062;
      panGroup.add(panInner);

      // Red Center Heat Spot inside the pan (Matches Image 1 Row 3 Right!)
      const heatRingMat = new THREE.MeshStandardMaterial({
        color: 0xd62828,
        emissive: 0xb91c1c,
        emissiveIntensity: 0.65,
        roughness: 0.35
      });
      const centerHeatSpot = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.012, 18), heatRingMat);
      centerHeatSpot.position.y = 0.064;
      panGroup.add(centerHeatSpot);

      // Angled Warm Brown Wooden Pan Handle sticking out to front-right (Matches Image 1 Row 3 Right!)
      const handleGroup = new THREE.Group();
      handleGroup.rotation.y = -Math.PI / 3;
      const woodHandle = new THREE.Mesh(
        new THREE.CylinderGeometry(0.026, 0.034, 0.34, 12),
        new THREE.MeshStandardMaterial({ color: 0x7c4a27, roughness: 0.55 })
      );
      woodHandle.rotation.z = Math.PI / 2;
      woodHandle.position.set(0.41, 0.065, 0);
      woodHandle.castShadow = true;
      handleGroup.add(woodHandle);
      panGroup.add(handleGroup);

      group.add(panGroup);

      const prog = this.createProgressBar3D();
      group.add(prog.progressGroup);
      return { ...prog, heatRingMat };
    }
    // 3. DELIVERY WINDOW COUNTER (Matches Reference Image 1 Row 1 Right: Silver Tray with Black Triangles + Overhead Dark Metal Frame with Red Domed Cloche!)
    else if (type === CounterType.DELIVERY) {
      // Recessed Brushed Stainless Tray
      const trayMat = new THREE.MeshStandardMaterial({
        color: 0xe2e8f0,
        roughness: 0.22,
        metalness: 0.78
      });
      const matMesh = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.025, 0.88), trayMat);
      matMesh.position.y = 0.848;
      group.add(matMesh);

      // Black Directional Triangle Arrow on Silver Tray pointing North (Matches Image 1 Row 1 Right!)
      const triShape = new THREE.Shape();
      triShape.moveTo(0, 0.16);
      triShape.lineTo(-0.18, -0.10);
      triShape.lineTo(0.18, -0.10);
      triShape.closePath();
      const triGeo = new THREE.ExtrudeGeometry(triShape, { depth: 0.008, bevelEnabled: false });
      const triMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.5 });
      const arrow = new THREE.Mesh(triGeo, triMat);
      arrow.rotation.x = -Math.PI / 2;
      arrow.position.set(0, 0.862, 0.08);
      group.add(arrow);

      // Overhead Dark Metal Pass-Through Gantry Frame & Red Domed Heat Cloche (Matches Image 1 Row 1 Right!)
      const frameMat = new THREE.MeshStandardMaterial({ color: 0x3b4048, roughness: 0.45, metalness: 0.65 });
      [-0.44, 0.44].forEach((px) => {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.56, 0.06), frameMat);
        post.position.set(px, 1.12, -0.18);
        post.castShadow = true;
        group.add(post);
      });

      const topBeamFront = new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.06, 0.06), frameMat);
      topBeamFront.position.set(0, 1.38, -0.02);
      group.add(topBeamFront);

      const topBeamBack = new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.06, 0.06), frameMat);
      topBeamBack.position.set(0, 1.38, -0.34);
      group.add(topBeamBack);

      [-0.44, 0.44].forEach((px) => {
        const sideCross = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.38), frameMat);
        sideCross.position.set(px, 1.38, -0.18);
        group.add(sideCross);
      });

      // Glossy Red Domed Service Cloche hanging in the upper rack (Matches Image 1 Row 1 Right!)
      const clocheMat = new THREE.MeshStandardMaterial({ color: 0x9e241b, roughness: 0.25, metalness: 0.35 });
      const clocheDome = new THREE.Mesh(
        new THREE.SphereGeometry(0.24, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.55),
        clocheMat
      );
      clocheDome.position.set(0, 1.32, -0.18);
      clocheDome.castShadow = true;
      group.add(clocheDome);

      const clocheRim = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.022, 10, 24), clocheMat);
      clocheRim.rotation.x = Math.PI / 2;
      clocheRim.position.set(0, 1.32, -0.18);
      group.add(clocheRim);

      const clocheKnob = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.04, 0.04, 14), clocheMat);
      clocheKnob.position.set(0, 1.56, -0.18);
      group.add(clocheKnob);

      return { deliveryArrowMesh: arrow };
    }
    // 4. SQUARE GREEN & BRUSHED-SILVER FUNNEL TRASH BIN (Matches Reference Image 1 Row 2 Col 2!)
    else if (type === CounterType.TRASH) {
      // Dark Forest-Green Square Box Base (#284226)
      const greenBaseMat = new THREE.MeshStandardMaterial({ color: 0x284226, roughness: 0.52, metalness: 0.12 });
      const baseBox = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.68, 0.92), greenBaseMat);
      baseBox.position.y = 0.34;
      baseBox.castShadow = true;
      baseBox.receiveShadow = true;
      group.add(baseBox);

      // Beveled Brushed-Silver Square Funnel Rim on Top (#d1d5db)
      const silverRimMat = new THREE.MeshStandardMaterial({ color: 0xd1d5db, roughness: 0.25, metalness: 0.72 });
      const trashLidGroup = new THREE.Group();
      trashLidGroup.position.set(0, 0.72, 0);

      const borderW = 0.14;
      const rimH = 0.12;
      const frontRim = new THREE.Mesh(new THREE.BoxGeometry(0.80, rimH, borderW), silverRimMat);
      frontRim.position.set(0, 0, 0.33);
      frontRim.castShadow = true;
      trashLidGroup.add(frontRim);

      const backRim = new THREE.Mesh(new THREE.BoxGeometry(0.80, rimH, borderW), silverRimMat);
      backRim.position.set(0, 0, -0.33);
      backRim.castShadow = true;
      trashLidGroup.add(backRim);

      const leftRim = new THREE.Mesh(new THREE.BoxGeometry(borderW, rimH, 0.52), silverRimMat);
      leftRim.position.set(-0.33, 0, 0);
      leftRim.castShadow = true;
      trashLidGroup.add(leftRim);

      const rightRim = new THREE.Mesh(new THREE.BoxGeometry(borderW, rimH, 0.52), silverRimMat);
      rightRim.position.set(0.33, 0, 0);
      rightRim.castShadow = true;
      trashLidGroup.add(rightRim);

      group.add(trashLidGroup);

      // Deep Pitch-Black Square Trash Opening in Center
      const holeMesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.54, 0.04, 0.54),
        new THREE.MeshStandardMaterial({ color: 0x090d16, roughness: 0.95 })
      );
      holeMesh.position.y = 0.69;
      group.add(holeMesh);

      return { trashLidGroup };
    }
    // 5. OVERCOOKED-STYLE PLATE COUNTER & INGREDIENT STORAGE CRATES (Matches Reference Image 1 Row 2 Center & Row 3 Left!)
    else if (type.startsWith('crate_')) {
      const woodBodyMat = new THREE.MeshStandardMaterial({ color: 0x63391c, roughness: 0.55, metalness: 0.05 });
      const woodFrameMat = new THREE.MeshStandardMaterial({ color: 0x7c4a27, roughness: 0.5, metalness: 0.06 });
      const darkSeamMat = new THREE.MeshStandardMaterial({ color: 0x3b1f0c, roughness: 0.7 });
      const chromeHandleMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.2, metalness: 0.85 });

      // 1. Sturdy Warm-Brown Wooden Crate Box Body (y = 0.0 to 0.82)
      const binShell = new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.82, 0.96), woodBodyMat);
      binShell.position.y = 0.41;
      binShell.castShadow = true;
      binShell.receiveShadow = true;
      group.add(binShell);

      // Horizontal Wooden Crate Seam & Front Drawer Handle (Matches Image 1 Row 2 Center & Row 3 Left!)
      const frontSeam = new THREE.Mesh(new THREE.BoxGeometry(0.98, 0.022, 0.98), darkSeamMat);
      frontSeam.position.y = 0.24;
      group.add(frontSeam);

      // PLATE STATION (Matches Reference Image 1 Row 3 Col 1: Brown Drawer Counter with Large White Ceramic Plate on Top!)
      if (type === CounterType.CRATE_PLATE) {
        const flatWoodTop = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.04, 1.0), woodFrameMat);
        flatWoodTop.position.y = 0.825;
        flatWoodTop.receiveShadow = true;
        group.add(flatWoodTop);

        // Front silver drawer handle
        const uHandle = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.026, 0.045), chromeHandleMat);
        uHandle.position.set(0, 0.14, 0.49);
        group.add(uHandle);

        // Large Clean White Ceramic Plate with Recessed Inner Rim on Top (Matches Image 1 Row 3 Col 1!)
        const crateDisplayGroup = new THREE.Group();
        crateDisplayGroup.position.set(0, 0.846, 0);

        const outerRim = new THREE.Mesh(
          new THREE.CylinderGeometry(0.36, 0.32, 0.024, 28),
          new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.18, metalness: 0.1 })
        );
        outerRim.castShadow = true;
        outerRim.receiveShadow = true;
        crateDisplayGroup.add(outerRim);

        const innerWell = new THREE.Mesh(
          new THREE.CylinderGeometry(0.25, 0.24, 0.026, 28),
          new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.15 })
        );
        innerWell.position.y = 0.002;
        crateDisplayGroup.add(innerWell);

        group.add(crateDisplayGroup);
        return { crateDisplayGroup };
      }

      // INGREDIENT STORAGE CRATE (Matches Reference Image 1 Row 2 Center:
      // Warm Wooden Picture-Frame Top Border + Recessed Dark Panel + White Circle Medallion with Bold 2D Cartoon Ingredient Illustration!)
      const frameH = 0.026;
      const frameW = 0.085;
      const frameFront = new THREE.Mesh(new THREE.BoxGeometry(1.0, frameH, frameW), woodFrameMat);
      frameFront.position.set(0, 0.835, 0.457);
      frameFront.receiveShadow = true;
      group.add(frameFront);

      const frameBack = new THREE.Mesh(new THREE.BoxGeometry(1.0, frameH, frameW), woodFrameMat);
      frameBack.position.set(0, 0.835, -0.457);
      frameBack.receiveShadow = true;
      group.add(frameBack);

      const frameLeft = new THREE.Mesh(new THREE.BoxGeometry(frameW, frameH, 0.83), woodFrameMat);
      frameLeft.position.set(-0.457, 0.835, 0);
      frameLeft.receiveShadow = true;
      group.add(frameLeft);

      const frameRight = new THREE.Mesh(new THREE.BoxGeometry(frameW, frameH, 0.83), woodFrameMat);
      frameRight.position.set(0.457, 0.835, 0);
      frameRight.receiveShadow = true;
      group.add(frameRight);

      // Top Surface Decal with Recessed Dark Wood + White Circular Plate + Bold 2D Cartoon Ingredient Artwork!
      // Purely decorative (raycast disabled) so up to 6 items can be placed cleanly on top!
      const decalGeo = new THREE.PlaneGeometry(0.84, 0.84);
      const decalMat = new THREE.MeshStandardMaterial({
        map: TextureGenerator3D.getIngredientBinTopDecalTexture(type),
        roughness: 0.35,
        metalness: 0.04,
        polygonOffset: true,
        polygonOffsetFactor: -1
      });
      const decalMesh = new THREE.Mesh(decalGeo, decalMat);
      decalMesh.rotation.x = -Math.PI / 2;
      decalMesh.position.set(0, 0.842, 0);
      decalMesh.receiveShadow = true;
      decalMesh.raycast = () => {};
      group.add(decalMesh);

      return {};
    }

    return {};
  }

  private createCrateSignBadge(group: THREE.Group, emoji: string, color: number) {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;

    // Circle badge background
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(64, 64, 58, 0, Math.PI * 2);
    ctx.fill();

    // Colored border
    ctx.lineWidth = 10;
    ctx.strokeStyle = `#${color.toString(16).padStart(6, '0')}`;
    ctx.stroke();

    // Emoji icon
    ctx.font = '64px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(emoji, 64, 70);

    const texture = new THREE.CanvasTexture(canvas);
    const badgeMat = new THREE.MeshBasicMaterial({ map: texture, transparent: true });
    const badge = new THREE.Mesh(new THREE.PlaneGeometry(0.40, 0.40), badgeMat);
    // Position on front face of counter (Z = +0.475)
    badge.position.set(0, 0.56, 0.485);
    group.add(badge);
  }

  private createFloatingStationLabel(
    group: THREE.Group,
    emoji: string,
    title: string,
    color: number,
    offsetX: number = 0,
    offsetZ: number = -0.35
  ) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 80;
    const ctx = canvas.getContext('2d')!;

    const hexColor = `#${color.toString(16).padStart(6, '0')}`;

    // Rounded pill sign background
    ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
    if (ctx.roundRect) {
      ctx.beginPath();
      ctx.roundRect(6, 6, 244, 68, 22);
      ctx.fill();
    } else {
      ctx.fillRect(6, 6, 244, 68);
    }

    // Vibrant station-color border
    ctx.lineWidth = 6;
    ctx.strokeStyle = hexColor;
    ctx.stroke();

    // Emoji + bold station name
    ctx.font = '900 30px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`${emoji} ${title}`, 128, 42);

    const texture = new THREE.CanvasTexture(canvas);
    const spriteMat = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false
    });
    const labelSprite = new THREE.Sprite(spriteMat);
    labelSprite.position.set(offsetX, 1.32, offsetZ);
    labelSprite.scale.set(0.95, 0.30, 1);
    labelSprite.renderOrder = 5;
    group.add(labelSprite);
  }
}
