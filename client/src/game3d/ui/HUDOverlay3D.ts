import { OrderRecipe, IngredientType } from '../../game/types';

export interface MobileInputsState {
  moveX: number;
  moveZ: number;
  isPickupJustPressed: boolean;
  isActionPressed: boolean;
  isActionJustPressed: boolean;
  isThrowJustPressed: boolean;
  isDashJustPressed: boolean;
}

export class HUDOverlay3D {
  public container: HTMLElement;
  public inputs: MobileInputsState = {
    moveX: 0,
    moveZ: 0,
    isPickupJustPressed: false,
    isActionPressed: false,
    isActionJustPressed: false,
    isThrowJustPressed: false,
    isDashJustPressed: false
  };

  private scoreEl!: HTMLElement;
  private timerEl!: HTMLElement;
  private ordersContainer!: HTMLElement;
  private gameOverEl!: HTMLElement;
  private dashBtnEl?: HTMLElement;
  private actionBtnEl?: HTMLElement;
  private actionBtnEnabled = false;
  private currentActionLabel = '';
  private onExitCallback: () => void;
  private onScreenshotCallback?: () => void;

  private joystickActive = false;
  private joystickTouchId: number | null = null;
  private joystickCenter = { x: 0, y: 0 };
  private joystickThumbEl!: HTMLElement;
  private joystickBaseEl!: HTMLElement;

