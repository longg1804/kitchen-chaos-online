import Phaser from 'phaser';

export class MobileControls {
  private scene: Phaser.Scene;
  private joystickBase?: Phaser.GameObjects.Arc;
  private joystickThumb?: Phaser.GameObjects.Arc;
  private joystickPointerId: number | null = null;
  private joystickCenter = { x: 0, y: 0 };
  private maxRadius = 50;

  public moveVector = { x: 0, y: 0 };
  public isActionPressed = false;
  public isActionJustPressed = false;
  public isPickupJustPressed = false;

  private actionBtn?: Phaser.GameObjects.Container;
  private pickupBtn?: Phaser.GameObjects.Container;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.createControls();

    // Resize handler
    this.scene.scale.on('resize', this.onResize, this);
  }

  private createControls() {
    const { width, height } = this.scene.scale;

    // 1. VIRTUAL JOYSTICK BASE & THUMB (Bottom Left)
    const joyX = Math.max(80, width * 0.15);
    const joyY = height - Math.max(80, height * 0.2);
    this.joystickCenter = { x: joyX, y: joyY };

    this.joystickBase = this.scene.add.circle(joyX, joyY, this.maxRadius, 0xffffff, 0.2)
      .setStrokeStyle(3, 0xffffff, 0.4)
      .setScrollFactor(0)
      .setDepth(1000);

    this.joystickThumb = this.scene.add.circle(joyX, joyY, 25, 0x38bdf8, 0.7)
      .setStrokeStyle(2, 0xffffff, 0.9)
      .setScrollFactor(0)
      .setDepth(1001);

    // Joystick Touch Listeners
    this.scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      // If pointer is on the left half of the screen
      if (pointer.x < this.scene.scale.width * 0.45 && this.joystickPointerId === null) {
        this.joystickPointerId = pointer.id;
        this.joystickCenter = { x: pointer.x, y: pointer.y };
        this.joystickBase?.setPosition(pointer.x, pointer.y);
        this.joystickThumb?.setPosition(pointer.x, pointer.y);
        this.joystickBase?.setVisible(true);
        this.joystickThumb?.setVisible(true);
      }
    });

    this.scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (pointer.id === this.joystickPointerId) {
        const dx = pointer.x - this.joystickCenter.x;
        const dy = pointer.y - this.joystickCenter.y;
        const dist = Math.hypot(dx, dy);

        if (dist <= this.maxRadius) {
          this.joystickThumb?.setPosition(pointer.x, pointer.y);
          this.moveVector = { x: dx / this.maxRadius, y: dy / this.maxRadius };
        } else {
          const angle = Math.atan2(dy, dx);
          const clampedX = this.joystickCenter.x + Math.cos(angle) * this.maxRadius;
          const clampedY = this.joystickCenter.y + Math.sin(angle) * this.maxRadius;
          this.joystickThumb?.setPosition(clampedX, clampedY);
          this.moveVector = { x: Math.cos(angle), y: Math.sin(angle) };
        }
      }
    });

    const resetJoystick = (pointer: Phaser.Input.Pointer) => {
      if (pointer.id === this.joystickPointerId) {
        this.joystickPointerId = null;
        this.moveVector = { x: 0, y: 0 };
        this.joystickThumb?.setPosition(this.joystickCenter.x, this.joystickCenter.y);
      }
    };

    this.scene.input.on('pointerup', resetJoystick);
    this.scene.input.on('pointerupoutside', resetJoystick);

    // 2. ACTION BUTTONS (Bottom Right)
    this.createActionButtons(width, height);
  }

  private createActionButtons(width: number, height: number) {
    // Button 1: ACTION / CHOP / INTERACT (Orange circle)
    const actX = width - Math.max(70, width * 0.12);
    const actY = height - Math.max(130, height * 0.32);

    this.actionBtn = this.scene.add.container(actX, actY).setScrollFactor(0).setDepth(1000);
    const actCircle = this.scene.add.circle(0, 0, 36, 0xf97316, 0.85)
      .setStrokeStyle(3, 0xffedd5, 1)
      .setInteractive();
    const actText = this.scene.add.text(0, 0, 'CẮT\nNẤU', {
      font: 'bold 13px Arial',
      align: 'center',
      color: '#ffffff'
    }).setOrigin(0.5);
    this.actionBtn.add([actCircle, actText]);

    actCircle.on('pointerdown', () => {
      this.isActionPressed = true;
      this.isActionJustPressed = true;
      actCircle.setScale(0.9);
      this.triggerHaptic();
    });
    actCircle.on('pointerup', () => {
      this.isActionPressed = false;
      actCircle.setScale(1.0);
    });
    actCircle.on('pointerout', () => {
      this.isActionPressed = false;
      actCircle.setScale(1.0);
    });

    // Button 2: PICK UP / DROP (Green circle)
    const pickX = width - Math.max(130, width * 0.22);
    const pickY = height - Math.max(70, height * 0.18);

    this.pickupBtn = this.scene.add.container(pickX, pickY).setScrollFactor(0).setDepth(1000);
    const pickCircle = this.scene.add.circle(0, 0, 36, 0x10b981, 0.85)
      .setStrokeStyle(3, 0xd1fae5, 1)
      .setInteractive();
    const pickText = this.scene.add.text(0, 0, 'CẦM\nTHẢ', {
      font: 'bold 13px Arial',
      align: 'center',
      color: '#ffffff'
    }).setOrigin(0.5);
    this.pickupBtn.add([pickCircle, pickText]);

    pickCircle.on('pointerdown', () => {
      this.isPickupJustPressed = true;
      pickCircle.setScale(0.9);
      this.triggerHaptic();
    });
    pickCircle.on('pointerup', () => {
      pickCircle.setScale(1.0);
    });
    pickCircle.on('pointerout', () => {
      pickCircle.setScale(1.0);
    });
  }

  private triggerHaptic() {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(20);
      } catch (e) {
        // Ignore if not allowed
      }
    }
  }

  private onResize(gameSize: Phaser.Structs.Size) {
    const { width, height } = gameSize;
    const joyX = Math.max(80, width * 0.15);
    const joyY = height - Math.max(80, height * 0.2);
    this.joystickCenter = { x: joyX, y: joyY };
    this.joystickBase?.setPosition(joyX, joyY);
    this.joystickThumb?.setPosition(joyX, joyY);

    const actX = width - Math.max(70, width * 0.12);
    const actY = height - Math.max(130, height * 0.32);
    this.actionBtn?.setPosition(actX, actY);

    const pickX = width - Math.max(130, width * 0.22);
    const pickY = height - Math.max(70, height * 0.18);
    this.pickupBtn?.setPosition(pickX, pickY);
  }

  public postUpdate() {
    // Reset one-frame flags
    this.isActionJustPressed = false;
    this.isPickupJustPressed = false;
  }
}
