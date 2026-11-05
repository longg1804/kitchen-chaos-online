import * as THREE from 'three';
import { CounterType, IngredientType, KitchenItem, StoveState } from '../../game/types';
import { CookingConfig } from '../../game/config/CookingConfig';
import { MaterialFactory } from './MaterialFactory';
import { Physics3D } from '../core/Physics3D';
import { TextureGenerator3D } from './TextureGenerator3D';
import { Ingredient3DFactory } from '../entities/Ingredient3D';

export interface Counter3DData {
  id: string;
  type: CounterType;
  x: number;
  z: number;
  group: THREE.Group;
  itemHolder: THREE.Group;
  crateDisplayGroup?: THREE.Group;
  boardKnifeGroup?: THREE.Group;
  heatRingMat?: THREE.MeshStandardMaterial;
  isActivelyChopping?: boolean;
  bounceTimer?: number;
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
    // 1. Cozy Stylized Checkered Tile Floor
    const floorGeo = new THREE.PlaneGeometry(12.6, 9.6);
    const floorMat = new THREE.MeshStandardMaterial({
      map: TextureGenerator3D.getFloorTexture(),
      roughness: 0.35,
      metalness: 0.05
    });
    this.floorMesh = new THREE.Mesh(floorGeo, floorMat);
    this.floorMesh.rotation.x = -Math.PI / 2;
    this.floorMesh.position.set(0, 0, 0);
    this.floorMesh.receiveShadow = true;
    this.roomGroup.add(this.floorMesh);

