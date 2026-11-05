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

  public facingDirection = { x: 0, y: 1 };
  public readonly speed = 240;
  public isChopping = false;

  constructor(scene: Phaser.Scene, x: number, y: number, skinKey: string = 'chef_classic') {
    this.scene = scene;

    this.sprite = scene.physics.add.sprite(x, y, skinKey);
    this.sprite.setCollideWorldBounds(true);
    this.sprite.body.setSize(32, 28);
    this.sprite.body.setOffset(8, 18);
    this.sprite.setDepth(30);
  }

  public update(
    deltaSeconds: number,
    input: PlayerInput,
    counters: KitchenCounter[],
    onDelivery: (item: KitchenItem) => void,
    onThrow?: (item: KitchenItem, startX: number, startY: number, targetX: number, targetY: number) => void
  ) {
    const { dx, dy, actionHeld, pickupDropJustPressed, throwJustPressed } = input;

    // Movement
    const length = Math.hypot(dx, dy);
    if (length > 0.1) {
      const normX = dx / length;
      const normY = dy / length;
      this.sprite.setVelocity(normX * this.speed, normY * this.speed);
      this.facingDirection = { x: normX, y: normY };

      if (normX < -0.2) this.sprite.setFlipX(true);
      else if (normX > 0.2) this.sprite.setFlipX(false);
    } else {
      this.sprite.setVelocity(0, 0);
    }

    const nearestCounter = this.findFacingCounter(counters);

    // Cutting Action
    if (actionHeld && nearestCounter && nearestCounter.type === CounterType.CUTTING_BOARD) {
      this.isChopping = true;
      nearestCounter.cutAction(deltaSeconds);
    } else {
      this.isChopping = false;
    }

    // Pickup / Drop
    if (pickupDropJustPressed && nearestCounter) {
      this.handlePickupDrop(nearestCounter, onDelivery);
    }

    // THROW ACTION (Phase 3)
    if (throwJustPressed && this.heldItem && this.heldItem.type !== IngredientType.PLATE) {
      this.throwCurrentItem(counters, onThrow);
    }

    this.updateHeldItemPosition();
  }

  private throwCurrentItem(
    counters: KitchenCounter[],
    onThrow?: (item: KitchenItem, startX: number, startY: number, targetX: number, targetY: number) => void
  ) {
    if (!this.heldItem) return;
    const itemToThrow = this.heldItem;
    this.heldItem = null;
    this.destroyHeldItemVisual();

    const startX = this.sprite.x;
    const startY = this.sprite.y - 10;
    const throwDistance = 160;
    const targetX = startX + this.facingDirection.x * throwDistance;
    const targetY = startY + this.facingDirection.y * throwDistance;

    SoundManager.getInstance().playDrop();

    // Create flying sprite
    const flyingSprite = this.scene.add.sprite(startX, startY, `item_${itemToThrow.type}`).setDepth(45);

    // Arc trajectory tween
    this.scene.tweens.add({
      targets: flyingSprite,
      x: targetX,
      y: targetY,
      duration: 350,
      ease: 'Quad.easeOut',
      onComplete: () => {
        // Try landing on counter nearest to target
        let landed = false;
        for (const c of counters) {
          if (Phaser.Math.Distance.Between(targetX, targetY, c.x, c.y) < 38) {
            const leftover = c.placeItem(itemToThrow);
            if (!leftover) landed = true;
            break;
          }
        }
        flyingSprite.destroy();
      }
    });

    if (onThrow) {
      onThrow(itemToThrow, startX, startY, targetX, targetY);
    }
  }

  private handlePickupDrop(counter: KitchenCounter, onDelivery: (item: KitchenItem) => void) {
    const sound = SoundManager.getInstance();

    if (counter.type === CounterType.TRASH) {
      if (this.heldItem) {
        this.heldItem = null;
        this.destroyHeldItemVisual();
        sound.playTrash();
      }
      return;
    }

    if (counter.type === CounterType.DELIVERY) {
      if (this.heldItem && this.heldItem.type === IngredientType.PLATE) {
        onDelivery(this.heldItem);
        this.heldItem = null;
        this.destroyHeldItemVisual();
      }
      return;
    }

    if (this.heldItem) {
      const remainingItem = counter.placeItem(this.heldItem);
      this.heldItem = remainingItem;
      this.destroyHeldItemVisual();
      if (this.heldItem) this.createHeldItemVisual();
      else sound.playDrop();
    } else {
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

  public createHeldItemVisual() {
    if (!this.heldItem) return;

    let texKey = `item_${this.heldItem.type}`;
    if (this.heldItem.type === IngredientType.PLATE && this.heldItem.plateContents) {
      const contents = this.heldItem.plateContents;
      if (contents.length === 2 && contents.includes(IngredientType.CHOPPED_LETTUCE) && contents.includes(IngredientType.SLICED_TOMATO)) {
        texKey = 'item_salad';
      } else if (contents.length >= 3 && contents.includes(IngredientType.BREAD) && contents.includes(IngredientType.COOKED_PATTY)) {
        texKey = 'item_burger';
      }
    }

    this.heldItemSprite = this.scene.add.sprite(this.sprite.x, this.sprite.y - 32, texKey).setDepth(35);
  }

  public updateHeldItemPosition() {
    if (!this.heldItem || !this.heldItemSprite) return;

    const isMoving = this.sprite.body.velocity.length() > 5;
    const bob = isMoving ? Math.sin(this.scene.time.now / 100) * 2 : 0;

    this.heldItemSprite.setPosition(this.sprite.x, this.sprite.y - 28 + bob);

    this.plateSubSprites.forEach(s => s.destroy());
    this.plateSubSprites = [];

    if (this.heldItem.type === IngredientType.PLATE && this.heldItem.plateContents) {
      const contents = this.heldItem.plateContents;
      const isSalad = contents.length === 2 && contents.includes(IngredientType.CHOPPED_LETTUCE) && contents.includes(IngredientType.SLICED_TOMATO);
      const isBurger = contents.length >= 3 && contents.includes(IngredientType.BREAD) && contents.includes(IngredientType.COOKED_PATTY);

      if (isSalad) {
        this.heldItemSprite.setTexture('item_salad');
      } else if (isBurger) {
        this.heldItemSprite.setTexture('item_burger');
      } else {
        contents.forEach((ing, idx) => {
          const subSprite = this.scene.add.sprite(this.sprite.x, this.sprite.y - 30 - idx * 4 + bob, `item_${ing}`)
            .setScale(0.65)
            .setDepth(36 + idx);
          this.plateSubSprites.push(subSprite);
        });
      }
    }
  }

  public destroyHeldItemVisual() {
    this.heldItemSprite?.destroy();
    this.heldItemSprite = undefined;
    this.plateSubSprites.forEach(s => s.destroy());
    this.plateSubSprites = [];
  }
}