  constructor(onExit: () => void, onScreenshot?: () => void) {
    this.onExitCallback = onExit;
    this.onScreenshotCallback = onScreenshot;
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
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
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
      top: 10px;
      right: 14px;
      display: flex;
      gap: 10px;
      align-items: center;
      pointer-events: auto;
    `;

    // Center: Score & Combo
    this.scoreEl = document.createElement('div');
    this.scoreEl.style.cssText = `
      background: rgba(15, 23, 42, 0.88);
      border: 2px solid #fbbf24;
      border-radius: 16px;
      padding: 6px 16px;
      color: #fbbf24;
      font-weight: 900;
      font-size: 18px;
      letter-spacing: 0.5px;
      box-shadow: 0 4px 12px rgba(251, 191, 36, 0.25);
      text-align: center;
      backdrop-filter: blur(6px);
      white-space: nowrap;
    `;
    this.scoreEl.innerText = 'ĐIỂM: 0 (x1)';
    topBar.appendChild(this.scoreEl);

    // Match Timer
    this.timerEl = document.createElement('div');
    this.timerEl.style.cssText = `
      background: rgba(15, 23, 42, 0.88);
      border: 2px solid #38bdf8;
      border-radius: 16px;
      padding: 6px 14px;
      color: #38bdf8;
      font-weight: 900;
      font-size: 18px;
      letter-spacing: 0.5px;
      box-shadow: 0 4px 12px rgba(56, 189, 248, 0.25);
      backdrop-filter: blur(6px);
      white-space: nowrap;
    `;
    this.timerEl.innerText = '⏱ 03:00';
    topBar.appendChild(this.timerEl);

    // Screenshot Button
    if (this.onScreenshotCallback) {
      const snapBtn = document.createElement('button');
      snapBtn.innerHTML = '📸 Chụp ảnh';
      snapBtn.title = 'Phím tắt [P] để chụp ảnh màn hình';
      snapBtn.style.cssText = `
        background: rgba(30, 41, 59, 0.85);
        border: 1px solid #38bdf8;
        color: #38bdf8;
        padding: 7px 12px;
        border-radius: 12px;
        font-size: 13px;
        font-weight: bold;
        cursor: pointer;
        backdrop-filter: blur(6px);
        transition: transform 0.1s;
      `;
      snapBtn.onclick = () => this.onScreenshotCallback && this.onScreenshotCallback();
      topBar.appendChild(snapBtn);
    }

    // Exit Button
    const exitBtn = document.createElement('button');
    exitBtn.innerHTML = '🚪 Thoát';
    exitBtn.style.cssText = `
      background: rgba(30, 41, 59, 0.85);
      border: 1px solid #475569;
      color: #f8fafc;
      padding: 7px 12px;
      border-radius: 12px;
      font-size: 13px;
      font-weight: bold;
      cursor: pointer;
      backdrop-filter: blur(6px);
      transition: background 0.15s;
    `;
    exitBtn.onclick = () => this.onExitCallback();
    topBar.appendChild(exitBtn);

    this.container.appendChild(topBar);
  }

  /**
   * Overcooked 2 Horizontal Order Ticker Bar
   * Positioned along top-left without occluding kitchen gameplay!
   */
  private buildOrdersList() {
    this.ordersContainer = document.createElement('div');
    this.ordersContainer.style.cssText = `
      position: absolute;
      top: 10px;
      left: 14px;
      display: flex;
      flex-direction: row;
      gap: 10px;
      pointer-events: none;
      max-width: calc(100vw - 360px);
      overflow-x: auto;
    `;
    this.container.appendChild(this.ordersContainer);
  }

  public updateOrders(orders: OrderRecipe[]) {
    this.ordersContainer.innerHTML = '';

    orders.forEach(order => {
      const card = document.createElement('div');
      card.style.cssText = `
        background: rgba(15, 23, 42, 0.92);
        border: 2px solid #3b82f6;
        border-radius: 12px;
        padding: 6px 10px;
        min-width: 130px;
        backdrop-filter: blur(8px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.45);
        display: flex;
        flex-direction: column;
        justify-content: space-between;
      `;

      // Header: Recipe Name & Points
      const header = document.createElement('div');
      header.style.cssText = `
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 6px;
        margin-bottom: 4px;
      `;
      header.innerHTML = `
        <span style="font-weight: 800; font-size: 12px; color: #ffffff; white-space: nowrap;">${order.name}</span>
        <span style="font-weight: 900; font-size: 12px; color: #fbbf24;">+${order.rewardPoints}đ</span>
      `;
      card.appendChild(header);

      // Ingredient Chips (Compact mini badges)
      const chips = document.createElement('div');
      chips.style.cssText = 'display: flex; gap: 4px; flex-wrap: nowrap; margin-bottom: 5px;';
      order.requiredIngredients.forEach(ing => {
        const chip = document.createElement('span');
        chip.style.cssText = `
          background: #1e293b;
          border: 1px solid #475569;
          border-radius: 6px;
          padding: 2px 4px;
          font-size: 11px;
          line-height: 1;
        `;
        chip.innerText = this.getIngredientEmoji(ing);
        chips.appendChild(chip);
      });
      card.appendChild(chips);

      // Countdown Progress Bar
      const progressBg = document.createElement('div');
      progressBg.style.cssText = `
        width: 100%;
        height: 4px;
        background: #334155;
        border-radius: 2px;
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

  private getIngredientEmoji(type: IngredientType): string {
    switch (type) {
      case IngredientType.BREAD: return '🍞';
      case IngredientType.COOKED_PATTY: return '🥩';
      case IngredientType.CHOPPED_LETTUCE: return '🥬';
      case IngredientType.SLICED_TOMATO: return '🍅';
      case IngredientType.SLICED_CHEESE: return '🧀';
      default: return '🍴';
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
      width: 40vw;
      height: 50vh;
      pointer-events: auto;
      touch-action: none;
    `;

    this.joystickBaseEl = document.createElement('div');
    this.joystickBaseEl.style.cssText = `
      position: absolute;
      width: 100px;
      height: 100px;
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
      width: 46px;
      height: 46px;
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
        this.joystickThumbEl.style.left = '50px';
        this.joystickThumbEl.style.top = '50px';
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
          const maxR = 45;
          let clampedX = dx;
          let clampedY = dy;
          if (dist > maxR) {
            clampedX = (dx / dist) * maxR;
            clampedY = (dy / dist) * maxR;
          }
          this.joystickThumbEl.style.left = `${50 + clampedX}px`;
          this.joystickThumbEl.style.top = `${50 + clampedY}px`;
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

    // 2. TOUCH ACTION BUTTONS (Right screen bottom safe area)
    const btnContainer = document.createElement('div');
    btnContainer.style.cssText = `
      position: absolute;
      bottom: 20px;
      right: 20px;
      display: flex;
      gap: 14px;
      align-items: flex-end;
      pointer-events: auto;
    `;

    // Dash / Sprint (Indigo with lightning)
    this.dashBtnEl = this.createTouchButton('⚡<br>LƯỚT', '#6366f1', '#4f46e5', 66, () => {
      this.inputs.isDashJustPressed = true;
    });

    // Pickup / Drop (Green)
    const pickupBtn = this.createTouchButton('CẦM<br>THẢ', '#10b981', '#059669', 72, () => {
      this.inputs.isPickupJustPressed = true;
    });

    //Contextual Smart Action Button (CẮT / NẤU / RỬA / GIAO MÓN) - Single-tap trigger!
    this.actionBtnEl = this.createTouchButton('🔪<br>CẮT', '#f97316', '#ea580c', 80, () => {
      if (!this.actionBtnEnabled) return;
      this.inputs.isActionJustPressed = true;
    }, (pressed) => {
      this.inputs.isActionPressed = this.actionBtnEnabled && pressed;
    });

    // Throw (Purple)
    const throwBtn = this.createTouchButton('NÉM', '#8b5cf6', '#7c3aed', 62, () => {
      this.inputs.isThrowJustPressed = true;
    });

    btnContainer.appendChild(this.dashBtnEl);
    btnContainer.appendChild(throwBtn);
    btnContainer.appendChild(pickupBtn);
    btnContainer.appendChild(this.actionBtnEl);
    this.container.appendChild(btnContainer);

    this.updateContextualActionButton('CẮT<br>NẤU', '#475569', false);
  }

  /**
   * Dynamically updates the Smart Contextual Action Button based on what equipment
   * and ingredient the player is facing/holding (CẮT, NẤU, RỬA, GIAO MÓN, or Disabled).
   */
  public updateContextualActionButton(labelHtml: string, color: string, enabled: boolean) {
    if (!this.actionBtnEl) return;
    if (this.currentActionLabel === `${labelHtml}_${color}_${enabled}`) return;
    this.currentActionLabel = `${labelHtml}_${color}_${enabled}`;
    this.actionBtnEnabled = enabled;

    const span = this.actionBtnEl.querySelector('span');
    if (span) {
      span.innerHTML = labelHtml;
    }

    this.actionBtnEl.dataset.baseColor = color;
    this.actionBtnEl.style.background = color;
    if (enabled) {
      this.actionBtnEl.style.opacity = '1.0';
      this.actionBtnEl.style.filter = 'none';
      this.actionBtnEl.style.cursor = 'pointer';
      this.actionBtnEl.style.boxShadow = `0 0 18px ${color}99, 0 4px 14px rgba(0, 0, 0, 0.45)`;
    } else {
      this.actionBtnEl.style.opacity = '0.38';
      this.actionBtnEl.style.filter = 'grayscale(65%)';
      this.actionBtnEl.style.cursor = 'default';
      this.actionBtnEl.style.boxShadow = '0 2px 6px rgba(0, 0, 0, 0.25)';
      this.inputs.isActionPressed = false;
    }
  }

  public showFloatingPopup(text: string, borderColor: string = '#fbbf24') {
    const popup = document.createElement('div');
    popup.innerHTML = text;
    popup.style.cssText = `
      position: absolute;
      top: 90px;
      left: 50%;
      transform: translate(-50%, 0) scale(0.85);
      background: rgba(15, 23, 42, 0.94);
      border: 3px solid ${borderColor};
      border-radius: 18px;
      padding: 8px 22px;
      color: #ffffff;
      font-weight: 900;
      font-size: 20px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
      pointer-events: none;
      z-index: 80;
      opacity: 1;
      transition: transform 0.75s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.75s ease-out;
    `;
    this.container.appendChild(popup);
    requestAnimationFrame(() => {
      popup.style.transform = 'translate(-50%, -32px) scale(1.05)';
      popup.style.opacity = '0';
    });
    setTimeout(() => {
      if (popup.parentNode) popup.parentNode.removeChild(popup);
    }, 800);
  }

  public updateDashCooldown(remainingSeconds: number, totalCooldown: number) {
    if (!this.dashBtnEl) return;
    const ringEl = this.dashBtnEl.querySelector('.dash-cooldown-ring') as HTMLElement | null;
    if (remainingSeconds > 0 && totalCooldown > 0) {
      const progress = Math.max(0, Math.min(1, 1 - remainingSeconds / totalCooldown));
      const deg = Math.round(progress * 360);
      this.dashBtnEl.style.opacity = '0.68';
      this.dashBtnEl.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.35)';
      if (ringEl) {
        ringEl.style.background = `conic-gradient(#38bdf8 ${deg}deg, rgba(15, 23, 42, 0.75) ${deg}deg)`;
        ringEl.style.opacity = '1';
      }
    } else {
      this.dashBtnEl.style.opacity = '1.0';
      this.dashBtnEl.style.boxShadow = '0 0 16px rgba(99, 102, 241, 0.85), 0 4px 14px rgba(0, 0, 0, 0.4)';
      if (ringEl) {
        ringEl.style.background = 'conic-gradient(#a5b4fc 360deg, transparent 360deg)';
        ringEl.style.opacity = '0';
      }
    }
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
    btn.type = 'button';
    btn.tabIndex = -1;
    btn.style.cssText = `
      position: relative;
      width: ${size}px;
      height: ${size}px;
      border-radius: 50%;
      background: ${color};
      border: 3px solid #ffffff;
      color: #ffffff;
      font-weight: 900;
      font-size: ${size < 70 ? '11px' : '13px'};
      line-height: 1.2;
      text-align: center;
      cursor: pointer;
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.4);
      user-select: none;
      -webkit-user-select: none;
      touch-action: none;
      outline: none;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.08s, opacity 0.12s, box-shadow 0.15s;
    `;

    const ring = document.createElement('div');
    ring.className = 'dash-cooldown-ring';
    ring.style.cssText = `
      position: absolute;
      inset: 0;
      border-radius: 50%;
      pointer-events: none;
      opacity: 0;
      mix-blend-mode: screen;
    `;
    btn.appendChild(ring);

    const label = document.createElement('span');
    label.style.cssText = 'position: relative; z-index: 2; pointer-events: none;';
    label.innerHTML = html;
    btn.appendChild(label);

    let activePointerId: number | null = null;

    const press = (e: PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      btn.blur();
      if (activePointerId !== null) return;
      activePointerId = e.pointerId;
      try {
        btn.setPointerCapture(e.pointerId);
      } catch (_) {}
      btn.style.transform = 'scale(0.90)';
      btn.style.background = activeColor;
      onTap();
      if (onHold) onHold(true);
    };

    const release = (e: PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (activePointerId !== null && e.pointerId !== activePointerId) return;
      activePointerId = null;
      btn.style.transform = 'scale(1)';
      btn.style.background = btn.dataset.baseColor || color;
      if (onHold) onHold(false);
    };

    btn.addEventListener('pointerdown', press, { passive: false });
    btn.addEventListener('pointerup', release, { passive: false });
    btn.addEventListener('pointercancel', release, { passive: false });
    btn.addEventListener('lostpointercapture', release, { passive: false });
    // Prevent keyboard Space/Enter from ever activating the button
    btn.addEventListener('keydown', (e) => {
      e.preventDefault();
      e.stopPropagation();
    });

    return btn;
  }

  private buildDesktopHints() {
    const hint = document.createElement('div');
    hint.style.cssText = `
      position: absolute;
      bottom: 8px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(15, 23, 42, 0.75);
      border: 1px solid #334155;
      border-radius: 10px;
      padding: 4px 14px;
      color: #94a3b8;
      font-size: 11px;
      font-weight: bold;
      pointer-events: none;
      backdrop-filter: blur(4px);
      white-space: nowrap;
    `;
    hint.innerHTML = '⌨ <b>[WASD / ⬆⬅⬇➡]</b> Di chuyển &nbsp;|&nbsp; <b>[Shift]</b> Lướt (Dash) &nbsp;|&nbsp; <b>[E]</b> Cầm/Thả &nbsp;|&nbsp; <b>[Space]</b> Cắt/Nấu &nbsp;|&nbsp; <b>[Q]</b> Ném &nbsp;|&nbsp; <b>[P]</b> Chụp ảnh';
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
