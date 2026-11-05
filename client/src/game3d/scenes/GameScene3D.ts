import * as THREE from 'three';
import { IsometricCamera } from '../core/IsometricCamera';
import { Physics3D } from '../core/Physics3D';
import { KitchenMap3D, Counter3DData } from '../environment/KitchenMap3D';
import { ChefCharacter3D, ChefSkinId } from '../entities/ChefCharacter3D';
import { Ingredient3DFactory, ThrownItem3D } from '../entities/Ingredient3D';
import { ParticleSystem3D } from '../vfx/ParticleSystem3D';
import { HUDOverlay3D } from '../ui/HUDOverlay3D';
import { RecipeManager } from '../../game/recipes/RecipeManager';
import { SoundManager } from '../../game/systems/SoundManager';
import { NetworkManager } from '../../multiplayer/NetworkManager';
import { CounterType, IngredientType, KitchenItem, StoveState } from '../../game/types';
import { CookingConfig } from '../../game/config/CookingConfig';

export interface GameScene3DConfig {
  isMultiplayer: boolean;
  roomCode?: string;
  mapId?: string;
  skin?: string;
  playerName?: string;
  onExit: () => void;
}

export class GameScene3D {
  private config: GameScene3DConfig;
  private container: HTMLElement;
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private cameraSystem!: IsometricCamera;
  private physics!: Physics3D;
  private map!: KitchenMap3D;
  private particles!: ParticleSystem3D;
  private hud!: HUDOverlay3D;

  private recipeManager!: RecipeManager;
  private sound = SoundManager.getInstance();
  private network = NetworkManager.getInstance();

  // Local Player
  private localPlayer!: ChefCharacter3D;
  private playerPos = { x: 0, z: 0 };
  private facingDir = { x: 0, z: 1 };
  private playerSpeed = 4.8;
  private heldItem: KitchenItem | null = null;
  private heldItemMesh: THREE.Group | null = null;

  // Dash System (Overcooked 2 Responsive Dash: 220ms dash, 400ms cooldown after dash ends)
  private isDashing = false;
  private dashTimer = 0;
  private readonly dashDuration = 0.22; // 220ms
  private readonly dashCooldown = 0.40; // 400ms cooldown starting AFTER dash finishes
  private dashCooldownTimer = 0;
  private readonly dashSpeedMultiplier = 2.15;
  private dashDirection = { x: 0, z: 1 };
  private dashParticleTimer = 0;

  // Bound event listeners for clean teardown (prevents duplicate listeners)
  private boundKeyDown!: (e: KeyboardEvent) => void;
  private boundKeyUp!: (e: KeyboardEvent) => void;
  private boundBlur!: () => void;
  private boundResize!: () => void;

  // Remote Players
  private remotePlayers = new Map<string, { chef: ChefCharacter3D; targetX: number; targetZ: number; heldMesh?: THREE.Group }>();

  // Thrown Items in Flight
  private thrownItems: ThrownItem3D[] = [];

  // Active facing counter highlight & Smart Chopping / Smart Cooking State
  private targetCounterHighlight!: THREE.Mesh;
  private currentFacingCounter: Counter3DData | null = null;
  private activeChopCounter: Counter3DData | null = null;
  private activeCookCounter: Counter3DData | null = null;
  private cookAnimTimer = 0;
  private chopEffectTimer = 0;
  private sprayEffectTimer = 0;
  private spraySyncTimer = 0;
  private isPlayerMoving = false;
  private lastSyncedAnim = 'IDLE';

  // Game Loop & Match Timer
  private isRunning = false;
  private lastTime = 0;
  private matchTimeRemaining = 180;
  private isGameOver = false;
  private lastNetworkSendTime = 0;

  // Keyboard state
  private keys: { [key: string]: boolean } = {};

  constructor(container: HTMLElement, config: GameScene3DConfig) {
    this.container = container;
    this.config = config;

    this.initThree();
    this.initGame();
    this.setupInputs();

    if (this.config.isMultiplayer && this.network.room) {
      this.setupMultiplayerSync();
    }

    this.isRunning = true;
    this.lastTime = performance.now();
    requestAnimationFrame(this.renderLoop.bind(this));
  }

  private initThree() {
    this.scene = new THREE.Scene();
    // Warm Cozy Restaurant Ambiance (No stark pitch black void)
    this.scene.background = new THREE.Color(0x182030);

    // High quality WebGL Renderer with Soft Cartoon Shadows
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;

    this.container.appendChild(this.renderer.domElement);

    // Overcooked 2 Front-Facing Top-Down Oblique Camera with Auto-Framing
    this.cameraSystem = new IsometricCamera(window.innerWidth / window.innerHeight);

    // 1. Warm Cartoon Hemisphere Light (Peach Sky + Soft Slate Ground)
    const hemiLight = new THREE.HemisphereLight(0xffedd5, 0x475569, 0.85);
    this.scene.add(hemiLight);

    // 2. Main Key Sun Light (Casts soft directional shadows)
    const sunLight = new THREE.DirectionalLight(0xffffff, 1.35);
    sunLight.position.set(5, 14, 8);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 35;
    sunLight.shadow.camera.left = -8;
    sunLight.shadow.camera.right = 8;
    sunLight.shadow.camera.top = 7;
    sunLight.shadow.camera.bottom = -7;
    sunLight.shadow.bias = -0.0003;
    this.scene.add(sunLight);

    // 3. Warm Ambient Fill
    const ambientLight = new THREE.AmbientLight(0xfffbeb, 0.4);
    this.scene.add(ambientLight);

    // 4. Cool Rim Light from Back for Cartoon Silhouettes
    const rimLight = new THREE.DirectionalLight(0x7dd3fc, 0.4);
    rimLight.position.set(-6, 9, -7);
    this.scene.add(rimLight);

    this.boundResize = this.onResize.bind(this);
    window.addEventListener('resize', this.boundResize);
  }

