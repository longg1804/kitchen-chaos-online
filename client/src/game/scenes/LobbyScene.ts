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

  // UI Containers
  private mainMenuContainer!: Phaser.GameObjects.Container;
  private lobbyRoomContainer!: Phaser.GameObjects.Container;
  private playerListContainer!: Phaser.GameObjects.Container;
  private roomCodeText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private startBtn!: Phaser.GameObjects.Container;
  private readyBtn!: Phaser.GameObjects.Container;
  private mapSelectorContainer?: Phaser.GameObjects.Container;

  constructor() {
    super('LobbyScene');
  }

  create() {
    const { width, height } = this.scale;

    const savedName = localStorage.getItem('kitchen_chaos_player_name');
    if (savedName) this.playerName = savedName;

    const savedSkin = localStorage.getItem('kitchen_chaos_player_skin');
    if (savedSkin) this.selectedSkin = savedSkin as ChefSkin;

    this.add.rectangle(width / 2, height / 2, width, height, 0x0b0f19);

    // Title Header
    this.add.text(width / 2, 60, 'KITCHEN CHAOS ONLINE', {
      font: '900 42px Arial',
      color: '#fbbf24'
    }).setOrigin(0.5);

    this.add.text(width / 2, 100, 'Trò chơi nấu ăn phối hợp nhiều người thời gian thực', {
      font: 'bold 14px Arial',
      color: '#94a3b8'
    }).setOrigin(0.5);

    this.createMainMenu(width, height);
    this.createLobbyRoomUI(width, height);
    this.checkUrlRoomCode();
  }

  private checkUrlRoomCode() {
    const params = new URLSearchParams(window.location.search);
    const mode = params.get('mode');
    if (mode === 'solo') {
      this.network.leaveRoom();
      this.scene.start('GameScene', {
        isMultiplayer: false,
        skin: this.selectedSkin,
        mapId: this.selectedMap
      });
      return;
    }

    const roomCode = params.get('room');
    if (roomCode) {
      console.log(`[LobbyScene] Detected room code from URL: ${roomCode}`);
      this.joinRoomByCode(roomCode);
    }
  }

  private createMainMenu(width: number, height: number) {
    this.mainMenuContainer = this.add.container(width / 2, height / 2 + 35);

    // 1. Name Input Box
    const nameBox = this.add.rectangle(0, -140, 360, 48, 0x1e293b).setStrokeStyle(2, 0x3b82f6).setInteractive();
    const nameLabel = this.add.text(0, -140, `Tên: ${this.playerName} ✎`, {
      font: 'bold 17px Arial',
      color: '#ffffff'
    }).setOrigin(0.5);

    nameBox.on('pointerdown', () => {
      const openModal = (window as any).openCustomModal;
      if (openModal) {
        openModal('ĐỔI TÊN ĐẦU BẾP', 'Nhập tên của bạn...', this.playerName, 'text', (val: string) => {
          if (val && val.trim()) {
            this.playerName = val.trim().substring(0, 15);
            localStorage.setItem('kitchen_chaos_player_name', this.playerName);
            nameLabel.setText(`Tên: ${this.playerName} ✎`);
          }
        });
      }
    });

    // 2. Character Skin Selector Carousel
    const skinTitle = this.add.text(0, -95, 'CHỌN NHÂN VẬT ĐẦU BẾP:', { font: 'bold 12px Arial', color: '#94a3b8' }).setOrigin(0.5);

    const skins: { id: ChefSkin; label: string }[] = [
      { id: ChefSkin.CLASSIC, label: '👨‍🍳 Cổ Điển' },
      { id: ChefSkin.PANDA, label: '🐼 Panda' },
      { id: ChefSkin.FOX, label: '🦊 Hồ Ly' },
      { id: ChefSkin.ROBOT, label: '🤖 Robot' }
    ];

    const skinButtons: Phaser.GameObjects.Rectangle[] = [];
    skins.forEach((s, idx) => {
      const btnX = (idx - 1.5) * 92;
      const btnY = -65;
      const isSelected = this.selectedSkin === s.id;
      const rect = this.add.rectangle(btnX, btnY, 86, 34, isSelected ? 0x2563eb : 0x1e293b)
        .setStrokeStyle(2, isSelected ? 0x38bdf8 : 0x475569)
        .setInteractive();

      const txt = this.add.text(btnX, btnY, s.label, { font: 'bold 12px Arial', color: '#ffffff' }).setOrigin(0.5);

      rect.on('pointerdown', () => {
        this.selectedSkin = s.id;
        localStorage.setItem('kitchen_chaos_player_skin', s.id);
        skinButtons.forEach((b, i) => {
          const active = skins[i].id === this.selectedSkin;
          b.setFillStyle(active ? 0x2563eb : 0x1e293b);
          b.setStrokeStyle(2, active ? 0x38bdf8 : 0x475569);
        });
      });

      skinButtons.push(rect);
      this.mainMenuContainer.add([rect, txt]);
    });

    // 3. Action Buttons
    const createBtn = this.createButton(0, -10, 360, 52, 0x2563eb, '🚀 TẠO PHÒNG MỚI (HOST)', () => {
      this.createOnlineRoom();
    });

    const joinBtn = this.createButton(0, 55, 360, 52, 0x059669, '🔑 VÀO PHÒNG BẰNG MÃ SỐ', () => {
      const openModal = (window as any).openCustomModal;
      if (openModal) {
        openModal('NHẬP MÃ PHÒNG (6 CHỮ SỐ)', 'Ví dụ: 123456', '', 'number', (code: string) => {
          if (code && code.trim()) {
            this.joinRoomByCode(code.trim());
          }
        });
      }
    });

    const soloBtn = this.createButton(0, 120, 360, 46, 0x475569, '🍳 CHƠI MỘT MÌNH (SOLO)', () => {
      this.network.leaveRoom();
      this.scene.start('GameScene', {
        isMultiplayer: false,
        skin: this.selectedSkin,
        mapId: this.selectedMap
      });
    });

    this.statusText = this.add.text(0, 168, '', {
      font: 'bold 15px Arial',
      color: '#ef4444'
    }).setOrigin(0.5);

    this.mainMenuContainer.add([nameBox, nameLabel, skinTitle, createBtn, joinBtn, soloBtn, this.statusText]);
  }

  private createLobbyRoomUI(width: number, height: number) {
    this.lobbyRoomContainer = this.add.container(width / 2, height / 2 + 25).setVisible(false);

    const box = this.add.rectangle(0, 0, 600, 380, 0x1e293b, 0.95).setStrokeStyle(2, 0x3b82f6);

    this.roomCodeText = this.add.text(0, -150, 'MÃ PHÒNG: ......', {
      font: '900 30px Arial',
      color: '#38bdf8'
    }).setOrigin(0.5);

    const copyBtn = this.createButton(0, -108, 260, 34, 0x0284c7, '📋 SAO CHÉP LINK MỜI', () => {
      const code = this.currentRoomCode || (this.network.room as any)?.options?.roomCode;
      if (code) {
        const url = `${window.location.origin}${window.location.pathname}?room=${code}`;
        navigator.clipboard.writeText(url).then(() => {
          alert(`Đã sao chép đường link mời bạn bè:\n${url}`);
        }).catch(() => {
          prompt('Sao chép đường link mời bạn bè:', url);
        });
      }
    });

    // Map Selector Pills (for Host)
    this.mapSelectorContainer = this.add.container(0, -68);
    const mapLabel = this.add.text(-220, 0, 'BẢN ĐỒ:', { font: 'bold 12px Arial', color: '#fbbf24' }).setOrigin(0, 0.5);
    this.mapSelectorContainer.add(mapLabel);

    const mapOptions: { id: KitchenMapId; label: string }[] = [
      { id: KitchenMapId.TRADITIONAL, label: '🏠 Tiêu Chuẩn' },
      { id: KitchenMapId.CONVEYOR, label: '🔄 Băng Chuyền' },
      { id: KitchenMapId.SPLIT_KITCHEN, label: '⚡ Tách Đôi' }
    ];

    const mapBtns: Phaser.GameObjects.Rectangle[] = [];
    mapOptions.forEach((m, idx) => {
      const mX = -90 + idx * 115;
      const isSel = this.selectedMap === m.id;
      const mRect = this.add.rectangle(mX, 0, 108, 28, isSel ? 0xd97706 : 0x334155)
        .setStrokeStyle(1.5, isSel ? 0xfbbf24 : 0x475569)
        .setInteractive();
      const mText = this.add.text(mX, 0, m.label, { font: 'bold 11px Arial', color: '#ffffff' }).setOrigin(0.5);

      mRect.on('pointerdown', () => {
        this.selectedMap = m.id;
        mapBtns.forEach((b, i) => {
          const active = mapOptions[i].id === this.selectedMap;
          b.setFillStyle(active ? 0xd97706 : 0x334155);
          b.setStrokeStyle(1.5, active ? 0xfbbf24 : 0x475569);
        });
        if (this.network.room) {
          this.network.room.send('change_map', { mapId: m.id });
        }
      });

      mapBtns.push(mRect);
      this.mapSelectorContainer?.add([mRect, mText]);
    });

    // Players list container
    this.playerListContainer = this.add.container(0, -20);

    // Ready Button
    this.readyBtn = this.createButton(-130, 145, 210, 46, 0x10b981, 'SẴN SÀNG', () => {
      this.network.setReady();
    });

    // Start Game Button (for Host)
    this.startBtn = this.createButton(130, 145, 210, 46, 0xf59e0b, 'BẮT ĐẦU NẤU', () => {
      this.network.startGame();
    });

    const leaveBtn = this.createButton(275, -165, 38, 32, 0xef4444, '✕', () => {
      this.network.leaveRoom();
      this.isInRoom = false;
      this.mainMenuContainer.setVisible(true);
      this.lobbyRoomContainer.setVisible(false);
    });

    this.lobbyRoomContainer.add([
      box,
      this.roomCodeText,
      copyBtn,
      this.mapSelectorContainer,
      this.playerListContainer,
      this.readyBtn,
      this.startBtn,
      leaveBtn
    ]);
  }

  private async createOnlineRoom() {
    this.statusText.setText('Đang kết nối đến máy chủ...').setColor('#38bdf8');
    try {
      const room = await this.network.createRoom(this.playerName);
      this.onRoomJoined(room);
    } catch (err: any) {
      console.error(err);
      this.statusText.setText('Không thể kết nối máy chủ! Hãy chắc chắn server đang chạy.').setColor('#ef4444');
    }
  }

  private async joinRoomByCode(code: string) {
    this.statusText.setText('Đang kết nối vào phòng...').setColor('#38bdf8');
    try {
      const room = await this.network.joinRoomByCode(code, this.playerName);
      this.onRoomJoined(room);
    } catch (err: any) {
      console.error(err);
      this.statusText.setText(err.message || 'Mã phòng không tồn tại hoặc đã đầy!').setColor('#ef4444');
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }

  private onRoomJoined(room: any) {
    this.isInRoom = true;
    this.mainMenuContainer.setVisible(false);
    this.lobbyRoomContainer.setVisible(true);
    this.statusText.setText('');

    const initCode = (room.options && room.options.roomCode) || room.state?.roomCode;
    if (initCode) {
      this.currentRoomCode = initCode;
      this.roomCodeText.setText(`MÃ PHÒNG: ${initCode}`);
    } else {
      this.roomCodeText.setText('MÃ PHÒNG: Đang tải...');
    }

    room.onMessage('room_code', (code: string) => {
      this.currentRoomCode = code;
      this.roomCodeText.setText(`MÃ PHÒNG: ${code}`);
    });

    room.onMessage('players_update', (list: any[]) => {
      this.renderPlayerList(list);
    });

    room.onMessage('map_changed', (data: { mapId: KitchenMapId }) => {
      this.selectedMap = data.mapId;
    });

    room.onMessage('game_started', (data: any) => {
      this.scene.start('GameScene', {
        isMultiplayer: true,
        roomCode: data?.roomCode || this.currentRoomCode,
        mapId: this.selectedMap,
        skin: this.selectedSkin,
        players: data?.players || []
      });
    });
  }

  private renderPlayerList(players: any[]) {
    this.playerListContainer.removeAll(true);
    let isCurrentHost = false;

    players.forEach((p, idx) => {
      const y = idx * 40;
      const isMe = p.id === this.network.mySessionId;
      if (isMe && p.isHost) isCurrentHost = true;

      const bg = this.add.rectangle(0, y, 540, 34, isMe ? 0x334155 : 0x0f172a)
        .setStrokeStyle(1, 0x475569);

      const hostBadge = p.isHost ? '👑 ' : '';
      const meBadge = isMe ? ' (Bạn)' : '';
      const nameTxt = this.add.text(-250, y, `${hostBadge}${p.name}${meBadge}`, {
        font: 'bold 15px Arial',
        color: p.color || '#ffffff'
      }).setOrigin(0, 0.5);

      const readyTxt = this.add.text(250, y, p.isReady ? '✔ ĐÃ SẴN SÀNG' : '⏳ CHỜ...', {
        font: 'bold 13px Arial',
        color: p.isReady ? '#10b981' : '#f59e0b'
      }).setOrigin(1, 0.5);

      this.playerListContainer.add([bg, nameTxt, readyTxt]);
    });

    if (isCurrentHost) {
      this.readyBtn.setPosition(-130, 145);
      this.startBtn.setVisible(true);
      this.startBtn.setPosition(130, 145);
      this.mapSelectorContainer?.setVisible(true);
    } else {
      this.readyBtn.setPosition(0, 145);
      this.startBtn.setVisible(false);
      this.mapSelectorContainer?.setVisible(false);
    }
  }

  private createButton(x: number, y: number, w: number, h: number, color: number, text: string, callback: () => void): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);
    const rect = this.add.rectangle(0, 0, w, h, color).setInteractive().setStrokeStyle(1, 0xffffff, 0.3);
    const label = this.add.text(0, 0, text, {
      font: 'bold 15px Arial',
      color: '#ffffff'
    }).setOrigin(0.5);

    rect.on('pointerdown', () => rect.setScale(0.96));
    rect.on('pointerup', () => {
      rect.setScale(1.0);
      callback();
    });
    rect.on('pointerout', () => rect.setScale(1.0));

    container.add([rect, label]);
    return container;
  }
}
