import { Client, Room } from 'colyseus.js';

export class NetworkManager {
  private static instance: NetworkManager;
  public client: Client;
  public room: Room | null = null;
  public mySessionId: string = '';
  public isHost: boolean = false;

  private constructor() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname;
    
    let serverUrl = '';
    if (window.location.port === '3000') {
      serverUrl = `${protocol}//${host}:2567`;
    } else {
      const portPart = window.location.port ? `:${window.location.port}` : '';
      serverUrl = `${protocol}//${host}${portPart}`;
    }

    this.client = new Client(serverUrl);
    console.log(`[NetworkManager] Connected to Server URL: ${serverUrl}`);
  }

  public static getInstance(): NetworkManager {
    if (!NetworkManager.instance) {
      NetworkManager.instance = new NetworkManager();
    }
    return NetworkManager.instance;
  }

  public generateRoomCode(): string {
    // 6 pure digits only
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  public async createRoom(playerName: string): Promise<Room> {
    const roomCode = this.generateRoomCode();
    this.room = await this.client.create('kitchen_room', { roomCode, name: playerName });
    this.mySessionId = this.room.sessionId;
    this.isHost = true;
    return this.room;
  }

  public async joinRoomByCode(roomCode: string, playerName: string): Promise<Room> {
    const cleanCode = roomCode.trim();

    // Directly query server API for room lookup (100% reliable)
    const host = window.location.hostname;
    const protocol = window.location.protocol;
    const httpPort = window.location.port === '3000' ? ':2567' : (window.location.port ? `:${window.location.port}` : '');
    const apiUrl = `${protocol}//${host}${httpPort}/api/room-lookup/${cleanCode}`;

    const resp = await fetch(apiUrl);
    if (!resp.ok) {
      throw new Error(`Phòng số ${cleanCode} không tồn tại hoặc đã đóng!`);
    }

    const data = await resp.json();
    if (!data.roomId) {
      throw new Error(`Không tìm thấy phòng số: ${cleanCode}`);
    }

    // Join directly by roomId
    this.room = await this.client.joinById(data.roomId, { name: playerName });
    this.mySessionId = this.room.sessionId;
    return this.room;
  }

  public async quickJoin(playerName: string): Promise<Room> {
    this.room = await this.client.joinOrCreate('kitchen_room', { name: playerName });
    this.mySessionId = this.room.sessionId;
    return this.room;
  }

  public leaveRoom() {
    if (this.room) {
      this.room.leave();
      this.room = null;
      this.mySessionId = '';
      this.isHost = false;
    }
  }

  public sendMove(x: number, y: number, facingX: number, facingY: number) {
    if (this.room) {
      this.room.send('player_move', { x, y, facingX, facingY });
    }
  }

  public sendAction(counterId: string, delta: number) {
    if (this.room) {
      this.room.send('player_action', { counterId, delta });
    }
  }

  public stopAction() {
    if (this.room) {
      this.room.send('stop_action');
    }
  }

  public sendInteract(counterId: string) {
    if (this.room) {
      this.room.send('player_interact', { counterId });
    }
  }

  public setReady() {
    if (this.room) {
      this.room.send('set_ready');
    }
  }

  public startGame() {
    if (this.room) {
      this.room.send('start_game');
    }
  }
}
