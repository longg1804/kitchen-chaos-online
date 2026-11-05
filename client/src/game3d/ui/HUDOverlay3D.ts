import { OrderRecipe, IngredientType } from '../../game/types';

export interface MobileInputsState {
  moveX: number;
  moveZ: number;
  isPickupJustPressed: boolean;
  isActionPressed: boolean;
  isActionJustPressed: boolean;
  isThrowJustPressed: boolean;
}

export class HUDOverlay3D {
  public container: HTMLElement;
  public inputs: MobileInputsState = {
    moveX: 0,
    moveZ: 0,
    isPickupJustPressed: false,
    isActionPressed: false,
    isActionJustPressed: false,
    isThrowJustPressed: false
  };

  private scoreEl!: HTMLElement;
  private timerEl!: HTMLElement;
  private ordersContainer!: HTMLElement;
  private gameOverEl!: HTMLElement;
  private onExitCallback: () => void;

  private joystickActive = false;
  private joystickTouchId: number | null = null;
  private joystickCenter = { x: 0, y: 0 };
  private joystickThumbEl!: HTMLElement;
  private joystickBaseEl!: HTMLElement;

  constructor(onExit: () => void) {
    this.onExitCallback = onExit;
    this.container = document.createElement('div');
    this.container.id = 'hud-overlay-3d';
    this.container.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      pointer-events: none;
      z-index: 50;
      overflow: hidden;
      font-family: system-ui, -apple-system, sans-serif;
    `;

    this.buildTopBar();
    this.buildOrdersList();
    this.buildMobileControls();
    this.buildDesktopHints();
    this.buildGameOverModal();

    document.body.appendChild(this.container);
  }

  private buildTopBar() {
    const topBar = document.createElement('div');
    topBar.style.cssText = `
      position: absolute;
      top: 12px;
      left: 16px;
      right: 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      pointer-events: auto;
    `;

    // Left: Exit Button
    const exitBtn = document.createElement('button');
    exitBtn.innerHTML = '🚪 Thoát';
    exitBtn.style.cssText = `
      background: rgba(30, 41, 59, 0.85);
      border: 1px solid #475569;
      color: #f8fafc;
      padding: 8px 14px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: bold;
      cursor: pointer;
      backdrop-filter: blur(6px);
    `;
    exitBtn.onclick = () => this.onExitCallback();
    topBar.appendChild(exitBtn);

    // Center: Score & Combo
    this.scoreEl = document.createElement('div');
    this.scoreEl.style.cssText = `
      background: rgba(15, 23, 42, 0.88);
      border: 2px solid #fbbf24;
      border-radius: 20px;
      padding: 6px 20px;
      color: #fbbf24;
      font-weight: 900;
      font-size: 22px;
      letter-spacing: 1px;
      box-shadow: 0 4px 15px rgba(251, 191, 36, 0.25);
      text-align: center;
      backdrop-filter: blur(6px);
    `;
    this.scoreEl.innerText = 'ĐIỂM: 0 (x1)';
    topBar.appendChild(this.scoreEl);

    // Right: Match Timer
    this.timerEl = document.createElement('div');
    this.timerEl.style.cssText = `
      background: rgba(15, 23, 42, 0.88);
      border: 2px solid #38bdf8;
      border-radius: 20px;
      padding: 6px 16px;
      color: #38bdf8;
      font-weight: 900;
      font-size: 20px;
      letter-spacing: 1px;
      box-shadow: 0 4px 15px rgba(56, 189, 248, 0.25);
      backdrop-filter: blur(6px);
      margin-right: 120px;
    `;
    this.timerEl.innerText = '⏱ 03:00';
    topBar.appendChild(this.timerEl);

    this.container.appendChild(topBar);
  }

  private buildOrdersList() {
    this.ordersContainer = document.createElement('div');
    this.ordersContainer.style.cssText = `
      position: absolute;
      top: 68px;
      left: 16px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      max-width: 320px;
      pointer-events: none;
    `;
    this.container.appendChild(this.ordersContainer);
  }

  public updateOrders(orders: OrderRecipe[]) {
    this.ordersContainer.innerHTML = '';

    orders.forEach(order => {
      const card = document.createElement('div');
      card.style.cssText = `
        background: rgba(15, 23, 42, 0.9);
        border: 2px solid #3b82f6;
        border-radius: 12px;
        padding: 8px 12px;
        backdrop-filter: blur(8px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
      `;

      // Title & Reward Points
      const header = document.createElement('div');
      header.style.cssText = `
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 6px;
      `;
      header.innerHTML = `
        <span style="font-weight: bold; font-size: 13px; color: #ffffff;">${order.name}</span>
        <span style="font-weight: 800; font-size: 13px; color: #fbbf24;">+${order.rewardPoints}đ</span>
      `;
      card.appendChild(header);

      // Ingredient chips
      const chips = document.createElement('div');
      chips.style.cssText = 'display: flex; gap: 4px; flex-wrap: wrap; margin-bottom: 6px;';
      order.requiredIngredients.forEach(ing => {
        const chip = document.createElement('span');
        chip.style.cssText = `
          background: #1e293b;
          border: 1px solid #475569;
          border-radius: 6px;
          padding: 2px 6px;
          font-size: 11px;
          font-weight: 600;
          color: #94a3b8;
        `;
        chip.innerText = this.getIngredientLabel(ing);
        chips.appendChild(chip);
      });
      card.appendChild(chips);

      // Remaining Time Progress Bar
      const progressBg = document.createElement('div');
      progressBg.style.cssText = `
        width: 100%;
        height: 5px;
        background: #334155;
        border-radius: 3px;
        overflow: hidden;
      `;
      const ratio = Math.max(0, Math.min(1, order.remainingTime / order.maxTime));
      const barColor = ratio > 0.4 ? '#10b981' : ratio > 0.2 ? '#f59e0b' : '#ef4444';
      const progressFill = document.createElement('div');
      progressFill.style.cssText = `
        width: ${ratio * 100}%;
        height: 100%;
        background: ${barColor};
        transition: width 0.2s linear;
      `;
      progressBg.appendChild(progressFill);
      card.appendChild(progressBg);

      this.ordersContainer.appendChild(card);
    });
  }

  private getIngredientLabel(type: IngredientType): string {
    switch (type) {
      case IngredientType.BREAD: return '🥖 Bánh mì';
      case IngredientType.COOKED_PATTY: return '🥩 Thịt nướng';
      case IngredientType.CHOPPED_LETTUCE: return '🥬 Xà lách';
      case IngredientType.SLICED_TOMATO: return '🍅 Cà chua';
      case IngredientType.SLICED_CHEESE: return '🧀 Phô mai';
      default: return type;
    }
  }

  public updateScoreAndTimer(score: number, combo: number, secondsRemaining: number) {
    this.scoreEl.innerText = `ĐIỂM: ${score} (x${combo})`;
    const m = Math.floor(secondsRemaining / 60).toString().padStart(2, '0');
    const s = Math.floor(secondsRemaining % 60).toString().padStart(2, '0');
    this.timerEl.innerText = `⏱ ${m}:${s}`;
    if (secondsRemaining <= 20) {
      this.timerEl.style.borderColor = '#ef4444';
      this.timerEl.style.color = '#ef4444';
    }
  }

  private buildMobileControls() {
    // 1. TOUCH JOYSTICK ZONE (Left screen)
    const joyZone = document.createElement('div');
    joyZone.style.cssText = `
      position: absolute;
      bottom: 0;
      left: 0;
      width: 45vw;
      height: 60vh;
      pointer-events: auto;
      touch-action: none;
    `;

    this.joystickBaseEl = document.createElement('div');
    this.joystickBaseEl.style.cssText = `
      position: absolute;
      width: 110px;
      height: 110px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.15);
      border: 3px solid rgba(255, 255, 255, 0.35);
      transform: translate(-50%, -50%);
      display: none;
      pointer-events: none;
    `;

    this.joystickThumbEl = document.createElement('div');
    this.joystickThumbEl.style.cssText = `
      position: absolute;
      width: 50px;
      height: 50px;
      border-radius: 50%;
      background: #38bdf8;
      border: 2px solid #ffffff;
      transform: translate(-50%, -50%);
      pointer-events: none;
      box-shadow: 0 0 12px rgba(56, 189, 248, 0.8);
    `;
    this.joystickBaseEl.appendChild(this.joystickThumbEl);
    joyZone.appendChild(this.joystickBaseEl);

    // Joystick Touch Listeners
    joyZone.addEventListener('touchstart', (e: TouchEvent) => {
      if (this.joystickTouchId === null && e.changedTouches.length > 0) {
        const t = e.changedTouches[0];
        this.joystickTouchId = t.identifier;
        this.joystickActive = true;
        this.joystickCenter = { x: t.clientX, y: t.clientY };
        this.joystickBaseEl.style.left = `${t.clientX}px`;
        this.joystickBaseEl.style.top = `${t.clientY}px`;
        this.joystickThumbEl.style.left = '55px';
        this.joystickThumbEl.style.top = '55px';
        this.joystickBaseEl.style.display = 'block';
      }
    }, { passive: false });

    joyZone.addEventListener('touchmove', (e: TouchEvent) => {
      if (!this.joystickActive) return;
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        if (t.identifier === this.joystickTouchId) {
          const dx = t.clientX - this.joystickCenter.x;
          const dy = t.clientY - this.joystickCenter.y;
          const dist = Math.hypot(dx, dy);
          const maxR = 50;
          let clampedX = dx;
          let clampedY = dy;
          if (dist > maxR) {
            clampedX = (dx / dist) * maxR;
            clampedY = (dy / dist) * maxR;
          }
          this.joystickThumbEl.style.left = `${55 + clampedX}px`;
          this.joystickThumbEl.style.top = `${55 + clampedY}px`;
          this.inputs.moveX = clampedX / maxR;
          this.inputs.moveZ = clampedY / maxR;
        }
      }
    }, { passive: false });

    const endJoy = (e: TouchEvent) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === this.joystickTouchId) {
          this.joystickActive = false;
          this.joystickTouchId = null;
          this.joystickBaseEl.style.display = 'none';
          this.inputs.moveX = 0;
          this.inputs.moveZ = 0;
        }
      }
    };
    joyZone.addEventListener('touchend', endJoy);
    joyZone.addEventListener('touchcancel', endJoy);

    this.container.appendChild(joyZone);

    // 2. TOUCH ACTION BUTTONS (Right screen bottom)
    const btnContainer = document.createElement('div');
    btnContainer.style.cssText = `
      position: absolute;
      bottom: 24px;
      right: 24px;
      display: flex;
      gap: 16px;
      align-items: flex-end;
      pointer-events: auto;
    `;

    // Pickup / Drop (Green)
    const pickupBtn = this.createTouchButton('CẦM<br>THẢ', '#10b981', '#059669', 75, () => {
      this.inputs.isPickupJustPressed = true;
    });

    // Action / Chop (Orange)
    const actionBtn = this.createTouchButton('CẮT<br>NẤU', '#f97316', '#ea580c', 85, () => {
      this.inputs.isActionJustPressed = true;
    }, (pressed) => {
      this.inputs.isActionPressed = pressed;
    });

    // Throw (Purple)
    const throwBtn = this.createTouchButton('NÉM', '#8b5cf6', '#7c3aed', 65, () => {
      this.inputs.isThrowJustPressed = true;
    });

    btnContainer.appendChild(throwBtn);
    btnContainer.appendChild(pickupBtn);
    btnContainer.appendChild(actionBtn);
    this.container.appendChild(btnContainer);
  }

  private createTouchButton(
    html: string,
    color: string,
    activeColor: string,
    size: number,
    onTap: () => void,
    onHold?: (pressed: boolean) => void
  ): HTMLElement {
    const btn = document.createElement('button');
    btn.innerHTML = html;
    btn.style.cssText = `
      width: ${size}px;
      height: ${size}px;
      border-radius: 50%;
      background: ${color};
      border: 3px solid #ffffff;
      color: #ffffff;
      font-weight: 900;
      font-size: ${size < 70 ? '12px' : '14px'};
      line-height: 1.2;
      text-align: center;
      cursor: pointer;
      box-shadow: 0 6px 18px rgba(0, 0, 0, 0.4);
      user-select: none;
      -webkit-user-select: none;
      touch-action: manipulation;
      transition: transform 0.1s;
    `;

    const press = (e: Event) => {
      e.preventDefault();
      btn.style.transform = 'scale(0.92)';
      btn.style.background = activeColor;
      onTap();
      if (onHold) onHold(true);
    };

    const release = (e: Event) => {
      e.preventDefault();
      btn.style.transform = 'scale(1)';
      btn.style.background = color;
      if (onHold) onHold(false);
    };

    btn.addEventListener('touchstart', press, { passive: false });
    btn.addEventListener('touchend', release);
    btn.addEventListener('mousedown', press);
    btn.addEventListener('mouseup', release);
    btn.addEventListener('mouseleave', release);

    return btn;
  }

  private buildDesktopHints() {
    const hint = document.createElement('div');
    hint.style.cssText = `
      position: absolute;
      bottom: 12px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(15, 23, 42, 0.75);
      border: 1px solid #334155;
      border-radius: 12px;
      padding: 6px 16px;
      color: #94a3b8;
      font-size: 12px;
      font-weight: bold;
      pointer-events: none;
      backdrop-filter: blur(4px);
    `;
    hint.innerHTML = '⌨ <b>[WASD]</b> Di chuyển &nbsp;|&nbsp; <b>[E]</b> Cầm/Thả &nbsp;|&nbsp; <b>[Space]</b> Cắt/Nấu &nbsp;|&nbsp; <b>[Q]</b> Ném';
    this.container.appendChild(hint);
  }

  private buildGameOverModal() {
    this.gameOverEl = document.createElement('div');
    this.gameOverEl.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(11, 15, 25, 0.88);
      display: none;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      z-index: 100;
      pointer-events: auto;
      backdrop-filter: blur(10px);
    `;

    this.gameOverEl.innerHTML = `
      <div style="background: #1e293b; border: 3px solid #fbbf24; border-radius: 20px; padding: 32px 40px; text-align: center; box-shadow: 0 20px 40px rgba(0,0,0,0.8); max-width: 400px; width: 90%;">
        <h1 style="color: #fbbf24; font-size: 36px; font-weight: 900; margin-bottom: 12px;">HẾT GIỜ!</h1>
        <p style="color: #94a3b8; font-size: 15px; margin-bottom: 24px;">Nhà bếp đã hoàn thành ca phục vụ xuất sắc!</p>
        <div id="final-score" style="font-size: 44px; font-weight: 900; color: #38bdf8; margin-bottom: 28px;">0 ĐIỂM</div>
        <button id="btn-back-lobby" style="background: #2563eb; color: #ffffff; border: none; padding: 14px 28px; font-size: 16px; font-weight: bold; border-radius: 12px; cursor: pointer; width: 100%;">
          VỀ SẢNH CHÍNH
        </button>
      </div>
    `;

    const backBtn = this.gameOverEl.querySelector('#btn-back-lobby');
    if (backBtn) {
      backBtn.addEventListener('click', () => this.onExitCallback());
    }

    this.container.appendChild(this.gameOverEl);
  }

  public showGameOver(score: number) {
    const finalScore = this.gameOverEl.querySelector('#final-score');
    if (finalScore) {
      finalScore.innerHTML = `${score} <span style="font-size: 24px; color: #fbbf24;">ĐIỂM</span>`;
    }
    this.gameOverEl.style.display = 'flex';
  }

  public destroy() {
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
  }
}
