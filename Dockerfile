FROM node:22-alpine

WORKDIR /app

# patches 먼저 복사 (pnpm install에 필요)
COPY patches ./patches/

# 의존성 설치
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile

# 빌드된 코드 복사
COPY . .

# 실행
EXPOSE 3000
CMD ["pnpm", "start"]
