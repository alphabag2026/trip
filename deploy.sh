#!/bin/bash

# Meetup Travel 배포 스크립트
# 사용법: ./deploy.sh [서버IP] [사용자명]
# 예: ./deploy.sh 158.247.244.201 root

SERVER_IP=${1:-158.247.244.201}
USER=${2:-root}
SERVICE_NAME="meetup-travel"
SERVICE_DIR="/opt/$SERVICE_NAME"

echo "🚀 Meetup Travel 배포 시작..."
echo "📍 대상 서버: $SERVER_IP"
echo "👤 사용자: $USER"
echo "📂 서비스 디렉토리: $SERVICE_DIR"

# 1. 로컬 빌드
echo -e "\n📦 로컬 빌드 시작..."
pnpm run build

# 2. GitHub에 push (선택사항)
echo -e "\n📤 GitHub에 push..."
git add .
git commit -m "Deploy: $(date '+%Y-%m-%d %H:%M:%S')" || true
git push origin main || true

# 3. 서버에 배포
echo -e "\n🌐 서버에 배포..."
ssh $USER@$SERVER_IP << 'REMOTE_SCRIPT'
#!/bin/bash

SERVICE_DIR="/opt/meetup-travel"

# 디렉토리 생성
mkdir -p $SERVICE_DIR

# 기존 컨테이너 중지
cd $SERVICE_DIR
docker-compose down 2>/dev/null || true

# 소스코드 클론 또는 업데이트
if [ -d "$SERVICE_DIR/.git" ]; then
    echo "📥 기존 저장소 업데이트..."
    cd $SERVICE_DIR
    git pull origin main
else
    echo "📥 저장소 클론..."
    cd /opt
    git clone https://github.com/your-username/meetup-travel.git
fi

# 이미지 빌드
echo "🔨 Docker 이미지 빌드..."
cd $SERVICE_DIR
docker build -t meetup-travel:latest .

# 컨테이너 시작
echo "▶️  컨테이너 시작..."
docker-compose up -d

# 상태 확인
echo -e "\n✅ 배포 완료!"
docker ps | grep meetup

REMOTE_SCRIPT

# 4. Nginx 설정 (선택사항)
echo -e "\n⚙️  Nginx 설정..."
ssh $USER@$SERVER_IP << 'NGINX_SCRIPT'
#!/bin/bash

# Nginx 설정 파일 생성
cat > /etc/nginx/conf.d/meetup.infoweb4.vip.conf << 'NGINX_CONFIG'
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
NGINX_CONFIG

# Nginx 테스트 및 재로드
nginx -t && systemctl reload nginx

echo "✅ Nginx 설정 완료"

NGINX_SCRIPT

echo -e "\n🎉 배포 완료!"
echo "📍 접속 URL: https://meetup.infoweb4.vip"
