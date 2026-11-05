import * as THREE from 'three';

export class MaterialFactory {
  private static materials: Map<string, THREE.Material> = new Map();

  public static get(name: string, color: number | string, roughness: number = 0.4, metalness: number = 0.1): THREE.MeshStandardMaterial {
    const key = `${name}_${color}_${roughness}_${metalness}`;
    if (!this.materials.has(key)) {
      const mat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(color),
        roughness,
        metalness
      });
      this.materials.set(key, mat);
    }
    return this.materials.get(key) as THREE.MeshStandardMaterial;
  }

  // Pre-configured cartoon materials
  public static counterWood = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.5, metalness: 0.05 });
  public static counterSteel = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.25, metalness: 0.7 });
  public static counterTop = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.3, metalness: 0.1 });
  public static stoveMetal = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4, metalness: 0.8 });
  public static panMetal = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.3, metalness: 0.9 });
  public static cuttingWood = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.6, metalness: 0.05 });
  public static deliveryGreen = new THREE.MeshStandardMaterial({ color: 0x10b981, roughness: 0.3, metalness: 0.2 });
  public static trashRed = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.3, metalness: 0.1 });
  public static plateCeramic = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.15, metalness: 0.05 });
  public static cheeseYellow = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.4, metalness: 0.0 });
  public static tomatoRed = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.2, metalness: 0.05 });
  public static lettuceGreen = new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.45, metalness: 0.0 });
  public static breadGold = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.6, metalness: 0.0 });
  public static meatRaw = new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.35, metalness: 0.05 });
  public static meatCooked = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.55, metalness: 0.05 });
  public static meatBurnt = new THREE.MeshStandardMaterial({ color: 0x171717, roughness: 0.8, metalness: 0.1 });
}
