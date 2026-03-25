# Meetup Travel 배포 가이드

## 개요
Meetup Travel 프로젝트를 Vultr 독립 서버에 배포하는 방법을 설명합니다.

---

## 배포 환경

### 서버 정보
- **IP:** 158.247.244.201
- **OS:** Ubuntu 22.04
- **포트:** 3010 (외부) → 3000 (내부)
- **도메인:** meetup.infoweb4.vip
- **데이터베이스 포트:** 3310

### 기술 스택
- **Frontend:** React 19 + Tailwind 4
- **Backend:** Express 4 + tRPC 11
- **Database:** MySQL 8.0
- **Container:** Docker + docker-compose
- **Reverse Proxy:** Nginx

---

## 배포 절차

### 1단계: 사전 준비

#### 1.1 GitHub 저장소 생성
```bash
# 로컬에서
cd /home/ubuntu/meetup-travel
git remote add origin https://github.com/your-username/meetup-travel.git
git branch -M main
git push -u origin main
```

#### 1.2 필수 파일 확인
```bash
ls -la /home/ubuntu/meetup-travel/
# 다음 파일들이 있어야 함:
# - Dockerfile
# - docker-compose.yml
# - .dockerignore
# - package.json
# - pnpm-lock.yaml
```

### 2단계: 로컬 빌드 테스트

```bash
cd /home/ubuntu/meetup-travel

# 의존성 설치
pnpm install

# 빌드 테스트
pnpm run build

# 타입 체크
pnpm tsc --noEmit
```

### 3단계: Vultr 서버 배포

#### 3.1 서버에 SSH 접속
```bash
ssh root@158.247.244.201
```

#### 3.2 배포 디렉토리 생성
```bash
mkdir -p /opt/meetup-travel
cd /opt/meetup-travel
```

#### 3.3 소스코드 클론
```bash
git clone https://github.com/your-username/meetup-travel.git .
```

#### 3.4 Docker 이미지 빌드
```bash
docker build -t meetup-travel:latest .
```

#### 3.5 컨테이너 시작
```bash
docker-compose up -d

# 상태 확인
docker ps | grep meetup
docker logs meetup-app
```

### 4단계: Nginx 설정

#### 4.1 Nginx 설정 파일 생성
```bash
cat > /etc/nginx/conf.d/meetup.infoweb4.vip.conf << 'EOF'
server {
    server_name meetup.infoweb4.vip;
    listen 80;

    location / {
        proxy_pass http://127.0.0.1:3010;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF
```

#### 4.2 Nginx 테스트 및 재로드
```bash
nginx -t
systemctl reload nginx
```

### 5단계: SSL 인증서 설정 (Let's Encrypt)

```bash
# Certbot 설치
apt-get install -y certbot python3-certbot-nginx

# SSL 인증서 발급
certbot --nginx -d meetup.infoweb4.vip

# 자동 갱신 확인
systemctl enable certbot.timer
```

### 6단계: 데이터베이스 마이그레이션

```bash
# 컨테이너 내에서 마이그레이션 실행
docker exec meetup-app pnpm run db:push
```

---

## 배포 후 확인

### 서비스 상태 확인
```bash
# 컨테이너 상태
docker ps | grep meetup

# 로그 확인
docker logs meetup-app

# 데이터베이스 연결 확인
docker exec meetup-mysql mysql -u meetup_user -pmeetup2024 -e "SELECT 1;"
```

### 웹 접속 확인
```bash
# 브라우저에서
https://meetup.infoweb4.vip

# 또는 curl
curl -I https://meetup.infoweb4.vip
```

---

## 환경변수 설정

### docker-compose.yml의 environment 섹션
```yaml
environment:
  DATABASE_URL: "mysql://meetup_user:meetup2024@meetup-mysql:3306/meetup_db"
  JWT_SECRET: "meetup-secret-key-2024-production"
  NODE_ENV: "production"
  PORT: "3000"
  VITE_APP_ID: "meetup-travel"
  VITE_APP_TITLE: "Meetup & Travel"
  OAUTH_SERVER_URL: "https://api.manus.im"
  VITE_OAUTH_PORTAL_URL: "https://manus.im"
  BUILT_IN_FORGE_API_URL: "https://api.manus.im"
  BUILT_IN_FORGE_API_KEY: "your-api-key"
```

### 변경 필요 항목
- `JWT_SECRET`: 강력한 비밀키로 변경
- `BUILT_IN_FORGE_API_KEY`: 실제 API 키로 변경
- `MYSQL_PASSWORD`: 강력한 비밀번호로 변경

---

## 자동 복구 설정

### Cron Job 설정 (5분마다 상태 확인)
```bash
cat > /usr/local/bin/check-meetup-service.sh << 'EOF'
#!/bin/bash
if ! docker ps | grep -q "meetup-app"; then
    cd /opt/meetup-travel
    docker-compose up -d
    echo "[$(date)] meetup-app restarted" >> /var/log/meetup-service.log
fi
EOF

chmod +x /usr/local/bin/check-meetup-service.sh

# Crontab 추가
(crontab -l 2>/dev/null; echo "*/5 * * * * /usr/local/bin/check-meetup-service.sh") | crontab -
```

---

## 업데이트 배포

### 소스코드 업데이트
```bash
cd /opt/meetup-travel
git pull origin main
docker build -t meetup-travel:latest .
docker-compose up -d
```

---

## 트러블슈팅

### 1. 컨테이너 시작 실패
```bash
# 로그 확인
docker logs meetup-app

# 컨테이너 제거 후 재시작
docker-compose down
docker-compose up -d
```

### 2. 데이터베이스 연결 오류
```bash
# MySQL 상태 확인
docker exec meetup-mysql mysql -u root -pmeetup2024 -e "SELECT 1;"

# 데이터베이스 재생성
docker-compose down -v
docker-compose up -d
```

### 3. Nginx 오류
```bash
# Nginx 설정 테스트
nginx -t

# Nginx 로그 확인
tail -f /var/log/nginx/error.log
```

---

## 포트 정보

| 서비스 | 외부 포트 | 내부 포트 | 용도 |
|--------|---------|---------|------|
| meetup-app | 3010 | 3000 | 웹 애플리케이션 |
| meetup-mysql | 3310 | 3306 | 데이터베이스 |

---

## 보안 체크리스트

- [ ] JWT_SECRET 변경
- [ ] MYSQL_PASSWORD 변경
- [ ] BUILT_IN_FORGE_API_KEY 설정
- [ ] SSL 인증서 설정
- [ ] 방화벽 규칙 설정
- [ ] 정기 백업 설정
- [ ] 로그 모니터링 설정

---

## 지원

배포 중 문제가 발생하면:
1. 로그 확인: `docker logs meetup-app`
2. 서비스 상태 확인: `docker ps`
3. 데이터베이스 연결 확인: `docker exec meetup-mysql mysql -u meetup_user -pmeetup2024 -e "SELECT 1;"`
