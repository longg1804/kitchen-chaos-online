import * as THREE from 'three';
import { CounterType, IngredientType, KitchenItem, StoveState } from '../../game/types';
import { CookingConfig } from '../../game/config/CookingConfig';
import { MaterialFactory } from './MaterialFactory';
import { Physics3D } from '../core/Physics3D';
import { TextureGenerator3D } from './TextureGenerator3D';
import { Ingredient3DFactory } from '../entities/Ingredient3D';
import { ExternalModelLoader } from '../assets/ExternalModelLoader';

export interface Counter3DData {
  id: string;
  type: CounterType;
  x: number;
  z: number;
  group: THREE.Group;
  itemHolder: THREE.Group;
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

      const light = new THREE.PointLight(spot.color, spot.intensity, 6.5, 1.5);
      light.position.set(0, -0.25, 0);
      lampGroup.add(light);

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

    // Standard Overcooked Kitchen Layout in 3D Space
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

  public createCounter(id: string, type: CounterType, x: number, z: number): Counter3DData {
    const group = new THREE.Group();
    group.position.set(x, 0, z);

    // 1. Base Counter Cabinet Body (Customized per station type so stations aren't identical grey boxes!)
    const isStove = type === CounterType.STOVE;
    const isCutting = type === CounterType.CUTTING_BOARD;
    const isDelivery = type === CounterType.DELIVERY;
    const isTrash = type === CounterType.TRASH;

    if (!isTrash) {
      const bodyColor = isStove
        ? 0x334155 // Brushed dark steel range body
        : isCutting
        ? 0x1e3a5f // Deep chef-blue prep cabinet
        : isDelivery
        ? 0x064e3b // Rich emerald service base
        : 0x1e293b; // Classic navy-slate Shaker cabinet

      const bodyMat = new THREE.MeshStandardMaterial({
        color: bodyColor,
        roughness: isStove ? 0.32 : 0.45,
        metalness: isStove ? 0.55 : 0.12
      });
      const bodyGeo = new THREE.BoxGeometry(0.94, 0.76, 0.94);
      const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
      bodyMesh.position.y = 0.38;
      bodyMesh.castShadow = true;
      bodyMesh.receiveShadow = true;
      group.add(bodyMesh);

      // Front Cabinet Door Panel & 3D Brushed Metal Handle Bar (on non-crate, non-stove counters)
      if (!type.startsWith('crate_') && !isStove) {
        const cabinetMat = new THREE.MeshStandardMaterial({
          map: TextureGenerator3D.getCabinetFrontTexture(),
          roughness: 0.35,
          metalness: 0.2
        });
        const frontPanel = new THREE.Mesh(new THREE.PlaneGeometry(0.86, 0.68), cabinetMat);
        frontPanel.position.set(0, 0.38, 0.472);
        group.add(frontPanel);

        // 3D Chrome Handle Bar on front door
        const handleBar = new THREE.Mesh(
          new THREE.CylinderGeometry(0.014, 0.014, 0.26, 10),
          new THREE.MeshStandardMaterial({ color: 0xf8fafc, metalness: 0.85, roughness: 0.15 })
        );
        handleBar.rotation.z = Math.PI / 2;
        handleBar.position.set(0, 0.62, 0.49);
        group.add(handleBar);
      }

      // 2. Beveled Countertop Slab with warm wood/steel edge trim
      const topColor = isStove
        ? 0x94a3b8
        : isCutting
        ? 0xfef3c7
        : 0xf8fafc;
      const topMat = new THREE.MeshStandardMaterial({
        color: topColor,
        roughness: 0.24,
        metalness: isStove ? 0.65 : 0.35
      });
      const topGeo = new THREE.BoxGeometry(1.0, 0.08, 1.0);
      const topMesh = new THREE.Mesh(topGeo, topMat);
      topMesh.position.y = 0.80;
      topMesh.castShadow = true;
      topMesh.receiveShadow = true;
      group.add(topMesh);

      // Warm Brass/Wood Corner Trim Molding on standard counters
      if (type === CounterType.CLEAR) {
        const trimMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.35, metalness: 0.35 });
        const frontTrim = new THREE.Mesh(new THREE.BoxGeometry(1.01, 0.024, 0.025), trimMat);
        frontTrim.position.set(0, 0.80, 0.495);
        group.add(frontTrim);
      }

