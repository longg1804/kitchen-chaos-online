import Phaser from 'phaser';
import { NetworkManager } from '../../multiplayer/NetworkManager';

export class LobbyScene extends Phaser.Scene {
  private network = NetworkManager.getInstance();
  private playerName: string = 'Đầu Bếp';
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

  constructor() {
    super('LobbyScene');
  }

  create() {
    const { width, height } = this.scale;

    // Load saved name
    const savedName = localStorage.getItem('kitchen_chaos_player_name');
    if (savedName) {
      this.playerName = savedName;
    }

    // Background gradient / dark slate
    this.add.rectangle(width / 2, height / 2, width, height, 0x0b0f19);

    // Title Header
    this.add.text(width / 2, 55, 'KITCHEN CHAOS ONLINE', {
      font: '900 36px Arial',
      color: '#fbbf24'
    }).setOrigin(0.5);

    this.add.text(width / 2, 90, 'Trò chơi nấu ăn phối hợp nhiều người thời gian thực', {
      font: 'bold 13px Arial',
      color: '#94a3b8'
    }).setOrigin(0.5);

    // Create Main Menu UI
    this.createMainMenu(width, height);

    // Create In-Room Lobby UI
    this.createLobbyRoomUI(width, height);

    // Check if URL has ?room=CODE
    this.checkUrlRoomCode();
  }

  private checkUrlRoomCode() {
    const params = new URLSearchParams(window.location.search);
    const roomCode = params.get('room');
    if (roomCode) {
      console.log(`[LobbyScene] Detected room code from URL: ${roomCode}`);
      this.joinRoomByCode(roomCode);
    }
  }

