import Phaser from 'phaser';
import { IngredientType, KitchenItem, PlayerInput } from '../types';
import { KitchenCounter } from './KitchenCounter';
import { SoundManager } from '../systems/SoundManager';
import { CounterType } from '../types';

export class Player {
  public scene: Phaser.Scene;
  public sprite: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
  public heldItem: KitchenItem | null = null;
  public heldItemSprite?: Phaser.GameObjects.Sprite;
  public plateSubSprites: Phaser.GameObjects.Sprite[] = [];

  public facingDirection = { x: 0, y: 1 }; // Default facing down
  public readonly speed = 220; // Movement speed
  public isChopping = false;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene;

    this.sprite = scene.physics.add.sprite(x, y, 'chef_player');
    this.sprite.setCollideWorldBounds(true);
    this.sprite.body.setSize(32, 28);
    this.sprite.body.setOffset(8, 18);
    this.sprite.setDepth(30);
  }

  public update(deltaSeconds: number, input: PlayerInput, counters: KitchenCounter[], onDelivery: (item: KitchenItem) => void) {
    const { dx, dy, actionJustPressed, actionHeld, pickupDropJustPressed } = input;

    // 1. Movement logic
    const length = Math.hypot(dx, dy);
    if (length > 0.1) {
      const normX = dx / length;
      const normY = dy / length;
      this.sprite.setVelocity(normX * this.speed, normY * this.speed);

      this.facingDirection = { x: normX, y: normY };

      // Flip sprite horizontally when moving left
      if (normX < -0.2) {
        this.sprite.setFlipX(true);
      } else if (normX > 0.2) {
        this.sprite.setFlipX(false);
      }
    } else {
      this.sprite.setVelocity(0, 0);
    }

    // 2. Identify nearest counter in facing range
    const nearestCounter = this.findFacingCounter(counters);

    // 3. Action / Chopping interaction
    if (actionHeld && nearestCounter && nearestCounter.type === CounterType.CUTTING_BOARD) {
      this.isChopping = true;
      nearestCounter.cutAction(deltaSeconds);
    } else {
      this.isChopping = false;
    }

    // 4. Pickup / Drop interaction
    if (pickupDropJustPressed && nearestCounter) {
      this.handlePickupDrop(nearestCounter, onDelivery);
    }

    // 5. Update held item visual position
    this.updateHeldItemPosition();
  }

  private handlePickupDrop(counter: KitchenCounter, onDelivery: (item: KitchenItem) => void) {
    const sound = SoundManager.getInstance();

    // SPECIAL: If counter is TRASH
    if (counter.type === CounterType.TRASH) {
      if (this.heldItem) {
        this.heldItem = null;
        this.destroyHeldItemVisual();
        sound.playTrash();
      }
      return;
    }

    // SPECIAL: If counter is DELIVERY
    if (counter.type === CounterType.DELIVERY) {
      if (this.heldItem && this.heldItem.type === IngredientType.PLATE) {
        onDelivery(this.heldItem);
        this.heldItem = null;
        this.destroyHeldItemVisual();
      }
      return;
    }

    // Normal Counters / Crates / Stove / Cutting Board
    if (this.heldItem) {
      // Trying to drop or combine item onto counter
      const remainingItem = counter.placeItem(this.heldItem);
      this.heldItem = remainingItem;
      this.destroyHeldItemVisual();
      if (this.heldItem) {
        this.createHeldItemVisual();
      } else {
        sound.playDrop();
      }
    } else {
      // Trying to pick item from counter
      const picked = counter.pickItem();
      if (picked) {
        this.heldItem = picked;
        this.createHeldItemVisual();
        sound.playPickup();
      }
    }
  }

  private findFacingCounter(counters: KitchenCounter[]): KitchenCounter | null {
    const interactDistance = 55;
    let closest: KitchenCounter | null = null;
    let minDistance = interactDistance;

    const reachX = this.sprite.x + this.facingDirection.x * 28;
    const reachY = this.sprite.y + this.facingDirection.y * 28;

    for (const counter of counters) {
      const dist = Phaser.Math.Distance.Between(reachX, reachY, counter.x, counter.y);
      if (dist < minDistance) {
        minDistance = dist;
        closest = counter;
      }
    }

    return closest;
  }

  private createHeldItemVisual() {
    if (!this.heldItem) return;

    let texKey = `item_${this.heldItem.type}`;
    if (this.heldItem.type === IngredientType.PLATE && this.heldItem.plateContents) {
      const hasAll = [IngredientType.BREAD, IngredientType.COOKED_PATTY, IngredientType.CHOPPED_LETTUCE, IngredientType.SLICED_TOMATO]
        .every(ing => this.heldItem!.plateContents!.includes(ing));
      if (hasAll) {
        texKey = 'item_burger';
      }
    }

    this.heldItemSprite = this.scene.add.sprite(this.sprite.x, this.sprite.y - 32, texKey).setDepth(35);
  }

  private updateHeldItemPosition() {
    if (!this.heldItem || !this.heldItemSprite) return;

    // Bobbing effect when moving
    const isMoving = this.sprite.body.velocity.length() > 5;
    const bob = isMoving ? Math.sin(this.scene.time.now / 100) * 2 : 0;

    this.heldItemSprite.setPosition(this.sprite.x, this.sprite.y - 28 + bob);

    // Update plate contents if any
    this.plateSubSprites.forEach(s => s.destroy());
    this.plateSubSprites = [];

    if (this.heldItem.type === IngredientType.PLATE && this.heldItem.plateContents) {
      const hasAll = [IngredientType.BREAD, IngredientType.COOKED_PATTY, IngredientType.CHOPPED_LETTUCE, IngredientType.SLICED_TOMATO]
        .every(ing => this.heldItem!.plateContents!.includes(ing));

      if (hasAll) {
        this.heldItemSprite.setTexture('item_burger');
      } else {
        this.heldItem.plateContents.forEach((ing, idx) => {
          const subSprite = this.scene.add.sprite(this.sprite.x, this.sprite.y - 30 - idx * 4 + bob, `item_${ing}`)
            .setScale(0.65)
            .setDepth(36 + idx);
          this.plateSubSprites.push(subSprite);
        });
      }
    }
  }

  private destroyHeldItemVisual() {
    this.heldItemSprite?.destroy();
    this.heldItemSprite = undefined;
    this.plateSubSprites.forEach(s => s.destroy());
    this.plateSubSprites = [];
  }
}
