import { IngredientType, KitchenItem, OrderRecipe } from '../types';

export class RecipeManager {
  private activeOrders: OrderRecipe[] = [];
  private maxConcurrentOrders = 3;
  private orderCounter = 0;
  private spawnInterval = 15; // seconds
  private timeSinceLastSpawn = 0;

  public score = 0;
  public combo = 1;

  // Recipe Catalog
  public static RECIPES: { [key: string]: { name: string; ingredients: IngredientType[]; points: number } } = {
    BURGER_COMPLETE: {
      name: 'Burger Đầy Đủ',
      ingredients: [IngredientType.BREAD, IngredientType.COOKED_PATTY, IngredientType.CHOPPED_LETTUCE, IngredientType.SLICED_TOMATO],
      points: 100
    },
    BURGER_CHEESE_MEAT: {
      name: 'Burger Thịt & Xà Lách',
      ingredients: [IngredientType.BREAD, IngredientType.COOKED_PATTY, IngredientType.CHOPPED_LETTUCE],
      points: 70
    },
    BURGER_MEAT_TOMATO: {
      name: 'Burger Thịt & Cà Chua',
      ingredients: [IngredientType.BREAD, IngredientType.COOKED_PATTY, IngredientType.SLICED_TOMATO],
      points: 70
    }
  };

  constructor() {
    this.spawnOrder();
    this.spawnOrder();
  }

  public update(deltaSeconds: number): { completed: boolean; expired: boolean; scoreDelta: number } {
    let expired = false;
    let scoreDelta = 0;

    // Update remaining time on each active order
    for (let i = this.activeOrders.length - 1; i >= 0; i--) {
      const order = this.activeOrders[i];
      order.remainingTime -= deltaSeconds;

      if (order.remainingTime <= 0) {
        // Expired order! Penalty
        this.activeOrders.splice(i, 1);
        this.combo = 1;
        scoreDelta -= 30;
        this.score = Math.max(0, this.score - 30);
        expired = true;
      }
    }

    // Spawn new orders if below max
    this.timeSinceLastSpawn += deltaSeconds;
    if (this.activeOrders.length < this.maxConcurrentOrders && this.timeSinceLastSpawn >= this.spawnInterval) {
      this.spawnOrder();
      this.timeSinceLastSpawn = 0;
    }

    return { completed: false, expired, scoreDelta };
  }

  public spawnOrder() {
    if (this.activeOrders.length >= this.maxConcurrentOrders) return;

    this.orderCounter++;
    const recipeKeys = Object.keys(RecipeManager.RECIPES);
    const chosenKey = recipeKeys[Math.floor(Math.random() * recipeKeys.length)];
    const template = RecipeManager.RECIPES[chosenKey];

    const order: OrderRecipe = {
      id: `order_${this.orderCounter}`,
      name: template.name,
      requiredIngredients: [...template.ingredients],
      maxTime: 60, // 60s per order
      remainingTime: 60,
      rewardPoints: template.points,
      iconTexture: 'item_burger'
    };

    this.activeOrders.push(order);
  }

  public getOrders(): OrderRecipe[] {
    return this.activeOrders;
  }

  // Check if plate content satisfies any active order
  public tryDeliver(plateItem: KitchenItem): { success: boolean; pointsEarned: number } {
    if (plateItem.type !== IngredientType.PLATE || !plateItem.plateContents) {
      return { success: false, pointsEarned: 0 };
    }

    const contents = [...plateItem.plateContents].sort();

    for (let i = 0; i < this.activeOrders.length; i++) {
      const order = this.activeOrders[i];
      const required = [...order.requiredIngredients].sort();

      // Compare contents
      if (contents.length === required.length && contents.every((val, index) => val === required[index])) {
        // Matched!
        const earned = order.rewardPoints * this.combo;
        this.score += earned;
        this.combo = Math.min(4, this.combo + 1); // Max 4x combo!

        this.activeOrders.splice(i, 1);
        this.spawnOrder(); // Queue a new order

        return { success: true, pointsEarned: earned };
      }
    }

    return { success: false, pointsEarned: 0 };
  }
}
