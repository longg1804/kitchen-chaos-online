import Phaser from 'phaser';
import { NetworkManager } from '../../multiplayer/NetworkManager';
import { ChefSkin, KitchenMapId } from '../types';

export class LobbyScene extends Phaser.Scene {
  private network = NetworkManager.getInstance();
  private playerName: string = 'Đầu Bếp';
  private selectedSkin: ChefSkin = ChefSkin.CLASSIC;
  private selectedMap: KitchenMapId = KitchenMapId.TRADITIONAL;
  private isInRoom = false;
  private currentRoomCode: string = '';
  private currentPlayers: any[] = [];

  private domRoot?: HTMLElement;
  private mainViewEl?: HTMLElement;
  private roomViewEl?: HTMLElement;
  private nameTextEl?: HTMLElement;
  private statusBannerEl?: HTMLElement;
  private roomCodeValueEl?: HTMLElement;
  private playerListEl?: HTMLElement;
  private mapSelectorWrapEl?: HTMLElement;
  private startBtnEl?: HTMLButtonElement;
  private readyBtnEl?: HTMLButtonElement;
  private skinCardEls: Map<ChefSkin, HTMLElement> = new Map();
  private mapCardEls: Map<KitchenMapId, HTMLElement> = new Map();

  constructor() {
    super('LobbyScene');
  }

