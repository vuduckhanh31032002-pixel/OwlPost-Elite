# 🦉 OwlPost Elite — Chat App

Ứng dụng nhắn tin trực tuyến (realtime) dành cho môn **Điện toán di động**.

- **Backend:** Spring Boot 3.5.10 · Java 17 · Spring Data JPA · Spring Security · Jakarta WebSocket · JWT (jjwt 0.12.6) · PostgreSQL
- **Frontend:** React 19 · Vite 7 · Axios

**Tính năng chính:** đăng ký / đăng nhập (kèm Google OAuth) · tìm kiếm người dùng không dấu · kết bạn · nhắn tin realtime 1–1 và nhóm · gửi ảnh / video · emoji · tạo nhóm và gửi lời mời · đổi tên / ảnh / nền nhóm · chặn người dùng · xóa / khôi phục cuộc trò chuyện · phân trang tin nhắn · giao diện sáng / tối.

---

## 🚀 Cài đặt database từ đầu

Project dùng **PostgreSQL**. Làm theo 6 bước dưới đây.

### Bước 1 — Cài PostgreSQL

Cài **PostgreSQL 16** (khuyến nghị) từ <https://www.postgresql.org/download/windows/>.
Sau khi cài, mở **psql** hoặc **pgAdmin**.

### Bước 2 — Tạo database `chatapp`

PostgreSQL **không cho phép** chạy `CREATE DATABASE` bên trong transaction, nên cần chạy lệnh này **riêng**, không chạy cả file:

```sql
CREATE DATABASE chatapp;
```

Hoặc bằng dòng lệnh:

```bash
psql -U postgres -c "CREATE DATABASE chatapp;"
```

> Nếu báo `database "chatapp" already exists` thì bỏ qua — database đã có sẵn.

### Bước 3 — Kết nối vào database `chatapp`

```bash
psql -U postgres -d chatapp
```

Hoặc trong pgAdmin: mở **Query Tool** rồi chọn database `chatapp`.

### Bước 4 — Chạy file `database-init.sql`

File này tạo **8 bảng**: `users`, `chatrooms`, `roommembers`, `messages`, `friends`, `friendrequests`, `groupinvites`, `blocked_users`.

```bash
psql -U postgres -d chatapp -f database-init.sql
```

> File dành cho database mới, chạy **một lần**. Nếu bảng đã tồn tại sẽ báo `relation already exists` — đây là bình thường.

### Bước 5 — Cấu hình username / password PostgreSQL

Mở `backend/src/main/resources/application.properties` và sửa cho khớp máy của bạn:

```properties
spring.datasource.url=jdbc:postgresql://localhost:5432/chatapp
spring.datasource.username=postgres
spring.datasource.password=<mật khẩu PostgreSQL của bạn>
```

Cách khuyến nghị hơn (không ghi mật khẩu vào code) — dùng **biến môi trường**:

| Biến | Mô tả |
|---|---|
| `SPRING_DATASOURCE_URL` | `jdbc:postgresql://localhost:5432/chatapp` |
| `SPRING_DATASOURCE_USERNAME` | `postgres` |
| `SPRING_DATASOURCE_PASSWORD` | mật khẩu PostgreSQL của bạn |
| `SPRING_JPA_HIBERNATE_DDL_AUTO` | `update` |

Ngoài ra backend còn cần đặt biến môi trường **`JWT_SECRET`** (khóa ký JWT). Không có biến này ứng dụng sẽ không khởi động được.

### Bước 6 — Chạy Backend

```bash
cd backend
mvn spring-boot:run
```

Hibernate với `spring.jpa.hibernate.ddl-auto=update` sẽ **kiểm tra và đồng bộ schema** — nó chỉ bổ sung những gì còn thiếu, không xóa dữ liệu bạn đã có.

Backend chạy tại `http://localhost:8081`.

### Chạy Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend chạy tại `http://localhost:5173`.

> Cấu hình địa chỉ backend trong `frontend/.env`:
> ```
> VITE_BACKEND_ORIGIN=http://localhost:8081
> VITE_GOOGLE_CLIENT_ID=<client id Google OAuth nếu muốn dùng đăng nhập Google>
> ```

---

## 📄 Các file SQL trong project

| File | Mục đích |
|---|---|
| `database-init.sql` | **Script khởi tạo database** — dùng để dựng database từ đầu trên máy mới. |
| `database-postgres.sql` | **File tài liệu** — mô tả chi tiết cấu trúc 8 bảng (dành cho giáo viên xem). Không cần chạy. |
| `database.sql` | File cũ của SQL Server, **không dùng với project hiện tại**. |

### Về cơ chế đồng bộ schema

Project **không** dùng Flyway/Liquibase và **không** tự chạy file SQL khi khởi động.
Toàn bộ schema được Hibernate sinh ra từ các file Entity nhờ `ddl-auto=update`.

Vì vậy `database-init.sql` chỉ là bước dựng sẵn database cho thuận tiện. Nếu bạn bỏ qua bước này và chạy thẳng Backend, Hibernate vẫn tự tạo đủ bảng.

---

## 🧪 Chạy test

```bash
cd backend
mvn test
```

---

## 📁 Cấu trúc project

```
Chat-app-web-main/
├── backend/                    # Spring Boot (API REST + WebSocket)
│   └── src/main/java/edu/khanh2002/chatapp/
│       ├── config/             # Security, JWT, CORS, xử lý lỗi
│       ├── controller/         # REST controller
│       ├── service/            # Business logic
│       ├── repository/         # JPA repository
│       ├── entity/             # JPA entity
│       └── websocket/          # ChatSocket, UserSocket
├── frontend/                   # React + Vite
│   └── src/
│       ├── pages/              # Auth, MainLayout, Profile
│       ├── layout/             # Sidebar, ChatList, ChatWindow
│       ├── components/         # Modal, MessageBubble...
│       └── services/           # api.js, socket.js, userSocket.js
├── database-init.sql           # Script khởi tạo database
└── database-postgres.sql       # Tài liệu cấu trúc database
```

---

## 👤 Tác giả

**Vũ Đức Khánh** — Đồ án môn Điện toán di động