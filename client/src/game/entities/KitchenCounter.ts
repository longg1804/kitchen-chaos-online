import Phaser from 'phaser';
import { CounterType, IngredientType, KitchenItem, StoveState } from '../types';
import { SoundManager } from '../systems/SoundManager';

export class KitchenCounter {
  public scene: Phaser.Scene;
  public id: string = '';
  public x: number;
  public y: number;
  public type: CounterType;
  public currentItem: KitchenItem | null = null;

  public sprite: Phaser.GameObjects.Sprite;
  public itemSprite?: Phaser.GameObjects.Sprite;
  public plateSprites: Phaser.GameObjects.Sprite[] = [];
  public progressBarBg?: Phaser.GameObjects.Rectangle;
  public progressBarFill?: Phaser.GameObjects.Rectangle;

  // Cutting logic
  public cutProgress = 0; // 0 to 1
  public readonly cutRequiredTime = 2.5; // seconds

  // Stove logic
  public stoveState: StoveState = StoveState.IDLE;
  public cookingTimer = 0;
  public readonly cookTime = 6.0;   // 6s to cook
  public readonly burnTime = 12.0;  // 12s total (6s after cooked) before burn

  constructor(scene: Phaser.Scene, x: number, y: number, type: CounterType, id?: string) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.type = type;
    this.id = id || `counter_${x}_${y}`;

    // Sprite texture based on type
    let texture = 'counter_clear';
    switch (type) {
      case CounterType.CLEAR: texture = 'counter_clear'; break;
      case CounterType.CUTTING_BOARD: texture = 'counter_cutting'; break;
      case CounterType.STOVE: texture = 'counter_stove'; break;
      case CounterType.DELIVERY: texture = 'counter_delivery'; break;
      case CounterType.TRASH: texture = 'counter_trash'; break;
      case CounterType.CRATE_BREAD: texture = 'counter_crate_bread'; break;
      case CounterType.CRATE_MEAT: texture = 'counter_crate_meat'; break;
      case CounterType.CRATE_LETTUCE: texture = 'counter_crate_lettuce'; break;
      case CounterType.CRATE_TOMATO: texture = 'counter_crate_tomato'; break;
      case CounterType.CRATE_PLATE: texture = 'counter_crate_plate'; break;
    }

