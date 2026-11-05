import * as THREE from 'three';
import { MaterialFactory } from '../environment/MaterialFactory';

export type ChefSkinId = 'chef_classic' | 'chef_panda' | 'chef_fox' | 'chef_robot';

export type ChefAnimState =
  | 'IDLE'
  | 'WALK'
  | 'DASH'
  | 'CARRY'
  | 'CHOP'
  | 'COOK'
  | 'THROW'
  | 'PICKUP'
  | 'DROP'
  | 'CELEBRATE';

export class ChefCharacter3D {
  public group: THREE.Group;
  public skin: ChefSkinId;
  public playerName: string;
  public isHost: boolean;

  // Body parts for procedural animation
  private bodyMesh!: THREE.Mesh;
  private headGroup!: THREE.Group;
  private leftHand!: THREE.Mesh;
  private rightHand!: THREE.Mesh;
  private leftFoot!: THREE.Mesh;
  private rightFoot!: THREE.Mesh;
  private chefHat!: THREE.Group;
  private knifeMesh!: THREE.Mesh;
  public handAnchor!: THREE.Group;
  public nameSprite!: THREE.Sprite;

  // Unified Layered Animation State Machine
  public state: ChefAnimState = 'IDLE';
  public isHoldingItem: boolean = false;
  public isDashing: boolean = false;
  public isChopping: boolean = false;
  public isCooking: boolean = false;

  // Timers for one-shot actions (PICKUP, DROP, THROW, CELEBRATE)
  private oneShotState: 'PICKUP' | 'DROP' | 'THROW' | 'CELEBRATE' | null = null;
  private oneShotTimer: number = 0;
  private oneShotDuration: number = 0.25;

  private dashTimer: number = 0;
  private walkCycleTimer: number = 0;
  private workCycleTimer: number = 0;
  private targetRotation: number = 0;

  constructor(skin: ChefSkinId = 'chef_classic', playerName: string = 'Chef', isHost: boolean = false) {
    this.skin = skin;
    this.playerName = playerName;
    this.isHost = isHost;
    this.group = new THREE.Group();

    this.buildModel();
    this.buildNameTag();
  }

