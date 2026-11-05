import * as THREE from 'three';

export class IsometricCamera {
  public camera: THREE.PerspectiveCamera;
  public target: THREE.Vector3 = new THREE.Vector3(0, 0.4, -0.2);
  public distance: number = 10.8;
  
  // Overcooked 2 Standard Angle:
  // Top-down Oblique: Front-facing (Yaw = 0, NO diamond tilt), Pitch = ~52 degrees
  private pitchAngle: number = (51 * Math.PI) / 180; // 51 degrees elevation
  private fov: number = 38; // Narrow FOV for miniature cartoon diorama feel

  // Bounding box of the kitchen map (for auto-framing)
  private mapWidth: number = 10.4;  // 9 columns * 1.05 + counter margin
  private mapDepth: number = 7.8;   // 7 rows * 1.05 + counter margin

  constructor(aspect: number) {
    this.camera = new THREE.PerspectiveCamera(this.fov, aspect, 0.1, 1000);
    this.fitMap(aspect);
    this.updatePosition();
  }

  /**
   * Automatically calculates ideal camera distance so the kitchen map
   * fills the majority of the screen without clipping on any device (Desktop or Mobile).
   */
  public fitMap(aspect: number) {
    const vFovRad = (this.fov * Math.PI) / 180;
    const tanHalfVFov = Math.tan(vFovRad / 2);
    const tanHalfHFov = tanHalfVFov * aspect;

    // Projected dimensions in camera view space
    const projectedDepth = this.mapDepth * Math.sin(this.pitchAngle) + 1.2 * Math.cos(this.pitchAngle);
    const projectedWidth = this.mapWidth;

    // Comfortable margin (padding) so top HUD and bottom controls have clear breathing room
    // On landscape mobile/desktop, vertical space needs slight margin for order cards
    const padY = aspect > 1.3 ? 1.22 : 1.15;
    const padX = 1.12;

    const distRequiredY = (projectedDepth / 2 / tanHalfVFov) * padY;
    const distRequiredX = (projectedWidth / 2 / tanHalfHFov) * padX;

    // Choose distance that fits both axes comfortably
    this.distance = Math.max(distRequiredY, distRequiredX, 9.2);

    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
    this.updatePosition();
  }

  public updatePosition() {
    // True Overcooked 2 Front-Facing Oblique View:
    // X = 0 (No horizontal tilt, rectangular layout, NO DIAMOND)
    // Y = target.y + distance * sin(pitch)
    // Z = target.z + distance * cos(pitch)
    const sinP = Math.sin(this.pitchAngle);
    const cosP = Math.cos(this.pitchAngle);

    const posX = this.target.x; // 0
    const posY = this.target.y + this.distance * sinP;
    const posZ = this.target.z + this.distance * cosP;

    this.camera.position.set(posX, posY, posZ);
    this.camera.lookAt(this.target.x, this.target.y, this.target.z);
  }

  public setAspect(aspect: number) {
    this.fitMap(aspect);
  }

  public update(delta: number, _followPos?: { x: number; y: number; z: number }) {
    // Overcooked 2 camera stays rock-solid centered on the kitchen arena
    // so all players, counters, and stations remain clearly visible at all times!
    this.updatePosition();
  }
}
