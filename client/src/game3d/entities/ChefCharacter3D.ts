import * as THREE from 'three';
import { MaterialFactory } from '../environment/MaterialFactory';

export type ChefSkinId = 'chef_classic' | 'chef_panda' | 'chef_fox' | 'chef_robot';

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

  // Animation states
  public currentAnim: 'idle' | 'walk' | 'chop' | 'celebrate' | 'fail' = 'idle';
  private animTimer: number = 0;
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

    // 7. HAND ANCHOR (Where held food/plate sits directly in front of chef)
    this.handAnchor = new THREE.Group();
    this.handAnchor.position.set(0, 0.42, 0.38);
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

  public update(delta: number, isMoving: boolean) {
    this.animTimer += delta * 10;

    // Smooth rotation towards movement direction
    let diff = this.targetRotation - this.group.rotation.y;
    // Normalize diff to [-PI, PI]
    while (diff < -Math.PI) diff += Math.PI * 2;
    while (diff > Math.PI) diff -= Math.PI * 2;
    this.group.rotation.y += diff * Math.min(1, delta * 15);

    // Apply procedural animations based on state
    if (this.currentAnim === 'chop') {
      // Rapid chopping rhythm!
      this.knifeMesh.visible = true;
      const chopCycle = Math.sin(this.animTimer * 2.5);
      this.rightHand.position.y = 0.32 + chopCycle * 0.12;
      this.rightHand.position.z = 0.25 - chopCycle * 0.05;
      this.leftHand.position.set(-0.15, 0.30, 0.32);
      this.bodyMesh.rotation.x = 0.15; // Leaning into the cutting board
      this.headGroup.rotation.x = 0.2;
    } else if (this.currentAnim === 'celebrate') {
      this.knifeMesh.visible = false;
      // Happy jump and hands up!
      const jump = Math.abs(Math.sin(this.animTimer * 1.5)) * 0.25;
      this.group.position.y = jump;
      this.leftHand.position.set(-0.35, 0.65, 0.1);
      this.rightHand.position.set(0.35, 0.65, 0.1);
      this.chefHat.rotation.z = Math.sin(this.animTimer) * 0.15;
    } else if (isMoving) {
      this.knifeMesh.visible = false;
      this.currentAnim = 'walk';
      // Overcooked signature waddle!
      const waddle = Math.sin(this.animTimer * 1.2);
      this.group.position.y = Math.abs(waddle) * 0.06;
      this.bodyMesh.rotation.z = waddle * 0.12;
      this.headGroup.rotation.z = -waddle * 0.08;

      // Feet swinging
      this.leftFoot.position.z = Math.sin(this.animTimer * 1.2) * 0.15;
      this.rightFoot.position.z = -Math.sin(this.animTimer * 1.2) * 0.15;

      // Hands swinging opposite to feet
      this.leftHand.position.set(-0.32, 0.32, -waddle * 0.15);
      this.rightHand.position.set(0.32, 0.32, waddle * 0.15);
    } else {
      this.knifeMesh.visible = false;
      this.currentAnim = 'idle';
      // Breathing bob
      const breath = Math.sin(this.animTimer * 0.3);
      this.group.position.y = 0;
      this.bodyMesh.scale.set(1 + breath * 0.02, 1 - breath * 0.02, 1 + breath * 0.02);
      this.headGroup.position.y = 0.68 + breath * 0.015;
      this.leftFoot.position.z = 0;
      this.rightFoot.position.z = 0;
      this.leftHand.position.set(-0.32, 0.32 + breath * 0.01, 0.1);
      this.rightHand.position.set(0.32, 0.32 + breath * 0.01, 0.1);
      this.bodyMesh.rotation.z = 0;
      this.headGroup.rotation.z = 0;
      this.bodyMesh.rotation.x = 0;
      this.headGroup.rotation.x = 0;
    }
  }
}
