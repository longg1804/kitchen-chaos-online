import * as THREE from 'three';
import { CounterType, IngredientType, KitchenItem, StoveState } from '../../game/types';
import { MaterialFactory } from './MaterialFactory';
import { Physics3D } from '../core/Physics3D';

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

  constructor(scene: THREE.Scene, physics: Physics3D) {
    this.scene = scene;
    this.physics = physics;
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
  }

  private buildRoomShell() {
    // 1. Tiled Floor
    const floorGeo = new THREE.PlaneGeometry(12, 10, 12, 10);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0xf1f5f9,
      roughness: 0.35,
      metalness: 0.05
    });
    this.floorMesh = new THREE.Mesh(floorGeo, floorMat);
    this.floorMesh.rotation.x = -Math.PI / 2;
    this.floorMesh.receiveShadow = true;
    this.scene.add(this.floorMesh);

    // Decorative floor grid border
    const gridHelper = new THREE.GridHelper(12, 12, 0x94a3b8, 0xe2e8f0);
    gridHelper.position.y = 0.005;
    this.scene.add(gridHelper);

    // Back & Left Walls for depth & shadow catching
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.7 });
    
    // Back Wall
    const backWall = new THREE.Mesh(new THREE.BoxGeometry(12, 3, 0.3), wallMat);
    backWall.position.set(0, 1.5, -4.5);
    backWall.receiveShadow = true;
    this.scene.add(backWall);

    // Left Wall
    const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.3, 3, 10), wallMat);
    leftWall.position.set(-5.5, 1.5, 0);
    leftWall.receiveShadow = true;
    this.scene.add(leftWall);

    // Wooden Baseboards
    const baseboardMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.5 });
    const bbBack = new THREE.Mesh(new THREE.BoxGeometry(12, 0.25, 0.35), baseboardMat);
    bbBack.position.set(0, 0.125, -4.4);
    this.scene.add(bbBack);
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
    // TOP ROW (r = -3)
    add(-4, -3, CounterType.CLEAR);
    add(-3, -3, CounterType.CLEAR);
    add(-2, -3, CounterType.DELIVERY);
    add(-1, -3, CounterType.DELIVERY);
    add(0, -3, CounterType.CLEAR);
    add(1, -3, CounterType.CLEAR);
    add(2, -3, CounterType.TRASH);
    add(3, -3, CounterType.CLEAR);
    add(4, -3, CounterType.CLEAR);

    // LEFT COLUMN (c = -4)
    add(-4, -2, CounterType.CRATE_BREAD);
    add(-4, -1, CounterType.CRATE_MEAT);
    add(-4, 0, CounterType.STOVE);
    add(-4, 1, CounterType.STOVE);
    add(-4, 2, CounterType.CLEAR);

    // RIGHT COLUMN (c = 4)
    add(4, -2, CounterType.CRATE_LETTUCE);
    add(4, -1, CounterType.CRATE_TOMATO);
    add(4, 0, CounterType.CRATE_CHEESE);
    add(4, 1, CounterType.CUTTING_BOARD);
    add(4, 2, CounterType.CUTTING_BOARD);

    // BOTTOM ROW (r = 3)
    add(-4, 3, CounterType.CLEAR);
    add(-3, 3, CounterType.CRATE_PLATE);
    add(-2, 3, CounterType.CRATE_PLATE);
    add(-1, 3, CounterType.CLEAR);
    add(0, 3, CounterType.CLEAR);
    add(1, 3, CounterType.CLEAR);
    add(2, 3, CounterType.CLEAR);
    add(3, 3, CounterType.CLEAR);
    add(4, 3, CounterType.CLEAR);

    // CENTER ISLAND TABLE
    add(-1, 0, CounterType.CLEAR);
    add(0, 0, CounterType.CLEAR);
    add(1, 0, CounterType.CLEAR);
  }

  public createCounter(id: string, type: CounterType, x: number, z: number): Counter3DData {
    const group = new THREE.Group();
    group.position.set(x, 0, z);

    // Base Counter Box (Oak Wood body)
    const bodyGeo = new THREE.BoxGeometry(0.92, 0.78, 0.92);
    const bodyMesh = new THREE.Mesh(bodyGeo, MaterialFactory.counterWood);
    bodyMesh.position.y = 0.39;
    bodyMesh.castShadow = true;
    bodyMesh.receiveShadow = true;
    group.add(bodyMesh);

    // Steel/Stone Countertop with bevel rim
    const topGeo = new THREE.BoxGeometry(0.98, 0.08, 0.98);
    const topMesh = new THREE.Mesh(topGeo, MaterialFactory.counterTop);
    topMesh.position.y = 0.82;
    topMesh.castShadow = true;
    topMesh.receiveShadow = true;
    group.add(topMesh);

    // Plinth bottom base (Stainless steel)
    const baseGeo = new THREE.BoxGeometry(0.86, 0.08, 0.86);
    const baseMesh = new THREE.Mesh(baseGeo, MaterialFactory.counterSteel);
    baseMesh.position.y = 0.04;
    group.add(baseMesh);

    // Item Holder (where food / plate sits)
    const itemHolder = new THREE.Group();
    itemHolder.position.set(0, 0.86, 0);
    group.add(itemHolder);

    // Equipment on top based on Type
    this.decorateCounter(group, type);

    this.scene.add(group);
    this.physics.addBox(id, x, z, 0.98, 0.98);

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
      const boardGeo = new THREE.BoxGeometry(0.7, 0.04, 0.55);
      const board = new THREE.Mesh(boardGeo, MaterialFactory.cuttingWood);
      board.position.y = 0.88;
      board.castShadow = true;
      group.add(board);

      // Steel Chef Knife
      const knifeBlade = new THREE.Mesh(
        new THREE.BoxGeometry(0.3, 0.03, 0.05),
        MaterialFactory.counterSteel
      );
      knifeBlade.position.set(0.1, 0.91, 0.2);
      group.add(knifeBlade);
    }
    // 2. STOVE & FRYING PAN
    else if (type === CounterType.STOVE) {
      // Cooktop burner ring
      const burnerGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.02, 16);
      const burner = new THREE.Mesh(burnerGeo, MaterialFactory.stoveMetal);
      burner.position.y = 0.87;
      group.add(burner);

      // Frying Pan
      const panBody = new THREE.Mesh(
        new THREE.CylinderGeometry(0.26, 0.22, 0.06, 16),
        MaterialFactory.panMetal
      );
      panBody.position.y = 0.90;
      panBody.castShadow = true;
      group.add(panBody);

      // Pan Handle
      const panHandle = new THREE.Mesh(
        new THREE.BoxGeometry(0.24, 0.02, 0.04),
        MaterialFactory.panMetal
      );
      panHandle.position.set(0.34, 0.91, 0);
      group.add(panHandle);
    }
    // 3. DELIVERY COUNTER
    else if (type === CounterType.DELIVERY) {
      const conveyorMat = MaterialFactory.deliveryGreen;
      const matMesh = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.02, 0.9), conveyorMat);
      matMesh.position.y = 0.87;
      group.add(matMesh);

      // Arrow indicator (White chevron)
      const arrowGeo = new THREE.ConeGeometry(0.2, 0.35, 3);
      const arrowMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
      const arrow = new THREE.Mesh(arrowGeo, arrowMat);
      arrow.rotation.x = Math.PI / 2;
      arrow.position.set(0, 0.89, -0.1);
      group.add(arrow);
    }
    // 4. TRASH CAN
    else if (type === CounterType.TRASH) {
      const binGeo = new THREE.BoxGeometry(0.75, 0.8, 0.75);
      const bin = new THREE.Mesh(binGeo, MaterialFactory.trashRed);
      bin.position.y = 0.45;
      bin.castShadow = true;
      group.add(bin);

      // Chrome Foot pedal
      const pedal = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.04, 0.15), MaterialFactory.counterSteel);
      pedal.position.set(0, 0.04, 0.42);
      group.add(pedal);
    }
    // 5. CRATES (Wood crates with colorful contents)
    else if (type.startsWith('crate_')) {
      const crateBox = new THREE.Mesh(
        new THREE.BoxGeometry(0.78, 0.3, 0.78),
        new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.7 })
      );
      crateBox.position.y = 1.0;
      crateBox.castShadow = true;
      group.add(crateBox);

      // Color representation inside crate
      let color = 0xd97706;
      if (type === CounterType.CRATE_MEAT) color = 0xdc2626;
      else if (type === CounterType.CRATE_LETTUCE) color = 0x22c55e;
      else if (type === CounterType.CRATE_TOMATO) color = 0xef4444;
      else if (type === CounterType.CRATE_CHEESE) color = 0xfacc15;
      else if (type === CounterType.CRATE_PLATE) color = 0xffffff;

      const fillMesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.7, 0.1, 0.7),
        new THREE.MeshStandardMaterial({ color, roughness: 0.3 })
      );
      fillMesh.position.y = 1.1;
      group.add(fillMesh);
    }
  }
}
