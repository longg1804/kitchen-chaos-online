import { MobileInputsState } from '../../game3d/ui/HUDOverlay3D';

export interface UnifiedInputState {
  moveX: number;
  moveZ: number;
  isMoving: boolean;
  isPickupDropJustPressed: boolean;
  isActionPressed: boolean;
  isActionJustPressed: boolean;
  isDashJustPressed: boolean;
  isThrowJustPressed: boolean;
  isPauseJustPressed: boolean;
  isScreenshotJustPressed: boolean;
  isGamepadActive: boolean;
}

export class InputManager {
  private keys: Record<string, boolean> = {};
  private prevKeys: Record<string, boolean> = {};
  private prevGamepadButtons: boolean[] = [];
  private gamepadActive = false;
  private gamepadToastTimer: number | null = null;
  private gamepadToastEl?: HTMLElement;

  private touchSource?: () => MobileInputsState;

  // Single-frame action triggers
  private triggerPickupDrop = false;
  private triggerAction = false;
  private triggerDash = false;
  private triggerThrow = false;
  private triggerPause = false;
  private triggerScreenshot = false;

  private boundKeyDown: (e: KeyboardEvent) => void;
  private boundKeyUp: (e: KeyboardEvent) => void;
  private boundBlur: () => void;
  private boundGamepadConnected: (e: GamepadEvent) => void;
  private boundGamepadDisconnected: (e: GamepadEvent) => void;

  constructor(touchSource?: () => MobileInputsState) {
    this.touchSource = touchSource;

    this.boundKeyDown = (e: KeyboardEvent) => {
      // Prevent browser default scrolling on arrow keys & spacebar during gameplay
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }

      if (!this.keys[e.code]) {
        // Just pressed
        if (e.code === 'KeyE' || e.code === 'Space') {
          this.triggerPickupDrop = true;
        }
        if (e.code === 'KeyF') {
          this.triggerAction = true;
        }
        if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
          this.triggerDash = true;
        }
        if (e.code === 'KeyQ' || e.code === 'ControlLeft' || e.code === 'ControlRight') {
          this.triggerThrow = true;
        }
        if (e.code === 'Escape') {
          this.triggerPause = true;
        }
        if (e.code === 'KeyP') {
          this.triggerScreenshot = true;
        }
      }

