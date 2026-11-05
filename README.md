# Kitchen Chaos Online 🍳🍔

Trò chơi nấu ăn phối hợp nhiều người (Cooperative Multiplayer Cooking Web Game) chạy trực tiếp trên trình duyệt web, lấy cảm hứng từ lối chơi của Overcooked 2, hỗ trợ 1–4 người chơi thời gian thực qua WebSocket/Colyseus, tối ưu Mobile-First.

---

## 🛠 Tech Stack
- **Frontend**: HTML5, TypeScript, Phaser 3 (Engine & Arcade Physics), Vite, Web Audio API procedural sound synthesizer, Colyseus.js.
- **Backend**: Node.js, TypeScript, Colyseus Multiplayer Game Server (Room System, State Schema, WebSocket Transport, Express, CORS).
- **Điều khiển**:
  - **Desktop**: `WASD` / `Mũi tên` (Di chuyển) | `E` (Cầm / Thả đồ) | `Space` (Chặt rau / Hành động).
  - **Mobile**: Virtual Joystick (Ngón cái trái) + Nút Action "CẮT/NẤU" & "CẦM/THẢ" (Ngón cái phải), hỗ trợ chạm đa điểm Multi-Touch.

---

## 🚀 Hướng Dẫn Chạy & Kiểm Thử Multiplayer (Phase 2)

### 1. Khởi động Máy chủ (Server Colyseus)
Mở một cửa sổ Terminal tại thư mục dự án và chạy:
```bash
npm run dev:server
# Hoặc đã build: npm run start:server
```
Server sẽ chạy tại cổng `2567`:
`[Kitchen Chaos Server] Colyseus Game Server running on port 2567`
`[Kitchen Chaos Server] WebSocket endpoint: ws://localhost:2567`

---

### 2. Khởi động Web Game (Client)
Mở một cửa sổ Terminal thứ hai tại thư mục dự án và chạy:
```bash
npm run dev:client
```
Client sẽ chạy tại: `http://localhost:3000` (hoặc IP mạng LAN: `http://192.168.x.x:3000`).

---

### 3. Trải nghiệm Chơi Cùng Bạn Bè (2 Thiết bị hoặc 2 Tab)

#### Thiết bị 1 (Trưởng phòng - Host):
1. Mở `http://localhost:3000` trên trình duyệt.
2. Đổi tên nhân vật nếu muốn (bấm vào dòng `Tên: ... ✎`).
3. Bấm **🚀 TẠO PHÒNG MỚI (HOST)**.
4. Màn hình sảnh chờ (Lobby) xuất hiện với **MÃ PHÒNG** gồm 6 ký tự (Ví dụ: `KTC884`).
5. Bấm **📋 SAO CHÉP LINK MỜI** để sao chép đường link tham gia (Dạng: `http://localhost:3000/?room=KTC884`).

#### Thiết bị 2 (Bạn bè - Khách / Tab thứ 2 hoặc Điện thoại):
- **Cách 1**: Mở tab ẩn danh hoặc mở trên điện thoại (cùng Wi-Fi) và dán link vừa sao chép (hoặc gõ địa chỉ kèm mã phòng).
- **Cách 2**: Truy cập web, bấm **🔑 VÀO PHÒNG BẰNG MÃ** rồi nhập mã 6 ký tự của Host.

#### Vào Trận Nấu Ăn Phối Hợp:
1. Khi khách vào phòng, tên và avatar của họ sẽ lập tức xuất hiện trên danh sách người chơi của cả 2 máy trong thời gian thực!
2. Người chơi bấm nút **SẴN SÀNG**.
3. Trưởng phòng bấm **BẮT ĐẦU NẤU**.
4. Cả 2 máy sẽ đồng thời được chuyển vào sàn bếp:
   - Nhìn thấy nhân vật của nhau di chuyển mượt mà.
   - Nhìn thấy vật phẩm bạn mình đang cầm trên tay.
   - Một người có thể lấy bánh mì và đĩa, người kia có thể đứng nướng thịt bò hoặc chặt xà lách/cà chua.
   - Đặt nguyên liệu phối hợp lên cùng một chiếc đĩa để tạo nên chiếc Burger hoàn chỉnh!
   - Giao món lên quầy Delivery: Cả 2 máy sẽ cùng nghe tiếng chuông chiến thắng và nhận điểm số đồng bộ tức thì!
