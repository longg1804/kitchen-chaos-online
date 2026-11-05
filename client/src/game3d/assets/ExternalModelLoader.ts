import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export interface ExternalModelOptions {
  /** Desired horizontal footprint (max of width X or depth Z in world units, default 0.50) */
  targetWidth?: number;
  /** Optional vertical height multiplier after uniform scaling */
  scaleY?: number;
  /** Optional rotation around Y axis in radians applied before bounding-box alignment */
  rotationY?: number;
  /** Optional rotation around X axis in radians applied before bounding-box alignment */
  rotationX?: number;
  /** Optional rotation around Z axis in radians applied before bounding-box alignment */
  rotationZ?: number;
  /** World X offset after centering */
  offsetX?: number;
  /** World Y offset for the bottom contact plane (default 0) */
  offsetY?: number;
  /** World Z offset after centering */
  offsetZ?: number;
  /** Clone materials so per-instance color/emissive transitions do not affect other instances */
  cloneMaterials?: boolean;
  /** Custom callback to inspect/modify the cloned GLTF scene before bounds normalization */
  onBeforeNormalize?: (root: THREE.Group) => void;
  /** Custom callback to inspect/modify the normalized clone after alignment */
  onAfterNormalize?: (root: THREE.Group) => void;
}

/**
 * Loads, caches, normalizes, and instantiates CC0 3D GLB assets (Kenney Food Kit & Furniture Kit)
 * with automatic bottom-pivot alignment (min.y = 0) and centered X/Z footprint.
 */
export class ExternalModelLoader {
  private static loader = new GLTFLoader();
  private static cache = new Map<string, THREE.Group>();
  private static loadingPromises = new Map<string, Promise<THREE.Group>>();
  private static preloadStarted = false;

  public static readonly PATHS = {
    // Food & Ingredients (CC0 Kenney Food Kit 2.0)
    BURGER: '/models/food/burger.glb',
    BURGER_CHEESE: '/models/food/burger-cheese.glb',
    BREAD_LOAF: '/models/food/loaf-round.glb',
    MEAT_RAW: '/models/food/meat-raw.glb',
    MEAT_COOKED: '/models/food/meat-cooked.glb',
    MEAT_PATTY: '/models/food/meat-patty.glb',
    LETTUCE_HEAD: '/models/food/cabbage.glb',
    SALAD_CHOPPED: '/models/food/salad.glb',
    TOMATO_WHOLE: '/models/food/tomato.glb',
    TOMATO_SLICE: '/models/food/tomato-slice.glb',
    CHEESE_WEDGE: '/models/food/cheese-cut.glb',
    CHEESE_WHOLE: '/models/food/cheese.glb',
    CHICKEN_WHOLE: '/models/food/turkey.glb',
    FISH_WHOLE: '/models/food/fish.glb',
    SUSHI_SALMON: '/models/food/sushi-salmon.glb',
    ONION_WHOLE: '/models/food/onion.glb',
    ONION_HALF: '/models/food/onion-half.glb',
    FRIES: '/models/food/fries.glb',
    EGG_WHOLE: '/models/food/egg.glb',
    EGG_COOKED: '/models/food/egg-cooked.glb',
    PLATE: '/models/food/plate.glb',
    FRYING_PAN: '/models/food/frying-pan.glb',
    POT_STEW: '/models/food/pot-stew.glb',
    POT: '/models/food/pot.glb',
    CUTTING_BOARD: '/models/food/cutting-board.glb',
    CHEF_KNIFE: '/models/food/cooking-knife-chopping.glb',
    BOTTLE_KETCHUP: '/models/food/bottle-ketchup.glb',
    BOTTLE_MUSTARD: '/models/food/bottle-musterd.glb',
    BOTTLE_OIL: '/models/food/bottle-oil.glb',
    SHAKER_SALT: '/models/food/shaker-salt.glb',
    SHAKER_PEPPER: '/models/food/shaker-pepper.glb',

    // Kitchen Furniture & Appliances (CC0 Kenney Furniture Kit)
    FRIDGE: '/models/furniture/kitchenFridge.glb',
    BLENDER: '/models/furniture/kitchenBlender.glb',
    COFFEE_MACHINE: '/models/furniture/kitchenCoffeeMachine.glb',
    TRASHCAN: '/models/furniture/trashcan.glb'
  } as const;

  /**
   * Starts preloading all core 3D GLB assets in the background immediately.
   */
  public static preloadAll(): void {
    if (this.preloadStarted) return;
    this.preloadStarted = true;

    Object.values(this.PATHS).forEach((path) => {
      this.loadTemplate(path).catch((err) => {
        console.warn(`[ExternalModelLoader] Failed to preload ${path}:`, err);
      });
    });
  }

