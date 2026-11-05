import * as THREE from 'three';
import { CounterType, KitchenItem, StoveState } from '../../game/types';
import { MaterialFactory } from './MaterialFactory';
import { Physics3D } from '../core/Physics3D';
import { TextureGenerator3D } from './TextureGenerator3D';

export interface Counter3DData {
  id: string;
  type: CounterType;
  x: number;
  z: number;
  group: THREE.Group;
  itemHolder: THREE.Group;
  progressBarMesh?: THREE.Mesh;
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

  constructor(scene: THREE.Scene, physics: Physics3D) {
    this.scene = scene;
    this.physics = physics;
    this.scene.add(this.roomGroup);
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

    // Item Holder (where food / plate sits)
    const itemHolder = new THREE.Group();
    itemHolder.position.set(0, 0.84, 0);
    group.add(itemHolder);

    // Equipment on top based on Type
    this.decorateCounter(group, type);

    this.scene.add(group);
    this.physics.addBox(id, x, z, 1.0, 1.0);

    const counterData: Counter3DData = {
      id,
      type,
      x,
      z,
      group,
      itemHolder,
      cutProgress: 0,
      stoveState: StoveState.IDLE,
      cookingTimer: 0
    };

    this.counters.set(id, counterData);
    return counterData;
  }

  private decorateCounter(group: THREE.Group, type: CounterType) {
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
      knifeGroup.position.set(0.18, 0.90, 0.16);
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
      const heatRing = new THREE.Mesh(
        new THREE.TorusGeometry(0.24, 0.025, 8, 24),
        new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xdc2626, emissiveIntensity: 0.7 })
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
    }
    // 5. WOODEN INGREDIENT CRATES WITH FRONT ICON BADGES
    else if (type.startsWith('crate_')) {
      // Slatted Wooden Crate
      const crateBox = new THREE.Mesh(
        new THREE.BoxGeometry(0.82, 0.32, 0.82),
        new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.75 })
      );
      crateBox.position.y = 0.96;
      crateBox.castShadow = true;
      group.add(crateBox);

      // Inside fill base
      let badgeColor = 0xd97706;
      let badgeLabel = '🍞';

      if (type === CounterType.CRATE_MEAT) {
        badgeColor = 0xdc2626;
        badgeLabel = '🥩';
      } else if (type === CounterType.CRATE_LETTUCE) {
        badgeColor = 0x22c55e;
        badgeLabel = '🥬';
      } else if (type === CounterType.CRATE_TOMATO) {
        badgeColor = 0xef4444;
        badgeLabel = '🍅';
      } else if (type === CounterType.CRATE_CHEESE) {
        badgeColor = 0xfacc15;
        badgeLabel = '🧀';
      } else if (type === CounterType.CRATE_PLATE) {
        badgeColor = 0xffffff;
        badgeLabel = '🍽️';
      }

      // Top contents bed
      const fillMesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.74, 0.12, 0.74),
        new THREE.MeshStandardMaterial({ color: badgeColor, roughness: 0.4 })
      );
      fillMesh.position.y = 1.06;
      group.add(fillMesh);

      // Front 3D Badge Sign facing the player!
      this.createCrateSignBadge(group, badgeLabel, badgeColor);

      // For plate crate: show a neat stack of white ceramic plates!
      if (type === CounterType.CRATE_PLATE) {
        const plateMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.15, metalness: 0.1 });
        for (let p = 0; p < 4; p++) {
          const pMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.25, 0.03, 18), plateMat);
          pMesh.position.set(0, 1.12 + p * 0.04, 0);
          pMesh.castShadow = true;
          group.add(pMesh);
        }
      }
    }
  }

  private createCrateSignBadge(group: THREE.Group, emoji: string, color: number) {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;

    // Circle badge background
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.arc(64, 64, 58, 0, Math.PI * 2);
    ctx.fill();

    // Colored border
    ctx.lineWidth = 8;
    ctx.strokeStyle = `#${color.toString(16).padStart(6, '0')}`;
    ctx.stroke();

    // Emoji icon
    ctx.font = '64px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(emoji, 64, 70);

    const texture = new THREE.CanvasTexture(canvas);
    const badgeMat = new THREE.MeshBasicMaterial({ map: texture, transparent: true });
    const badge = new THREE.Mesh(new THREE.PlaneGeometry(0.38, 0.38), badgeMat);
    // Position on front face of counter (Z = +0.475)
    badge.position.set(0, 0.58, 0.485);
    group.add(badge);
  }
}
