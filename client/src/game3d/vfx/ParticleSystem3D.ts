import * as THREE from 'three';

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

  private whitePuffMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7 });
  private blackSmokeMat = new THREE.MeshBasicMaterial({ color: 0x1c1917, transparent: true, opacity: 0.8 });
  private fireMat = new THREE.MeshBasicMaterial({ color: 0xf97316 });
  private starGoldMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
  private greenCrumbMat = new THREE.MeshBasicMaterial({ color: 0x22c55e });

  private puffGeo = new THREE.SphereGeometry(0.08, 6, 6);
  private starGeo = new THREE.TetrahedronGeometry(0.1);

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  // Steam rising gently from hot stove
  public emitSteam(x: number, y: number, z: number) {
    const mesh = new THREE.Mesh(this.puffGeo, this.whitePuffMat.clone());
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
    const mesh = new THREE.Mesh(this.puffGeo, this.blackSmokeMat.clone());
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

  // Crumbs flying off during cutting / chopping
  public emitChopCrumbs(x: number, y: number, z: number) {
    for (let i = 0; i < 4; i++) {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.04), this.greenCrumbMat);
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
    for (let i = 0; i < 12; i++) {
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

      // Gentle gravity effect for crumbs/stars
      if (p.scaleSpeed < 0) {
        p.velY -= 4.0 * delta;
      }

      // Fade out
      const factor = 1 - p.life / p.maxLife;
      const mat = p.mesh.material as THREE.Material & { opacity?: number };
      if (mat.opacity !== undefined) {
        mat.opacity = factor * 0.8;
      }

      const s = THREE.MathUtils.clamp(1 + p.scaleSpeed * p.life, 0.1, 3);
      p.mesh.scale.set(s, s, s);
    }
  }
}