    // Warm Baseboards around the floor perimeter
    const baseboardMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.5 });
    const bbBack = new THREE.Mesh(new THREE.BoxGeometry(12.6, 0.25, 0.25), baseboardMat);
    bbBack.position.set(0, 0.125, -4.55);
    this.roomGroup.add(bbBack);

    const bbLeft = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.25, 9.6), baseboardMat);
    bbLeft.position.set(-6.15, 0.125, 0);
    this.roomGroup.add(bbLeft);

    const bbRight = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.25, 9.6), baseboardMat);
    bbRight.position.set(6.15, 0.125, 0);
    this.roomGroup.add(bbRight);

    // 2. Glossy Subway Tile Back Wall
    const backWallMat = new THREE.MeshStandardMaterial({
      map: TextureGenerator3D.getSubwayTileTexture(),
      roughness: 0.25,
      metalness: 0.1
    });
    const backWall = new THREE.Mesh(new THREE.BoxGeometry(12.6, 3.6, 0.3), backWallMat);
    backWall.position.set(0, 1.8, -4.7);
    backWall.receiveShadow = true;
    this.roomGroup.add(backWall);

    // Side Walls (Warm Buttercream tone)
    const sideWallMat = new THREE.MeshStandardMaterial({ color: 0xfde68a, roughness: 0.6 });
    const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.3, 3.6, 9.6), sideWallMat);
    leftWall.position.set(-6.3, 1.8, 0);
    leftWall.receiveShadow = true;
    this.roomGroup.add(leftWall);

    const rightWall = new THREE.Mesh(new THREE.BoxGeometry(0.3, 3.6, 9.6), sideWallMat);
    rightWall.position.set(6.3, 1.8, 0);
    rightWall.receiveShadow = true;
    this.roomGroup.add(rightWall);

    // 3. Decorative Stainless Steel Kitchen Shelf on Back Wall
    const shelfMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8, roughness: 0.2 });
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(11, 0.08, 0.6), shelfMat);
    shelf.position.set(0, 2.2, -4.3);
    shelf.castShadow = true;
    this.roomGroup.add(shelf);

    // Shelf support brackets
    for (let bx = -4.5; bx <= 4.5; bx += 3) {
      const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.4, 0.5), shelfMat);
      bracket.position.set(bx, 2.0, -4.35);
      this.roomGroup.add(bracket);
    }

    // Decorative spice jars and olive oil bottles on shelf
    const jarColors = [0xef4444, 0x22c55e, 0xfacc15, 0x0284c7, 0xf97316];
    for (let j = 0; j < 8; j++) {
      const jarMat = new THREE.MeshStandardMaterial({ color: jarColors[j % jarColors.length], roughness: 0.3 });
      const jar = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.28, 12), jarMat);
      jar.position.set(-3.5 + j * 0.9, 2.38, -4.3);
      jar.castShadow = true;
      this.roomGroup.add(jar);
    }
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

    // 1. Counter Body: Dark Slate / Navy Blue Lacquer with Shaker Panel
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.45,
      metalness: 0.1
    });
    const bodyGeo = new THREE.BoxGeometry(0.94, 0.76, 0.94);
    const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
    bodyMesh.position.y = 0.38;
    bodyMesh.castShadow = true;
    bodyMesh.receiveShadow = true;
    group.add(bodyMesh);

    // Front Cabinet Face with Door Detail & Chrome Pull (Facing front towards player at +Z)
    const cabinetMat = new THREE.MeshStandardMaterial({
      map: TextureGenerator3D.getCabinetFrontTexture(),
      roughness: 0.35,
      metalness: 0.2
    });
    const frontPanel = new THREE.Mesh(new THREE.PlaneGeometry(0.86, 0.68), cabinetMat);
    frontPanel.position.set(0, 0.38, 0.471);
    group.add(frontPanel);

    // 2. Beveled Countertop (Stainless Steel with bevel edge)
    const topMat = new THREE.MeshStandardMaterial({
      color: 0xf1f5f9,
      roughness: 0.25,
      metalness: 0.5
    });
    const topGeo = new THREE.BoxGeometry(1.0, 0.08, 1.0);
    const topMesh = new THREE.Mesh(topGeo, topMat);
    topMesh.position.y = 0.80;
    topMesh.castShadow = true;
    topMesh.receiveShadow = true;
    group.add(topMesh);

    // Recessed Dark Plinth Base (Kickplate creating contact shadow)
    const plinthMat = new THREE.MeshStandardMaterial({ color: 0x090d16, roughness: 0.8 });
    const plinth = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.08, 0.86), plinthMat);
    plinth.position.y = 0.04;
    group.add(plinth);

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

    // Equipment on top based on Type
    const extraRefs = this.decorateCounter(group, type, id);

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
      crateDisplayGroup: extraRefs.crateDisplayGroup,
      boardKnifeGroup: extraRefs.boardKnifeGroup,
      heatRingMat: extraRefs.heatRingMat,
      isActivelyChopping: false,
      bounceTimer: 0,
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
      c.bounceTimer = 0.22;
    }
  }

  public updateStations(delta: number) {
    const now = performance.now() * 0.001;
    this.counters.forEach((c) => {
      // 1. Crate / Counter interaction bounce feedback & active chopping vibration
      if (c.bounceTimer && c.bounceTimer > 0) {
        c.bounceTimer = Math.max(0, c.bounceTimer - delta);
        const t = c.bounceTimer / 0.22;
        const pulse = 1 + Math.sin(t * Math.PI) * 0.14;
        if (c.crateDisplayGroup) {
          c.crateDisplayGroup.scale.set(pulse, pulse, pulse);
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
        }
        c.itemHolder.scale.set(1, 1, 1);
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
            const safeEnd = cookDuration + CookingConfig.burnTimeline.safeDuration;
            const warnEnd = safeEnd + CookingConfig.burnTimeline.warningDuration;
            const dangerEnd = warnEnd + CookingConfig.burnTimeline.dangerDuration;

            let ratio = 0;
            if (c.stoveState === StoveState.COOKING) {
              ratio = Math.min(1, c.cookingTimer / cookDuration);
              c.progressFillMat.color.setHex(0x22c55e); // Green cooking bar (0 -> 100%)
              if (c.statusSprite) c.statusSprite.visible = false;
            } else if (c.stoveState === StoveState.COOKED) {
              // 0–5s after cooked: Safe green bar + ✅ Checkmark icon
              const postTime = Math.max(0, c.cookingTimer - cookDuration);
              ratio = Math.max(0.1, 1 - postTime / CookingConfig.burnTimeline.safeDuration);
              c.progressFillMat.color.setHex(0x10b981);
              if (c.statusSprite) {
                c.statusSprite.visible = true;
                c.statusSprite.material = this.statusMaterials['COOKED'];
                const s = 0.36 + Math.sin(now * 6) * 0.03;
                c.statusSprite.scale.set(s, s, 1);
              }
            } else if (c.stoveState === StoveState.WARNING) {
              // 5–10s after cooked: Warning amber bar + pulsing ⚠️ icon
              const warnElapsed = Math.max(0, c.cookingTimer - safeEnd);
              ratio = Math.min(1, warnElapsed / CookingConfig.burnTimeline.warningDuration);
              const pulse = Math.floor(Date.now() / 240) % 2 === 0;
              c.progressFillMat.color.setHex(pulse ? 0xf59e0b : 0xfacc15);
              if (c.statusSprite) {
                c.statusSprite.visible = true;
                c.statusSprite.material = this.statusMaterials['WARNING'];
                const s = 0.38 + Math.sin(now * 12) * 0.05;
                c.statusSprite.scale.set(s, s, 1);
              }
            } else if (c.stoveState === StoveState.DANGER || c.stoveState === StoveState.BURNING) {
              // 10–13s after cooked: Urgent flashing red bar + rapid flashing 🔥 icon
              const dangerElapsed = Math.max(0, c.cookingTimer - warnEnd);
              ratio = Math.min(1, dangerElapsed / Math.max(1, dangerEnd - warnEnd));
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
    id: string = ''
  ): {
    crateDisplayGroup?: THREE.Group;
    boardKnifeGroup?: THREE.Group;
    heatRingMat?: THREE.MeshStandardMaterial;
    progressGroup?: THREE.Group;
    progressFillMesh?: THREE.Mesh;
    progressFillMat?: THREE.MeshBasicMaterial;
    statusSprite?: THREE.Sprite;
  } {
    // Dedicated Fire Extinguisher Station on top-right counter (3, -3)
    if (id === 'counter_3_-3') {
      const standMat = new THREE.MeshStandardMaterial({
        color: 0xdc2626,
        emissive: 0x991b1b,
        emissiveIntensity: 0.25,
        roughness: 0.35
      });
      const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.34, 0.025, 20), standMat);
      pad.position.y = 0.852;
      group.add(pad);

      this.createCrateSignBadge(group, '🧯', 0xdc2626);
      this.createFloatingStationLabel(group, '🧯', 'CỨU HỎA', 0xef4444);
      return {};
    }

    // Decorative Cartoon Kitchen Appliances on non-interactive back-wall corner counters:
    // Top-left corner (-4, -3): Cartoon Commercial Refrigerator
    if (id === 'counter_-4_-3') {
      const fridgeGroup = new THREE.Group();
      const fridgeMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.25, metalness: 0.45 });
      const handleMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.2, metalness: 0.8 });

      const fridgeBody = new THREE.Mesh(new THREE.BoxGeometry(0.92, 1.35, 0.88), fridgeMat);
      fridgeBody.position.y = 1.48;
      fridgeBody.castShadow = true;
      fridgeGroup.add(fridgeBody);

      const handleTop = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.35, 0.06), handleMat);
      handleTop.position.set(0.32, 1.80, 0.46);
      fridgeGroup.add(handleTop);

      const handleBot = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.42, 0.06), handleMat);
      handleBot.position.set(0.32, 1.25, 0.46);
      fridgeGroup.add(handleBot);

      group.add(fridgeGroup);
      return {};
    }

    // Back-wall counter (1, -3): Cartoon Kitchen Sink with Gooseneck Faucet & Soapy Water Basin
    if (id === 'counter_1_-3') {
      const basinMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.2, metalness: 0.7 });
      const waterMat = new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x0284c7,
        emissiveIntensity: 0.25,
        roughness: 0.15
      });
      const chromeMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.15, metalness: 0.9 });

      const basin = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.04, 0.62), basinMat);
      basin.position.set(0, 0.845, 0.04);
      group.add(basin);

      const water = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.045, 0.54), waterMat);
      water.position.set(0, 0.848, 0.04);
      group.add(water);

      // Gooseneck Faucet
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.28, 12), chromeMat);
      stem.position.set(0, 0.98, -0.32);
      group.add(stem);

      const spout = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.028, 10, 16, Math.PI), chromeMat);
      spout.rotation.y = Math.PI / 2;
      spout.position.set(0, 1.11, -0.21);
      group.add(spout);

      return {};
    }

    // 1. CUTTING BOARD
    if (type === CounterType.CUTTING_BOARD) {
      const boardGeo = new THREE.BoxGeometry(0.74, 0.05, 0.58);
      const boardMat = new THREE.MeshStandardMaterial({
        map: TextureGenerator3D.getButcherBlockTexture(),
        roughness: 0.5,
        metalness: 0.05
      });
      const board = new THREE.Mesh(boardGeo, boardMat);
      board.position.set(0, 0.865, 0.02);
      board.castShadow = true;
      group.add(board);

      // Stainless Steel Chef Knife angled on board
      const knifeGroup = new THREE.Group();
      knifeGroup.position.set(0.24, 0.90, 0.22);
      knifeGroup.rotation.y = -Math.PI / 6;

      // Steel Blade
      const blade = new THREE.Mesh(
        new THREE.BoxGeometry(0.32, 0.02, 0.06),
        new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.15, metalness: 0.9 })
      );
      blade.castShadow = true;
      knifeGroup.add(blade);

      // Wood Handle
      const handle = new THREE.Mesh(
        new THREE.BoxGeometry(0.14, 0.025, 0.04),
        new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.7 })
      );
      handle.position.x = 0.22;
      knifeGroup.add(handle);

      group.add(knifeGroup);

      const prog = this.createProgressBar3D();
      group.add(prog.progressGroup);
      return { ...prog, boardKnifeGroup: knifeGroup };
    }
    // 2. STOVE & FRYING PAN
    else if (type === CounterType.STOVE) {
      // Cast Iron Burner Grate Frame
      const burnerFrame = new THREE.Mesh(
        new THREE.BoxGeometry(0.8, 0.02, 0.8),
        new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.7, metalness: 0.8 })
      );
      burnerFrame.position.y = 0.85;
      group.add(burnerFrame);

      // Glowing Red Heat Ring
      const heatRingMat = new THREE.MeshStandardMaterial({
        color: 0xef4444,
        emissive: 0xdc2626,
        emissiveIntensity: 0.7
      });
      const heatRing = new THREE.Mesh(
        new THREE.TorusGeometry(0.24, 0.025, 8, 24),
        heatRingMat
      );
      heatRing.rotation.x = Math.PI / 2;
      heatRing.position.y = 0.862;
      group.add(heatRing);

      // Front Dial Knobs (Two red knobs on front panel)
      const knobGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.03, 12);
      const knobMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.3 });
      const knob1 = new THREE.Mesh(knobGeo, knobMat);
      knob1.rotation.x = Math.PI / 2;
      knob1.position.set(-0.2, 0.65, 0.48);
      group.add(knob1);

      const knob2 = new THREE.Mesh(knobGeo, knobMat);
      knob2.rotation.x = Math.PI / 2;
      knob2.position.set(0.2, 0.65, 0.48);
      group.add(knob2);

      // Heavy Frying Pan
      const panGroup = new THREE.Group();
      panGroup.position.set(0, 0.88, 0);

      const panBody = new THREE.Mesh(
        new THREE.CylinderGeometry(0.28, 0.24, 0.07, 18),
        new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.3, metalness: 0.85 })
      );
      panBody.castShadow = true;
      panGroup.add(panBody);

      // Pan Handle
      const panHandle = new THREE.Mesh(
        new THREE.BoxGeometry(0.28, 0.025, 0.04),
        new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.6 })
      );
      panHandle.position.set(0.38, 0.02, 0);
      panGroup.add(panHandle);

      group.add(panGroup);

      const prog = this.createProgressBar3D();
      group.add(prog.progressGroup);
      return { ...prog, heatRingMat };
    }
    // 3. DELIVERY WINDOW COUNTER
    else if (type === CounterType.DELIVERY) {
      // Glowing green service surface
      const matMesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.94, 0.03, 0.94),
        new THREE.MeshStandardMaterial({
          color: 0x10b981,
          emissive: 0x059669,
          emissiveIntensity: 0.35,
          roughness: 0.25
        })
      );
      matMesh.position.y = 0.855;
      group.add(matMesh);

      // Animated glowing white chevron arrow pointing north
      const arrowGeo = new THREE.ConeGeometry(0.22, 0.38, 3);
      const arrowMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: 0xffffff,
        emissiveIntensity: 0.6
      });
      const arrow = new THREE.Mesh(arrowGeo, arrowMat);
      arrow.rotation.x = Math.PI / 2;
      arrow.position.set(0, 0.875, -0.1);
      group.add(arrow);

      // Polished Brass Service Bell 🛎️ on corner
      const bellBase = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.09, 0.02, 16),
        new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8 })
      );
      bellBase.position.set(-0.35, 0.87, 0.32);
      group.add(bellBase);

      const bellDome = new THREE.Mesh(
        new THREE.SphereGeometry(0.07, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2),
        new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.9, roughness: 0.15 })
      );
      bellDome.position.set(-0.35, 0.88, 0.32);
      bellDome.castShadow = true;
      group.add(bellDome);
      return {};
    }
    // 4. COMMERCIAL PEDAL TRASH CAN
    else if (type === CounterType.TRASH) {
      // Cylinder Ribbed Trash Can
      const binGeo = new THREE.CylinderGeometry(0.36, 0.34, 0.78, 20);
      const binMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.35, metalness: 0.2 });
      const bin = new THREE.Mesh(binGeo, binMat);
      bin.position.y = 0.42;
      bin.castShadow = true;
      group.add(bin);

      // Polished Chrome Swing Lid with Handle
      const lidMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, metalness: 0.8, roughness: 0.15 });
      const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.06, 20), lidMat);
      lid.position.y = 0.83;
      lid.castShadow = true;
      group.add(lid);

      const lidHandle = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.015, 8, 16, Math.PI), lidMat);
      lidHandle.rotation.x = Math.PI / 2;
      lidHandle.position.set(0, 0.87, 0);
      group.add(lidHandle);

      // Chrome Foot Pedal
      const pedal = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.04, 0.12), lidMat);
      pedal.position.set(0, 0.04, 0.40);
      group.add(pedal);
      return {};
    }
    // 5. REDESIGNED 3-LAYER INGREDIENT STORAGE STATIONS (Open Crate + 3D Piled Models + Floating Signboard)
    else if (type.startsWith('crate_')) {
      const crateDisplayGroup = new THREE.Group();
      crateDisplayGroup.position.set(0, 0.84, 0);
      group.add(crateDisplayGroup);

      let badgeColor = 0xd97706;
      let badgeEmoji = '🍞';
      let stationTitle = 'BÁNH MÌ';
      let itemType = IngredientType.BREAD;
      let linerColor = 0xfef3c7; // Warm bakery cloth

      if (type === CounterType.CRATE_MEAT) {
        badgeColor = 0xef4444;
        badgeEmoji = '🥩';
        stationTitle = 'THỊT BÒ';
        itemType = IngredientType.RAW_MEAT;
        linerColor = 0xe0f2fe; // Chilled butcher ice tray
      } else if (type === CounterType.CRATE_LETTUCE) {
        badgeColor = 0x22c55e;
        badgeEmoji = '🥬';
        stationTitle = 'XÀ LÁCH';
        itemType = IngredientType.LETTUCE;
        linerColor = 0xdcfce7; // Fresh produce liner
      } else if (type === CounterType.CRATE_TOMATO) {
        badgeColor = 0xf43f5e;
        badgeEmoji = '🍅';
        stationTitle = 'CÀ CHUA';
        itemType = IngredientType.TOMATO;
        linerColor = 0xfef2f2;
      } else if (type === CounterType.CRATE_CHEESE) {
        badgeColor = 0xfacc15;
        badgeEmoji = '🧀';
        stationTitle = 'PHÔ MAI';
        itemType = IngredientType.CHEESE;
        linerColor = 0xfef9c3;
      } else if (type === CounterType.CRATE_PLATE) {
        badgeColor = 0x38bdf8;
        badgeEmoji = '🍽️';
        stationTitle = 'ĐĨA SỨ';
        itemType = IngredientType.PLATE;
        linerColor = 0x334155;
      }

      // Layer 1: Open-Top Slatted Wooden Crate / Display Rim with Color-Coded Accent Trim
      const woodMat = new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.7 });
      const accentMat = new THREE.MeshStandardMaterial({
        color: badgeColor,
        roughness: 0.35,
        emissive: badgeColor,
        emissiveIntensity: 0.15
      });
      const linerMat = new THREE.MeshStandardMaterial({ color: linerColor, roughness: 0.5 });

      // Inner bed floor
      const bed = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.06, 0.78), linerMat);
      bed.position.y = 0.03;
      bed.receiveShadow = true;
      crateDisplayGroup.add(bed);

      // 4 Open Crate Walls (so interior is recessed and holds piled 3D ingredients)
      const wallH = 0.18;
      const wallFront = new THREE.Mesh(new THREE.BoxGeometry(0.86, wallH, 0.06), woodMat);
      wallFront.position.set(0, wallH / 2, 0.40);
      wallFront.castShadow = true;
      crateDisplayGroup.add(wallFront);

      const wallBack = new THREE.Mesh(new THREE.BoxGeometry(0.86, wallH, 0.06), woodMat);
      wallBack.position.set(0, wallH / 2, -0.40);
      wallBack.castShadow = true;
      crateDisplayGroup.add(wallBack);

      const wallLeft = new THREE.Mesh(new THREE.BoxGeometry(0.06, wallH, 0.74), woodMat);
      wallLeft.position.set(-0.40, wallH / 2, 0);
      wallLeft.castShadow = true;
      crateDisplayGroup.add(wallLeft);

      const wallRight = new THREE.Mesh(new THREE.BoxGeometry(0.06, wallH, 0.74), woodMat);
      wallRight.position.set(0.40, wallH / 2, 0);
      wallRight.castShadow = true;
      crateDisplayGroup.add(wallRight);

      // Color-coded top rim strips around the crate perimeter for instant visual identification
      const rimFront = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.035, 0.07), accentMat);
      rimFront.position.set(0, wallH + 0.015, 0.40);
      crateDisplayGroup.add(rimFront);

      const rimBack = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.035, 0.07), accentMat);
      rimBack.position.set(0, wallH + 0.015, -0.40);
      crateDisplayGroup.add(rimBack);

      const rimLeft = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.035, 0.76), accentMat);
      rimLeft.position.set(-0.40, wallH + 0.015, 0);
      crateDisplayGroup.add(rimLeft);

      const rimRight = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.035, 0.76), accentMat);
      rimRight.position.set(0.40, wallH + 0.015, 0);
      crateDisplayGroup.add(rimRight);

      // Layer 2: Abundant 3D Ingredient Models Piled Inside the Crate!
      if (type === CounterType.CRATE_PLATE) {
        const plateMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.12, metalness: 0.15 });
        const rimBlueMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.2 });
        for (let p = 0; p < 5; p++) {
          const pMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.29, 0.25, 0.035, 22), plateMat);
          pMesh.position.set(0, 0.08 + p * 0.042, 0);
          pMesh.castShadow = true;
          crateDisplayGroup.add(pMesh);

          const pRim = new THREE.Mesh(new THREE.TorusGeometry(0.27, 0.012, 8, 22), rimBlueMat);
          pRim.rotation.x = Math.PI / 2;
          pRim.position.set(0, 0.095 + p * 0.042, 0);
          crateDisplayGroup.add(pRim);
        }
      } else {
        // Place 4 actual 3D ingredient models arranged naturally in the crate
        const placements = [
          { x: -0.16, y: 0.06, z: -0.14, rotY: 0.2, tiltZ: 0.1, scale: 0.72 },
          { x: 0.16, y: 0.06, z: -0.14, rotY: 1.4, tiltZ: -0.1, scale: 0.72 },
          { x: -0.15, y: 0.07, z: 0.15, rotY: 2.5, tiltZ: 0.08, scale: 0.74 },
          { x: 0.15, y: 0.07, z: 0.15, rotY: 3.8, tiltZ: -0.08, scale: 0.74 },
          { x: 0.0, y: 0.16, z: 0.0, rotY: 0.7, tiltZ: 0.05, scale: 0.82 } // Hero top item in center!
        ];
        placements.forEach((pl) => {
          const sample = Ingredient3DFactory.createMeshFromType(itemType);
          sample.position.set(pl.x, pl.y, pl.z);
          sample.rotation.set(0, pl.rotY, pl.tiltZ);
          sample.scale.setScalar(pl.scale);
          crateDisplayGroup.add(sample);
        });
      }

      // Layer 3: Front Icon Badge + High-Contrast Floating 3D Label Signboard
      this.createCrateSignBadge(group, badgeEmoji, badgeColor);
      this.createFloatingStationLabel(group, badgeEmoji, stationTitle, badgeColor);

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

  private createFloatingStationLabel(group: THREE.Group, emoji: string, title: string, color: number) {
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
    labelSprite.position.set(0, 1.48, -0.15);
    labelSprite.scale.set(1.05, 0.33, 1);
    labelSprite.renderOrder = 5;
    group.add(labelSprite);
  }
}