  private buildModel() {
    // Determine skin color themes
    let skinColor = 0xffe4c4; // Peach skin
    let bodyColor = 0x2563eb; // Classic Royal Blue uniform
    let apronColor = 0xffffff;
    let shoeColor = 0x1e293b;

    if (this.skin === 'chef_panda') {
      skinColor = 0xf8fafc;
      bodyColor = 0x15803d; // Bamboo Forest Green
      apronColor = 0x0f172a; // Dark apron
    } else if (this.skin === 'chef_fox') {
      skinColor = 0xf97316; // Fox Orange
      bodyColor = 0xdc2626; // Crimson Red
      apronColor = 0xffedd5;
    } else if (this.skin === 'chef_robot') {
      skinColor = 0x94a3b8; // Metallic Chrome / Grey
      bodyColor = 0x0284c7; // Cyan Blue
      apronColor = 0x38bdf8;
      shoeColor = 0x0f172a;
    }

    const skinMat = new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.6 });
    const bodyMat = new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.5 });
    const apronMat = new THREE.MeshStandardMaterial({ color: apronColor, roughness: 0.6 });
    const shoeMat = new THREE.MeshStandardMaterial({ color: shoeColor, roughness: 0.4 });
    const whiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 });
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.2 });

    // 1. FEET / SHOES
    const footGeo = new THREE.CylinderGeometry(0.09, 0.1, 0.08, 12);
    this.leftFoot = new THREE.Mesh(footGeo, shoeMat);
    this.leftFoot.position.set(-0.14, 0.04, 0);
    this.leftFoot.castShadow = true;
    this.group.add(this.leftFoot);

    this.rightFoot = new THREE.Mesh(footGeo, shoeMat);
    this.rightFoot.position.set(0.14, 0.04, 0);
    this.rightFoot.castShadow = true;
    this.group.add(this.rightFoot);

    // 2. TORSO / BODY with Apron
    const bodyGeo = new THREE.CylinderGeometry(0.24, 0.28, 0.45, 16);
    this.bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
    this.bodyMesh.position.y = 0.32;
    this.bodyMesh.castShadow = true;
    this.group.add(this.bodyMesh);

    // Apron front layer
    const apronGeo = new THREE.CylinderGeometry(0.25, 0.29, 0.38, 16, 1, false, -Math.PI / 3, (Math.PI * 2) / 3);
    const apronMesh = new THREE.Mesh(apronGeo, apronMat);
    apronMesh.position.set(0, 0, 0.01);
    this.bodyMesh.add(apronMesh);

    // Apron straps (Brown leather)
    const strapMat = new THREE.MeshStandardMaterial({ color: 0x854d0e, roughness: 0.8 });
    const strapL = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.2, 0.02), strapMat);
    strapL.position.set(-0.12, 0.12, 0.24);
    this.bodyMesh.add(strapL);
    const strapR = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.2, 0.02), strapMat);
    strapR.position.set(0.12, 0.12, 0.24);
    this.bodyMesh.add(strapR);

    // 3. HEAD GROUP
    this.headGroup = new THREE.Group();
    this.headGroup.position.set(0, 0.68, 0);
    this.group.add(this.headGroup);

    // Cute chubby head sphere
    const headGeo = new THREE.SphereGeometry(0.26, 20, 20);
    const headMesh = new THREE.Mesh(headGeo, skinMat);
    headMesh.castShadow = true;
    this.headGroup.add(headMesh);

    // Big Cute Eyes
    const eyeGeo = new THREE.SphereGeometry(0.04, 12, 12);
    const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
    eyeL.position.set(-0.09, 0.04, 0.23);
    eyeL.scale.set(1, 1.2, 0.5);
    this.headGroup.add(eyeL);

    const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
    eyeR.position.set(0.09, 0.04, 0.23);
    eyeR.scale.set(1, 1.2, 0.5);
    this.headGroup.add(eyeR);

    // Cute Eye Highlights (sparkle!)
    const hlGeo = new THREE.SphereGeometry(0.012, 8, 8);
    const hlL = new THREE.Mesh(hlGeo, whiteMat);
    hlL.position.set(-0.08, 0.06, 0.245);
    this.headGroup.add(hlL);
    const hlR = new THREE.Mesh(hlGeo, whiteMat);
    hlR.position.set(0.10, 0.06, 0.245);
    this.headGroup.add(hlR);

    // Rosy Cheeks
    const cheekMat = new THREE.MeshStandardMaterial({ color: 0xf43f5e, roughness: 0.9, transparent: true, opacity: 0.6 });
    const cheekGeo = new THREE.SphereGeometry(0.035, 10, 10);
    const cheekL = new THREE.Mesh(cheekGeo, cheekMat);
    cheekL.position.set(-0.16, -0.04, 0.20);
    this.headGroup.add(cheekL);
    const cheekR = new THREE.Mesh(cheekGeo, cheekMat);
    cheekR.position.set(0.16, -0.04, 0.20);
    this.headGroup.add(cheekR);

    // 4. SKIN SPECIFIC FEATURES
    if (this.skin === 'chef_panda') {
      // Black eye patches
      const patchMat = new THREE.MeshStandardMaterial({ color: 0x0f172a });
      const patchL = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.02, 12), patchMat);
      patchL.rotation.x = Math.PI / 2;
      patchL.position.set(-0.09, 0.04, 0.22);
      this.headGroup.add(patchL);

      const patchR = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.02, 12), patchMat);
      patchR.rotation.x = Math.PI / 2;
      patchR.position.set(0.09, 0.04, 0.22);
      this.headGroup.add(patchR);

      // Round Panda Ears
      const earGeo = new THREE.SphereGeometry(0.07, 12, 12);
      const earL = new THREE.Mesh(earGeo, patchMat);
      earL.position.set(-0.22, 0.22, 0);
      this.headGroup.add(earL);
      const earR = new THREE.Mesh(earGeo, patchMat);
      earR.position.set(0.22, 0.22, 0);
      this.headGroup.add(earR);
    } else if (this.skin === 'chef_fox') {
      // Pointy Fox Ears
      const foxEarGeo = new THREE.ConeGeometry(0.08, 0.16, 4);
      const foxEarMat = new THREE.MeshStandardMaterial({ color: 0xea580c });
      const earL = new THREE.Mesh(foxEarGeo, foxEarMat);
      earL.position.set(-0.18, 0.25, 0);
      earL.rotation.z = 0.3;
      this.headGroup.add(earL);
      const earR = new THREE.Mesh(foxEarGeo, foxEarMat);
      earR.position.set(0.18, 0.25, 0);
      earR.rotation.z = -0.3;
      this.headGroup.add(earR);

      // White Fox Muzzle
      const muzzleGeo = new THREE.ConeGeometry(0.09, 0.12, 8);
      const muzzleMesh = new THREE.Mesh(muzzleGeo, whiteMat);
      muzzleMesh.rotation.x = Math.PI / 2;
      muzzleMesh.position.set(0, -0.04, 0.28);
      this.headGroup.add(muzzleMesh);
    } else if (this.skin === 'chef_robot') {
      // Glowing Cyan Visor
      const visorGeo = new THREE.BoxGeometry(0.32, 0.08, 0.06);
      const visorMat = new THREE.MeshStandardMaterial({
        color: 0x00f0ff,
        emissive: 0x00d4ff,
        emissiveIntensity: 0.8
      });
      const visor = new THREE.Mesh(visorGeo, visorMat);
      visor.position.set(0, 0.04, 0.23);
      this.headGroup.add(visor);

      // Robot Antenna
      const antMat = new THREE.MeshStandardMaterial({ color: 0x475569 });
      const antPole = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.15), antMat);
      antPole.position.set(0, 0.35, 0);
      this.headGroup.add(antPole);

      const antLight = new THREE.Mesh(
        new THREE.SphereGeometry(0.04, 8, 8),
        new THREE.MeshStandardMaterial({ color: 0xfacc15, emissive: 0xeab308, emissiveIntensity: 1 })
      );
      antLight.position.set(0, 0.44, 0);
      this.headGroup.add(antLight);
    }

    // 5. ICONIC CHEF HAT (Toque Blanche)
    this.chefHat = new THREE.Group();
    const hatBaseGeo = new THREE.CylinderGeometry(0.20, 0.22, 0.12, 16);
    const hatBase = new THREE.Mesh(hatBaseGeo, whiteMat);
    hatBase.position.y = 0.25;
    this.chefHat.add(hatBase);

    // Puffy cloud top of toque
    const puffGeo = new THREE.SphereGeometry(0.28, 16, 16);
    const puff = new THREE.Mesh(puffGeo, whiteMat);
    puff.position.y = 0.38;
    puff.scale.set(1.1, 0.8, 1.1);
    puff.castShadow = true;
    this.chefHat.add(puff);

    this.headGroup.add(this.chefHat);

    // 6. HANDS & ARMS
    const handGeo = new THREE.SphereGeometry(0.075, 12, 12);
    this.leftHand = new THREE.Mesh(handGeo, skinMat);
    this.leftHand.position.set(-0.32, 0.32, 0.1);
    this.leftHand.castShadow = true;
    this.group.add(this.leftHand);

    this.rightHand = new THREE.Mesh(handGeo, skinMat);
    this.rightHand.position.set(0.32, 0.32, 0.1);
    this.rightHand.castShadow = true;
    this.group.add(this.rightHand);

    // Chopping Knife (hidden by default)
    this.knifeMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 0.25, 0.06),
      MaterialFactory.counterSteel
    );
    this.knifeMesh.rotation.x = Math.PI / 4;
    this.knifeMesh.visible = false;
    this.rightHand.add(this.knifeMesh);

    // 7. HAND ANCHOR (Held food/plate held visibly at chest level)
    this.handAnchor = new THREE.Group();
    this.handAnchor.position.set(0, 0.62, 0.36);
    this.group.add(this.handAnchor);
  }

  private buildNameTag() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw stylized pill badge
    ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
    ctx.roundRect ? ctx.roundRect(8, 8, 240, 48, 16) : ctx.rect(8, 8, 240, 48);
    ctx.fill();

    // Border
    ctx.lineWidth = 3;
    ctx.strokeStyle = this.isHost ? '#fbbf24' : '#38bdf8';
    ctx.stroke();

    // Text
    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';

    const label = (this.isHost ? '👑 ' : '') + this.playerName;
    ctx.fillText(label, 128, 32);

    const texture = new THREE.CanvasTexture(canvas);
    const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
    this.nameSprite = new THREE.Sprite(spriteMat);
    this.nameSprite.position.set(0, 1.45, 0);
    this.nameSprite.scale.set(1.2, 0.3, 1);
    this.group.add(this.nameSprite);
  }

  public setRotation(angleRad: number) {
    this.targetRotation = angleRad;
  }

  public triggerDash(duration: number = 0.22) {
    this.isDashing = true;
    this.dashTimer = duration;
    this.isChopping = false;
    this.isCooking = false;
  }

  /**
   * Triggers a timed one-shot upper/full-body animation (PICKUP, DROP, THROW, CELEBRATE)
   * that automatically returns to IDLE / WALK / CARRY when completed.
   */
  public playOneShot(action: 'PICKUP' | 'DROP' | 'THROW' | 'CELEBRATE', duration?: number) {
    this.oneShotState = action;
    this.oneShotDuration = duration ?? (action === 'CELEBRATE' ? 0.85 : action === 'THROW' ? 0.26 : 0.18);
    this.oneShotTimer = this.oneShotDuration;
  }

  public update(delta: number, isMoving: boolean) {
    const blend = Math.min(1, delta * 18);

    // If moving, automatically cancel stationary CHOP / COOK animations!
    if (isMoving) {
      this.isChopping = false;
      this.isCooking = false;
      this.walkCycleTimer += delta * 12;
    } else {
      this.walkCycleTimer = 0;
    }

    if (this.isChopping || this.isCooking) {
      this.workCycleTimer += delta * 18;
    } else {
      this.workCycleTimer = 0;
    }

    // 1. Update timers
    if (this.isDashing) {
      this.dashTimer -= delta;
      if (this.dashTimer <= 0) {
        this.isDashing = false;
        this.dashTimer = 0;
      }
    }

    if (this.oneShotTimer > 0) {
      this.oneShotTimer -= delta;
      if (this.oneShotTimer <= 0) {
        this.oneShotTimer = 0;
        this.oneShotState = null;
      }
    }

    // 2. Smooth rotation towards target facing angle
    let diff = this.targetRotation - this.group.rotation.y;
    while (diff < -Math.PI) diff += Math.PI * 2;
    while (diff > Math.PI) diff -= Math.PI * 2;
    this.group.rotation.y += diff * Math.min(1, delta * 18);

    // 3. Determine active Animation State (Priority Hierarchy)
    if (this.isDashing) {
      this.state = 'DASH';
    } else if (this.oneShotState) {
      this.state = this.oneShotState;
    } else if (this.isChopping && !isMoving) {
      this.state = 'CHOP';
    } else if (this.isCooking && !isMoving) {
      this.state = 'COOK';
    } else if (this.isHoldingItem) {
      this.state = 'CARRY';
    } else if (isMoving) {
      this.state = 'WALK';
    } else {
      this.state = 'IDLE';
    }

    // Target transforms for smooth blending (single authority per frame!)
    let targetGroupY = 0;
    let targetBodyRotX = 0;
    let targetBodyRotZ = 0;
    let targetBodyScaleX = 1;
    let targetBodyScaleY = 1;
    let targetBodyScaleZ = 1;
    let targetHeadRotX = 0;
    let targetHeadRotZ = 0;
    let targetHatRotX = 0;
    let targetHatRotZ = 0;

    let targetLFootZ = 0;
    let targetRFootZ = 0;

    let targetLHandX = -0.32;
    let targetLHandY = 0.32;
    let targetLHandZ = 0.08;

    let targetRHandX = 0.32;
    let targetRHandY = 0.32;
    let targetRHandZ = 0.08;

    let targetAnchorX = 0;
    let targetAnchorY = 0.46;
    let targetAnchorZ = 0.38;

    let showKnife = false;

    // 4. Lower Body Layer (Locomotion)
    if (this.state === 'DASH') {
      targetGroupY = 0.04;
      targetLFootZ = -0.14;
      targetRFootZ = 0.14;
    } else if (this.state === 'CELEBRATE') {
      const jump = Math.abs(Math.sin(this.oneShotTimer * 14)) * 0.22;
      targetGroupY = jump;
    } else if (isMoving) {
      const waddle = Math.sin(this.walkCycleTimer);
      targetGroupY = Math.abs(waddle) * 0.055;
      targetBodyRotZ = waddle * 0.10;
      targetHeadRotZ = -waddle * 0.07;
      targetLFootZ = waddle * 0.15;
      targetRFootZ = -waddle * 0.15;
    }

    // 5. Upper Body Layer (Actions, Carry & Idle)
    switch (this.state) {
      case 'DASH': {
        targetBodyRotX = 0.38;
        targetBodyScaleX = 0.92;
        targetBodyScaleY = 0.88;
        targetBodyScaleZ = 1.20;
        targetHeadRotX = 0.26;
        targetHatRotX = -0.32;
        if (this.isHoldingItem) {
          targetLHandX = -0.19;
          targetLHandY = 0.45;
          targetLHandZ = 0.35;
          targetRHandX = 0.19;
          targetRHandY = 0.45;
          targetRHandZ = 0.35;
          targetAnchorY = 0.45;
          targetAnchorZ = 0.40;
        } else {
          targetLHandX = -0.30;
          targetLHandY = 0.26;
          targetLHandZ = -0.24;
          targetRHandX = 0.30;
          targetRHandY = 0.26;
          targetRHandZ = -0.24;
        }
        break;
      }

      case 'CHOP': {
        showKnife = true;
        const chopWave = Math.sin(this.workCycleTimer * 1.45);
        // Left hand holds ingredient steady on board; right hand chops rhythmically with knife
        targetLHandX = -0.16;
        targetLHandY = 0.38;
        targetLHandZ = 0.32;

        targetRHandX = 0.18;
        targetRHandY = 0.42 + chopWave * 0.11;
        targetRHandZ = 0.30 - chopWave * 0.04;

        targetBodyRotX = 0.16;
        targetHeadRotX = 0.22;
        break;
      }

      case 'COOK': {
        // Stirring / pan-tossing motion at stove
        const stirAngle = this.workCycleTimer * 1.1;
        targetLHandX = -0.24;
        targetLHandY = 0.36;
        targetLHandZ = 0.22;

        targetRHandX = 0.20 + Math.cos(stirAngle) * 0.05;
        targetRHandY = 0.38 + Math.abs(Math.sin(stirAngle)) * 0.04;
        targetRHandZ = 0.30 + Math.sin(stirAngle) * 0.05;

        targetBodyRotX = 0.12;
        targetHeadRotX = 0.18;
        break;
      }

      case 'PICKUP':
      case 'DROP': {
        const p = 1 - this.oneShotTimer / Math.max(0.01, this.oneShotDuration);
        const reach = Math.sin(p * Math.PI);
        targetBodyRotX = reach * 0.22;
        targetLHandX = -0.20;
        targetLHandY = 0.42 - reach * 0.08;
        targetLHandZ = 0.32 + reach * 0.10;
        targetRHandX = 0.20;
        targetRHandY = 0.42 - reach * 0.08;
        targetRHandZ = 0.32 + reach * 0.10;
        break;
      }

      case 'THROW': {
        const p = 1 - this.oneShotTimer / Math.max(0.01, this.oneShotDuration);
        const swing = Math.sin(p * Math.PI);
        targetBodyRotX = -0.12 + swing * 0.35;
        targetLHandX = -0.22;
        targetLHandY = 0.48 + swing * 0.10;
        targetLHandZ = 0.25 + swing * 0.18;
        targetRHandX = 0.22;
        targetRHandY = 0.48 + swing * 0.10;
        targetRHandZ = 0.25 + swing * 0.18;
        break;
      }

      case 'CELEBRATE': {
        targetLHandX = -0.34;
        targetLHandY = 0.64;
        targetLHandZ = 0.12;
        targetRHandX = 0.34;
        targetRHandY = 0.64;
        targetRHandZ = 0.12;
        targetHatRotZ = Math.sin(this.oneShotTimer * 16) * 0.14;
        break;
      }

      case 'CARRY': {
        // Stable two-handed carry posture (no unwanted arm bobbing!)
        targetLHandX = -0.20;
        targetLHandY = 0.46;
        targetLHandZ = 0.32;
        targetRHandX = 0.20;
        targetRHandY = 0.46;
        targetRHandZ = 0.32;
        targetAnchorX = 0;
        targetAnchorY = 0.46;
        targetAnchorZ = 0.38;
        break;
      }

      case 'WALK': {
        // Gentle arm swing opposite to feet while walking empty-handed
        const swing = Math.sin(this.walkCycleTimer);
        targetLHandX = -0.32;
        targetLHandY = 0.32;
        targetLHandZ = -swing * 0.14;
        targetRHandX = 0.32;
        targetRHandY = 0.32;
        targetRHandZ = swing * 0.14;
        break;
      }

      case 'IDLE':
      default: {
        // Calm, natural idle posture — arms stay relaxed at sides without moving up & down!
        targetLHandX = -0.32;
        targetLHandY = 0.32;
        targetLHandZ = 0.08;
        targetRHandX = 0.32;
        targetRHandY = 0.32;
        targetRHandZ = 0.08;
        break;
      }
    }

    // 6. Apply Smooth Blending to All Body Parts
    this.knifeMesh.visible = showKnife;

    this.group.position.y = THREE.MathUtils.lerp(this.group.position.y, targetGroupY, blend);

    this.bodyMesh.rotation.x = THREE.MathUtils.lerp(this.bodyMesh.rotation.x, targetBodyRotX, blend);
    this.bodyMesh.rotation.z = THREE.MathUtils.lerp(this.bodyMesh.rotation.z, targetBodyRotZ, blend);
    this.bodyMesh.scale.set(
      THREE.MathUtils.lerp(this.bodyMesh.scale.x, targetBodyScaleX, blend),
      THREE.MathUtils.lerp(this.bodyMesh.scale.y, targetBodyScaleY, blend),
      THREE.MathUtils.lerp(this.bodyMesh.scale.z, targetBodyScaleZ, blend)
    );

    this.headGroup.rotation.x = THREE.MathUtils.lerp(this.headGroup.rotation.x, targetHeadRotX, blend);
    this.headGroup.rotation.z = THREE.MathUtils.lerp(this.headGroup.rotation.z, targetHeadRotZ, blend);
    this.chefHat.rotation.x = THREE.MathUtils.lerp(this.chefHat.rotation.x, targetHatRotX, blend);
    this.chefHat.rotation.z = THREE.MathUtils.lerp(this.chefHat.rotation.z, targetHatRotZ, blend);

    this.leftFoot.position.z = THREE.MathUtils.lerp(this.leftFoot.position.z, targetLFootZ, blend);
    this.rightFoot.position.z = THREE.MathUtils.lerp(this.rightFoot.position.z, targetRFootZ, blend);

    this.leftHand.position.set(
      THREE.MathUtils.lerp(this.leftHand.position.x, targetLHandX, blend),
      THREE.MathUtils.lerp(this.leftHand.position.y, targetLHandY, blend),
      THREE.MathUtils.lerp(this.leftHand.position.z, targetLHandZ, blend)
    );
    this.rightHand.position.set(
      THREE.MathUtils.lerp(this.rightHand.position.x, targetRHandX, blend),
      THREE.MathUtils.lerp(this.rightHand.position.y, targetRHandY, blend),
      THREE.MathUtils.lerp(this.rightHand.position.z, targetRHandZ, blend)
    );

    this.handAnchor.position.set(
      THREE.MathUtils.lerp(this.handAnchor.position.x, targetAnchorX, blend),
      THREE.MathUtils.lerp(this.handAnchor.position.y, targetAnchorY, blend),
      THREE.MathUtils.lerp(this.handAnchor.position.z, targetAnchorZ, blend)
    );
  }
}