  create() {
    const savedName = localStorage.getItem('kitchen_chaos_player_name');
    if (savedName) this.playerName = savedName;

    const savedSkin = localStorage.getItem('kitchen_chaos_player_skin');
    if (savedSkin) this.selectedSkin = savedSkin as ChefSkin;

    // Ensure Phaser canvas stays behind our rich Cartoon DOM UI
    this.cameras.main.setBackgroundColor('#161f30');

    this.mountCartoonMenuDOM();

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.destroyCartoonMenuDOM();
    });
    this.events.once(Phaser.Scenes.Events.DESTROY, () => {
      this.destroyCartoonMenuDOM();
    });

    this.checkUrlRoomCode();
  }

  private checkUrlRoomCode() {
    const params = new URLSearchParams(window.location.search);
    const mode = params.get('mode');
    if (mode === 'solo') {
      this.network.leaveRoom();
      this.destroyCartoonMenuDOM();
      this.scene.start('GameScene', {
        isMultiplayer: false,
        skin: this.selectedSkin,
        mapId: this.selectedMap
      });
      return;
    }

    const roomCode = params.get('room');
    if (roomCode) {
      this.joinRoomByCode(roomCode);
    }
  }

  private injectLobbyStyles() {
    if (document.getElementById('kc-cartoon-lobby-styles')) return;
    const style = document.createElement('style');
    style.id = 'kc-cartoon-lobby-styles';
    style.textContent = `
      @keyframes kcFloatSlow {
        0%, 100% { transform: translateY(0px) rotate(0deg); }
        50% { transform: translateY(-8px) rotate(3deg); }
      }
      @keyframes kcTitleBounce {
        0%, 100% { transform: translateY(0px) scale(1); }
        50% { transform: translateY(-3px) scale(1.015); }
      }
      @keyframes kcPulseGlow {
        0%, 100% { box-shadow: 0 6px 0 #b45309, 0 10px 24px rgba(245, 158, 11, 0.45); }
        50% { box-shadow: 0 6px 0 #b45309, 0 12px 30px rgba(251, 191, 36, 0.75); }
      }
      #kc-lobby-root {
        position: fixed;
        inset: 0;
        width: 100%;
        height: 100%;
        z-index: 45;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: space-between;
        overflow-x: hidden;
        overflow-y: auto;
        user-select: none;
        -webkit-user-select: none;
        font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        background:
          radial-gradient(circle at 50% 36%, rgba(251, 191, 36, 0.22) 0%, rgba(234, 88, 12, 0.12) 38%, rgba(15, 23, 42, 0.96) 82%),
          linear-gradient(180deg, #1e293b 0%, #0f172a 100%);
        color: #fff7ed;
        box-sizing: border-box;
        padding:
          calc(clamp(28px, 4.5vh, 46px) + env(safe-area-inset-top, 0px))
          calc(clamp(12px, 3vw, 28px) + env(safe-area-inset-right, 0px))
          calc(clamp(14px, 3vh, 26px) + env(safe-area-inset-bottom, 0px))
          calc(clamp(12px, 3vw, 28px) + env(safe-area-inset-left, 0px));
      }
      /* Warm Cartoon Bistro Striped Awning Top Border */
      .kc-bistro-awning {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        height: clamp(18px, 3.2vh, 28px);
        background: repeating-linear-gradient(
          90deg,
          #dc2626 0px,
          #dc2626 36px,
          #fff7ed 36px,
          #fff7ed 72px
        );
        border-bottom: 4px solid #7f1d1d;
        box-shadow: 0 6px 18px rgba(0, 0, 0, 0.55);
        z-index: 2;
        pointer-events: none;
      }
      /* Warm Kitchen Checkerboard & Wood Counter Footer Trim */
      .kc-kitchen-footer-trim {
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        height: clamp(12px, 2.2vh, 20px);
        background: repeating-linear-gradient(
          90deg,
          #78350f 0px,
          #78350f 48px,
          #92400e 48px,
          #92400e 96px
        );
        border-top: 3px solid #f59e0b;
        box-shadow: 0 -4px 14px rgba(0, 0, 0, 0.5);
        z-index: 2;
        pointer-events: none;
      }
      .kc-bg-decor {
        position: fixed;
        inset: 0;
        pointer-events: none;
        overflow: hidden;
        z-index: 1;
      }
      .kc-main-panel {
        position: relative;
        z-index: 5;
        width: 100%;
        max-width: 820px;
        margin: auto;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: clamp(10px, 2.2vh, 18px);
      }
      /* Title Banner */
      .kc-header-box {
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        animation: kcTitleBounce 4s ease-in-out infinite;
      }
      .kc-title-badge {
        display: inline-flex;
        align-items: center;
        gap: 10px;
        background: linear-gradient(180deg, #b45309 0%, #78350f 100%);
        border: 3px solid #fde68a;
        border-radius: 999px;
        padding: 4px 16px;
        font-size: clamp(10px, 1.8vmin, 13px);
        font-weight: 900;
        color: #fef3c7;
        letter-spacing: 1px;
        text-transform: uppercase;
        box-shadow: 0 4px 10px rgba(0, 0, 0, 0.45);
        margin-bottom: clamp(4px, 1vh, 8px);
      }
      .kc-game-title {
        margin: 0;
        font-size: clamp(26px, 6.2vmin, 52px);
        font-weight: 900;
        line-height: 1.04;
        letter-spacing: 1px;
        color: #fde047;
        text-shadow:
          0 3px 0 #b45309,
          0 6px 0 #78350f,
          0 10px 22px rgba(0, 0, 0, 0.75);
        -webkit-text-stroke: 1.5px #78350f;
      }
      .kc-game-subtitle {
        margin: 4px 0 0 0;
        font-size: clamp(11px, 2.1vmin, 15px);
        font-weight: 800;
        color: #fed7aa;
        text-shadow: 0 2px 4px rgba(0, 0, 0, 0.65);
      }
      /* Chef Name Tag Bar */
      .kc-name-card {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        width: 100%;
        max-width: 520px;
        background: linear-gradient(180deg, #fffbeb 0%, #fef3c7 100%);
        border: 3.5px solid #f59e0b;
        border-radius: 18px;
        padding: clamp(6px, 1.3vh, 10px) clamp(12px, 2.2vw, 18px);
        box-shadow: 0 5px 0 #b45309, 0 8px 18px rgba(0, 0, 0, 0.45);
        color: #451a03;
        cursor: pointer;
        box-sizing: border-box;
        transition: transform 0.12s ease, box-shadow 0.12s ease;
      }
      .kc-name-card:hover {
        transform: translateY(-2px);
      }
      .kc-name-card:active {
        transform: translateY(2px);
        box-shadow: 0 2px 0 #b45309, 0 4px 10px rgba(0, 0, 0, 0.4);
      }
      /* Character Selection Grid (4 Cards) */
      .kc-section-label {
        font-size: clamp(11px, 2vmin, 13px);
        font-weight: 900;
        letter-spacing: 0.9px;
        color: #fde68a;
        text-transform: uppercase;
        text-shadow: 0 2px 4px rgba(0,0,0,0.65);
        margin-bottom: -4px;
      }
      .kc-skin-grid {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: clamp(8px, 1.8vw, 14px);
        width: 100%;
        max-width: 680px;
      }
      .kc-skin-card {
        position: relative;
        background: linear-gradient(180deg, #1e293b 0%, #0f172a 100%);
        border: 3px solid #475569;
        border-radius: 18px;
        padding: clamp(7px, 1.5vh, 12px) 6px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: clamp(3px, 0.8vh, 6px);
        cursor: pointer;
        box-shadow: 0 5px 0 #090d16, 0 6px 14px rgba(0, 0, 0, 0.4);
        transition: transform 0.14s cubic-bezier(0.34, 1.56, 0.64, 1), border-color 0.14s ease, background 0.14s ease, box-shadow 0.14s ease;
      }
      .kc-skin-card:hover {
        transform: translateY(-3px);
        border-color: #94a3b8;
      }
      .kc-skin-card.active {
        background: linear-gradient(180deg, #2563eb 0%, #1d4ed8 65%, #1e3a8a 100%);
        border-color: #fde047;
        box-shadow: 0 5px 0 #b45309, 0 0 20px rgba(250, 204, 21, 0.55);
        transform: translateY(-3px) scale(1.02);
      }
      .kc-skin-avatar {
        width: clamp(38px, 8.2vmin, 56px);
        height: clamp(38px, 8.2vmin, 56px);
        border-radius: 50%;
        background: radial-gradient(circle at 35% 30%, #ffffff 0%, #e2e8f0 100%);
        border: 2.5px solid #0f172a;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: inset 0 2px 4px rgba(0,0,0,0.15);
      }
      .kc-skin-card.active .kc-skin-avatar {
        background: radial-gradient(circle at 35% 30%, #fef9c3 0%, #fde047 100%);
        border-color: #78350f;
      }
      .kc-skin-name {
        font-size: clamp(11px, 2.1vmin, 14px);
        font-weight: 900;
        color: #ffffff;
        line-height: 1.1;
      }
      .kc-skin-role {
        font-size: clamp(9px, 1.6vmin, 11px);
        font-weight: 700;
        color: #cbd5e1;
        line-height: 1;
      }
      .kc-skin-card.active .kc-skin-role {
        color: #fef08a;
      }
      /* 3 Main Action Buttons */
      .kc-actions-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: clamp(8px, 1.8vw, 14px);
        width: 100%;
        max-width: 680px;
      }
      @media (max-width: 620px) and (orientation: portrait) {
        .kc-actions-grid {
          grid-template-columns: 1fr;
        }
        .kc-skin-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
      }
      .kc-action-btn {
        position: relative;
        border-radius: 18px;
        padding: clamp(9px, 1.8vh, 14px) clamp(10px, 1.6vw, 14px);
        border: 3.5px solid #fff7ed;
        color: #ffffff;
        cursor: pointer;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 3px;
        text-align: center;
        transition: transform 0.1s ease, filter 0.12s ease;
        outline: none;
      }
      .kc-action-btn:hover {
        transform: translateY(-2px);
        filter: brightness(1.06);
      }
      .kc-action-btn:active {
        transform: translateY(3px);
      }
      .kc-action-btn.btn-host {
        background: linear-gradient(180deg, #3b82f6 0%, #2563eb 65%, #1d4ed8 100%);
        box-shadow: 0 5px 0 #1e3a8a, 0 8px 18px rgba(37, 99, 235, 0.45);
      }
      .kc-action-btn.btn-join {
        background: linear-gradient(180deg, #10b981 0%, #059669 65%, #047857 100%);
        box-shadow: 0 5px 0 #064e3b, 0 8px 18px rgba(16, 185, 129, 0.45);
      }
      .kc-action-btn.btn-solo {
        background: linear-gradient(180deg, #f59e0b 0%, #ea580c 68%, #c2410c 100%);
        box-shadow: 0 5px 0 #7c2d12, 0 8px 18px rgba(245, 158, 11, 0.45);
      }
      .kc-btn-top {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 7px;
        font-size: clamp(12px, 2.3vmin, 16px);
        font-weight: 900;
        letter-spacing: 0.3px;
        text-shadow: 0 2px 3px rgba(0, 0, 0, 0.45);
      }
      .kc-btn-sub {
        font-size: clamp(9.5px, 1.7vmin, 11.5px);
        font-weight: 700;
        color: rgba(255, 255, 255, 0.9);
      }
      /* Room Lobby Card */
      .kc-room-card {
        position: relative;
        z-index: 5;
        width: 100%;
        max-width: 680px;
        margin: auto;
        background: linear-gradient(180deg, #1e293b 0%, #0f172a 100%);
        border: 4px solid #f59e0b;
        border-radius: 24px;
        padding: clamp(12px, 2.4vh, 22px) clamp(14px, 2.8vw, 24px);
        box-shadow: 0 8px 0 #78350f, 0 16px 36px rgba(0, 0, 0, 0.65);
        display: none;
        flex-direction: column;
        gap: clamp(8px, 1.8vh, 14px);
        box-sizing: border-box;
      }
      .kc-map-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 8px;
      }
      .kc-map-pill {
        background: #334155;
        border: 2.5px solid #64748b;
        border-radius: 12px;
        padding: 6px 8px;
        color: #f8fafc;
        font-size: clamp(10.5px, 2vmin, 13px);
        font-weight: 900;
        cursor: pointer;
        text-align: center;
        transition: all 0.14s ease;
      }
      .kc-map-pill.active {
        background: linear-gradient(180deg, #f59e0b 0%, #d97706 100%);
        border-color: #fef08a;
        color: #451a03;
        box-shadow: 0 3px 0 #78350f;
      }
    `;
    document.head.appendChild(style);
  }

  private mountCartoonMenuDOM() {
    this.destroyCartoonMenuDOM();
    this.injectLobbyStyles();

    // Ensure global #fs-btn stays visible and styled nicely on Main Menu
    const fsBtn = document.getElementById('fs-btn');
    if (fsBtn) {
      fsBtn.style.display = 'block';
    }

    this.domRoot = document.createElement('div');
    this.domRoot.id = 'kc-lobby-root';

    // Top Bistro Awning & Bottom Kitchen Counter Trim
    const awning = document.createElement('div');
    awning.className = 'kc-bistro-awning';
    this.domRoot.appendChild(awning);

    const footerTrim = document.createElement('div');
    footerTrim.className = 'kc-kitchen-footer-trim';
    this.domRoot.appendChild(footerTrim);

    // Floating Cartoon Kitchen Background Silhouettes
    const bgDecor = document.createElement('div');
    bgDecor.className = 'kc-bg-decor';
    bgDecor.innerHTML = `
      <div style="position:absolute;top:12%;left:6%;opacity:0.14;animation:kcFloatSlow 5.5s ease-in-out infinite;">
        ${this.getDecorFoodSVG('BURGER')}
      </div>
      <div style="position:absolute;bottom:14%;left:8%;opacity:0.13;animation:kcFloatSlow 6.5s ease-in-out 1s infinite;">
        ${this.getDecorFoodSVG('PAN')}
      </div>
      <div style="position:absolute;top:14%;right:7%;opacity:0.14;animation:kcFloatSlow 6s ease-in-out 0.5s infinite;">
        ${this.getDecorFoodSVG('HAT')}
      </div>
      <div style="position:absolute;bottom:15%;right:8%;opacity:0.13;animation:kcFloatSlow 5.2s ease-in-out 1.5s infinite;">
        ${this.getDecorFoodSVG('TOMATO')}
      </div>
    `;
    this.domRoot.appendChild(bgDecor);

    // =========================================================================
    // 1. MAIN MENU PANEL
    // =========================================================================
    this.mainViewEl = document.createElement('div');
    this.mainViewEl.className = 'kc-main-panel';

    // 1.1 Title Header
    const headerBox = document.createElement('div');
    headerBox.className = 'kc-header-box';
    headerBox.innerHTML = `
      <div class="kc-title-badge">
        <span>👨‍🍳</span>
        <span>CO-OP COOKING MULTIPLAYER 3D</span>
        <span>🍔</span>
      </div>
      <h1 class="kc-game-title">KITCHEN CHAOS ONLINE</h1>
      <p class="kc-game-subtitle">Phối hợp đầu bếp • Chế biến siêu tốc • Cứu nguy căn bếp rực lửa!</p>
    `;
    this.mainViewEl.appendChild(headerBox);

    // 1.2 Player Name Card
    const nameCard = document.createElement('div');
    nameCard.className = 'kc-name-card';
    nameCard.title = 'Nhấn để đổi tên Đầu Bếp';
    nameCard.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;min-width:0;">
        <span style="width:34px;height:34px;border-radius:10px;background:#f59e0b;color:#fff;display:flex;align-items:center;justify-content:center;font-size:18px;box-shadow:inset 0 2px 3px rgba(255,255,255,0.4);">👨‍🍳</span>
        <div style="display:flex;flex-direction:column;min-width:0;">
          <span style="font-size:10px;font-weight:900;color:#92400e;text-transform:uppercase;letter-spacing:0.6px;">Thẻ Đầu Bếp Của Bạn</span>
          <span id="kc-player-name-val" style="font-size:clamp(14px, 2.5vmin, 18px);font-weight:900;color:#451a03;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">Tên: ${this.escapeHtml(this.playerName)}</span>
        </div>
      </div>
      <span style="background:#f59e0b;color:#ffffff;font-weight:900;font-size:12px;padding:6px 12px;border-radius:10px;border:2px solid #78350f;white-space:nowrap;box-shadow:0 2px 0 #78350f;">Đổi tên ✎</span>
    `;
    nameCard.onclick = () => {
      const openModal = (window as any).openCustomModal;
      if (openModal) {
        openModal('ĐỔI TÊN ĐẦU BẾP', 'Nhập tên của bạn...', this.playerName, 'text', (val: string) => {
          if (val && val.trim()) {
            this.playerName = val.trim().substring(0, 15);
            localStorage.setItem('kitchen_chaos_player_name', this.playerName);
            if (this.nameTextEl) {
              this.nameTextEl.textContent = `Tên: ${this.playerName}`;
            }
          }
        });
      }
    };
    this.mainViewEl.appendChild(nameCard);
    this.nameTextEl = nameCard.querySelector('#kc-player-name-val') as HTMLElement;

    // 1.3 Character Skin Cards (4 Illustrated Chef Cards)
    const skinTitle = document.createElement('div');
    skinTitle.className = 'kc-section-label';
    skinTitle.textContent = 'CHỌN NHÂN VẬT ĐẦU BẾP';
    this.mainViewEl.appendChild(skinTitle);

    const skinGrid = document.createElement('div');
    skinGrid.className = 'kc-skin-grid';

    const skins: { id: ChefSkin; name: string; role: string }[] = [
      { id: ChefSkin.CLASSIC, name: 'Cổ Điển', role: 'Bếp Trưởng' },
      { id: ChefSkin.PANDA, name: 'Panda', role: 'Chuyên Chảo' },
      { id: ChefSkin.FOX, name: 'Hồ Ly', role: 'Siêu Tốc Độ' },
      { id: ChefSkin.ROBOT, name: 'Robot', role: 'Chuẩn Xác' }
    ];

    skins.forEach((s) => {
      const card = document.createElement('div');
      card.className = `kc-skin-card ${this.selectedSkin === s.id ? 'active' : ''}`;
      card.innerHTML = `
        <div class="kc-skin-avatar">${this.getChefAvatarSVG(s.id)}</div>
        <div class="kc-skin-name">${s.name}</div>
        <div class="kc-skin-role">${s.role}</div>
      `;
      card.onclick = () => {
        this.selectedSkin = s.id;
        localStorage.setItem('kitchen_chaos_player_skin', s.id);
        this.skinCardEls.forEach((el, key) => {
          el.classList.toggle('active', key === this.selectedSkin);
        });
      };
      this.skinCardEls.set(s.id, card);
      skinGrid.appendChild(card);
    });
    this.mainViewEl.appendChild(skinGrid);

    // 1.4 Three Equal-Weight Cartoon 3D Action Buttons
    const actionsGrid = document.createElement('div');
    actionsGrid.className = 'kc-actions-grid';

    const hostBtn = document.createElement('button');
    hostBtn.type = 'button';
    hostBtn.className = 'kc-action-btn btn-host';
    hostBtn.innerHTML = `
      <div class="kc-btn-top"><span>🚀</span><span>TẠO PHÒNG MỚI</span></div>
      <div class="kc-btn-sub">Mời bạn bè cùng nấu (Host)</div>
    `;
    hostBtn.onclick = () => this.createOnlineRoom();

    const joinBtn = document.createElement('button');
    joinBtn.type = 'button';
    joinBtn.className = 'kc-action-btn btn-join';
    joinBtn.innerHTML = `
      <div class="kc-btn-top"><span>🔑</span><span>VÀO PHÒNG BẰNG MÃ</span></div>
      <div class="kc-btn-sub">Nhập mã phòng 6 chữ số</div>
    `;
    joinBtn.onclick = () => {
      const openModal = (window as any).openCustomModal;
      if (openModal) {
        openModal('NHẬP MÃ PHÒNG (6 CHỮ SỐ)', 'Ví dụ: 123456', '', 'number', (code: string) => {
          if (code && code.trim()) {
            this.joinRoomByCode(code.trim());
          }
        });
      }
    };

    const soloBtn = document.createElement('button');
    soloBtn.type = 'button';
    soloBtn.className = 'kc-action-btn btn-solo';
    soloBtn.innerHTML = `
      <div class="kc-btn-top"><span>🍳</span><span>CHƠI MỘT MÌNH</span></div>
      <div class="kc-btn-sub">Luyện tập kỹ năng (Solo)</div>
    `;
    soloBtn.onclick = () => {
      this.network.leaveRoom();
      this.destroyCartoonMenuDOM();
      this.scene.start('GameScene', {
        isMultiplayer: false,
        skin: this.selectedSkin,
        mapId: this.selectedMap
      });
    };

    actionsGrid.appendChild(hostBtn);
    actionsGrid.appendChild(joinBtn);
    actionsGrid.appendChild(soloBtn);
    this.mainViewEl.appendChild(actionsGrid);

    // Status Banner
    this.statusBannerEl = document.createElement('div');
    this.statusBannerEl.style.cssText = `
      min-height: 22px;
      font-size: clamp(12px, 2.1vmin, 14px);
      font-weight: 800;
      color: #fde047;
      text-align: center;
      text-shadow: 0 2px 4px rgba(0,0,0,0.65);
    `;
    this.mainViewEl.appendChild(this.statusBannerEl);

    this.domRoot.appendChild(this.mainViewEl);

    // =========================================================================
    // 2. ROOM LOBBY PANEL
    // =========================================================================
    this.roomViewEl = document.createElement('div');
    this.roomViewEl.className = 'kc-room-card';

    // Top row: Room Code + Copy Link + Leave Button
    const roomHeader = document.createElement('div');
    roomHeader.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      flex-wrap: wrap;
      border-bottom: 2px solid #334155;
      padding-bottom: 10px;
    `;
    roomHeader.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
        <div id="kc-room-code-text" style="background:#0f172a;border:2.5px solid #38bdf8;border-radius:14px;padding:6px 14px;font-size:clamp(16px,3.2vmin,24px);font-weight:900;color:#38bdf8;letter-spacing:1px;">
          MÃ PHÒNG: ......
        </div>
        <button id="kc-copy-invite-btn" type="button" style="background:#0284c7;border:2px solid #bae6fd;border-radius:12px;padding:8px 14px;color:#fff;font-weight:900;font-size:clamp(11px,2vmin,13px);cursor:pointer;box-shadow:0 3px 0 #0369a1;">
          📋 SAO CHÉP LINK MỜI
        </button>
      </div>
      <button id="kc-leave-room-btn" type="button" style="background:#ef4444;border:2px solid #fecaca;border-radius:12px;padding:7px 14px;color:#fff;font-weight:900;font-size:13px;cursor:pointer;box-shadow:0 3px 0 #991b1b;">
        ✕ Rời Phòng
      </button>
    `;
    this.roomViewEl.appendChild(roomHeader);
    this.roomCodeValueEl = roomHeader.querySelector('#kc-room-code-text') as HTMLElement;

    const copyBtn = roomHeader.querySelector('#kc-copy-invite-btn') as HTMLButtonElement;
    copyBtn.onclick = () => {
      const code = this.currentRoomCode || (this.network.room as any)?.options?.roomCode;
      if (code) {
        const url = `${window.location.origin}${window.location.pathname}?room=${code}`;
        navigator.clipboard
          .writeText(url)
          .then(() => {
            copyBtn.textContent = '✅ ĐÃ SAO CHÉP LINK!';
            setTimeout(() => {
              copyBtn.textContent = '📋 SAO CHÉP LINK MỜI';
            }, 2000);
          })
          .catch(() => {
            prompt('Sao chép đường link mời bạn bè:', url);
          });
      }
    };

    const leaveBtn = roomHeader.querySelector('#kc-leave-room-btn') as HTMLButtonElement;
    leaveBtn.onclick = () => {
      this.network.leaveRoom();
      this.isInRoom = false;
      if (this.mainViewEl) this.mainViewEl.style.display = 'flex';
      if (this.roomViewEl) this.roomViewEl.style.display = 'none';
    };

    // Map Selector (for Host)
    this.mapSelectorWrapEl = document.createElement('div');
    this.mapSelectorWrapEl.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 6px;
    `;
    const mapLabel = document.createElement('div');
    mapLabel.style.cssText = 'font-size:11px;font-weight:900;color:#fde68a;letter-spacing:0.6px;';
    mapLabel.textContent = 'CHỌN BẢN ĐỒ NHÀ BẾP:';
    this.mapSelectorWrapEl.appendChild(mapLabel);

    const mapGrid = document.createElement('div');
    mapGrid.className = 'kc-map-grid';
    const mapOptions: { id: KitchenMapId; label: string }[] = [
      { id: KitchenMapId.TRADITIONAL, label: '🏠 Bếp Tiêu Chuẩn' },
      { id: KitchenMapId.CONVEYOR, label: '🔄 Băng Chuyền' },
      { id: KitchenMapId.SPLIT_KITCHEN, label: '⚡ Bếp Tách Đôi' }
    ];
    mapOptions.forEach((m) => {
      const pill = document.createElement('button');
      pill.type = 'button';
      pill.className = `kc-map-pill ${this.selectedMap === m.id ? 'active' : ''}`;
      pill.textContent = m.label;
      pill.onclick = () => {
        this.selectedMap = m.id;
        this.mapCardEls.forEach((el, k) => el.classList.toggle('active', k === this.selectedMap));
        if (this.network.room) {
          this.network.room.send('change_map', { mapId: m.id });
        }
      };
      this.mapCardEls.set(m.id, pill);
      mapGrid.appendChild(pill);
    });
    this.mapSelectorWrapEl.appendChild(mapGrid);
    this.roomViewEl.appendChild(this.mapSelectorWrapEl);

    // Player List Container
    this.playerListEl = document.createElement('div');
    this.playerListEl.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 6px;
      min-height: 110px;
      max-height: 185px;
      overflow-y: auto;
      padding: 4px 0;
    `;
    this.roomViewEl.appendChild(this.playerListEl);

    // Bottom Ready & Start Buttons
    const roomFooter = document.createElement('div');
    roomFooter.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      padding-top: 4px;
    `;

    this.readyBtnEl = document.createElement('button');
    this.readyBtnEl.type = 'button';
    this.readyBtnEl.className = 'kc-action-btn btn-join';
    this.readyBtnEl.style.flex = '1';
    this.readyBtnEl.innerHTML = `<div class="kc-btn-top"><span>✔</span><span>SẴN SÀNG</span></div>`;
    this.readyBtnEl.onclick = () => this.network.setReady();

    this.startBtnEl = document.createElement('button');
    this.startBtnEl.type = 'button';
    this.startBtnEl.className = 'kc-action-btn btn-solo';
    this.startBtnEl.style.flex = '1';
    this.startBtnEl.innerHTML = `<div class="kc-btn-top"><span>🔥</span><span>BẮT ĐẦU NẤU</span></div>`;
    this.startBtnEl.onclick = () => this.network.startGame();

    roomFooter.appendChild(this.readyBtnEl);
    roomFooter.appendChild(this.startBtnEl);
    this.roomViewEl.appendChild(roomFooter);

    this.domRoot.appendChild(this.roomViewEl);
    document.body.appendChild(this.domRoot);
  }

  private destroyCartoonMenuDOM() {
    if (this.domRoot && this.domRoot.parentNode) {
      this.domRoot.parentNode.removeChild(this.domRoot);
    }
    this.domRoot = undefined;
  }

  private setStatusMessage(msg: string, color: string = '#fde047') {
    if (this.statusBannerEl) {
      this.statusBannerEl.textContent = msg;
      this.statusBannerEl.style.color = color;
    }
  }

  private async createOnlineRoom() {
    this.setStatusMessage('⏳ Đang kết nối đến máy chủ bếp...', '#38bdf8');
    try {
      const room = await this.network.createRoom(this.playerName);
      this.onRoomJoined(room);
    } catch (err: any) {
      console.error(err);
      this.setStatusMessage('⚠️ Không thể kết nối máy chủ! Hãy kiểm tra server hoặc chọn Chơi Một Mình.', '#f87171');
    }
  }

  private async joinRoomByCode(code: string) {
    this.setStatusMessage(`⏳ Đang vào phòng ${code}...`, '#38bdf8');
    try {
      const room = await this.network.joinRoomByCode(code, this.playerName);
      this.onRoomJoined(room);
    } catch (err: any) {
      console.error(err);
      this.setStatusMessage(err.message || '⚠️ Mã phòng không tồn tại hoặc đã đầy!', '#f87171');
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }

  private onRoomJoined(room: any) {
    this.isInRoom = true;
    this.setStatusMessage('');
    if (this.mainViewEl) this.mainViewEl.style.display = 'none';
    if (this.roomViewEl) this.roomViewEl.style.display = 'flex';

    const initCode = (room.options && room.options.roomCode) || room.state?.roomCode;
    if (initCode) {
      this.currentRoomCode = initCode;
      if (this.roomCodeValueEl) this.roomCodeValueEl.textContent = `MÃ PHÒNG: ${initCode}`;
    } else {
      if (this.roomCodeValueEl) this.roomCodeValueEl.textContent = 'MÃ PHÒNG: Đang tải...';
    }

    room.onMessage('room_code', (code: string) => {
      this.currentRoomCode = code;
      if (this.roomCodeValueEl) this.roomCodeValueEl.textContent = `MÃ PHÒNG: ${code}`;
    });

    room.onMessage('players_update', (list: any[]) => {
      this.currentPlayers = list;
      this.renderPlayerList(list);
    });

    room.onMessage('map_changed', (data: { mapId: KitchenMapId }) => {
      this.selectedMap = data.mapId;
      this.mapCardEls.forEach((el, k) => el.classList.toggle('active', k === this.selectedMap));
    });

    room.onMessage('game_started', (data: any) => {
      this.destroyCartoonMenuDOM();
      this.scene.start('GameScene', {
        isMultiplayer: true,
        roomCode: data?.roomCode || this.currentRoomCode,
        mapId: this.selectedMap,
        skin: this.selectedSkin,
        players: data?.players || this.currentPlayers || []
      });
    });
  }

  private renderPlayerList(players: any[]) {
    if (!this.playerListEl) return;
    this.playerListEl.innerHTML = '';
    let isCurrentHost = false;

    players.forEach((p) => {
      const isMe = p.id === this.network.mySessionId;
      if (isMe && p.isHost) isCurrentHost = true;

      const row = document.createElement('div');
      row.style.cssText = `
        display: flex;
        align-items: center;
        justify-content: space-between;
        background: ${isMe ? 'rgba(37, 99, 235, 0.28)' : 'rgba(15, 23, 42, 0.85)'};
        border: 2px solid ${isMe ? '#38bdf8' : '#334155'};
        border-radius: 12px;
        padding: 8px 14px;
      `;

      const hostBadge = p.isHost ? '👑 ' : '👨‍🍳 ';
      const meBadge = isMe ? ' (Bạn)' : '';
      const readyColor = p.isReady ? '#4ade80' : '#fbbf24';
      const readyLabel = p.isReady ? '✔ ĐÃ SẴN SÀNG' : '⏳ ĐANG CHỜ...';

      row.innerHTML = `
        <span style="font-weight:900;font-size:clamp(13px,2.2vmin,15px);color:${p.color || '#ffffff'};">
          ${hostBadge}${this.escapeHtml(p.name)}${meBadge}
        </span>
        <span style="font-weight:900;font-size:clamp(11px,2vmin,13px);color:${readyColor};">
          ${readyLabel}
        </span>
      `;
      this.playerListEl?.appendChild(row);
    });

    if (this.startBtnEl && this.mapSelectorWrapEl) {
      this.startBtnEl.style.display = isCurrentHost ? 'flex' : 'none';
      this.mapSelectorWrapEl.style.display = isCurrentHost ? 'flex' : 'none';
    }
  }

  private getChefAvatarSVG(skin: ChefSkin): string {
    switch (skin) {
      case ChefSkin.PANDA:
        return `
          <svg width="82%" height="82%" viewBox="0 0 64 64">
            <!-- Chef Hat -->
            <path d="M18,22 C14,14 24,8 32,11 C40,8 50,14 46,22 Z" fill="#ffffff" stroke="#1e293b" stroke-width="2.5"/>
            <!-- Panda Ears -->
            <circle cx="17" cy="27" r="6" fill="#0f172a"/>
            <circle cx="47" cy="27" r="6" fill="#0f172a"/>
            <!-- Panda Head -->
            <circle cx="32" cy="37" r="16" fill="#ffffff" stroke="#0f172a" stroke-width="2.8"/>
            <ellipse cx="25" cy="36" rx="4.5" ry="3.5" transform="rotate(-15 25 36)" fill="#0f172a"/>
            <ellipse cx="39" cy="36" rx="4.5" ry="3.5" transform="rotate(15 39 36)" fill="#0f172a"/>
            <circle cx="25" cy="35" r="1.5" fill="#ffffff"/>
            <circle cx="39" cy="35" r="1.5" fill="#ffffff"/>
            <ellipse cx="32" cy="41" rx="3" ry="2" fill="#0f172a"/>
          </svg>
        `;
      case ChefSkin.FOX:
        return `
          <svg width="82%" height="82%" viewBox="0 0 64 64">
            <!-- Fox Ears -->
            <polygon points="14,20 24,26 16,34" fill="#ea580c" stroke="#1e293b" stroke-width="2.4"/>
            <polygon points="50,20 40,26 48,34" fill="#ea580c" stroke="#1e293b" stroke-width="2.4"/>
            <!-- Chef Hat -->
            <path d="M20,22 C17,14 25,9 32,12 C39,9 47,14 44,22 Z" fill="#ffffff" stroke="#1e293b" stroke-width="2.4"/>
            <!-- Fox Face -->
            <circle cx="32" cy="38" r="15" fill="#f97316" stroke="#7c2d12" stroke-width="2.6"/>
            <path d="M19,40 Q26,36 32,46 Q38,36 45,40 Q40,51 32,52 Q24,51 19,40 Z" fill="#fff7ed"/>
            <circle cx="26" cy="36" r="2.2" fill="#0f172a"/>
            <circle cx="38" cy="36" r="2.2" fill="#0f172a"/>
            <circle cx="32" cy="43" r="2.6" fill="#0f172a"/>
          </svg>
        `;
      case ChefSkin.ROBOT:
        return `
          <svg width="82%" height="82%" viewBox="0 0 64 64">
            <line x1="32" y1="8" x2="32" y2="16" stroke="#38bdf8" stroke-width="3"/>
            <circle cx="32" cy="8" r="3.5" fill="#fde047" stroke="#0f172a" stroke-width="2"/>
            <rect x="16" y="20" width="32" height="28" rx="7" fill="#94a3b8" stroke="#0f172a" stroke-width="2.8"/>
            <rect x="20" y="27" width="24" height="10" rx="4" fill="#0f172a"/>
            <circle cx="26" cy="32" r="2.8" fill="#38bdf8"/>
            <circle cx="38" cy="32" r="2.8" fill="#38bdf8"/>
            <rect x="24" y="41" width="16" height="3.5" rx="1.5" fill="#e2e8f0"/>
          </svg>
        `;
      case ChefSkin.CLASSIC:
      default:
        return `
          <svg width="82%" height="82%" viewBox="0 0 64 64">
            <!-- Tall Classic Toque -->
            <path d="M17,26 C12,16 22,8 32,12 C42,8 52,16 47,26 Z" fill="#ffffff" stroke="#1e293b" stroke-width="2.6"/>
            <rect x="19" y="23" width="26" height="5" rx="2" fill="#f1f5f9" stroke="#1e293b" stroke-width="2"/>
            <!-- Friendly Chef Head -->
            <circle cx="32" cy="39" r="14" fill="#fed7aa" stroke="#7c2d12" stroke-width="2.6"/>
            <circle cx="26" cy="37" r="2.2" fill="#0f172a"/>
            <circle cx="38" cy="37" r="2.2" fill="#0f172a"/>
            <!-- Mustache -->
            <path d="M23,44 Q28,40 32,43 Q36,40 41,44" fill="none" stroke="#78350f" stroke-width="3" stroke-linecap="round"/>
          </svg>
        `;
    }
  }

  private getDecorFoodSVG(type: 'BURGER' | 'PAN' | 'HAT' | 'TOMATO'): string {
    switch (type) {
      case 'BURGER':
        return `<svg width="84" height="84" viewBox="0 0 64 64"><circle cx="32" cy="32" r="24" fill="#f59e0b"/><rect x="10" y="28" width="44" height="8" rx="4" fill="#22c55e"/><rect x="12" y="34" width="40" height="8" rx="4" fill="#78350f"/></svg>`;
      case 'PAN':
        return `<svg width="84" height="84" viewBox="0 0 64 64"><circle cx="28" cy="34" r="20" fill="#cbd5e1"/><line x1="44" y1="22" x2="60" y2="10" stroke="#cbd5e1" stroke-width="7" stroke-linecap="round"/></svg>`;
      case 'HAT':
        return `<svg width="84" height="84" viewBox="0 0 64 64"><path d="M14,42 C6,24 20,12 32,18 C44,12 58,24 50,42 Z" fill="#ffffff"/><rect x="16" y="40" width="32" height="10" rx="3" fill="#e2e8f0"/></svg>`;
      case 'TOMATO':
      default:
        return `<svg width="76" height="76" viewBox="0 0 64 64"><circle cx="32" cy="34" r="22" fill="#ef4444"/><polygon points="32,10 36,20 46,18 38,25 32,22 26,25 18,18 28,20" fill="#22c55e"/></svg>`;
    }
  }

  private escapeHtml(str: string): string {
    return str.replace(/[&<>"']/g, (c) => {
      switch (c) {
        case '&':
          return '&amp;';
        case '<':
          return '&lt;';
        case '>':
          return '&gt;';
        case '"':
          return '&quot;';
        default:
          return '&#39;';
      }
    });
  }
}
