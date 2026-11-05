import * as THREE from 'three';
import { IngredientType, KitchenItem } from '../../game/types';

export class Ingredient3DFactory {
  // Shared cartoon PBR materials for food
  private static breadMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.5 }); // Golden bun
  private static rawMeatMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.4 }); // Red raw meat
  private static cookedMeatMat = new THREE.MeshStandardMaterial({ color: 0x581c1c, roughness: 0.6 }); // Juicy grilled brown patty
  private static burntMeatMat = new THREE.MeshStandardMaterial({ color: 0x1c1917, roughness: 0.9 }); // Charred black
  private static lettuceMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.4 }); // Fresh vibrant green
  private static tomatoMat = new THREE.MeshStandardMaterial({ color: 0xef233c, roughness: 0.3 }); // Glossy red
  private static tomatoSeedMat = new THREE.MeshStandardMaterial({ color: 0xfca5a5, roughness: 0.5 });
  private static cheeseMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, roughness: 0.4 }); // Yellow cheddar
  private static plateMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.15, metalness: 0.1 }); // Ceramic white

  public static createMesh(item: KitchenItem): THREE.Group {
    const group = new THREE.Group();

    if (item.type === IngredientType.PLATE) {
      this.buildPlate(group);
      // If plate has ingredients, stack them on top!
      if (item.plateContents && item.plateContents.length > 0) {
        let currentY = 0.04;
        for (const ingType of item.plateContents) {
          const subMesh = this.createMeshFromType(ingType);
          subMesh.position.y = currentY;
          group.add(subMesh);
          currentY += 0.055;
        }
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
    }

    return group;
  }

  // 1. CERAMIC PLATE
  private static buildPlate(group: THREE.Group) {
    const plateGeo = new THREE.CylinderGeometry(0.32, 0.28, 0.04, 20);
    const plate = new THREE.Mesh(plateGeo, this.plateMat);
    plate.castShadow = true;
    plate.receiveShadow = true;
    group.add(plate);

    const innerRimGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.01, 20);
    const innerMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.2 });
    const inner = new THREE.Mesh(innerRimGeo, innerMat);
    inner.position.y = 0.021;
    group.add(inner);
  }

  // 2. BURGER BUN
  private static buildBread(group: THREE.Group, isChopped: boolean) {
    const bunGeo = new THREE.SphereGeometry(0.24, 16, 12, 0, Math.PI * 2, 0, Math.PI / 1.7);
    const bun = new THREE.Mesh(bunGeo, this.breadMat);
    bun.castShadow = true;
    group.add(bun);

    // Sesame seed specks
    const sesameMat = new THREE.MeshStandardMaterial({ color: 0xfef08a });
    const sGeo = new THREE.SphereGeometry(0.015, 6, 6);
    for (let i = 0; i < 6; i++) {
      const seed = new THREE.Mesh(sGeo, sesameMat);
      const angle = (i / 6) * Math.PI * 2;
      seed.position.set(Math.cos(angle) * 0.12, 0.15, Math.sin(angle) * 0.12);
      group.add(seed);
    }
  }

  // 3. MEAT PATTY
  private static buildMeat(group: THREE.Group, state: 'raw' | 'cooked' | 'burnt') {
    let mat = this.rawMeatMat;
    if (state === 'cooked') mat = this.cookedMeatMat;
    if (state === 'burnt') mat = this.burntMeatMat;

    if (state === 'raw') {
      const steakGeo = new THREE.CylinderGeometry(0.2, 0.22, 0.08, 14);
      const steak = new THREE.Mesh(steakGeo, mat);
      steak.castShadow = true;
      group.add(steak);
    } else {
      const pattyGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.06, 16);
      const patty = new THREE.Mesh(pattyGeo, mat);
      patty.castShadow = true;
      group.add(patty);

      if (state === 'cooked') {
        const lineMat = new THREE.MeshStandardMaterial({ color: 0x271111 });
        for (let i = -1; i <= 1; i++) {
          const line = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.01, 0.03), lineMat);
          line.position.set(0, 0.031, i * 0.08);
          patty.add(line);
        }
      }
    }
  }

  // 4. LETTUCE
  private static buildLettuce(group: THREE.Group, isChopped: boolean) {
    if (isChopped) {
      for (let i = 0; i < 4; i++) {
        const leafGeo = new THREE.BoxGeometry(0.25, 0.02, 0.12);
        const leaf = new THREE.Mesh(leafGeo, this.lettuceMat);
        leaf.rotation.y = (i * Math.PI) / 3;
        leaf.position.set((Math.random() - 0.5) * 0.05, i * 0.025, (Math.random() - 0.5) * 0.05);
        leaf.castShadow = true;
        group.add(leaf);
      }
    } else {
      const headGeo = new THREE.SphereGeometry(0.22, 12, 12);
      const head = new THREE.Mesh(headGeo, this.lettuceMat);
      head.castShadow = true;
      group.add(head);

      const wrapGeo = new THREE.SphereGeometry(0.23, 10, 10, 0, Math.PI * 1.5, 0, Math.PI / 1.5);
      const wrapMat = new THREE.MeshStandardMaterial({ color: 0x16a34a });
      const wrap = new THREE.Mesh(wrapGeo, wrapMat);
      group.add(wrap);
    }
  }

  // 5. TOMATO
  private static buildTomato(group: THREE.Group, isChopped: boolean) {
    if (isChopped) {
      for (let i = 0; i < 2; i++) {
        const sliceGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.04, 16);
        const slice = new THREE.Mesh(sliceGeo, this.tomatoMat);
        slice.position.y = i * 0.05;
        slice.castShadow = true;
        group.add(slice);

        const seedStar = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.042, 5), this.tomatoSeedMat);
        slice.add(seedStar);
      }
    } else {
      const tomGeo = new THREE.SphereGeometry(0.20, 14, 14);
      const tomato = new THREE.Mesh(tomGeo, this.tomatoMat);
      tomato.castShadow = true;
      group.add(tomato);

      const stemGeo = new THREE.ConeGeometry(0.06, 0.05, 5);
      const stemMat = new THREE.MeshStandardMaterial({ color: 0x15803d });
      const stem = new THREE.Mesh(stemGeo, stemMat);
      stem.position.y = 0.20;
      stem.rotation.x = Math.PI;
      group.add(stem);
    }
  }

  // 6. CHEESE
  private static buildCheese(group: THREE.Group, isChopped: boolean) {
    if (isChopped) {
      const sliceGeo = new THREE.BoxGeometry(0.32, 0.03, 0.32);
      const slice = new THREE.Mesh(sliceGeo, this.cheeseMat);
      slice.castShadow = true;
      group.add(slice);
    } else {
      const wedgeGeo = new THREE.BoxGeometry(0.24, 0.14, 0.24);
      const wedge = new THREE.Mesh(wedgeGeo, this.cheeseMat);
      wedge.castShadow = true;
      group.add(wedge);
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