  private createMainMenu(width: number, height: number) {
    this.mainMenuContainer = this.add.container(width / 2, height / 2 + 25);

    // Name Input Box Representation (Calls In-game HTML Modal, never exits fullscreen!)
    const nameBox = this.add.rectangle(0, -95, 340, 46, 0x1e293b).setStrokeStyle(2, 0x3b82f6).setInteractive();
    const nameLabel = this.add.text(0, -95, `Tên: ${this.playerName} ✎`, {
      font: 'bold 16px Arial',
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

    // Button 1: Create Online Room
    const createBtn = this.createButton(0, -25, 340, 50, 0x2563eb, '🚀 TẠO PHÒNG MỚI (HOST)', () => {
      this.createOnlineRoom();
    });

    // Button 2: Join By Code (Numeric modal with Numpad)
    const joinBtn = this.createButton(0, 40, 340, 50, 0x059669, '🔑 VÀO PHÒNG BẰNG MÃ SỐ', () => {
      const openModal = (window as any).openCustomModal;
      if (openModal) {
        openModal('NHẬP MÃ PHÒNG (6 CHỮ SỐ)', 'Ví dụ: 123456', '', 'number', (code: string) => {
          if (code && code.trim()) {
            this.joinRoomByCode(code.trim());
          }
        });
      }
    });

    // Button 3: Solo Offline Mode
    const soloBtn = this.createButton(0, 105, 340, 44, 0x475569, '🍳 CHƠI MỘT MÌNH (SOLO)', () => {
      this.network.leaveRoom();
      this.scene.start('GameScene', { isMultiplayer: false });
    });

    // Status message
    this.statusText = this.add.text(0, 155, '', {
      font: 'bold 14px Arial',
      color: '#ef4444'
    }).setOrigin(0.5);

    this.mainMenuContainer.add([nameBox, nameLabel, createBtn, joinBtn, soloBtn, this.statusText]);
  }

  private createLobbyRoomUI(width: number, height: number) {
    this.lobbyRoomContainer = this.add.container(width / 2, height / 2 + 20).setVisible(false);

    // Room info box
    const box = this.add.rectangle(0, 0, 540, 340, 0x1e293b, 0.95).setStrokeStyle(2, 0x3b82f6);

    this.roomCodeText = this.add.text(0, -135, 'MÃ PHÒNG: ......', {
      font: '900 26px Arial',
      color: '#38bdf8'
    }).setOrigin(0.5);

    // Copy Invite Link Button
    const copyBtn = this.createButton(0, -95, 260, 34, 0x0284c7, '📋 SAO CHÉP LINK MỜI', () => {
      const code = this.currentRoomCode || this.network.room?.state?.roomCode;
      if (code) {
        const url = `${window.location.origin}${window.location.pathname}?room=${code}`;
        navigator.clipboard.writeText(url).then(() => {
          alert(`Đã sao chép đường link mời bạn bè:\n${url}`);
        }).catch(() => {
          prompt('Sao chép đường link mời bạn bè:', url);
        });
      } else {
        alert('Đang đồng bộ mã phòng từ máy chủ, vui lòng thử lại sau 1 giây...');
      }
    });

    // Players list container
    this.playerListContainer = this.add.container(0, -40);

    // Ready Button
    this.readyBtn = this.createButton(-120, 125, 200, 44, 0x10b981, 'SẴN SÀNG', () => {
      this.network.setReady();
    });

    // Start Game Button (for Host)
    this.startBtn = this.createButton(120, 125, 200, 44, 0xf59e0b, 'BẮT ĐẦU NẤU', () => {
      this.network.startGame();
    });

    // Leave Room Button
    const leaveBtn = this.createButton(245, -145, 36, 30, 0xef4444, '✕', () => {
      this.network.leaveRoom();
      this.isInRoom = false;
      this.mainMenuContainer.setVisible(true);
      this.lobbyRoomContainer.setVisible(false);
    });

    this.lobbyRoomContainer.add([box, this.roomCodeText, copyBtn, this.playerListContainer, this.readyBtn, this.startBtn, leaveBtn]);
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
      this.statusText.setText('Mã phòng không tồn tại hoặc đã đầy!').setColor('#ef4444');
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }

  private onRoomJoined(room: any) {
    this.isInRoom = true;
    this.mainMenuContainer.setVisible(false);
    this.lobbyRoomContainer.setVisible(true);
    this.statusText.setText('');

    // Set code immediately
    const initCode = (room.options && room.options.roomCode) || room.state?.roomCode;
    if (initCode) {
      this.currentRoomCode = initCode;
      this.roomCodeText.setText(`MÃ PHÒNG: ${initCode}`);
    } else {
      this.roomCodeText.setText('MÃ PHÒNG: Đang tải...');
    }

    // Direct room code message
    room.onMessage('room_code', (code: string) => {
      this.currentRoomCode = code;
      this.roomCodeText.setText(`MÃ PHÒNG: ${code}`);
    });

    // Dedicated players list broadcast message from server
    room.onMessage('players_update', (list: any[]) => {
      this.renderPlayerList(list);
    });

    // Game start signal
    room.onMessage('game_started', (data: any) => {
      this.scene.start('GameScene', {
        isMultiplayer: true,
        roomCode: data?.roomCode || this.currentRoomCode,
        players: data?.players || []
      });
    });
  }

  private renderPlayerList(players: any[]) {
    this.playerListContainer.removeAll(true);
    let isCurrentHost = false;

    players.forEach((p, idx) => {
      const y = idx * 38;
      const isMe = p.id === this.network.mySessionId;
      if (isMe && p.isHost) isCurrentHost = true;

      // Card Background
      const bg = this.add.rectangle(0, y, 480, 32, isMe ? 0x334155 : 0x0f172a)
        .setStrokeStyle(1, 0x475569);

      // Name & Host Crown
      const hostBadge = p.isHost ? '👑 ' : '';
      const meBadge = isMe ? ' (Bạn)' : '';
      const nameTxt = this.add.text(-220, y, `${hostBadge}${p.name}${meBadge}`, {
        font: 'bold 15px Arial',
        color: p.color || '#ffffff'
      }).setOrigin(0, 0.5);

      // Ready status
      const readyTxt = this.add.text(220, y, p.isReady ? '✔ ĐÃ SẴN SÀNG' : '⏳ CHỜ...', {
        font: 'bold 13px Arial',
        color: p.isReady ? '#10b981' : '#f59e0b'
      }).setOrigin(1, 0.5);

      this.playerListContainer.add([bg, nameTxt, readyTxt]);
    });

    // Layout buttons:
    // If Host: show both SẴN SÀNG and BẮT ĐẦU NẤU
    // If Guest: center SẴN SÀNG button
    if (isCurrentHost) {
      this.readyBtn.setPosition(-120, 125);
      this.startBtn.setVisible(true);
      this.startBtn.setPosition(120, 125);
    } else {
      this.readyBtn.setPosition(0, 125);
      this.startBtn.setVisible(false);
    }
  }

  private createButton(x: number, y: number, w: number, h: number, color: number, text: string, callback: () => void): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);
    const rect = this.add.rectangle(0, 0, w, h, color).setInteractive().setStrokeStyle(1, 0xffffff, 0.3);
    const label = this.add.text(0, 0, text, {
      font: 'bold 14px Arial',
      color: '#ffffff'
    }).setOrigin(0.5);

    rect.on('pointerdown', () => {
      rect.setScale(0.96);
    });

    rect.on('pointerup', () => {
      rect.setScale(1.0);
      callback();
    });

    rect.on('pointerout', () => {
      rect.setScale(1.0);
    });

    container.add([rect, label]);
    return container;
  }
}