      // Recessed Dark Plinth Base (Kickplate creating contact shadow)
      const plinthMat = new THREE.MeshStandardMaterial({ color: 0x090d16, roughness: 0.8 });
      const plinth = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.08, 0.86), plinthMat);
      plinth.position.y = 0.04;
      group.add(plinth);
    }

    // Calibrated Snap-to-Slot Item Holder (Item bottom plane rests exactly at surface)
    let slotY = 0.845; // Plain flat countertop
    let slotZ = 0;
    if (type === CounterType.CUTTING_BOARD) {
      slotY = 0.895; // On top of butcher block
      slotZ = 0.02;
    } else if (type === CounterType.STOVE) {
      slotY = 0.905; // Inside cast iron frying pan
    } else if (type === CounterType.DELIVERY) {
      slotY = 0.875; // On top of green delivery conveyor
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
      counterData.currentItem = extItem;
      counterData.itemHolder.add(Ingredient3DFactory.createMesh(extItem));
    }

    this.counters.set(id, counterData);
    return counterData;
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

      const mesh = Ingredient3DFactory.createMesh(item);
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
      // 1. Crate drawer slide/bounce & active chopping vibration
      if (c.bounceTimer && c.bounceTimer > 0) {
        c.bounceTimer = Math.max(0, c.bounceTimer - delta);
        const t = c.bounceTimer / 0.24;
        const pulse = 1 + Math.sin(t * Math.PI) * 0.16;
        if (c.crateDisplayGroup) {
          c.crateDisplayGroup.scale.set(pulse, pulse, pulse);
          c.crateDisplayGroup.position.z = 0.34 + Math.sin(t * Math.PI) * 0.08;
        } else {
          c.itemHolder.scale.set(pulse, pulse, pulse);
        }
      } else if (c.isActivelyChopping && c.currentItem) {
        // Subtle rhythmic squash-and-stretch on food while being chopped on board!
        const chopSquash = Math.sin(now * 26) * 0.07;
        c.itemHolder.scale.set(1 + chopSquash, 1 - chopSquash, 1 + chopSquash);
      } else {
        if (c.crateDisplayGroup) {
          c.crateDisplayGroup.scale.set(1, 1, 1);
          c.crateDisplayGroup.position.z = 0.34;
        }
        c.itemHolder.scale.set(1, 1, 1);
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

              // Gradual visual color transition on RAW_MEAT while COOKING (Ruby Red -> Seared Golden-Brown!)
              const rawColor = new THREE.Color(0xef4444);
              const cookedColor = new THREE.Color(0xc26a1b);
              const whiteTint = new THREE.Color(0xffffff);
              const searedTint = new THREE.Color(0xd97706);
              const rawFatColor = new THREE.Color(0xfecaca);
              const cookedFatColor = new THREE.Color(0xfde68a);
              c.itemHolder.traverse((child) => {
                if (child instanceof THREE.Mesh) {
                  if (child.userData.isCookingMeat && child.material instanceof THREE.MeshStandardMaterial) {
                    if (child.userData.hasTextureMap) {
                      child.material.color.lerpColors(whiteTint, searedTint, ratio * 0.85);
                      child.material.emissive.setHex(0x451a03);
                      child.material.emissiveIntensity = ratio * 0.25;
                    } else {
                      child.material.color.lerpColors(rawColor, cookedColor, ratio * 0.85);
                    }
                  } else if (child.userData.isCookingFat && child.material instanceof THREE.MeshStandardMaterial) {
                    child.material.color.lerpColors(rawFatColor, cookedFatColor, ratio * 0.85);
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

    // Warm orange firelight
    const fireLight = new THREE.PointLight(0xf97316, 1.8, 3.2);
    fireLight.position.set(0, 0.55, 0);
    fireGroup.add(fireLight);

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
    // Dedicated Fire Extinguisher Station on top-right counter (3, -3)
    if (id === 'counter_3_-3') {
      const standMat = new THREE.MeshStandardMaterial({
        color: 0xdc2626,
        emissive: 0x991b1b,
        emissiveIntensity: 0.25,
        roughness: 0.35
      });
      const yellowSafetyMat = new THREE.MeshStandardMaterial({
        color: 0xfacc15,
        roughness: 0.35,
        metalness: 0.2
      });

      const outerRing = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.40, 0.018, 24), yellowSafetyMat);
      outerRing.position.y = 0.848;
      group.add(outerRing);

      const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.34, 0.026, 20), standMat);
      pad.position.y = 0.854;
      group.add(pad);

      // Wall-mounted red safety backboard & clamp rack
      const backRack = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.56, 0.05), standMat);
      backRack.position.set(0, 1.16, -0.44);
      group.add(backRack);

      const rackStripe = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.09, 0.056), yellowSafetyMat);
      rackStripe.position.set(0, 1.38, -0.44);
      group.add(rackStripe);

      this.createCrateSignBadge(group, '🧯', 0xdc2626);
      this.createFloatingStationLabel(group, '🧯', 'CỨU HỎA', 0xef4444);
      return {};
    }

    // Decorative Cartoon Kitchen Appliances on non-interactive back-wall corner counters:
    // Top-left corner (-4, -3): Cartoon Commercial Refrigerator (CC0 kitchenFridge.glb)
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

    // Back-wall counter (1, -3): Cartoon Kitchen Sink with Gooseneck Faucet, Drying Rack & Animated Soap Bubbles
    if (id === 'counter_1_-3') {
      const basinMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.2, metalness: 0.75 });
      const waterMat = new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x0284c7,
        emissiveIntensity: 0.28,
        roughness: 0.12
      });
      const chromeMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.15, metalness: 0.9 });
      const foamMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: 0xe0f2fe,
        emissiveIntensity: 0.22,
        roughness: 0.25,
        transparent: true,
        opacity: 0.88
      });

      const basin = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.045, 0.66), basinMat);
      basin.position.set(0, 0.845, 0.04);
      group.add(basin);

      const water = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.05, 0.56), waterMat);
      water.position.set(-0.14, 0.85, 0.04);
      group.add(water);

      // Slanted stainless drying rack on right side with clean dishes
      const rackBoard = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.03, 0.54), chromeMat);
      rackBoard.position.set(0.24, 0.86, 0.04);
      rackBoard.rotation.z = 0.08;
      group.add(rackBoard);

      for (let r = -1; r <= 1; r++) {
        const dryPlate = new THREE.Mesh(
          new THREE.CylinderGeometry(0.11, 0.09, 0.02, 16),
          new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.15 })
        );
        dryPlate.rotation.x = Math.PI / 2 - 0.25;
        dryPlate.position.set(0.24, 0.93, 0.04 + r * 0.13);
        group.add(dryPlate);
      }

      // Gooseneck Faucet + Hot/Cold Knobs
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.042, 0.30, 12), chromeMat);
      stem.position.set(-0.12, 0.99, -0.32);
      group.add(stem);

      const spout = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.028, 10, 16, Math.PI), chromeMat);
      spout.rotation.y = Math.PI / 2;
      spout.position.set(-0.12, 1.12, -0.21);
      group.add(spout);

      const hotKnob = new THREE.Mesh(
        new THREE.CylinderGeometry(0.028, 0.028, 0.03, 10),
        new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.3 })
      );
      hotKnob.position.set(-0.26, 0.88, -0.32);
      group.add(hotKnob);

      const coldKnob = new THREE.Mesh(
        new THREE.CylinderGeometry(0.028, 0.028, 0.03, 10),
        new THREE.MeshStandardMaterial({ color: 0x3b82f6, roughness: 0.3 })
      );
      coldKnob.position.set(0.02, 0.88, -0.32);
      group.add(coldKnob);

      // Animated rising soap bubbles group
      const sinkBubblesGroup = new THREE.Group();
      sinkBubblesGroup.position.set(-0.14, 0.88, 0.04);
      const bubbleCoords = [
        [-0.12, 0.02, -0.10, 0.048],
        [0.08, 0.05, -0.06, 0.040],
        [-0.04, 0.08, 0.09, 0.052],
        [0.11, 0.03, 0.12, 0.036],
        [-0.14, 0.06, 0.08, 0.042]
      ];
      bubbleCoords.forEach(([bx, by, bz, br]) => {
        const bMesh = new THREE.Mesh(new THREE.SphereGeometry(br, 10, 10), foamMat);
        bMesh.position.set(bx, by, bz);
        sinkBubblesGroup.add(bMesh);
      });
      group.add(sinkBubblesGroup);

      return { sinkBubblesGroup };
    }

    // 1. CUTTING BOARD (CC0 cutting-board.glb & cooking-knife-chopping.glb + Side Towel Rail)
    if (type === CounterType.CUTTING_BOARD) {
      const boardContainer = new THREE.Group();
      const boardGeo = new THREE.BoxGeometry(0.74, 0.05, 0.58);
      const boardMat = new THREE.MeshStandardMaterial({
        map: TextureGenerator3D.getButcherBlockTexture(),
        roughness: 0.5,
        metalness: 0.05
      });
      const fallbackBoard = new THREE.Mesh(boardGeo, boardMat);
      fallbackBoard.position.set(0, 0.865, 0.02);
      fallbackBoard.castShadow = true;

      ExternalModelLoader.attachModel(
        boardContainer,
        ExternalModelLoader.PATHS.CUTTING_BOARD,
        { targetWidth: 0.74, offsetY: 0.842, offsetZ: 0.02 },
        fallbackBoard
      );
      group.add(boardContainer);

      // Chrome Towel Bar & Checkered Chef Towel on front apron
      const railMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.2, metalness: 0.85 });
      const towelBar = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.44, 10), railMat);
      towelBar.rotation.z = Math.PI / 2;
      towelBar.position.set(0, 0.72, 0.51);
      group.add(towelBar);

      const towelCloth = new THREE.Mesh(
        new THREE.BoxGeometry(0.24, 0.22, 0.022),
        new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.8 })
      );
      towelCloth.position.set(-0.08, 0.62, 0.515);
      group.add(towelCloth);

      // Stainless Steel Chef Knife angled on board
      const knifeGroup = new THREE.Group();
      knifeGroup.position.set(0.24, 0.895, 0.20);
      knifeGroup.rotation.y = -Math.PI / 6;

      const fallbackKnife = new THREE.Group();
      const blade = new THREE.Mesh(
        new THREE.BoxGeometry(0.32, 0.02, 0.06),
        new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.15, metalness: 0.9 })
      );
      blade.castShadow = true;
      fallbackKnife.add(blade);

      const handle = new THREE.Mesh(
        new THREE.BoxGeometry(0.14, 0.025, 0.04),
        new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.7 })
      );
      handle.position.x = 0.22;
      fallbackKnife.add(handle);

      ExternalModelLoader.attachModel(
        knifeGroup,
        ExternalModelLoader.PATHS.CHEF_KNIFE,
        { targetWidth: 0.36, rotationZ: Math.PI / 2 },
        fallbackKnife
      );

      group.add(knifeGroup);

      const prog = this.createProgressBar3D();
      group.add(prog.progressGroup);
      return { ...prog, boardKnifeGroup: knifeGroup };
    }
    // 2. STOVE & FRYING PAN (CC0 frying-pan.glb + Cast-Iron Grates + Glowing Oven Door Window)
    else if (type === CounterType.STOVE) {
      const ironMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.65, metalness: 0.82 });
      // Cast Iron Burner Grate Frame
      const burnerFrame = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.024, 0.82), ironMat);
      burnerFrame.position.y = 0.85;
      group.add(burnerFrame);

      // 4-Prong Spider Grate Bars
      const grateBarX = new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.028, 0.045), ironMat);
      grateBarX.position.y = 0.86;
      group.add(grateBarX);
      const grateBarZ = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.028, 0.74), ironMat);
      grateBarZ.position.y = 0.86;
      group.add(grateBarZ);

      // Glowing Red Heat Ring
      const heatRingMat = new THREE.MeshStandardMaterial({
        color: 0xef4444,
        emissive: 0xdc2626,
        emissiveIntensity: 0.75
      });
      const heatRing = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.026, 8, 24), heatRingMat);
      heatRing.rotation.x = Math.PI / 2;
      heatRing.position.y = 0.864;
      group.add(heatRing);

      // Front Control Bezel & Dial Knobs
      const controlPanel = new THREE.Mesh(
        new THREE.BoxGeometry(0.86, 0.14, 0.03),
        new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.35, metalness: 0.65 })
      );
      controlPanel.position.set(0, 0.68, 0.472);
      group.add(controlPanel);

      const knobGeo = new THREE.CylinderGeometry(0.042, 0.042, 0.035, 14);
      const knobMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.25 });
      [-0.24, 0, 0.24].forEach((kx) => {
        const knob = new THREE.Mesh(knobGeo, knobMat);
        knob.rotation.x = Math.PI / 2;
        knob.position.set(kx, 0.68, 0.49);
        group.add(knob);
      });

      // Warm Glowing Oven Door Window on front face
      const ovenDoorFrame = new THREE.Mesh(
        new THREE.BoxGeometry(0.76, 0.42, 0.028),
        new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.3, metalness: 0.7 })
      );
      ovenDoorFrame.position.set(0, 0.34, 0.472);
      group.add(ovenDoorFrame);

      const ovenWindow = new THREE.Mesh(
        new THREE.BoxGeometry(0.56, 0.24, 0.032),
        new THREE.MeshStandardMaterial({
          color: 0xf97316,
          emissive: 0xea580c,
          emissiveIntensity: 0.42,
          roughness: 0.15
        })
      );
      ovenWindow.position.set(0, 0.33, 0.475);
      group.add(ovenWindow);

      // Heavy Frying Pan (CC0 frying-pan.glb)
      const panGroup = new THREE.Group();
      panGroup.position.set(0, 0.862, 0);

      const fallbackPan = new THREE.Group();
      const panBody = new THREE.Mesh(
        new THREE.CylinderGeometry(0.28, 0.24, 0.07, 18),
        new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.3, metalness: 0.85 })
      );
      panBody.position.y = 0.035;
      panBody.castShadow = true;
      fallbackPan.add(panBody);

      const panHandle = new THREE.Mesh(
        new THREE.BoxGeometry(0.28, 0.025, 0.04),
        new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.6 })
      );
      panHandle.position.set(0.38, 0.05, 0);
      fallbackPan.add(panHandle);

      ExternalModelLoader.attachModel(
        panGroup,
        ExternalModelLoader.PATHS.FRYING_PAN,
        { targetWidth: 0.72, offsetX: 0.06 },
        fallbackPan
      );

      group.add(panGroup);

      const prog = this.createProgressBar3D();
      group.add(prog.progressGroup);
      return { ...prog, heatRingMat };
    }
    // 3. DELIVERY WINDOW COUNTER (Bistro Conveyor Belt, Service Bell & Striped Pass-Through Frame)
    else if (type === CounterType.DELIVERY) {
      // Glowing emerald conveyor surface
      const matMesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.94, 0.032, 0.94),
        new THREE.MeshStandardMaterial({
          color: 0x10b981,
          emissive: 0x059669,
          emissiveIntensity: 0.38,
          roughness: 0.25
        })
      );
      matMesh.position.y = 0.855;
      group.add(matMesh);

      // Stainless steel conveyor roller ribs
      const rollerMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.25, metalness: 0.8 });
      for (let rz = -0.32; rz <= 0.32; rz += 0.16) {
        const roller = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.78, 10), rollerMat);
        roller.rotation.z = Math.PI / 2;
        roller.position.set(0, 0.872, rz);
        group.add(roller);
      }

      // Animated glowing white chevron arrow pointing north
      const arrowGeo = new THREE.ConeGeometry(0.22, 0.38, 3);
      const arrowMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: 0xffffff,
        emissiveIntensity: 0.75
      });
      const arrow = new THREE.Mesh(arrowGeo, arrowMat);
      arrow.rotation.x = Math.PI / 2;
      arrow.position.set(0, 0.888, -0.05);
      group.add(arrow);

      // Polished Brass Service Bell 🛎️ on corner
      const bellBase = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.09, 0.02, 16),
        new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8 })
      );
      bellBase.position.set(-0.35, 0.875, 0.32);
      group.add(bellBase);

      const bellDome = new THREE.Mesh(
        new THREE.SphereGeometry(0.07, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2),
        new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.9, roughness: 0.15 })
      );
      bellDome.position.set(-0.35, 0.885, 0.32);
      bellDome.castShadow = true;
      group.add(bellDome);
      return { deliveryArrowMesh: arrow };
    }
    // 4. COMMERCIAL PEDAL TRASH CAN (With Hinged Animated Swing Lid)
    else if (type === CounterType.TRASH) {
      // Cylinder Ribbed Trash Can
      const binGeo = new THREE.CylinderGeometry(0.36, 0.34, 0.78, 20);
      const binMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.35, metalness: 0.2 });
      const bin = new THREE.Mesh(binGeo, binMat);
      bin.position.y = 0.42;
      bin.castShadow = true;
      group.add(bin);

      // Dark Inner Liner Cavity (visible when lid flips open)
      const innerCavity = new THREE.Mesh(
        new THREE.CylinderGeometry(0.32, 0.30, 0.04, 18),
        new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.9 })
      );
      innerCavity.position.y = 0.805;
      group.add(innerCavity);

      // Side Carry Handles
      const handleMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4, metalness: 0.6 });
      [-0.37, 0.37].forEach((hx) => {
        const sideHandle = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.08, 0.16), handleMat);
        sideHandle.position.set(hx, 0.68, 0);
        group.add(sideHandle);
      });

      // Hinged Chrome Swing Lid Group (pivoted at back edge z = -0.34, y = 0.83)
      const lidMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, metalness: 0.82, roughness: 0.15 });
      const trashLidGroup = new THREE.Group();
      trashLidGroup.position.set(0, 0.83, -0.34);

      const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.06, 20), lidMat);
      lid.position.set(0, 0, 0.34);
      lid.castShadow = true;
      trashLidGroup.add(lid);

      const lidHandle = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.015, 8, 16, Math.PI), lidMat);
      lidHandle.rotation.x = Math.PI / 2;
      lidHandle.position.set(0, 0.04, 0.34);
      trashLidGroup.add(lidHandle);

      group.add(trashLidGroup);

      // Chrome Foot Pedal
      const pedal = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.04, 0.12), lidMat);
      pedal.position.set(0, 0.04, 0.40);
      group.add(pedal);
      return { trashLidGroup };
    }
    // 5. OVERCOOKED-STYLE 3D INGREDIENT STORAGE BIN CABINETS WITH:
    //    - Zone A: Multi-compartment wooden cabinet + angled pull-out ingredient chute holding 3D ingredients inside!
    //    - Zone B: Completely FLAT top surface at y = 0.842 with 2D Cartoon Ingredient Artwork Decal & 6 placement slots!
    else if (type.startsWith('crate_')) {
      let badgeColor = 0xd97706;
      let badgeEmoji = '🍞';
      let stationTitle = 'BÁNH MÌ';
      let itemType = IngredientType.BREAD;
      let linerColor = 0xfef3c7; // Warm bakery cloth
      let topSurfaceColor = 0xfef9c3;

      if (type === CounterType.CRATE_MEAT) {
        badgeColor = 0xef4444;
        badgeEmoji = '🥩';
        stationTitle = 'THỊT BÒ';
        itemType = IngredientType.RAW_MEAT;
        linerColor = 0xe0f2fe; // Chilled butcher ice tray
        topSurfaceColor = 0xf8fafc;
      } else if (type === CounterType.CRATE_LETTUCE) {
        badgeColor = 0x22c55e;
        badgeEmoji = '🥬';
        stationTitle = 'XÀ LÁCH';
        itemType = IngredientType.LETTUCE;
        linerColor = 0xdcfce7; // Fresh produce liner
        topSurfaceColor = 0xf0fdf4;
      } else if (type === CounterType.CRATE_TOMATO) {
        badgeColor = 0xf43f5e;
        badgeEmoji = '🍅';
        stationTitle = 'CÀ CHUA';
        itemType = IngredientType.TOMATO;
        linerColor = 0xfef2f2;
        topSurfaceColor = 0xfff1f2;
      } else if (type === CounterType.CRATE_CHEESE) {
        badgeColor = 0xfacc15;
        badgeEmoji = '🧀';
        stationTitle = 'PHÔ MAI';
        itemType = IngredientType.CHEESE;
        linerColor = 0xfef9c3;
        topSurfaceColor = 0xfefce8;
      } else if (type === CounterType.CRATE_PLATE) {
        badgeColor = 0x38bdf8;
        badgeEmoji = '🍽️';
        stationTitle = 'ĐĨA SỨ';
        itemType = IngredientType.PLATE;
        linerColor = 0x334155;
        topSurfaceColor = 0xf1f5f9;
      }

      const woodMat = new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.62 });
      const darkWoodMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.68 });
      const brassMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, roughness: 0.25, metalness: 0.85 });
      const accentMat = new THREE.MeshStandardMaterial({
        color: badgeColor,
        roughness: 0.32,
        emissive: badgeColor,
        emissiveIntensity: 0.15
      });
      const linerMat = new THREE.MeshStandardMaterial({ color: linerColor, roughness: 0.42 });
      const flatTopMat = new THREE.MeshStandardMaterial({
        color: topSurfaceColor,
        roughness: 0.28,
        metalness: 0.08
      });

      // 1. Sturdy Wooden Bin Cabinet Cladding around body (y = 0.08 to 0.76)
      const binShell = new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.70, 0.96), woodMat);
      binShell.position.y = 0.41;
      binShell.castShadow = true;
      binShell.receiveShadow = true;
      group.add(binShell);

      // 4 Reinforced Corner Pillars + Brass Corner Caps
      const cornerCoords = [
        [-0.46, -0.46],
        [0.46, -0.46],
        [-0.46, 0.46],
        [0.46, 0.46]
      ];
      cornerCoords.forEach(([cx, cz]) => {
        const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.74, 0.08), darkWoodMat);
        pillar.position.set(cx, 0.41, cz);
        group.add(pillar);

        const brassCap = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.04, 0.09), brassMat);
        brassCap.position.set(cx, 0.77, cz);
        group.add(brassCap);
      });

      // 2. FLAT PLACEMENT COUNTERTOP SURFACE AT Y = 0.840 (100% flat, never blocks placed items!)
      const flatWorktop = new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.012, 0.96), flatTopMat);
      flatWorktop.position.y = 0.840;
      flatWorktop.receiveShadow = true;
      group.add(flatWorktop);

      // Flush color-coded border trim around the flat top perimeter (y = 0.841, flush with top)
      const trimH = 0.014;
      const trimFront = new THREE.Mesh(new THREE.BoxGeometry(1.0, trimH, 0.05), accentMat);
      trimFront.position.set(0, 0.840, 0.475);
      group.add(trimFront);

      const trimBack = new THREE.Mesh(new THREE.BoxGeometry(1.0, trimH, 0.05), accentMat);
      trimBack.position.set(0, 0.840, -0.475);
      group.add(trimBack);

      const trimLeft = new THREE.Mesh(new THREE.BoxGeometry(0.05, trimH, 0.92), accentMat);
      trimLeft.position.set(-0.475, 0.840, 0);
      group.add(trimLeft);

      const trimRight = new THREE.Mesh(new THREE.BoxGeometry(0.05, trimH, 0.92), accentMat);
      trimRight.position.set(0.475, 0.840, 0);
      group.add(trimRight);

      // 3. 2D CARTOON INGREDIENT ILLUSTRATION DECAL ON TOP SURFACE (PHẦN 2.2)
      // Replaces the old plain 2D circles with rich cartoon illustrations of the ingredient!
      // Purely decorative (raycast disabled, 0 collision thickness) so placed items sit cleanly on top.
      const decalGeo = new THREE.PlaneGeometry(0.86, 0.86);
      const decalMat = new THREE.MeshStandardMaterial({
        map: TextureGenerator3D.getIngredientBinTopDecalTexture(type),
        roughness: 0.32,
        metalness: 0.05,
        polygonOffset: true,
        polygonOffsetFactor: -1
      });
      const decalMesh = new THREE.Mesh(decalGeo, decalMat);
      decalMesh.rotation.x = -Math.PI / 2;
      decalMesh.position.set(0, 0.847, 0);
      decalMesh.receiveShadow = true;
      decalMesh.raycast = () => {}; // Purely decorative, never intercepts raycasts or physics
      group.add(decalMesh);

      // For CRATE_PLATE, add 4 sleek corner chrome guide rods at the very outer corners (leaves center free)
      if (type === CounterType.CRATE_PLATE) {
        const chromeRodMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.15, metalness: 0.9 });
        [
          [-0.41, -0.41],
          [0.41, -0.41],
          [-0.41, 0.41],
          [0.41, 0.41]
        ].forEach(([rx, rz]) => {
          const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.10, 10), chromeRodMat);
          rod.position.set(rx, 0.89, rz);
          group.add(rod);
        });
      }

      // 4. ANGLED INTERIOR INGREDIENT STORAGE DRAWER / CHUTE (Built into kitchen-facing side of the bin!)
      let drawerDirRotY = 0; // Default +Z (front)
      if (x < -2.5) {
        drawerDirRotY = Math.PI / 2; // Left column (-4): faces +X toward kitchen center
      } else if (x > 2.5) {
        drawerDirRotY = -Math.PI / 2; // Right column (+4): faces -X toward kitchen center
      } else if (z > 2.0) {
        drawerDirRotY = Math.PI; // Bottom row (+3): faces -Z toward kitchen center
      }

      const drawerAnchor = new THREE.Group();
      drawerAnchor.rotation.y = drawerDirRotY;
      group.add(drawerAnchor);

      // Lower ventilation louvers & brass label frame below the pull-out drawer
      for (let lv = 0; lv < 2; lv++) {
        const louver = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.03, 0.025), darkWoodMat);
        louver.position.set(0, 0.16 + lv * 0.07, 0.482);
        drawerAnchor.add(louver);
      }

      const crateDisplayGroup = new THREE.Group();
      // Positioned in the upper-middle front bay of the bin cabinet (y = 0.48, z = +0.34)
      crateDisplayGroup.position.set(0, 0.48, 0.34);
      crateDisplayGroup.rotation.x = 0.38;
      drawerAnchor.add(crateDisplayGroup);

      // Drawer box pocket
      const drawerFloor = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.05, 0.38), linerMat);
      drawerFloor.position.set(0, 0, 0);
      crateDisplayGroup.add(drawerFloor);

      const drawerLip = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.16, 0.045), darkWoodMat);
      drawerLip.position.set(0, 0.06, 0.18);
      crateDisplayGroup.add(drawerLip);

      const drawerAccent = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.035, 0.055), accentMat);
      drawerAccent.position.set(0, 0.14, 0.18);
      crateDisplayGroup.add(drawerAccent);

      // Brass drawer pull handle on front of chute
      const pullBar = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.028, 0.035), brassMat);
      pullBar.position.set(0, 0.07, 0.215);
      crateDisplayGroup.add(pullBar);

      const drawerSideL = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.18, 0.38), darkWoodMat);
      drawerSideL.position.set(-0.36, 0.07, 0);
      crateDisplayGroup.add(drawerSideL);

      const drawerSideR = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.18, 0.38), darkWoodMat);
      drawerSideR.position.set(0.36, 0.07, 0);
      crateDisplayGroup.add(drawerSideR);

      // Abundant 3D Ingredient Models inside the bin drawer chute!
      if (type === CounterType.CRATE_PLATE) {
        for (let p = 0; p < 4; p++) {
          const plateSample = Ingredient3DFactory.createMeshFromType(IngredientType.PLATE);
          plateSample.position.set(0, 0.03 + p * 0.038, 0.02);
          plateSample.scale.setScalar(0.68);
          crateDisplayGroup.add(plateSample);
        }
      } else {
        const placements = [
          { x: -0.17, y: 0.03, z: -0.03, rotY: 0.2, scale: 0.65 },
          { x: 0.17, y: 0.03, z: -0.03, rotY: 1.4, scale: 0.65 },
          { x: -0.11, y: 0.06, z: 0.06, rotY: 2.3, scale: 0.68 },
          { x: 0.11, y: 0.06, z: 0.06, rotY: 3.6, scale: 0.68 },
          { x: 0.0, y: 0.11, z: 0.02, rotY: 0.7, scale: 0.74 }
        ];
        placements.forEach((pl) => {
          const sample = Ingredient3DFactory.createMeshFromType(itemType);
          sample.position.set(pl.x, pl.y, pl.z);
          sample.rotation.set(0, pl.rotY, 0);
          sample.scale.setScalar(pl.scale);
          crateDisplayGroup.add(sample);
        });
      }

      // 5. Front Icon Badge + Non-Occluding Outer-Edge Label Signboard (never blocks the flat top surface!)
      this.createCrateSignBadge(group, badgeEmoji, badgeColor);
      let labelOffsetX = 0;
      let labelOffsetZ = -0.38;
      if (x < -2.5) {
        labelOffsetX = -0.48; // Offset to outer left wall edge
        labelOffsetZ = 0;
      } else if (x > 2.5) {
        labelOffsetX = 0.48;  // Offset to outer right wall edge
        labelOffsetZ = 0;
      } else if (z > 2.0) {
        labelOffsetX = 0;
        labelOffsetZ = 0.46;  // Offset to outer bottom edge
      }
      this.createFloatingStationLabel(group, badgeEmoji, stationTitle, badgeColor, labelOffsetX, labelOffsetZ);

      return { crateDisplayGroup };
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