  /**
   * Loads a GLB template once and caches it for instant cloning.
   */
  public static loadTemplate(url: string): Promise<THREE.Group> {
    const cached = this.cache.get(url);
    if (cached) {
      return Promise.resolve(cached);
    }

    const existingPromise = this.loadingPromises.get(url);
    if (existingPromise) {
      return existingPromise;
    }

    const promise = new Promise<THREE.Group>((resolve, reject) => {
      this.loader.load(
        url,
        (gltf) => {
          const root = gltf.scene;
          root.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              child.castShadow = true;
              child.receiveShadow = true;
              const mats = Array.isArray(child.material) ? child.material : [child.material];
              mats.forEach((mat) => {
                if (mat && 'map' in mat && mat.map) {
                  mat.map.colorSpace = THREE.SRGBColorSpace;
                  mat.map.needsUpdate = true;
                }
                if (mat instanceof THREE.MeshStandardMaterial) {
                  mat.roughness = Math.min(mat.roughness, 0.55);
                }
              });
            }
          });
          this.cache.set(url, root);
          this.loadingPromises.delete(url);
          resolve(root);
        },
        undefined,
        (err) => {
          this.loadingPromises.delete(url);
          reject(err);
        }
      );
    });

    this.loadingPromises.set(url, promise);
    return promise;
  }

  /**
   * Attaches a normalized clone of an external GLB model into `targetGroup`.
   * - If the model is already cached, attaches synchronously and discards `fallbackGroup`.
   * - If still loading, displays `fallbackGroup` temporarily and swaps it automatically once loaded.
   */
  public static attachModel(
    targetGroup: THREE.Group,
    url: string,
    options: ExternalModelOptions = {},
    fallbackGroup?: THREE.Object3D
  ): void {
    this.preloadAll();

    const cached = this.cache.get(url);
    if (cached) {
      if (fallbackGroup && fallbackGroup.parent === targetGroup) {
        targetGroup.remove(fallbackGroup);
      }
      const instance = this.buildNormalizedInstance(cached, options);
      targetGroup.add(instance);
      return;
    }

    if (fallbackGroup && fallbackGroup.parent !== targetGroup) {
      targetGroup.add(fallbackGroup);
    }

    this.loadTemplate(url)
      .then((template) => {
        if (fallbackGroup && fallbackGroup.parent === targetGroup) {
          targetGroup.remove(fallbackGroup);
        }
        const instance = this.buildNormalizedInstance(template, options);
        targetGroup.add(instance);
      })
      .catch(() => {
        // Keep procedural fallback if external GLB fails to load
      });
  }

  /**
   * Clones the cached template, applies optional node/material customizations,
   * scales to `targetWidth`, centers X/Z at 0, and aligns bottom (min.y) to `offsetY` (0).
   */
  private static buildNormalizedInstance(
    template: THREE.Group,
    options: ExternalModelOptions
  ): THREE.Group {
    const wrapper = new THREE.Group();
    const clone = template.clone(true);

    if (options.cloneMaterials) {
      clone.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material) {
          if (Array.isArray(child.material)) {
            child.material = child.material.map((m) => m.clone());
          } else {
            child.material = child.material.clone();
          }
        }
      });
    }

    if (options.onBeforeNormalize) {
      options.onBeforeNormalize(clone);
    }

    if (options.rotationX) clone.rotation.x = options.rotationX;
    if (options.rotationY) clone.rotation.y = options.rotationY;
    if (options.rotationZ) clone.rotation.z = options.rotationZ;

    clone.updateMatrixWorld(true);
    const initialBox = this.computeVisibleBox3(clone);
    const size = new THREE.Vector3();
    initialBox.getSize(size);

    const maxHoriz = Math.max(size.x, size.z, 0.001);
    const targetWidth = options.targetWidth ?? 0.50;
    const uniformScale = targetWidth / maxHoriz;

    clone.scale.multiplyScalar(uniformScale);
    if (options.scaleY) {
      clone.scale.y *= options.scaleY;
    }

    clone.updateMatrixWorld(true);
    const scaledBox = this.computeVisibleBox3(clone);
    const scaledCenter = new THREE.Vector3();
    scaledBox.getCenter(scaledCenter);

    clone.position.x += -scaledCenter.x + (options.offsetX ?? 0);
    clone.position.z += -scaledCenter.z + (options.offsetZ ?? 0);
    clone.position.y += -scaledBox.min.y + (options.offsetY ?? 0);

    clone.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    wrapper.add(clone);

    if (options.onAfterNormalize) {
      options.onAfterNormalize(wrapper);
    }

    return wrapper;
  }

  /**
   * Computes accurate world-space Box3 considering ONLY visible meshes.
   */
  private static computeVisibleBox3(root: THREE.Object3D): THREE.Box3 {
    const box = new THREE.Box3();
    const meshBox = new THREE.Box3();
    root.traverseVisible((child) => {
      if (child instanceof THREE.Mesh && child.geometry) {
        if (!child.geometry.boundingBox) {
          child.geometry.computeBoundingBox();
        }
        if (child.geometry.boundingBox) {
          meshBox.copy(child.geometry.boundingBox).applyMatrix4(child.matrixWorld);
          box.union(meshBox);
        }
      }
    });
    if (box.isEmpty()) {
      box.setFromObject(root);
    }
    return box;
  }
}
