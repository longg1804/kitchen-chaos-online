import * as THREE from 'three';
import { QualityManager3D } from '../core/QualityManager3D';

interface Particle {
  mesh: THREE.Mesh;
  velX: number;
  velY: number;
  velZ: number;
  life: number;
  maxLife: number;
  scaleSpeed: number;
}

export class ParticleSystem3D {
  public scene: THREE.Scene;
  private particles: Particle[] = [];

  // Shared materials & geometries (Zero per-frame allocation!)
  private whitePuffMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.72 });
  private blackSmokeMat = new THREE.MeshBasicMaterial({ color: 0x1c1917, transparent: true, opacity: 0.82 });
  private fireMat = new THREE.MeshBasicMaterial({ color: 0xf97316 });
  private starGoldMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
  private greenCrumbMat = new THREE.MeshBasicMaterial({ color: 0x22c55e });
  private foamMatWhite = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 });
  private foamMatBlue = new THREE.MeshBasicMaterial({ color: 0xe0f2fe, transparent: true, opacity: 0.85 });

  private puffGeo = new THREE.SphereGeometry(0.08, 6, 5);
  private crumbGeo = new THREE.BoxGeometry(0.04, 0.04, 0.04);
  private starGeo = new THREE.TetrahedronGeometry(0.1);

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  private canSpawnParticle(): boolean {
    const profile = QualityManager3D.getProfile();
    if (this.particles.length >= profile.maxParticles) {
      // Recycle oldest particle so critical gameplay VFX always appear immediately
      const oldest = this.particles.shift();
      if (oldest) {
        this.scene.remove(oldest.mesh);
      }
    }
    return true;
  }

  // Rapid cartoon dust clouds bursting from feet during dash
  public emitDashDust(x: number, y: number, z: number, dirX: number, dirZ: number) {
    const profile = QualityManager3D.getProfile();
    const count = Math.max(2, Math.round(4 * profile.particleSpawnMultiplier));
    for (let i = 0; i < count; i++) {
      this.canSpawnParticle();
      const mesh = new THREE.Mesh(this.puffGeo, this.whitePuffMat);
      mesh.position.set(x + (Math.random() - 0.5) * 0.2, y + 0.05, z + (Math.random() - 0.5) * 0.2);
      this.scene.add(mesh);

      this.particles.push({
        mesh,
        velX: -dirX * (1.2 + Math.random() * 0.8) + (Math.random() - 0.5) * 0.5,
        velY: 0.3 + Math.random() * 0.3,
        velZ: -dirZ * (1.2 + Math.random() * 0.8) + (Math.random() - 0.5) * 0.5,
        life: 0,
        maxLife: 0.35,
        scaleSpeed: 1.8
      });
    }
  }

  // Steam rising gently from hot stove
  public emitSteam(x: number, y: number, z: number) {
    this.canSpawnParticle();
    const mesh = new THREE.Mesh(this.puffGeo, this.whitePuffMat);
    mesh.position.set(x + (Math.random() - 0.5) * 0.15, y, z + (Math.random() - 0.5) * 0.15);
    this.scene.add(mesh);

    this.particles.push({
      mesh,
      velX: (Math.random() - 0.5) * 0.2,
      velY: 0.8 + Math.random() * 0.4,
      velZ: (Math.random() - 0.5) * 0.2,
      life: 0,
      maxLife: 0.8,
      scaleSpeed: 1.5
    });
  }

  // Heavy black smoke when food burns
  public emitBurntSmoke(x: number, y: number, z: number) {
    this.canSpawnParticle();
    const mesh = new THREE.Mesh(this.puffGeo, this.blackSmokeMat);
    mesh.position.set(x + (Math.random() - 0.5) * 0.1, y, z + (Math.random() - 0.5) * 0.1);
    this.scene.add(mesh);

    this.particles.push({
      mesh,
      velX: (Math.random() - 0.5) * 0.3,
      velY: 1.2 + Math.random() * 0.5,
      velZ: (Math.random() - 0.5) * 0.3,
      life: 0,
      maxLife: 1.0,
      scaleSpeed: 2.0
    });
  }

  // Rising orange/yellow fire sparks & embers on burning stations
  public emitFireEmbers(x: number, y: number, z: number) {
    this.canSpawnParticle();
    const mat = Math.random() < 0.5 ? this.fireMat : this.starGoldMat;
    const mesh = new THREE.Mesh(this.puffGeo, mat);
    mesh.scale.setScalar(0.6);
    mesh.position.set(x + (Math.random() - 0.5) * 0.35, y, z + (Math.random() - 0.5) * 0.35);
    this.scene.add(mesh);

    this.particles.push({
      mesh,
      velX: (Math.random() - 0.5) * 0.7,
      velY: 1.6 + Math.random() * 1.2,
      velZ: (Math.random() - 0.5) * 0.7,
      life: 0,
      maxLife: 0.55,
      scaleSpeed: -1.2
    });
  }

  // Pressurized white CO2 / foam spray cone from Fire Extinguisher (45° cone, 3.0 unit range)
  public emitExtinguisherFoam(x: number, y: number, z: number, dirX: number, dirZ: number) {
    const baseAngle = Math.atan2(dirX, dirZ);
    const halfConeRad = (22.5 * Math.PI) / 180;
    const profile = QualityManager3D.getProfile();
    const count = profile.tier === 'MOBILE_LOW' ? 2 : 3;

    for (let i = 0; i < count; i++) {
      this.canSpawnParticle();
      const puffMat = i % 2 === 0 ? this.foamMatWhite : this.foamMatBlue;
      const mesh = new THREE.Mesh(this.puffGeo, puffMat);
      mesh.position.set(
        x + dirX * 0.35 + (Math.random() - 0.5) * 0.08,
        y + (Math.random() - 0.5) * 0.08,
        z + dirZ * 0.35 + (Math.random() - 0.5) * 0.08
      );
      this.scene.add(mesh);

      const sprayAngle = baseAngle + (Math.random() * 2 - 1) * halfConeRad;
      const speed = 5.2 + Math.random() * 2.2;

      this.particles.push({
        mesh,
        velX: Math.sin(sprayAngle) * speed,
        velY: (Math.random() - 0.35) * 0.9,
        velZ: Math.cos(sprayAngle) * speed,
        life: 0,
        maxLife: 0.42,
        scaleSpeed: 3.4
      });
    }
  }

  // Crumbs flying off during cutting / chopping
  public emitChopCrumbs(x: number, y: number, z: number) {
    const profile = QualityManager3D.getProfile();
    const count = Math.max(2, Math.round(4 * profile.particleSpawnMultiplier));
    for (let i = 0; i < count; i++) {
      this.canSpawnParticle();
      const mesh = new THREE.Mesh(this.crumbGeo, this.greenCrumbMat);
      mesh.position.set(x, y, z);
      this.scene.add(mesh);

      this.particles.push({
        mesh,
        velX: (Math.random() - 0.5) * 1.5,
        velY: 1.0 + Math.random() * 1.0,
        velZ: (Math.random() - 0.5) * 1.5,
        life: 0,
        maxLife: 0.4,
        scaleSpeed: -0.5
      });
    }
  }

  // Star celebration burst upon successful delivery
  public emitDeliveryStars(x: number, y: number, z: number) {
    const profile = QualityManager3D.getProfile();
    const count = Math.max(6, Math.round(12 * profile.particleSpawnMultiplier));
    for (let i = 0; i < count; i++) {
      this.canSpawnParticle();
      const mesh = new THREE.Mesh(this.starGeo, this.starGoldMat);
      mesh.position.set(x, y, z);
      this.scene.add(mesh);

      const angle = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * 1.5;
      this.particles.push({
        mesh,
        velX: Math.cos(angle) * speed,
        velY: 2.0 + Math.random() * 1.5,
        velZ: Math.sin(angle) * speed,
        life: 0,
        maxLife: 0.9,
        scaleSpeed: -0.8
      });
    }
  }

  public update(delta: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += delta;

      if (p.life >= p.maxLife) {
        this.scene.remove(p.mesh);
        this.particles.splice(i, 1);
        continue;
      }

      p.mesh.position.x += p.velX * delta;
      p.mesh.position.y += p.velY * delta;
      p.mesh.position.z += p.velZ * delta;

      if (p.scaleSpeed < 0) {
        p.velY -= 4.0 * delta;
      }

      const factor = 1 - p.life / p.maxLife;
      const s = THREE.MathUtils.clamp((1 + p.scaleSpeed * p.life) * (0.4 + factor * 0.6), 0.08, 2.8);
      p.mesh.scale.set(s, s, s);
    }
  }
}