  private initGame() {
    this.physics = new Physics3D();
    this.map = new KitchenMap3D(this.scene, this.physics);
    this.map.buildMap(this.config.mapId || 'traditional');

    this.particles = new ParticleSystem3D(this.scene);
    this.recipeManager = new RecipeManager();

    // Spawn local chef in kitchen open area
    const skinId = (this.config.skin || 'chef_classic') as ChefSkinId;
    const name = this.config.playerName || 'Đầu Bếp';
    this.localPlayer = new ChefCharacter3D(skinId, name, !this.config.isMultiplayer || this.network.isHost);
    this.playerPos = { x: 0, z: 1.0 };
    this.localPlayer.group.position.set(this.playerPos.x, 0, this.playerPos.z);
    this.scene.add(this.localPlayer.group);

    // Subtle square outer perimeter highlight around targeted counter (never occludes food items!)
    const ringGeo = new THREE.RingGeometry(0.64, 0.71, 4);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85
    });
    this.targetCounterHighlight = new THREE.Mesh(ringGeo, ringMat);
    this.targetCounterHighlight.rotation.x = -Math.PI / 2;
    this.targetCounterHighlight.rotation.z = Math.PI / 4; // Align 4-sided ring into square border
    this.targetCounterHighlight.position.y = 0.842;
    this.targetCounterHighlight.visible = false;
    this.scene.add(this.targetCounterHighlight);

    // Initialize HUD Overlay with Overcooked Top Ticker & Screenshot support
    this.hud = new HUDOverlay3D(
      () => {
        this.destroy();
        this.config.onExit();
      },
      () => {
        this.takeScreenshot();
      }
    );

    this.hud.updateOrders(this.recipeManager.getOrders());
  }

  private setupInputs() {
    this.boundKeyDown = (e: KeyboardEvent) => {
      // Ignore keyboard shortcuts if typing in an input element
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Edge-detection: ignore key-repeat events when holding down a key!
      if (e.repeat || this.keys[e.code]) {
        return;
      }

      this.keys[e.code] = true;
      this.sound.init(); // Initialize audio on first keypress

      // Strict, non-overlapping action bindings:
      // [E] = Pick Up / Drop (At Storage Bins: Empty hand = ALWAYS dispense from bin; Holding item = Place onto bin top surface)
      // [Space] or [F] = Smart Contextual Action (At Storage Bins: Pick up item from bin top surface, or Swap held item & dispense)
      // [Shift] = Dash ONLY
      // [Q] = Throw ONLY
      // [P] = Screenshot ONLY
      if (e.code === 'KeyE') {
        e.preventDefault();
        this.handlePickupDrop();
      } else if (e.code === 'Space' || e.code === 'KeyF') {
        e.preventDefault();
        this.handleSmartAction();
      } else if (e.code === 'KeyQ') {
        e.preventDefault();
        this.handleThrow();
      } else if (e.code === 'KeyP') {
        e.preventDefault();
        this.takeScreenshot();
      } else if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        e.preventDefault();
        this.handleDash();
      }
    };

    this.boundKeyUp = (e: KeyboardEvent) => {
      this.keys[e.code] = false;
    };

    this.boundBlur = () => {
      // Clear held keys when window loses focus to prevent stuck movement/actions
      this.keys = {};
    };

    window.addEventListener('keydown', this.boundKeyDown);
    window.addEventListener('keyup', this.boundKeyUp);
    window.addEventListener('blur', this.boundBlur);
  }

  private setupMultiplayerSync() {
    const room = this.network.room!;

    // 1. Remote player movement & skin
    room.onMessage('remote_player_move', (data: any) => {
      if (data.id === this.network.mySessionId) return;

      let r = this.remotePlayers.get(data.id);
      if (!r) {
        const chef = new ChefCharacter3D((data.skin || 'chef_classic') as ChefSkinId, data.name, false);
        this.scene.add(chef.group);
        r = { chef, targetX: data.x, targetZ: data.y };
        this.remotePlayers.set(data.id, r);
      }

      r.targetX = data.x;
      r.targetZ = data.y;
      const fZ = data.facingZ !== undefined ? data.facingZ : data.facingY;
      if (data.facingX !== undefined && fZ !== undefined) {
        const angle = Math.atan2(data.facingX, fZ);
        r.chef.setRotation(angle);
      }
    });

    // Remote player animation state sync
    room.onMessage('remote_player_anim', (data: { id: string; anim: string; counterId?: string }) => {
      if (data.id === this.network.mySessionId) return;
      const r = this.remotePlayers.get(data.id);
      if (!r) return;

      r.chef.isChopping = (data.anim === 'CHOP');
      r.chef.isCooking = (data.anim === 'COOK');
      if (data.anim === 'PICKUP' || data.anim === 'DROP' || data.anim === 'THROW' || data.anim === 'CELEBRATE') {
        r.chef.playOneShot(data.anim);
      }
      if (data.counterId) {
        const c = this.map.counters.get(data.counterId);
        if (c) {
          c.isActivelyChopping = (data.anim === 'CHOP');
        }
      } else {
        this.map.counters.forEach((c) => {
          if (c !== this.activeChopCounter) c.isActivelyChopping = false;
        });
      }
    });

    // 2. Remote held item update
    const handleHeldSync = (data: { id: string; item?: KitchenItem | null; heldItem?: KitchenItem | null }) => {
      if (data.id === this.network.mySessionId) return;
      const r = this.remotePlayers.get(data.id);
      if (!r) return;

      const syncedItem = data.item !== undefined ? data.item : (data.heldItem ?? null);
      r.chef.isHoldingItem = (syncedItem !== null);

      if (r.heldMesh) {
        r.chef.handAnchor.remove(r.heldMesh);
        r.heldMesh = undefined;
      }

      if (syncedItem) {
        r.heldMesh = Ingredient3DFactory.createMesh(syncedItem);
        r.heldMesh.position.set(0, 0, 0);
        r.chef.handAnchor.add(r.heldMesh);
      }
    };
    room.onMessage('remote_held_update', handleHeldSync);
    room.onMessage('held_update', handleHeldSync);

    // Remote player dash broadcast
    room.onMessage('remote_player_dash', (data: { id: string; dirX: number; dirZ: number; duration: number }) => {
      const r = this.remotePlayers.get(data.id);
      if (r) {
        r.chef.triggerDash(data.duration || this.dashDuration);
        this.sound.playDash();
        this.particles.emitDashDust(r.chef.group.position.x, 0, r.chef.group.position.z, data.dirX, data.dirZ);
      }
    });

    // 3. Remote counter update (Preserves active 3D mesh & timers if item type hasn't changed!)
    const handleCounterSync = (data: {
      id: string;
      item: KitchenItem | null;
      surfaceItems?: KitchenItem[];
      cutProgress?: number;
      stoveState?: StoveState;
      cookTimer?: number;
      burnTimer?: number;
      cookingTimer?: number;
      isOnFire?: boolean;
      fireIntensity?: number;
    }) => {
      const counter = this.map.counters.get(data.id);
      if (!counter) return;

      const prevType = counter.currentItem?.type ?? null;
      const nextType = data.item?.type ?? null;
      const prevPlate = JSON.stringify(counter.currentItem?.plateContents ?? []);
      const nextPlate = JSON.stringify(data.item?.plateContents ?? []);

      counter.currentItem = data.item;
      if (data.cutProgress !== undefined) counter.cutProgress = data.cutProgress;
      if (data.stoveState !== undefined) counter.stoveState = data.stoveState;
      if (data.cookTimer !== undefined) counter.cookTimer = data.cookTimer;
      if (data.burnTimer !== undefined) counter.burnTimer = data.burnTimer;
      if (data.cookingTimer !== undefined) counter.cookingTimer = data.cookingTimer;
      if (data.isOnFire !== undefined) counter.isOnFire = data.isOnFire;
      if (data.fireIntensity !== undefined) counter.fireIntensity = data.fireIntensity;

      if (data.surfaceItems !== undefined) {
        counter.surfaceItems = data.surfaceItems;
        this.map.rebuildSurfaceMeshes(counter);
      }

      // Only rebuild the 3D mesh if the item type or plate contents actually changed!
      if (prevType !== nextType || prevPlate !== nextPlate) {
        counter.itemHolder.clear();
        if (data.item) {
          const mesh = Ingredient3DFactory.createMesh(data.item);
          counter.itemHolder.add(mesh);
        }
      }
    };
    room.onMessage('remote_counter_update', handleCounterSync);
    room.onMessage('counter_update', handleCounterSync);
    room.onMessage('server_stove_sync', handleCounterSync);

    // Remote fire & extinguisher spray sync
    room.onMessage('remote_fire_update', (data: { id: string; isOnFire: boolean; fireIntensity: number }) => {
      const counter = this.map.counters.get(data.id);
      if (counter) {
        counter.isOnFire = data.isOnFire;
        counter.fireIntensity = data.fireIntensity;
      }
    });

    room.onMessage('remote_player_spray', (data: { id: string; x: number; z: number; dirX: number; dirZ: number }) => {
      if (data.id === this.network.mySessionId) return;
      this.particles.emitExtinguisherFoam(data.x, 0.78, data.z, data.dirX, data.dirZ);
      this.sound.playExtinguisherSpray();
    });

    // 4. Remote thrown item
    room.onMessage('remote_throw_item', (data: { item: KitchenItem; fromX: number; fromZ: number; toX: number; toZ: number }) => {
      const thrown = new ThrownItem3D(data.item, data.fromX, data.fromZ, data.toX, data.toZ);
      this.thrownItems.push(thrown);
      this.scene.add(thrown.mesh);
      this.sound.playThrow();
    });

    // 5. Score & orders sync from host
    const handleScoreSync = (data: { score: number; combo: number }) => {
      this.recipeManager.score = data.score;
      this.recipeManager.combo = data.combo;
    };
    room.onMessage('remote_score_update', handleScoreSync);
    room.onMessage('score_update', handleScoreSync);

    room.onMessage('remote_orders_update', (data: { orders: any[] }) => {
      this.hud.updateOrders(data.orders);
    });
    room.onMessage('orders_update', (orders: any[]) => {
      if (Array.isArray(orders)) {
        this.hud.updateOrders(orders);
      }
    });
  }

  private renderLoop(currentTime: number) {
    if (!this.isRunning) return;

    const delta = Math.min((currentTime - this.lastTime) / 1000, 0.1);
    this.lastTime = currentTime;

    this.update(delta);
    this.renderer.render(this.scene, this.cameraSystem.camera);

    requestAnimationFrame(this.renderLoop.bind(this));
  }

  private update(delta: number) {
    if (this.isGameOver) return;

    // 1. Match Timer Countdown
    this.matchTimeRemaining -= delta;
    if (this.matchTimeRemaining <= 0) {
      this.matchTimeRemaining = 0;
      this.isGameOver = true;
      this.hud.showGameOver(this.recipeManager.score);
    }

    // 2. Recipe Orders update
    const orderResult = this.recipeManager.update(delta);
    this.hud.updateScoreAndTimer(this.recipeManager.score, this.recipeManager.combo, this.matchTimeRemaining);
    this.hud.updateOrders(this.recipeManager.getOrders());

    // Dash Cooldown Update (only ticks when not currently dashing)
    if (!this.isDashing && this.dashCooldownTimer > 0) {
      this.dashCooldownTimer -= delta;
      if (this.dashCooldownTimer < 0) this.dashCooldownTimer = 0;
    }
    this.hud.updateDashCooldown(this.dashCooldownTimer, this.dashCooldown);

    // 3. Local Player Movement & Physics
    this.handleMovement(delta);

    // 4. Stoves, Chopping & Station 3D Progress Bars
    this.updateKitchenSimulation(delta);
    this.map.updateStations(delta);

    // 5. Thrown items in flight
    for (let i = this.thrownItems.length - 1; i >= 0; i--) {
      const thrown = this.thrownItems[i];
      const done = thrown.update(delta);
      if (done) {
        this.scene.remove(thrown.mesh);
        this.thrownItems.splice(i, 1);
        this.particles.emitChopCrumbs(thrown.targetX, 0.88, thrown.targetZ);
        this.landThrownItem(thrown.item, thrown.targetX, thrown.targetZ);
      }
    }

    // 6. VFX & Particles
    this.particles.update(delta);

    // 7. Remote Players interpolation
    this.remotePlayers.forEach(r => {
      const dx = r.targetX - r.chef.group.position.x;
      const dz = r.targetZ - r.chef.group.position.z;
      const dist = Math.hypot(dx, dz);
      const isMoving = dist > 0.05;

      r.chef.group.position.x += dx * Math.min(1, delta * 12);
      r.chef.group.position.z += dz * Math.min(1, delta * 12);
      r.chef.update(delta, isMoving);
    });

    // 8. Camera follow
    this.cameraSystem.update(delta, { x: this.playerPos.x, y: 0, z: this.playerPos.z });

    // 9. Check facing counter for interaction & highlight
    this.updateFacingCounter();

    // 10. Handle mobile inputs
    this.processMobileActions();

    // 11. Multiplayer Network Sync throttled
    this.syncNetworkPosition();
  }

  private handleMovement(delta: number) {
    // Handle Active Dash Movement (220ms burst with smooth deceleration & zero recovery freeze)
    if (this.isDashing) {
      this.isPlayerMoving = true;
      this.cancelActiveWorkOnMove();

      this.dashTimer -= delta;
      this.dashParticleTimer += delta;
      if (this.dashParticleTimer >= 0.045) {
        this.dashParticleTimer = 0;
        this.particles.emitDashDust(this.playerPos.x, 0, this.playerPos.z, this.dashDirection.x, this.dashDirection.z);
      }

      if (this.dashTimer <= 0) {
        this.isDashing = false;
        this.dashTimer = 0;
        // Cooldown (0.40s) starts AFTER Dash finishes!
        this.dashCooldownTimer = this.dashCooldown;
      }

      // Smooth cubic ease-out deceleration toward the end of the dash
      const progress = Math.max(0, Math.min(1, 1 - this.dashTimer / this.dashDuration));
      const dynamicMultiplier = 1 + (this.dashSpeedMultiplier - 1) * (1 - progress * progress * 0.45);
      const dashSpeed = this.playerSpeed * dynamicMultiplier;
      const nextX = this.playerPos.x + this.dashDirection.x * dashSpeed * delta;
      const nextZ = this.playerPos.z + this.dashDirection.z * dashSpeed * delta;

      const resolved = this.physics.resolveCollision(nextX, nextZ, 0.38);
      this.playerPos.x = resolved.x;
      this.playerPos.z = resolved.z;

      this.localPlayer.group.position.x = this.playerPos.x;
      this.localPlayer.group.position.z = this.playerPos.z;
      this.localPlayer.update(delta, true);
      return;
    }

    let moveX = 0;
    let moveZ = 0;

    // Desktop keyboard
    if (this.keys['KeyW'] || this.keys['ArrowUp']) moveZ -= 1;
    if (this.keys['KeyS'] || this.keys['ArrowDown']) moveZ += 1;
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) moveX -= 1;
    if (this.keys['KeyD'] || this.keys['ArrowRight']) moveX += 1;

    // Mobile Virtual Joystick
    if (this.hud.inputs.moveX !== 0 || this.hud.inputs.moveZ !== 0) {
      moveX = this.hud.inputs.moveX;
      moveZ = this.hud.inputs.moveZ;
    }

    const isMoving = Math.hypot(moveX, moveZ) > 0.1;
    this.isPlayerMoving = isMoving;

    if (isMoving) {
      // Immediately cancel any active chopping/cooking animation if player moves!
      // (Cutting board retains its current cutProgress; stove continues cooking on its own)
      this.cancelActiveWorkOnMove();

      // Normalize
      const len = Math.hypot(moveX, moveZ);
      const normX = moveX / len;
      const normZ = moveZ / len;

      this.facingDir = { x: normX, z: normZ };
      const targetAngle = Math.atan2(normX, normZ);
      this.localPlayer.setRotation(targetAngle);

      // Desired position
      const nextX = this.playerPos.x + normX * this.playerSpeed * delta;
      const nextZ = this.playerPos.z + normZ * this.playerSpeed * delta;

      // Smooth Circle-to-AABB slide collision against counters & walls!
      const resolved = this.physics.resolveCollision(nextX, nextZ, 0.38);
      this.playerPos.x = resolved.x;
      this.playerPos.z = resolved.z;
    }

    this.localPlayer.group.position.x = this.playerPos.x;
    this.localPlayer.group.position.z = this.playerPos.z;
    this.localPlayer.update(delta, isMoving);
  }

  private cancelActiveWorkOnMove() {
    if (this.activeChopCounter) {
      this.activeChopCounter.isActivelyChopping = false;
      this.activeChopCounter = null;
      this.localPlayer.isChopping = false;
      this.syncPlayerAnim('IDLE');
      if (this.config.isMultiplayer && this.network.room) {
        this.network.room.send('stop_action');
      }
    }
    if (this.activeCookCounter) {
      this.activeCookCounter = null;
      this.cookAnimTimer = 0;
      this.localPlayer.isCooking = false;
      this.syncPlayerAnim('IDLE');
    }
  }

  private isChoppable(type: IngredientType): boolean {
    return (
      type === IngredientType.LETTUCE ||
      type === IngredientType.TOMATO ||
      type === IngredientType.CHEESE ||
      type === IngredientType.ONION ||
      type === IngredientType.POTATO
    );
  }

  private isCookable(type: IngredientType): boolean {
    return this.isRawCookable(type) || this.isAlreadyCooked(type);
  }

  private isRawCookable(type: IngredientType): boolean {
    return (
      type === IngredientType.RAW_MEAT ||
      type === IngredientType.CHICKEN ||
      type === IngredientType.FISH ||
      type === IngredientType.SHRIMP ||
      type === IngredientType.EGG ||
      type === IngredientType.POTATO ||
      type === IngredientType.CHOPPED_POTATO
    );
  }

  private isAlreadyCooked(type: IngredientType): boolean {
    return (
      type === IngredientType.COOKED_PATTY ||
      type === IngredientType.COOKED_CHICKEN ||
      type === IngredientType.COOKED_FISH ||
      type === IngredientType.COOKED_SHRIMP ||
      type === IngredientType.FRIED_EGG
    );
  }

  private faceCounter(counter: Counter3DData) {
    const dx = counter.x - this.playerPos.x;
    const dz = counter.z - this.playerPos.z;
    const len = Math.hypot(dx, dz) || 1;
    this.facingDir = { x: dx / len, z: dz / len };
    this.localPlayer.setRotation(Math.atan2(this.facingDir.x, this.facingDir.z));
  }

  private syncPlayerAnim(anim: string, counterId?: string) {
    const key = `${anim}_${counterId || ''}`;
    if (this.lastSyncedAnim === key) return;
    this.lastSyncedAnim = key;
    if (this.config.isMultiplayer && this.network.room) {
      this.network.room.send('player_anim', { anim, counterId });
    }
  }

  private updateFacingCounter() {
    // Check counter in front of player (or nearest reachable counter within interaction radius)
    const checkX = this.playerPos.x + this.facingDir.x * 0.82;
    const checkZ = this.playerPos.z + this.facingDir.z * 0.82;

    let closest: Counter3DData | null = null;
    let minDist = 0.98;

    for (const c of this.map.counters.values()) {
      const dist = Math.hypot(c.x - checkX, c.z - checkZ);
      if (dist < minDist) {
        minDist = dist;
        closest = c;
      }
    }

    this.currentFacingCounter = closest;

    if (closest) {
      this.targetCounterHighlight.position.set(closest.x, 0.842, closest.z);
      this.targetCounterHighlight.visible = true;
    } else {
      this.targetCounterHighlight.visible = false;
    }

    // Update Contextual Smart Action Button (Phase 7)
    this.updateContextualHUD();
  }

  private getCrateDisplayName(type: CounterType): string {
    switch (type) {
      case CounterType.CRATE_BREAD:
        return 'Bánh Mì 🍞';
      case CounterType.CRATE_MEAT:
        return 'Thịt Bò 🥩';
      case CounterType.CRATE_LETTUCE:
        return 'Xà Lách 🥬';
      case CounterType.CRATE_TOMATO:
        return 'Cà Chua 🍅';
      case CounterType.CRATE_CHEESE:
        return 'Phô Mai 🧀';
      case CounterType.CRATE_PLATE:
        return 'Đĩa Sứ 🍽️';
      default:
        return 'Nguyên Liệu 📦';
    }
  }

  private updateContextualHUD() {
    const isTouch = this.hud.isMobileTouchMode();

    // Priority 1: Player is holding the Fire Extinguisher -> Hold-to-Spray Foam button!
    if (this.heldItem && this.heldItem.type === IngredientType.FIRE_EXTINGUISHER) {
      this.hud.updateContextualActionButton('🧯<br>Phun bọt', '#0ea5e9', true);
      this.hud.updateInteractionPrompt(
        isTouch
          ? '🧯 Giữ nút <b>[Phun bọt]</b> để chữa cháy &nbsp;•&nbsp; <b>[Cầm/Thả]</b> Đặt bình'
          : '🧯 Giữ <b>[Space]</b> để phun bọt chữa cháy &nbsp;•&nbsp; <b>[E]</b> Đặt bình xuống bàn',
        '#0ea5e9',
        true
      );
      return;
    }

    const c = this.currentFacingCounter;
    if (!c) {
      this.hud.updateContextualActionButton('🔪<br>Cắt/Nấu', '#475569', false);
      this.hud.updateInteractionPrompt('', '#38bdf8', false);
      return;
    }

    if (c.isOnFire) {
      this.hud.updateContextualActionButton('🔥<br>Đang cháy', '#ef4444', false);
      this.hud.updateInteractionPrompt(
        '🔥 Trạm đang cháy! Hãy lấy <b>Bình Cứu Hỏa (🧯)</b> ở góc phải trên!',
        '#ef4444',
        true
      );
      return;
    }

    if (c.type === CounterType.CUTTING_BOARD) {
      const canChopBoard = c.currentItem !== null && c.currentItem !== undefined && this.isChoppable(c.currentItem.type);
      const canPlaceAndChop = !c.currentItem && this.heldItem !== null && this.isChoppable(this.heldItem.type);
      const active = canChopBoard || canPlaceAndChop;
      this.hud.updateContextualActionButton(
        '🔪<br>Cắt',
        active ? '#f97316' : '#475569',
        active
      );
      if (active) {
        this.hud.updateInteractionPrompt(
          isTouch
            ? '🔪 Chạm <b>[Cắt]</b> để sơ chế &nbsp;•&nbsp; <b>[Cầm/Thả]</b> Đặt / Lấy'
            : '🔪 <b>[Space]</b> Cắt tự động &nbsp;•&nbsp; <b>[E]</b> Đặt / Lấy nguyên liệu',
          '#f97316',
          true
        );
      } else if (c.currentItem && !this.heldItem) {
        this.hud.updateInteractionPrompt(
          isTouch ? '✋ Chạm <b>[Cầm/Thả]</b> để nhặt nguyên liệu đã cắt' : '✋ <b>[E]</b> Nhặt nguyên liệu đã sơ chế',
          '#10b981',
          true
        );
      } else {
        this.hud.updateInteractionPrompt('🔪 Thớt Sơ Chế — Đặt Rau / Cà Chua / Phô Mai để cắt', '#64748b', true);
      }
      return;
    }

    if (c.type === CounterType.STOVE) {
      const canCookStove = c.currentItem !== null && c.currentItem !== undefined && this.isCookable(c.currentItem.type);
      const canPlaceAndCook = !c.currentItem && this.heldItem !== null && this.isCookable(this.heldItem.type);
      const active = canCookStove || canPlaceAndCook;
      this.hud.updateContextualActionButton(
        '🍳<br>Nấu',
        active ? '#ea580c' : '#475569',
        active
      );
      if (c.currentItem && !this.heldItem) {
        this.hud.updateInteractionPrompt(
          isTouch
            ? '🍳 Chạm <b>[Cầm/Thả]</b> Nhặt thịt khỏi chảo &nbsp;•&nbsp; <b>[Nấu]</b> Đảo thịt'
            : '🍳 <b>[E]</b> Nhặt thịt khỏi chảo &nbsp;•&nbsp; <b>[Space]</b> Đảo thịt',
          '#ea580c',
          true
        );
      } else if (canPlaceAndCook) {
        this.hud.updateInteractionPrompt(
          isTouch ? '🍳 Chạm <b>[Cầm/Thả]</b> hoặc <b>[Nấu]</b> để đặt thịt lên chảo' : '🍳 <b>[E / Space]</b> Đặt thịt lên chảo nướng',
          '#ea580c',
          true
        );
      } else {
        this.hud.updateInteractionPrompt('🍳 Bếp Nướng — Đặt Thịt Bò Sống lên chảo để áp chảo', '#64748b', true);
      }
      return;
    }

    if (c.id === 'counter_1_-3') {
      // Sink
      this.hud.updateContextualActionButton('💧<br>Rửa', '#0284c7', true);
      this.hud.updateInteractionPrompt(
        isTouch ? '💧 Chạm <b>[Rửa]</b> tại Bồn Rửa' : '💧 <b>[Space]</b> Rửa đĩa / Tráng tay tại Bồn Rửa',
        '#0284c7',
        true
      );
      return;
    }

    if (c.type === CounterType.DELIVERY) {
      const canDeliver = this.heldItem !== null && this.heldItem.type === IngredientType.PLATE;
      this.hud.updateContextualActionButton(
        '🛎️<br>Giao món',
        canDeliver ? '#10b981' : '#475569',
        canDeliver
      );
      this.hud.updateInteractionPrompt(
        canDeliver
          ? isTouch
            ? '🛎️ Chạm <b>[Giao món]</b> hoặc <b>[Cầm/Thả]</b> để phục vụ!'
            : '🛎️ <b>[E / Space]</b> Giao Đĩa Món Ăn hoàn chỉnh để nhận điểm!'
          : '🛎️ Quầy Giao Món — Hãy cầm Đĩa (🍽️) có món ăn hoàn chỉnh tới đây',
        canDeliver ? '#10b981' : '#64748b',
        true
      );
      return;
    }

    if (c.type === CounterType.TRASH) {
      this.hud.updateContextualActionButton('🗑️<br>Bỏ rác', '#ef4444', Boolean(this.heldItem));
      this.hud.updateInteractionPrompt(
        this.heldItem
          ? isTouch
            ? '🗑️ Chạm <b>[Cầm/Thả]</b> để bỏ vật phẩm vào Thùng Rác'
            : '🗑️ <b>[E]</b> Bỏ vật phẩm đang cầm vào Thùng Rác'
          : '🗑️ Thùng Rác',
        '#ef4444',
        true
      );
      return;
    }

    // Ingredient Storage Bin contextual action (PHẦN 2.4 & PHẦN 3):
    // Strict separation between taking raw ingredients from inside the bin ([E] / Cầm/Thả) and surface items ([Space/F] / Nhặt mặt)!
    if (c.type.startsWith('crate_')) {
      const binName = this.getCrateDisplayName(c.type);
      const count = c.surfaceItems.length;

      if (!this.heldItem && count > 0) {
        this.hud.updateContextualActionButton('✋<br>Nhặt mặt', '#0ea5e9', true);
        this.hud.updateInteractionPrompt(
          isTouch
            ? `📦 <b>[Cầm/Thả]</b> Lấy ${binName} &nbsp;•&nbsp; ✋ <b>[Nhặt mặt]</b> Nhặt trên thùng (${count}/6)`
            : `📦 <b>[E]</b> Lấy ${binName} từ thùng &nbsp;•&nbsp; ✋ <b>[Space / F]</b> Nhặt vật phẩm trên mặt thùng (${count}/6)`,
          '#0ea5e9',
          true
        );
        return;
      }
      if (!this.heldItem) {
        this.hud.updateContextualActionButton('📦<br>Lấy đồ', '#10b981', true);
        this.hud.updateInteractionPrompt(
          isTouch
            ? `📦 Chạm <b>[Cầm/Thả]</b> để lấy ${binName} từ thùng`
            : `📦 <b>[E / Space]</b> Lấy ${binName} mới từ trong thùng`,
          '#10b981',
          true
        );
        return;
      }
      if (this.heldItem && count < 6) {
        this.hud.updateContextualActionButton('🔄<br>Đặt & Lấy', '#0ea5e9', true);
        this.hud.updateInteractionPrompt(
          isTouch
            ? `📥 <b>[Cầm/Thả]</b> Đặt lên thùng (${count}/6) &nbsp;•&nbsp; 🔄 <b>[Đặt & Lấy]</b> Lấy ${binName}`
            : `📥 <b>[E]</b> Đặt lên mặt thùng (${count}/6) &nbsp;•&nbsp; 🔄 <b>[Space]</b> Đặt lên mặt & Lấy ${binName}`,
          '#10b981',
          true
        );
        return;
      }
      if (this.heldItem && count >= 6) {
        this.hud.updateContextualActionButton('📥<br>Đặt cạnh', '#f59e0b', true);
        this.hud.updateInteractionPrompt(
          isTouch
            ? `📦 Mặt thùng đầy (6/6) — Chạm <b>[Cầm/Thả]</b> đặt sang bàn kế bên`
            : `📦 Mặt thùng đã đầy (6/6) — <b>[E]</b> Tự động đặt sang bàn trống kế bên`,
          '#f59e0b',
          true
        );
        return;
      }
    }

    // Regular Countertop prompts
    this.hud.updateContextualActionButton('🔪<br>Cắt/Nấu', '#475569', false);
    if (!this.heldItem && c.currentItem) {
      this.hud.updateInteractionPrompt(
        isTouch ? '✋ Chạm <b>[Cầm/Thả]</b> để nhặt vật phẩm trên bàn' : '✋ <b>[E]</b> Nhặt vật phẩm trên mặt bàn',
        '#38bdf8',
        true
      );
    } else if (this.heldItem && !c.currentItem) {
      this.hud.updateInteractionPrompt(
        isTouch ? '📥 Chạm <b>[Cầm/Thả]</b> để đặt vật phẩm xuống bàn' : '📥 <b>[E]</b> Đặt vật phẩm xuống mặt bàn',
        '#38bdf8',
        true
      );
    } else if (this.heldItem && c.currentItem) {
      this.hud.updateInteractionPrompt(
        isTouch ? '🍽️ Chạm <b>[Cầm/Thả]</b> để ghép nguyên liệu vào Đĩa' : '🍽️ <b>[E]</b> Ghép nguyên liệu vào Đĩa',
        '#10b981',
        true
      );
    } else {
      this.hud.updateInteractionPrompt('', '#38bdf8', false);
    }
  }

  private updateKitchenSimulation(delta: number) {
    // 1. SMART CHOPPING SYSTEM (Continuous Auto-Chop after single tap until completed or player moves!)
    if (this.activeChopCounter) {
      const c = this.activeChopCounter;
      const dist = Math.hypot(c.x - this.playerPos.x, c.z - this.playerPos.z);

      if (
        this.isPlayerMoving ||
        this.isDashing ||
        dist > 1.45 ||
        !c.currentItem ||
        !this.isChoppable(c.currentItem.type)
      ) {
        // Interrupted by movement or item removed -> stop chopping, retain progress!
        c.isActivelyChopping = false;
        this.activeChopCounter = null;
        this.localPlayer.isChopping = false;
        this.syncPlayerAnim('IDLE');
      } else {
        // Continue automatic chopping!
        c.isActivelyChopping = true;
        this.localPlayer.isChopping = true;
        this.faceCounter(c);

        c.cutProgress += delta * 0.50; // Exactly 2.0 seconds total from 0% to 100%
        this.chopEffectTimer += delta;
        if (this.chopEffectTimer >= 0.22) {
          this.chopEffectTimer = 0;
          this.sound.playChop();
          this.particles.emitChopCrumbs(c.x, 0.95, c.z);
          if (this.config.isMultiplayer && this.network.room) {
            this.network.room.send('player_action', { counterId: c.id, delta: 0.22 });
          }
        }

        if (c.cutProgress >= 1.0) {
          // Chopping complete!
          c.cutProgress = 0;
          c.isActivelyChopping = false;
          this.activeChopCounter = null;
          this.localPlayer.isChopping = false;

          this.transformSlicedIngredient(c.currentItem);
          c.itemHolder.clear();
          c.itemHolder.add(Ingredient3DFactory.createMesh(c.currentItem));
          this.map.triggerCounterBounce(c.id);
          this.sound.playPickup();
          this.broadcastCounterUpdate(c);
          this.syncPlayerAnim('IDLE');
        }
      }
    }

    // 2. SMART COOKING CHEF ANIMATION TIMER (Chef stirs/tends pan while standing at stove)
    if (this.activeCookCounter) {
      const c = this.activeCookCounter;
      const dist = Math.hypot(c.x - this.playerPos.x, c.z - this.playerPos.z);
      this.cookAnimTimer -= delta;
      if (this.isPlayerMoving || this.isDashing || dist > 1.45 || !c.currentItem || this.cookAnimTimer <= 0) {
        this.activeCookCounter = null;
        this.cookAnimTimer = 0;
        this.localPlayer.isCooking = false;
        this.syncPlayerAnim('IDLE');
      } else {
        this.localPlayer.isCooking = true;
        this.faceCounter(c);
      }
    }

    // 2.5. FIRE EXTINGUISHER SPRAY SYSTEM (Hold [Space] or Hold Mobile Contextual Button while holding extinguisher)
    const isSpraying =
      this.heldItem?.type === IngredientType.FIRE_EXTINGUISHER &&
      (this.keys['Space'] || this.hud.inputs.isActionPressed);

    if (isSpraying) {
      this.sprayEffectTimer += delta;
      if (this.sprayEffectTimer >= 0.045) {
        this.sprayEffectTimer = 0;
        this.particles.emitExtinguisherFoam(
          this.playerPos.x,
          0.75,
          this.playerPos.z,
          this.facingDir.x,
          this.facingDir.z
        );
        this.sound.playExtinguisherSpray();
      }

      if (this.config.isMultiplayer && this.network.room) {
        this.spraySyncTimer += delta;
        if (this.spraySyncTimer >= 0.08) {
          this.spraySyncTimer = 0;
          this.network.room.send('player_spray', {
            x: this.playerPos.x,
            z: this.playerPos.z,
            dirX: this.facingDir.x,
            dirZ: this.facingDir.z
          });
        }
      }

      // Check all burning counters within 3.0 units & 45-degree cone (±22.5°) in front of player
      const cosHalfCone = Math.cos(((CookingConfig.fire.sprayAngleDeg * 0.5) * Math.PI) / 180);
      this.map.counters.forEach((c) => {
        if (!c.isOnFire || (c.fireIntensity ?? 0) <= 0) return;

        const dx = c.x - this.playerPos.x;
        const dz = c.z - this.playerPos.z;
        const dist = Math.hypot(dx, dz);

        if (dist <= CookingConfig.fire.sprayRange && dist > 0.01) {
          const dot = (dx / dist) * this.facingDir.x + (dz / dist) * this.facingDir.z;
          // Inside 45° cone OR standing directly adjacent facing the counter
          if (dot >= cosHalfCone || (dist <= 1.25 && dot >= 0.55)) {
            c.fireSpreadTimer = 0; // Pause fire spread while being sprayed
            c.fireIntensity = Math.max(
              0,
              (c.fireIntensity ?? 1.0) - delta / CookingConfig.fire.extinguishDuration
            );

            if (c.fireIntensity <= 0) {
              c.isOnFire = false;
              c.fireIntensity = 0;
              c.fireSpreadTimer = 0;
              this.sound.playCookedReady();
              this.hud.showFloatingPopup('🧯 ĐÃ DẬP LỬA THÀNH CÔNG!', '#0ea5e9');
            }

            if (this.config.isMultiplayer && this.network.room) {
              this.network.room.send('fire_update', {
                id: c.id,
                isOnFire: c.isOnFire,
                fireIntensity: c.fireIntensity
              });
            }
          }
        }
      });
    }

    // 3. AUTONOMOUS STOVE SIMULATION & FIRE SPREAD SYSTEM
    let burningCount = 0;
    this.map.counters.forEach((c) => {
      if (c.isOnFire) burningCount++;
    });

    this.map.counters.forEach((c) => {
      // 3A. Active Fire VFX & Bounded Spread (Max 3 burning counters)
      if (c.isOnFire) {
        if (Math.random() < 0.25) {
          this.particles.emitFireEmbers(c.x, 1.05, c.z);
        }
        if (Math.random() < 0.18) {
          this.particles.emitBurntSmoke(c.x, 1.15, c.z);
        }

        c.fireSpreadTimer = (c.fireSpreadTimer || 0) + delta;
        if (c.fireSpreadTimer >= CookingConfig.fire.fireSpreadInterval) {
          c.fireSpreadTimer = 0;
          if (burningCount < CookingConfig.fire.fireSpreadLimit) {
            // Find an adjacent counter that is not on fire and not delivery/trash/extinguisher station
            for (const neighbor of this.map.counters.values()) {
              if (
                neighbor.id !== c.id &&
                !neighbor.isOnFire &&
                neighbor.type !== CounterType.DELIVERY &&
                neighbor.type !== CounterType.TRASH &&
                neighbor.id !== 'counter_3_-3'
              ) {
                const dist = Math.hypot(neighbor.x - c.x, neighbor.z - c.z);
                if (dist <= 1.2) {
                  neighbor.isOnFire = true;
                  neighbor.fireIntensity = 1.0;
                  neighbor.fireSpreadTimer = 0;
                  burningCount++;
                  this.sound.playFireIgnite();
                  this.hud.showFloatingPopup('🔥 LỬA LAN SANG BÀN BÊN CẠNH!', '#ef4444');
                  if (this.config.isMultiplayer && this.network.room) {
                    this.network.room.send('fire_update', {
                      id: neighbor.id,
                      isOnFire: true,
                      fireIntensity: 1.0
                    });
                  }
                  break;
                }
              }
            }
          }
        }
        // Burning stove cannot cook until extinguished!
        return;
      }

      // 3B. STRICT 4-STAGE COOKING STATE MACHINE (RAW -> COOKING -> COOKED -> BURNED)
      // Uses two completely independent timers:
      // - c.cookTimer (0 -> cookDuration, e.g. 8.0s for Beef)
      // - c.burnTimer (0 -> 13.0s AFTER cooked: 0-5s SAFE, 5-10s WARNING, 10-13s DANGER, >=13s BURNED)
      if (c.type === CounterType.STOVE && c.currentItem && this.isCookable(c.currentItem.type)) {
        const cookDuration = CookingConfig.getCookDuration(c.currentItem.type);
        const safeDur = CookingConfig.burnTimeline.safeDuration;            // 5.0s
        const warnDur = CookingConfig.burnTimeline.warningDuration;         // 5.0s
        const totalBurnDur = CookingConfig.burnTimeline.totalPostCookedTime; // 13.0s

        this.sound.playSizzle();
        if (Math.random() < 0.22) {
          this.particles.emitSteam(c.x, 0.96, c.z);
        }

        // STAGE 1: COOKING (Raw ingredient on stove -> counts cookTimer from 0 to cookDuration)
        // Rule 1 & Rule 4: Raw/Cooking meat can ONLY transition to COOKED when cookTimer >= cookDuration, NEVER to BURNED!
        if (this.isRawCookable(c.currentItem.type)) {
          c.stoveState = StoveState.COOKING;
          c.burnTimer = 0; // Strictly 0 while cooking
          c.cookTimer = (c.cookTimer || 0) + delta;
          c.cookingTimer = c.cookTimer;

          c.currentItem.cookTimer = c.cookTimer;
          c.currentItem.burnTimer = 0;
          c.currentItem.cookingTimer = c.cookTimer;
          c.currentItem.stoveState = StoveState.COOKING;

          if (c.cookTimer >= cookDuration) {
            // Transition COOKING -> COOKED!
            // Rule 3: Explicitly initialize burnTimer = 0 from the moment it becomes COOKED!
            c.currentItem.type = CookingConfig.getCookedCounterpart(c.currentItem.type);
            c.stoveState = StoveState.COOKED;
            c.cookTimer = cookDuration;
            c.burnTimer = 0;
            c.cookingTimer = cookDuration;
            c.beepTimer = 0;

            c.currentItem.cookTimer = cookDuration;
            c.currentItem.burnTimer = 0;
            c.currentItem.cookingTimer = cookDuration;
            c.currentItem.stoveState = StoveState.COOKED;

            c.itemHolder.clear();
            c.itemHolder.add(Ingredient3DFactory.createMesh(c.currentItem));
            this.map.triggerCounterBounce(c.id);
            this.sound.playCookedReady();
            this.hud.showFloatingPopup('✅ THỊT ĐÃ CHÍN! LẤY RA TRƯỚC KHI CHÁY!', '#10b981');
            if (!this.config.isMultiplayer || this.network.isHost) {
              this.broadcastCounterUpdate(c);
            }
            // Exit this frame's tick so burnTimer starts cleanly at 0 on the next frame!
            return;
          }
        }
        // STAGE 2: POST-COOKED BURN TIMELINE (Only runs when item is ALREADY COOKED!)
        // Rule 2: Only transitions COOKED -> BURNED after full 13.0s burnTimer completes!
        else if (this.isAlreadyCooked(c.currentItem.type)) {
          c.cookTimer = cookDuration;
          c.burnTimer = (c.burnTimer || 0) + delta;
          c.cookingTimer = cookDuration + c.burnTimer;

          c.currentItem.cookTimer = cookDuration;
          c.currentItem.burnTimer = c.burnTimer;
          c.currentItem.cookingTimer = c.cookingTimer;

          if (c.burnTimer < safeDur) {
            // 0–5s after cooked: COOKED (Safe window)
            c.stoveState = StoveState.COOKED;
            c.currentItem.stoveState = StoveState.COOKED;
          } else if (c.burnTimer < safeDur + warnDur) {
            // 5–10s after cooked: WARNING (⚠️ + light smoke + periodic beep)
            const prevState = c.stoveState;
            c.stoveState = StoveState.WARNING;
            c.currentItem.stoveState = StoveState.WARNING;
            if (prevState !== StoveState.WARNING && (!this.config.isMultiplayer || this.network.isHost)) {
              this.broadcastCounterUpdate(c);
            }
            if (Math.random() < 0.15) {
              this.particles.emitSteam(c.x, 0.98, c.z);
            }
            c.beepTimer = (c.beepTimer || 0) + delta;
            if (c.beepTimer >= 0.85) {
              c.beepTimer = 0;
              this.sound.playBeep(false);
            }
          } else if (c.burnTimer < totalBurnDur) {
            // 10–13s after cooked: DANGER (🔥 + heavier dark smoke + rapid urgent beep)
            const prevState = c.stoveState;
            c.stoveState = StoveState.DANGER;
            c.currentItem.stoveState = StoveState.DANGER;
            if (prevState !== StoveState.DANGER && (!this.config.isMultiplayer || this.network.isHost)) {
              this.broadcastCounterUpdate(c);
            }
            if (Math.random() < 0.35) {
              this.particles.emitBurntSmoke(c.x, 0.98, c.z);
            }
            c.beepTimer = (c.beepTimer || 0) + delta;
            if (c.beepTimer >= 0.30) {
              c.beepTimer = 0;
              this.sound.playBeep(true);
            }
          } else {
            // >= 13.0s after cooked: Transition COOKED -> BURNED & Ignite Stove!
            c.currentItem.type = IngredientType.BURNT_PATTY;
            c.stoveState = StoveState.BURNT;
            c.burnTimer = totalBurnDur;
            c.currentItem.burnTimer = totalBurnDur;
            c.currentItem.stoveState = StoveState.BURNT;

            c.isOnFire = true;
            c.fireIntensity = 1.0;
            c.fireSpreadTimer = 0;

            this.particles.emitBurntSmoke(c.x, 0.98, c.z);
            this.particles.emitFireEmbers(c.x, 1.05, c.z);
            this.sound.playFireIgnite();
            this.hud.showFloatingPopup('🔥 THỨC ĂN CHÁY! BẾP ĐANG BỐC LỬA (DÙNG 🧯)!', '#ef4444');

            c.itemHolder.clear();
            c.itemHolder.add(Ingredient3DFactory.createMesh(c.currentItem));
            if (!this.config.isMultiplayer || this.network.isHost) {
              this.broadcastCounterUpdate(c);
            }
          }
        }
      }
    });
  }

  private transformSlicedIngredient(item: KitchenItem) {
    if (item.type === IngredientType.LETTUCE) item.type = IngredientType.CHOPPED_LETTUCE;
    else if (item.type === IngredientType.TOMATO) item.type = IngredientType.SLICED_TOMATO;
    else if (item.type === IngredientType.CHEESE) item.type = IngredientType.SLICED_CHEESE;
    else if (item.type === IngredientType.ONION) item.type = IngredientType.SLICED_ONION;
    else if (item.type === IngredientType.POTATO) item.type = IngredientType.CHOPPED_POTATO;
  }

  private processMobileActions() {
    if (this.hud.inputs.isDashJustPressed) {
      this.hud.inputs.isDashJustPressed = false;
      this.handleDash();
    }
    if (this.hud.inputs.isActionJustPressed) {
      this.hud.inputs.isActionJustPressed = false;
      this.handleSmartAction();
    }
    if (this.hud.inputs.isPickupJustPressed) {
      this.hud.inputs.isPickupJustPressed = false;
      this.handlePickupDrop();
    }
    if (this.hud.inputs.isThrowJustPressed) {
      this.hud.inputs.isThrowJustPressed = false;
      this.handleThrow();
    }
  }

  /**
   * Smart Contextual Action (Triggered by single press of [Space] or Mobile Contextual Button)
   * - Cutting Board: Auto-places held choppable ingredient & starts continuous auto-chopping!
   * - Stove: Auto-places held raw meat onto frying pan & starts cooking!
   * - Sink: Triggers quick dish/hand rinse animation & water splash!
   * - Delivery: Submits held plate!
   */
  private handleSmartAction() {
    this.sound.init();
    // If holding Fire Extinguisher, holding Space/Button is handled continuously in updateKitchenSimulation
    if (this.heldItem && this.heldItem.type === IngredientType.FIRE_EXTINGUISHER) {
      return;
    }

    const counter = this.currentFacingCounter;
    if (!counter) return;

    // Cannot use a station that is currently on fire!
    if (counter.isOnFire) {
      this.sound.playBeep(true);
      this.hud.showFloatingPopup('🧯 HÃY DẬP LỬA TRƯỚC KHI SỬ DỤNG TRẠM NÀY!', '#ef4444');
      return;
    }

    // 1. SMART CHOPPING ON CUTTING BOARD
    if (counter.type === CounterType.CUTTING_BOARD) {
      // If holding a choppable ingredient and board is empty -> auto-place it onto the board!
      if (!counter.currentItem && this.heldItem && this.isChoppable(this.heldItem.type)) {
        counter.currentItem = this.heldItem;
        const mesh = Ingredient3DFactory.createMesh(this.heldItem);
        counter.itemHolder.clear();
        counter.itemHolder.add(mesh);
        this.setHeldItem(null);
        this.map.triggerCounterBounce(counter.id);
        this.sound.playDrop();
        this.broadcastCounterUpdate(counter);
      }

      // If board now has a choppable ingredient -> start continuous auto-chopping!
      if (counter.currentItem && this.isChoppable(counter.currentItem.type)) {
        this.faceCounter(counter);
        this.activeChopCounter = counter;
        counter.isActivelyChopping = true;
        this.localPlayer.isChopping = true;
        this.chopEffectTimer = 0.22; // Trigger first chop sound/crumb immediately
        this.syncPlayerAnim('CHOP', counter.id);
      }
      return;
    }

    // 2. SMART COOKING ON STOVE
    if (counter.type === CounterType.STOVE) {
      // If holding raw/cooked meat and stove is empty -> auto-place into frying pan & restore exact separate timers!
      if (!counter.currentItem && this.heldItem && this.isCookable(this.heldItem.type)) {
        this.placeItemOnStove(counter, this.heldItem);
        this.setHeldItem(null);
        this.map.triggerCounterBounce(counter.id);
        this.sound.playDrop();
        this.broadcastCounterUpdate(counter);
      }

      // Trigger chef cooking animation at stove
      if (counter.currentItem && this.isCookable(counter.currentItem.type)) {
        this.faceCounter(counter);
        this.activeCookCounter = counter;
        this.cookAnimTimer = 1.4;
        this.localPlayer.isCooking = true;
        this.particles.emitSteam(counter.x, 0.98, counter.z);
        this.syncPlayerAnim('COOK', counter.id);
      }
      return;
    }

    // 2.5. INGREDIENT STORAGE BIN SMART ACTION ([Space / F]):
    // - Empty hands + items on top surface -> Picks up the nearest item sitting on top of the bin!
    // - Holding item + free slot on top (< 6) -> Places held item onto bin top surface AND dispenses fresh ingredient from bin!
    // - Empty hands + top surface empty -> Dispenses fresh ingredient from bin!
    if (counter.type.startsWith('crate_')) {
      this.faceCounter(counter);
      if (!this.heldItem && counter.surfaceItems.length > 0) {
        const pickIdx = this.map.getNearestSurfaceItemIndex(
          counter,
          this.playerPos.x + this.facingDir.x * 0.45,
          this.playerPos.z + this.facingDir.z * 0.45
        );
        const [picked] = counter.surfaceItems.splice(pickIdx >= 0 ? pickIdx : counter.surfaceItems.length - 1, 1);
        this.map.rebuildSurfaceMeshes(counter);
        this.setHeldItem(picked);
        this.localPlayer.playOneShot('PICKUP');
        this.syncPlayerAnim('PICKUP');
        this.map.triggerCounterBounce(counter.id);
        this.sound.playPickup();
        this.broadcastCounterUpdate(counter);
        return;
      }
      if (this.heldItem && counter.surfaceItems.length < 6) {
        // Place held item onto flat top surface AND immediately dispense fresh raw ingredient from inside bin!
        counter.surfaceItems.push(this.heldItem);
        const addedIdx = counter.surfaceItems.length - 1;
        this.map.rebuildSurfaceMeshes(counter, addedIdx);
        this.dispenseFromCrate(counter);
        this.broadcastCounterUpdate(counter);
        return;
      }
      this.handlePickupDrop();
      return;
    }

    // 3. SINK INTERACTION
    if (counter.id === 'counter_1_-3') {
      this.faceCounter(counter);
      this.activeCookCounter = counter;
      this.cookAnimTimer = 0.8;
      this.localPlayer.isCooking = true;
      this.map.triggerCounterBounce(counter.id);
      this.particles.emitSteam(counter.x, 0.92, counter.z);
      this.sound.playPickup();
      this.syncPlayerAnim('COOK', counter.id);
      return;
    }

    // 4. DELIVERY COUNTER
    if (counter.type === CounterType.DELIVERY && this.heldItem && this.heldItem.type === IngredientType.PLATE) {
      this.handlePickupDrop();
    }
  }

  /**
   * Dispenses a fresh raw ingredient or clean plate from the interior drawer of an Ingredient Storage Bin.
   * Completely independent of how many items are sitting on the bin's flat top surface!
   */
  private dispenseFromCrate(counter: Counter3DData) {
    let spawnType: IngredientType = IngredientType.BREAD;
    if (counter.type === CounterType.CRATE_BREAD) spawnType = IngredientType.BREAD;
    else if (counter.type === CounterType.CRATE_MEAT) spawnType = IngredientType.RAW_MEAT;
    else if (counter.type === CounterType.CRATE_LETTUCE) spawnType = IngredientType.LETTUCE;
    else if (counter.type === CounterType.CRATE_TOMATO) spawnType = IngredientType.TOMATO;
    else if (counter.type === CounterType.CRATE_CHEESE) spawnType = IngredientType.CHEESE;
    else if (counter.type === CounterType.CRATE_PLATE) spawnType = IngredientType.PLATE;

    this.setHeldItem({
      id: `item_${Date.now()}_${Math.random()}`,
      type: spawnType,
      plateContents: spawnType === IngredientType.PLATE ? [] : undefined,
      cookTimer: 0,
      burnTimer: 0,
      cookingTimer: 0,
      stoveState: StoveState.IDLE
    });
    this.localPlayer.playOneShot('PICKUP');
    this.syncPlayerAnim('PICKUP');
    this.map.triggerCounterBounce(counter.id);
    this.sound.playPickup();
  }

  private handleDash() {
    // Only allow Dash when not already dashing and cooldown has finished
    if (this.isDashing || this.dashCooldownTimer > 0) return;

    this.cancelActiveWorkOnMove();
    this.isDashing = true;
    this.dashTimer = this.dashDuration;

    // Movement direction or facing direction
    let moveX = 0;
    let moveZ = 0;
    if (this.keys['KeyW'] || this.keys['ArrowUp']) moveZ -= 1;
    if (this.keys['KeyS'] || this.keys['ArrowDown']) moveZ += 1;
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) moveX -= 1;
    if (this.keys['KeyD'] || this.keys['ArrowRight']) moveX += 1;
    if (this.hud.inputs.moveX !== 0 || this.hud.inputs.moveZ !== 0) {
      moveX = this.hud.inputs.moveX;
      moveZ = this.hud.inputs.moveZ;
    }

    if (Math.hypot(moveX, moveZ) > 0.1) {
      const len = Math.hypot(moveX, moveZ);
      this.dashDirection = { x: moveX / len, z: moveZ / len };
    } else {
      this.dashDirection = { ...this.facingDir };
    }

    this.facingDir = { ...this.dashDirection };
    this.localPlayer.setRotation(Math.atan2(this.dashDirection.x, this.dashDirection.z));
    this.localPlayer.triggerDash(this.dashDuration);
    this.sound.playDash();
    this.particles.emitDashDust(this.playerPos.x, 0, this.playerPos.z, this.dashDirection.x, this.dashDirection.z);

    if (this.config.isMultiplayer && this.network.room) {
      this.network.room.send('player_dash', {
        dirX: this.dashDirection.x,
        dirZ: this.dashDirection.z,
        duration: this.dashDuration
      });
    }
  }

  private handlePickupDrop() {
    this.sound.init();
    this.cancelActiveWorkOnMove();

    if (!this.currentFacingCounter) {
      // Nothing in front to interact with
      return;
    }

    const counter = this.currentFacingCounter;
    this.faceCounter(counter);

    // 1. INGREDIENT STORAGE BINS (PHẦN 2.3 & 2.4):
    //    - 100% Independence between Ingredient Interaction Zone ([E] when empty-handed ALWAYS dispenses from bin!)
    //      and Placement Surface ([E] when holding places up to 6 items on flat top surface; [Space/F] picks up from top surface!)
    if (counter.type.startsWith('crate_')) {
      if (counter.isOnFire) {
        this.sound.playBeep(true);
        this.hud.showFloatingPopup('🔥 THÙNG ĐANG CHÁY! DÙNG BÌNH CỨU HỎA (🧯) ĐỂ DẬP LỬA!', '#ef4444');
        return;
      }

      // CASE A: Player's hands are EMPTY -> ALWAYS dispense a fresh raw ingredient from inside the storage bin!
      // Having 1, 2, 3, 4, 5, or 6 items on top of the bin NEVER blocks taking raw ingredients!
      if (!this.heldItem) {
        this.dispenseFromCrate(counter);
        return;
      }

      // CASE B: Player IS holding an item -> Assemble with a Plate on top OR place onto the bin's flat top surface (up to 6 items)!
      if (
        this.heldItem.type !== IngredientType.PLATE &&
        this.heldItem.type !== IngredientType.FIRE_EXTINGUISHER &&
        this.heldItem.type !== IngredientType.BURNT_PATTY
      ) {
        const plateIdx = counter.surfaceItems.findIndex((it) => it.type === IngredientType.PLATE);
        if (plateIdx >= 0) {
          const plateOnBin = counter.surfaceItems[plateIdx];
          if (!plateOnBin.plateContents) plateOnBin.plateContents = [];
          plateOnBin.plateContents.push(this.heldItem.type);
          this.map.rebuildSurfaceMeshes(counter, plateIdx);
          this.setHeldItem(null);
          this.localPlayer.playOneShot('DROP');
          this.syncPlayerAnim('DROP');
          this.map.triggerCounterBounce(counter.id);
          this.sound.playDrop();
          this.broadcastCounterUpdate(counter);
          return;
        }
      } else if (this.heldItem.type === IngredientType.PLATE) {
        // If holding a Plate, check if there is a non-plate ingredient sitting on top of the bin to scoop onto the plate
        const ingIdx = counter.surfaceItems.findIndex(
          (it) =>
            it.type !== IngredientType.PLATE &&
            it.type !== IngredientType.FIRE_EXTINGUISHER &&
            it.type !== IngredientType.BURNT_PATTY
        );
        if (ingIdx >= 0) {
          const [ingItem] = counter.surfaceItems.splice(ingIdx, 1);
          if (!this.heldItem.plateContents) this.heldItem.plateContents = [];
          this.heldItem.plateContents.push(ingItem.type);
          this.map.rebuildSurfaceMeshes(counter);
          this.updateHeldMesh();
          this.localPlayer.playOneShot('PICKUP');
          this.syncPlayerAnim('PICKUP');
          this.map.triggerCounterBounce(counter.id);
          this.sound.playPickup();
          this.broadcastCounterUpdate(counter);
          return;
        }
      }

      // Place held item into the next available slot on the bin's flat top surface (up to 6 items without overwriting!)
      if (counter.surfaceItems.length < 6) {
        counter.surfaceItems.push(this.heldItem);
        const newIdx = counter.surfaceItems.length - 1;
        this.map.rebuildSurfaceMeshes(counter, newIdx);
        this.setHeldItem(null);
        this.localPlayer.playOneShot('DROP');
        this.syncPlayerAnim('DROP');
        this.map.triggerCounterBounce(counter.id);
        this.sound.playDrop();
        this.broadcastCounterUpdate(counter);
        return;
      }

      // Fallback when all 6 slots on this bin are full: find nearest reachable adjacent counter/bin with free space!
      let fallbackCounter: Counter3DData | null = null;
      let bestDist = 1.65;
      for (const candidate of this.map.counters.values()) {
        if (candidate.id === counter.id || candidate.isOnFire) continue;
        if (candidate.id === 'counter_-4_-3' || candidate.id === 'counter_1_-3') continue;
        if (candidate.type === CounterType.TRASH || candidate.type === CounterType.DELIVERY) continue;

        const d = Math.hypot(candidate.x - this.playerPos.x, candidate.z - this.playerPos.z);
        if (d > bestDist) continue;

        if (candidate.type.startsWith('crate_') && candidate.surfaceItems.length < 6) {
          bestDist = d;
          fallbackCounter = candidate;
        } else if (!candidate.type.startsWith('crate_') && !candidate.currentItem) {
          if (candidate.type === CounterType.STOVE && !this.isCookable(this.heldItem.type)) continue;
          bestDist = d;
          fallbackCounter = candidate;
        }
      }

      if (fallbackCounter) {
        if (fallbackCounter.type.startsWith('crate_')) {
          fallbackCounter.surfaceItems.push(this.heldItem);
          this.map.rebuildSurfaceMeshes(fallbackCounter, fallbackCounter.surfaceItems.length - 1);
        } else if (fallbackCounter.type === CounterType.STOVE) {
          this.placeItemOnStove(fallbackCounter, this.heldItem);
        } else {
          fallbackCounter.currentItem = this.heldItem;
          fallbackCounter.itemHolder.clear();
          fallbackCounter.itemHolder.add(Ingredient3DFactory.createMesh(this.heldItem));
          fallbackCounter.itemPlaceBounceTimer = 0.24;
        }
        this.setHeldItem(null);
        this.localPlayer.playOneShot('DROP');
        this.syncPlayerAnim('DROP');
        this.map.triggerCounterBounce(fallbackCounter.id);
        this.sound.playDrop();
        this.broadcastCounterUpdate(fallbackCounter);
        this.hud.showFloatingPopup('📦 Mặt thùng đã đầy (6/6) — Đã đặt sang bàn kế bên!', '#0ea5e9');
      } else {
        this.sound.playBeep(false);
        this.hud.showFloatingPopup('📦 Mặt trên của thùng đã đầy (tối đa 6 vật phẩm)!', '#f59e0b');
      }
      return;
    }

    // 2. TRASH BIN (Dispose held item — except Fire Extinguisher! + Animated Swing Lid)
    if (counter.type === CounterType.TRASH) {
      if (this.heldItem) {
        if (this.heldItem.type === IngredientType.FIRE_EXTINGUISHER) {
          this.sound.playBeep(false);
          this.hud.showFloatingPopup('🧯 Hãy đặt Bình Cứu Hỏa lên bàn thay vì vứt vào thùng rác!', '#0ea5e9');
          return;
        }
        counter.trashLidTimer = 0.45;
        this.map.triggerCounterBounce(counter.id);
        this.sound.playTrash();
        this.setHeldItem(null);
        this.localPlayer.playOneShot('DROP');
        this.syncPlayerAnim('DROP');
      }
      return;
    }

    // Block interacting with a counter that is currently on fire!
    if (counter.isOnFire) {
      this.sound.playBeep(true);
      this.hud.showFloatingPopup('🔥 BÀN ĐANG CHÁY! DÙNG BÌNH CỨU HỎA (🧯) ĐỂ DẬP LỬA!', '#ef4444');
      return;
    }

    // 3. DELIVERY COUNTER (Submit completed plate)
    if (counter.type === CounterType.DELIVERY) {
      if (this.heldItem && this.heldItem.type === IngredientType.PLATE) {
        const result = this.recipeManager.tryDeliver(this.heldItem);
        if (result.success) {
          this.sound.playDelivery();
          this.particles.emitDeliveryStars(counter.x, 1.2, counter.z);
          this.setHeldItem(null);
          this.localPlayer.playOneShot('CELEBRATE');
          this.syncPlayerAnim('CELEBRATE');
          this.hud.showFloatingPopup(
            `🎉 +${result.pointsEarned} ĐIỂM! (COMBO x${this.recipeManager.combo})`,
            '#10b981'
          );

          if (this.config.isMultiplayer && this.network.room) {
            this.network.room.send('score_update', {
              score: this.recipeManager.score,
              combo: this.recipeManager.combo
            });
            this.network.room.send('orders_update', {
              orders: this.recipeManager.getOrders()
            });
          }
        } else {
          this.sound.playTrash();
          this.hud.showFloatingPopup('⚠️ SAI CÔNG THỨC MÓN ĂN!', '#ef4444');
        }
      }
      return;
    }

    // 4. CLEAR COUNTER / CUTTING BOARD / STOVE INTERACTION
    if (!this.heldItem && counter.currentItem) {
      // Rule 6: Picking up from a stove PAUSES and PRESERVES both cookTimer & burnTimer on the item,
      // and completely clears the stove's own timers so they never affect the next item!
      if (counter.type === CounterType.STOVE) {
        counter.currentItem.cookTimer = counter.cookTimer;
        counter.currentItem.burnTimer = counter.burnTimer;
        counter.currentItem.cookingTimer = counter.cookingTimer;
        counter.currentItem.stoveState = counter.stoveState;
      }
      this.setHeldItem(counter.currentItem);
      counter.currentItem = null;
      counter.cookTimer = 0;
      counter.burnTimer = 0;
      counter.cookingTimer = 0;
      counter.beepTimer = 0;
      counter.cutProgress = 0;
      counter.isActivelyChopping = false;
      counter.stoveState = StoveState.IDLE;
      counter.itemHolder.clear();
      this.localPlayer.playOneShot('PICKUP');
      this.syncPlayerAnim('PICKUP');
      this.map.triggerCounterBounce(counter.id);
      this.sound.playPickup();
      this.broadcastCounterUpdate(counter);
    } else if (this.heldItem && !counter.currentItem) {
      // Drop onto empty counter
      if (counter.type === CounterType.STOVE && !this.isCookable(this.heldItem.type)) {
        return;
      }

      if (counter.type === CounterType.STOVE) {
        this.placeItemOnStove(counter, this.heldItem);
      } else {
        counter.currentItem = this.heldItem;
        const mesh = Ingredient3DFactory.createMesh(this.heldItem);
        counter.itemHolder.clear();
        counter.itemHolder.add(mesh);
      }

      counter.itemPlaceBounceTimer = 0.24;
      this.setHeldItem(null);
      this.localPlayer.playOneShot('DROP');
      this.syncPlayerAnim('DROP');
      this.map.triggerCounterBounce(counter.id);
      this.sound.playDrop();
      this.broadcastCounterUpdate(counter);
    } else if (this.heldItem && counter.currentItem) {
      // Prevent combining Fire Extinguisher or Burnt Food with a Plate
      if (
        this.heldItem.type === IngredientType.FIRE_EXTINGUISHER ||
        counter.currentItem.type === IngredientType.FIRE_EXTINGUISHER ||
        this.heldItem.type === IngredientType.BURNT_PATTY ||
        counter.currentItem.type === IngredientType.BURNT_PATTY
      ) {
        return;
      }

      // COMBINE: Plate + Ingredient assembly
      if (counter.currentItem.type === IngredientType.PLATE && this.heldItem.type !== IngredientType.PLATE) {
        if (!counter.currentItem.plateContents) counter.currentItem.plateContents = [];
        counter.currentItem.plateContents.push(this.heldItem.type);

        counter.itemHolder.clear();
        counter.itemHolder.add(Ingredient3DFactory.createMesh(counter.currentItem));
        counter.itemPlaceBounceTimer = 0.24;
        this.setHeldItem(null);
        this.localPlayer.playOneShot('DROP');
        this.syncPlayerAnim('DROP');
        this.map.triggerCounterBounce(counter.id);
        this.sound.playDrop();
        this.broadcastCounterUpdate(counter);
      } else if (this.heldItem.type === IngredientType.PLATE && counter.currentItem.type !== IngredientType.PLATE) {
        // Held plate picks up cooked/prepared ingredient from counter!
        if (!this.heldItem.plateContents) this.heldItem.plateContents = [];
        this.heldItem.plateContents.push(counter.currentItem.type);

        counter.currentItem = null;
        counter.cookTimer = 0;
        counter.burnTimer = 0;
        counter.cookingTimer = 0;
        counter.beepTimer = 0;
        counter.stoveState = StoveState.IDLE;
        counter.itemHolder.clear();
        this.updateHeldMesh();
        this.localPlayer.playOneShot('PICKUP');
        this.syncPlayerAnim('PICKUP');
        this.map.triggerCounterBounce(counter.id);
        this.sound.playPickup();
        this.broadcastCounterUpdate(counter);
      }
    }
  }

  /**
   * Rule 5 & Rule 7: Safely places a raw or cooked item onto a Stove, initializing or resuming
   * its separate cookTimer and burnTimer without ever jumping directly to BURNED or resetting to RAW!
   */
  private placeItemOnStove(counter: Counter3DData, item: KitchenItem) {
    counter.currentItem = item;
    counter.beepTimer = 0;
    const cookDuration = CookingConfig.getCookDuration(item.type);
    const safeDur = CookingConfig.burnTimeline.safeDuration;
    const warnDur = CookingConfig.burnTimeline.warningDuration;
    const totalBurnDur = CookingConfig.burnTimeline.totalPostCookedTime;

    if (this.isRawCookable(item.type)) {
      counter.cookTimer = Math.max(0, Math.min(cookDuration - 0.05, item.cookTimer ?? 0));
      counter.burnTimer = 0;
      counter.cookingTimer = counter.cookTimer;
      counter.stoveState = StoveState.COOKING;

      item.cookTimer = counter.cookTimer;
      item.burnTimer = 0;
      item.cookingTimer = counter.cookTimer;
      item.stoveState = StoveState.COOKING;
    } else if (this.isAlreadyCooked(item.type)) {
      // Resume burnTimer from where it was paused (clamped so placing cooked meat on a stove NEVER instantly burns it!)
      counter.cookTimer = cookDuration;
      counter.burnTimer = Math.max(0, Math.min(totalBurnDur - 0.5, item.burnTimer ?? 0));
      counter.cookingTimer = cookDuration + counter.burnTimer;

      if (counter.burnTimer < safeDur) {
        counter.stoveState = StoveState.COOKED;
      } else if (counter.burnTimer < safeDur + warnDur) {
        counter.stoveState = StoveState.WARNING;
      } else {
        counter.stoveState = StoveState.DANGER;
      }

      item.cookTimer = counter.cookTimer;
      item.burnTimer = counter.burnTimer;
      item.cookingTimer = counter.cookingTimer;
      item.stoveState = counter.stoveState;
    }

    counter.itemHolder.clear();
    counter.itemHolder.add(Ingredient3DFactory.createMesh(item));
  }

  private landThrownItem(item: KitchenItem, x: number, z: number) {
    let closest: Counter3DData | null = null;
    let minDist = 0.85;
    for (const c of this.map.counters.values()) {
      const d = Math.hypot(c.x - x, c.z - z);
      if (d < minDist) {
        minDist = d;
        closest = c;
      }
    }

    if (closest && !closest.isOnFire && closest.type.startsWith('crate_')) {
      // Allow thrown items to land cleanly on the flat top surface of an Ingredient Storage Bin (up to 6 items)!
      if (closest.surfaceItems.length < 6) {
        closest.surfaceItems.push(item);
        this.map.rebuildSurfaceMeshes(closest, closest.surfaceItems.length - 1);
        this.map.triggerCounterBounce(closest.id);
        this.sound.playDrop();
        this.broadcastCounterUpdate(closest);
        return;
      }
    }

    if (
      closest &&
      !closest.isOnFire &&
      !closest.type.startsWith('crate_') &&
      closest.type !== CounterType.TRASH &&
      closest.type !== CounterType.DELIVERY
    ) {
      if (!closest.currentItem) {
        if (closest.type === CounterType.STOVE && !this.isCookable(item.type)) {
          return;
        }
        if (closest.type === CounterType.STOVE) {
          this.placeItemOnStove(closest, item);
        } else {
          closest.currentItem = item;
          closest.itemHolder.clear();
          closest.itemHolder.add(Ingredient3DFactory.createMesh(item));
        }
        this.map.triggerCounterBounce(closest.id);
        this.sound.playDrop();
        this.broadcastCounterUpdate(closest);
      }
    } else if (item.type === IngredientType.FIRE_EXTINGUISHER) {
      // Never allow the Fire Extinguisher to vanish if thrown off a counter — return it to its station!
      const extStation = this.map.counters.get('counter_3_-3');
      if (extStation && !extStation.currentItem) {
        extStation.currentItem = item;
        extStation.itemHolder.clear();
        extStation.itemHolder.add(Ingredient3DFactory.createMesh(item));
        this.broadcastCounterUpdate(extStation);
      }
    }
  }

  private handleThrow() {
    if (!this.heldItem) return;

    this.cancelActiveWorkOnMove();
    this.sound.playThrow();
    this.localPlayer.playOneShot('THROW');
    this.syncPlayerAnim('THROW');

    const throwDistance = 3.2;
    const targetX = this.playerPos.x + this.facingDir.x * throwDistance;
    const targetZ = this.playerPos.z + this.facingDir.z * throwDistance;

    const thrown = new ThrownItem3D(this.heldItem, this.playerPos.x, this.playerPos.z, targetX, targetZ);
    this.thrownItems.push(thrown);
    this.scene.add(thrown.mesh);

    if (this.config.isMultiplayer && this.network.room) {
      this.network.room.send('throw_item', {
        item: this.heldItem,
        fromX: this.playerPos.x,
        fromZ: this.playerPos.z,
        toX: targetX,
        toZ: targetZ
      });
    }

    this.setHeldItem(null);
  }

  private setHeldItem(item: KitchenItem | null) {
    this.heldItem = item;
    this.localPlayer.isHoldingItem = (item !== null);
    this.updateHeldMesh();

    if (this.config.isMultiplayer && this.network.room) {
      this.network.room.send('held_update', { item: this.heldItem });
    }
  }

  private updateHeldMesh() {
    if (this.heldItemMesh) {
      this.localPlayer.handAnchor.remove(this.heldItemMesh);
      this.heldItemMesh = null;
    }

    if (this.heldItem) {
      this.heldItemMesh = Ingredient3DFactory.createMesh(this.heldItem);
      this.localPlayer.handAnchor.add(this.heldItemMesh);
    }
  }

  private broadcastCounterUpdate(counter: Counter3DData) {
    if (this.config.isMultiplayer && this.network.room) {
      this.network.room.send('counter_update', {
        id: counter.id,
        item: counter.currentItem,
        surfaceItems: counter.surfaceItems,
        cutProgress: counter.cutProgress,
        stoveState: counter.stoveState,
        cookTimer: counter.cookTimer,
        burnTimer: counter.burnTimer,
        cookingTimer: counter.cookingTimer,
        isOnFire: counter.isOnFire,
        fireIntensity: counter.fireIntensity
      });
    }
  }

  private syncNetworkPosition() {
    if (!this.config.isMultiplayer || !this.network.room) return;

    const now = performance.now();
    if (now - this.lastNetworkSendTime > 45) { // ~22 FPS networking
      this.lastNetworkSendTime = now;
      this.network.room.send('player_move', {
        x: this.playerPos.x,
        y: this.playerPos.z,
        facingX: this.facingDir.x,
        facingY: this.facingDir.z
      });
    }
  }

  private onResize() {
    this.cameraSystem.setAspect(window.innerWidth / window.innerHeight);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  public takeScreenshot() {
    this.renderer.render(this.scene, this.cameraSystem.camera);
    const dataUrl = this.renderer.domElement.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `kitchen_chaos_3d_${Date.now()}.png`;
    link.href = dataUrl;
    link.click();
  }

  public destroy() {
    this.isRunning = false;
    if (this.boundResize) window.removeEventListener('resize', this.boundResize);
    if (this.boundKeyDown) window.removeEventListener('keydown', this.boundKeyDown);
    if (this.boundKeyUp) window.removeEventListener('keyup', this.boundKeyUp);
    if (this.boundBlur) window.removeEventListener('blur', this.boundBlur);

    if (this.hud) {
      this.hud.destroy();
    }

    if (this.renderer && this.renderer.domElement && this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
      this.renderer.dispose();
    }
  }
}
