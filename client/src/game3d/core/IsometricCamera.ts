import * as THREE from 'three';

export class IsometricCamera {
  public camera: THREE.PerspectiveCamera;
  public target: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  private distance: number = 14;

  constructor(aspect: number) {
    // Narrow FOV (42 deg) with high altitude mimics the perfect Isometric look of Overcooked
    this.camera = new THREE.PerspectiveCamera(42, aspect, 0.1, 1000);
    this.updatePosition();
  }

  public updatePosition() {
    // True 3D Isometric angle: 45 degrees horizontal, 55 degrees pitch
    const posX = this.target.x + this.distance * 0.75;
    const posY = this.target.y + this.distance * 1.25;
    const posZ = this.target.z + this.distance * 0.95;

    this.camera.position.set(posX, posY, posZ);
    this.camera.lookAt(this.target.x, this.target.y + 0.5, this.target.z);
  }

  public setAspect(aspect: number) {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }

  public update(delta: number, followPos?: { x: number; y: number; z: number }) {
    if (followPos) {
      // Smooth camera dampening around center
      this.target.x = THREE.MathUtils.lerp(this.target.x, followPos.x * 0.3, delta * 3);
      this.target.z = THREE.MathUtils.lerp(this.target.z, followPos.z * 0.3, delta * 3);
      this.updatePosition();
    }
  }
}
