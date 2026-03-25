FROM node:22-alpine

WORKDIR /app

# 의존성 설치
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile

# 소스코드 복사
COPY . .

# 빌드
RUN pnpm run build

# 실행
EXPOSE 3000
CMD ["pnpm", "start"]