    this.sprite = scene.add.sprite(x, y, texture).setDepth(10);
    this.createProgressBars();
  }

  private createProgressBars() {
    this.progressBarBg = this.scene.add.rectangle(this.x, this.y - 28, 44, 8, 0x1f2937)
      .setStrokeStyle(1, 0xffffff)
      .setDepth(25)
      .setVisible(false);

    this.progressBarFill = this.scene.add.rectangle(this.x - 21, this.y - 28, 0, 6, 0x10b981)
      .setOrigin(0, 0.5)
      .setDepth(26)
      .setVisible(false);
  }

  public update(deltaSeconds: number) {
    // 1. STOVE SIMULATION
    if (this.type === CounterType.STOVE && this.currentItem) {
      if (this.currentItem.type === IngredientType.RAW_MEAT) {
        this.cookingTimer += deltaSeconds;
        this.showProgressBar(this.cookingTimer / this.cookTime, 0xf59e0b); // Orange cooking

        if (this.cookingTimer >= this.cookTime) {
          // Meat is cooked!
          this.currentItem.type = IngredientType.COOKED_PATTY;
          this.stoveState = StoveState.COOKED;
          this.updateItemVisual();
        }
      } else if (this.currentItem.type === IngredientType.COOKED_PATTY) {
        this.cookingTimer += deltaSeconds;
        const burnRatio = (this.cookingTimer - this.cookTime) / (this.burnTime - this.cookTime);
        this.showProgressBar(burnRatio, 0xef4444); // Red warning!

        // Burning warning beep
        if (burnRatio > 0.6 && Math.floor(this.cookingTimer * 4) % 2 === 0) {
          SoundManager.getInstance().playWarning();
        }

        if (this.cookingTimer >= this.burnTime) {
          // Patty is burnt!
          this.currentItem.type = IngredientType.BURNT_PATTY;
          this.stoveState = StoveState.BURNT;
          this.hideProgressBar();
          this.updateItemVisual();
        }
      }
    } else if (this.type === CounterType.STOVE && !this.currentItem) {
      this.hideProgressBar();
      this.cookingTimer = 0;
    }
  }

  // Handle cutting board progress when player presses Action
  public cutAction(deltaSeconds: number): boolean {
    if (this.type !== CounterType.CUTTING_BOARD || !this.currentItem) return false;

    // Can only cut Lettuce or Tomato
    if (this.currentItem.type !== IngredientType.LETTUCE && this.currentItem.type !== IngredientType.TOMATO) {
      return false;
    }

    this.cutProgress += deltaSeconds / this.cutRequiredTime;
    this.showProgressBar(this.cutProgress, 0x3b82f6);
    SoundManager.getInstance().playChop();

    if (this.cutProgress >= 1.0) {
      // Finished cutting!
      if (this.currentItem.type === IngredientType.LETTUCE) {
        this.currentItem.type = IngredientType.CHOPPED_LETTUCE;
      } else if (this.currentItem.type === IngredientType.TOMATO) {
        this.currentItem.type = IngredientType.SLICED_TOMATO;
      }
      this.cutProgress = 0;
      this.hideProgressBar();
      this.updateItemVisual();
      return true;
    }

    return false;
  }

  public showProgressBar(ratio: number, color: number) {
    if (!this.progressBarBg || !this.progressBarFill) return;
    this.progressBarBg.setVisible(true);
    this.progressBarFill.setVisible(true);
    this.progressBarFill.setFillStyle(color);
    this.progressBarFill.width = Math.min(42, Math.max(0, ratio * 42));
  }

  public hideProgressBar() {
    this.progressBarBg?.setVisible(false);
    this.progressBarFill?.setVisible(false);
  }

  // Put an item on counter or combine onto plate
  public placeItem(item: KitchenItem): KitchenItem | null {
    // If empty counter
    if (!this.currentItem) {
      this.currentItem = item;
      this.updateItemVisual();
      return null; // Successfully placed, player now holds nothing
    }

    // Plate combination: If counter has a Plate, and incoming item is an ingredient
    if (this.currentItem.type === IngredientType.PLATE && this.currentItem.plateContents) {
      const allowedIngredients = [
        IngredientType.BREAD,
        IngredientType.COOKED_PATTY,
        IngredientType.CHOPPED_LETTUCE,
        IngredientType.SLICED_TOMATO
      ];

      if (allowedIngredients.includes(item.type)) {
        // Check if not already added
        if (!this.currentItem.plateContents.includes(item.type)) {
          this.currentItem.plateContents.push(item.type);
          this.updateItemVisual();
          return null; // Consumed ingredient onto plate!
        }
      }
    }

    // Plate combination reverse: If player holds a Plate, and counter has an ingredient
    if (item.type === IngredientType.PLATE && item.plateContents) {
      const allowedIngredients = [
        IngredientType.BREAD,
        IngredientType.COOKED_PATTY,
        IngredientType.CHOPPED_LETTUCE,
        IngredientType.SLICED_TOMATO
      ];

      if (allowedIngredients.includes(this.currentItem.type)) {
        if (!item.plateContents.includes(this.currentItem.type)) {
          item.plateContents.push(this.currentItem.type);
          this.currentItem = null;
          this.updateItemVisual();
          return item; // Plate now has the item
        }
      }
    }

    return item; // Cannot place, return back to player
  }

  // Pick item from this counter
  public pickItem(): KitchenItem | null {
    // 1. Infinite Crates
    if (this.type === CounterType.CRATE_BREAD) {
      return { id: `bread_${Date.now()}`, type: IngredientType.BREAD };
    }
    if (this.type === CounterType.CRATE_MEAT) {
      return { id: `meat_${Date.now()}`, type: IngredientType.RAW_MEAT };
    }
    if (this.type === CounterType.CRATE_LETTUCE) {
      return { id: `lettuce_${Date.now()}`, type: IngredientType.LETTUCE };
    }
    if (this.type === CounterType.CRATE_TOMATO) {
      return { id: `tomato_${Date.now()}`, type: IngredientType.TOMATO };
    }
    if (this.type === CounterType.CRATE_PLATE) {
      return { id: `plate_${Date.now()}`, type: IngredientType.PLATE, plateContents: [] };
    }

    // 2. Regular counter with an item
    if (this.currentItem) {
      const item = this.currentItem;
      this.currentItem = null;
      this.cutProgress = 0;
      this.cookingTimer = 0;
      this.stoveState = StoveState.IDLE;
      this.hideProgressBar();
      this.updateItemVisual();
      return item;
    }

    return null;
  }

  public updateItemVisual() {
    // Clear old plate sub-sprites
    this.plateSprites.forEach(s => s.destroy());
    this.plateSprites = [];

    if (!this.currentItem) {
      this.itemSprite?.destroy();
      this.itemSprite = undefined;
      return;
    }

    // Determine texture key
    let texKey = `item_${this.currentItem.type}`;
    if (!this.itemSprite) {
      this.itemSprite = this.scene.add.sprite(this.x, this.y - 4, texKey).setDepth(20);
    } else {
      this.itemSprite.setTexture(texKey);
      this.itemSprite.setPosition(this.x, this.y - 4);
    }

    // Render contents on plate
    if (this.currentItem.type === IngredientType.PLATE && this.currentItem.plateContents) {
      // If complete burger
      const hasAll = [IngredientType.BREAD, IngredientType.COOKED_PATTY, IngredientType.CHOPPED_LETTUCE, IngredientType.SLICED_TOMATO]
        .every(ing => this.currentItem!.plateContents!.includes(ing));

      if (hasAll) {
        this.itemSprite.setTexture('item_burger');
      } else {
        // Render stacked icons on plate
        this.currentItem.plateContents.forEach((ing, idx) => {
          const subSprite = this.scene.add.sprite(this.x, this.y - 6 - idx * 4, `item_${ing}`)
            .setScale(0.7)
            .setDepth(21 + idx);
          this.plateSprites.push(subSprite);
        });
      }
    }
  }

  public destroy() {
    this.sprite.destroy();
    this.itemSprite?.destroy();
    this.plateSprites.forEach(s => s.destroy());
    this.progressBarBg?.destroy();
    this.progressBarFill?.destroy();
  }
}
