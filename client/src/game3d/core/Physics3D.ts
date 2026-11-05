import * as THREE from 'three';

export interface BoxCollider {
  id: string;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export class Physics3D {
  private colliders: BoxCollider[] = [];

  public clear() {
    this.colliders = [];
  }

  public addBox(id: string, x: number, z: number, width: number, depth: number) {
    const halfW = width / 2;
    const halfD = depth / 2;
    this.colliders.push({
      id,
      minX: x - halfW,
      maxX: x + halfW,
      minZ: z - halfD,
      maxZ: z + halfD
    });
  }

  // Smooth slide-collision resolution for circular character body
  public resolveCollision(x: number, z: number, radius: number = 0.38): { x: number; z: number } {
    let resolvedX = x;
    let resolvedZ = z;

    for (const box of this.colliders) {
      // Find closest point on box to character center
      const closestX = Math.max(box.minX, Math.min(resolvedX, box.maxX));
      const closestZ = Math.max(box.minZ, Math.min(resolvedZ, box.maxZ));

      const dx = resolvedX - closestX;
      const dz = resolvedZ - closestZ;
      const distanceSq = dx * dx + dz * dz;

      if (distanceSq < radius * radius && distanceSq > 0.000001) {
        const dist = Math.sqrt(distanceSq);
        const overlap = radius - dist;
        const pushX = (dx / dist) * overlap;
        const pushZ = (dz / dist) * overlap;

        resolvedX += pushX;
        resolvedZ += pushZ;
      } else if (distanceSq <= 0.000001) {
        // Deep penetration fallback: push out along smallest axis
        const toMinX = Math.abs(resolvedX - box.minX);
        const toMaxX = Math.abs(box.maxX - resolvedX);
        const toMinZ = Math.abs(resolvedZ - box.minZ);
        const toMaxZ = Math.abs(box.maxZ - resolvedZ);
        const min = Math.min(toMinX, toMaxX, toMinZ, toMaxZ);

        if (min === toMinX) resolvedX = box.minX - radius;
        else if (min === toMaxX) resolvedX = box.maxX + radius;
        else if (min === toMinZ) resolvedZ = box.minZ - radius;
        else resolvedZ = box.maxZ + radius;
      }
    }

    return { x: resolvedX, z: resolvedZ };
  }
}