      this.keys[e.code] = true;
    };

    this.boundKeyUp = (e: KeyboardEvent) => {
      this.keys[e.code] = false;
    };

    this.boundBlur = () => {
      this.keys = {};
    };

    this.boundGamepadConnected = (e: GamepadEvent) => {
      this.gamepadActive = true;
      this.showGamepadToast(`🎮 Tay cầm đã kết nối: ${e.gamepad.id.substring(0, 24)}...`);
    };

    this.boundGamepadDisconnected = (e: GamepadEvent) => {
      this.gamepadActive = false;
      this.showGamepadToast('🎮 Tay cầm đã ngắt kết nối');
    };

    window.addEventListener('keydown', this.boundKeyDown);
    window.addEventListener('keyup', this.boundKeyUp);
    window.addEventListener('blur', this.boundBlur);
    window.addEventListener('gamepadconnected', this.boundGamepadConnected);
    window.addEventListener('gamepaddisconnected', this.boundGamepadDisconnected);
  }

  public setTouchSource(touchSource: () => MobileInputsState) {
    this.touchSource = touchSource;
  }

  private showGamepadToast(msg: string) {
    if (!this.gamepadToastEl) {
      this.gamepadToastEl = document.createElement('div');
      this.gamepadToastEl.style.cssText = `
        position: fixed;
        bottom: 24px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(15, 23, 42, 0.92);
        color: #fde047;
        font-family: 'Segoe UI', system-ui, sans-serif;
        font-weight: 800;
        font-size: 14px;
        padding: 8px 18px;
        border-radius: 9999px;
        border: 2px solid #f59e0b;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.6);
        z-index: 9999;
        pointer-events: none;
        transition: opacity 0.3s ease;
      `;
      document.body.appendChild(this.gamepadToastEl);
    }

    this.gamepadToastEl.textContent = msg;
    this.gamepadToastEl.style.opacity = '1';
    if (this.gamepadToastTimer !== null) clearTimeout(this.gamepadToastTimer);
    this.gamepadToastTimer = window.setTimeout(() => {
      if (this.gamepadToastEl) this.gamepadToastEl.style.opacity = '0';
      this.gamepadToastTimer = null;
    }, 2800);
  }

  /**
   * Samples all input sources (Keyboard, Gamepad, Touch) and produces a unified frame snapshot.
   */
  public sampleInputs(): UnifiedInputState {
    let moveX = 0;
    let moveZ = 0;

    // 1. Keyboard
    if (this.keys['KeyW'] || this.keys['ArrowUp']) moveZ -= 1;
    if (this.keys['KeyS'] || this.keys['ArrowDown']) moveZ += 1;
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) moveX -= 1;
    if (this.keys['KeyD'] || this.keys['ArrowRight']) moveX += 1;

    let isPickupDropJust = this.triggerPickupDrop;
    let isActionPr = Boolean(this.keys['KeyF'] || this.keys['Space']);
    let isActionJust = this.triggerAction;
    let isDashJust = this.triggerDash;
    let isThrowJust = this.triggerThrow;
    let isPauseJust = this.triggerPause;
    let isScreenshotJust = this.triggerScreenshot;

    // Reset keyboard single-frame triggers
    this.triggerPickupDrop = false;
    this.triggerAction = false;
    this.triggerDash = false;
    this.triggerThrow = false;
    this.triggerPause = false;
    this.triggerScreenshot = false;

    // 2. Gamepad API
    let gamepadConnectedThisFrame = false;
    if (typeof navigator !== 'undefined' && navigator.getGamepads) {
      const gamepads = navigator.getGamepads();
      for (let i = 0; i < gamepads.length; i++) {
        const gp = gamepads[i];
        if (!gp || !gp.connected) continue;

        gamepadConnectedThisFrame = true;

        // Analog Left Stick with 0.16 deadzone
        const DEADZONE = 0.16;
        const axisX = gp.axes[0] ?? 0;
        const axisZ = gp.axes[1] ?? 0;
        if (Math.abs(axisX) > DEADZONE) moveX += axisX;
        if (Math.abs(axisZ) > DEADZONE) moveZ += axisZ;

        // D-Pad buttons: 12 (Up), 13 (Down), 14 (Left), 15 (Right)
        if (gp.buttons[12]?.pressed) moveZ -= 1;
        if (gp.buttons[13]?.pressed) moveZ += 1;
        if (gp.buttons[14]?.pressed) moveX -= 1;
        if (gp.buttons[15]?.pressed) moveX += 1;

        // Button index mapping:
        // 0 = A / Cross (Interact: Pickup/Drop)
        // 1 = B / Circle (Dash)
        // 2 = X / Square (Action: Chop/Cook/Wash)
        // 3 = Y / Triangle (Throw)
        // 8 = Back / Select (Screenshot)
        // 9 = Start / Options (Pause)
        const checkButtonJust = (btnIdx: number): boolean => {
          const isPressed = Boolean(gp.buttons[btnIdx]?.pressed);
          const wasPressed = Boolean(this.prevGamepadButtons[btnIdx]);
          return isPressed && !wasPressed;
        };

        if (checkButtonJust(0)) isPickupDropJust = true;
        if (checkButtonJust(1)) isDashJust = true;
        if (checkButtonJust(2)) isActionJust = true;
        if (checkButtonJust(3)) isThrowJust = true;
        if (checkButtonJust(8)) isScreenshotJust = true;
        if (checkButtonJust(9)) isPauseJust = true;

        if (gp.buttons[2]?.pressed) isActionPr = true;

        // Update previous gamepad button states
        for (let b = 0; b < gp.buttons.length; b++) {
          this.prevGamepadButtons[b] = gp.buttons[b]?.pressed || false;
        }

        break; // Only listen to player 1's gamepad
      }
    }
    this.gamepadActive = gamepadConnectedThisFrame;

    // 3. Touch / Virtual Joystick & Buttons from HUDOverlay3D
    if (this.touchSource) {
      const touch = this.touchSource();
      if (touch) {
        if (touch.moveX !== 0 || touch.moveZ !== 0) {
          moveX = touch.moveX;
          moveZ = touch.moveZ;
        }
        if (touch.isPickupJustPressed) {
          isPickupDropJust = true;
          touch.isPickupJustPressed = false;
        }
        if (touch.isActionJustPressed) {
          isActionJust = true;
          touch.isActionJustPressed = false;
        }
        if (touch.isActionPressed) {
          isActionPr = true;
        }
        if (touch.isDashJustPressed) {
          isDashJust = true;
          touch.isDashJustPressed = false;
        }
        if (touch.isThrowJustPressed) {
          isThrowJust = true;
          touch.isThrowJustPressed = false;
        }
      }
    }

    // Clamp / Normalize Movement
    const len = Math.hypot(moveX, moveZ);
    let normX = 0;
    let normZ = 0;
    const isMoving = len > 0.12;
    if (isMoving) {
      normX = moveX / Math.max(1, len);
      normZ = moveZ / Math.max(1, len);
    }

    return {
      moveX: normX,
      moveZ: normZ,
      isMoving,
      isPickupDropJustPressed: isPickupDropJust,
      isActionPressed: isActionPr,
      isActionJustPressed: isActionJust,
      isDashJustPressed: isDashJust,
      isThrowJustPressed: isThrowJust,
      isPauseJustPressed: isPauseJust,
      isScreenshotJustPressed: isScreenshotJust,
      isGamepadActive: this.gamepadActive
    };
  }

  public destroy() {
    window.removeEventListener('keydown', this.boundKeyDown);
    window.removeEventListener('keyup', this.boundKeyUp);
    window.removeEventListener('blur', this.boundBlur);
    window.removeEventListener('gamepadconnected', this.boundGamepadConnected);
    window.removeEventListener('gamepaddisconnected', this.boundGamepadDisconnected);
    if (this.gamepadToastEl && this.gamepadToastEl.parentNode) {
      this.gamepadToastEl.parentNode.removeChild(this.gamepadToastEl);
    }
  }
}
