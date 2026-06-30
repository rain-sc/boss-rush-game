# Boss Rush Game

即時動作 Boss Rush 遊戲。設計文件見 [docs/](docs/);開發階段見 [docs/development-plan.md](docs/development-plan.md)。

## 技術棧

- 前端:React + Vite + TypeScript(之後加 Pixi.js / Framer Motion / Tailwind / Zustand)
- 後端:Java 21 + Spring Boot(Maven wrapper)
- 資料庫:PostgreSQL(Docker)

## 開發環境啟動

需求:Java 21、Node、Docker。

```bash
# 1) 資料庫(Postgres,對外埠 5433)
docker compose up -d

# 2) 後端(http://localhost:8080)
cd backend
./mvnw spring-boot:run        # Windows PowerShell: .\mvnw.cmd spring-boot:run

# 3) 前端(http://localhost:5173)
cd frontend
npm install                   # 第一次才需要
npm run dev
```

### 驗證(Phase 0)

- 後端健康檢查:<http://localhost:8080/api/health> → `{"status":"ok","db":"up"}`
- 前端首頁顯示「後端連線正常 — status: ok, db: up」(前端 `/api` 透過 Vite proxy 轉到後端)

> 注意:本機 5432 已被其他 Postgres 佔用,故容器對外用 **5433**(見 `docker-compose.yml` 與 `backend` 的 datasource 設定)。
