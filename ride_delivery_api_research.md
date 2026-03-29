# 차량 호출 & 배달 서비스 API 조사 결과

## 1. 글로벌 차량 호출 서비스 (API 제공 여부)

### Tier 1 - 공식 API 제공 (직접 연동 가능)
| 서비스 | 커버리지 | API 상태 | API 유형 |
|--------|----------|----------|----------|
| **Uber** | 80개국 | ✅ Ride Request API | REST API, SDK (iOS/Android) |
| **Grab** | 동남아 8개국 | ✅ GrabExpress API, Rides API | REST API, OAuth2 |
| **Lyft** | 미국/캐나다 | ✅ Ride Request API | REST API |
| **DiDi** | 중국 + 18개국 | ✅ 개발자 API | REST API |
| **Gojek** | 인도네시아/싱가포르 | ✅ GoRide API | REST API |
| **Cabify** | 스페인/중남미 6개국 | ✅ Corporate API | REST API |

### Tier 2 - 제한적 API / 파트너 전용
| 서비스 | 커버리지 | API 상태 |
|--------|----------|----------|
| **Bolt** | 64개국 | ❌ 공개 API 없음 (딥링크만 가능) |
| **inDrive** | 58개국 | ❌ 공개 API 없음 |
| **Yandex Go** | 36개국 | ⚠️ 파트너 전용 API |
| **Careem** | 중동 12개국 | ⚠️ Uber 인수 후 API 통합 중 |
| **FREENOW** | 유럽 9개국 | ⚠️ B2B API만 제공 |
| **Ola** | 인도 | ⚠️ 제한적 API |
| **Maxim** | 22개국 | ❌ 공개 API 없음 |

### Tier 3 - 딥링크/URL 스킴만 가능
| 서비스 | 방식 |
|--------|------|
| Bolt, inDrive, Maxim 등 | 앱 딥링크로 출발지/목적지 전달하여 앱 실행 |

## 2. 차량 호출 API 통합 서비스 (Aggregator)
| 서비스 | 설명 | API |
|--------|------|-----|
| **Karhoo** | 글로벌 라이드 어그리게이터, 여러 차량 서비스 통합 | ✅ REST API |
| **Jayride** | 공항 픽업/셔틀 통합 예약 | ✅ REST API |
| **Obi** | 실시간 가격 비교 어그리게이터 | ✅ REST API |
| **Curb** | 택시 + 라이드헤일링 통합 | ✅ Open API |

## 3. 글로벌 배달 서비스 (API 제공 여부)

### 음식 배달
| 서비스 | 커버리지 | API 상태 |
|--------|----------|----------|
| **Uber Eats** | 40+ 개국 | ✅ Marketplace API (가맹점용) |
| **DoorDash** | 미국/캐나다/호주 | ✅ Drive API (배달 요청) |
| **Grab Food** | 동남아 8개국 | ✅ GrabFood API (가맹점용) |
| **Deliveroo** | 유럽/중동 | ⚠️ 파트너 전용 |
| **Foodpanda** | 아시아/유럽 | ⚠️ 파트너 전용 |

### 택배/물류 배달
| 서비스 | 커버리지 | API 상태 |
|--------|----------|----------|
| **GrabExpress** | 동남아 | ✅ 배달 예약 API |
| **Lalamove** | 아시아/중남미 | ✅ REST API |
| **GoSend (Gojek)** | 인도네시아 | ✅ 배달 API |
| **Pandago** | 아시아 | ✅ 배달 API |

### 배달 통합 서비스 (Aggregator)
| 서비스 | 설명 | API |
|--------|------|-----|
| **KitchenHub** | Uber Eats/DoorDash/Grubhub 통합 | ✅ Unified API |
| **Otter (Uber)** | 멀티 플랫폼 주문 통합 | ✅ API |
| **Deliverect** | 30+ 배달 플랫폼 통합 | ✅ REST API |

## 4. 국가별 주요 서비스 매핑 (밋업 대상 국가)

| 국가 | 차량 호출 | 배달 |
|------|----------|------|
| 한국 | Kakao T | 배달의민족, 쿠팡이츠 |
| 일본 | Uber, DiDi, S.RIDE | Uber Eats, 出前館 |
| 태국 | Grab, Bolt | Grab Food, LINE MAN |
| 베트남 | Grab, Be | Grab Food, ShopeeFood |
| 싱가포르 | Grab, Gojek | Grab Food, Foodpanda |
| 인도네시아 | Grab, Gojek | Grab Food, GoFood |
| 말레이시아 | Grab | Grab Food, Foodpanda |
| 필리핀 | Grab | Grab Food, Foodpanda |
| 두바이/UAE | Uber, Careem | Talabat, Deliveroo |
| 미국 | Uber, Lyft | Uber Eats, DoorDash |
| 유럽 | Uber, Bolt, FREENOW | Uber Eats, Deliveroo, Wolt |

## 5. Alpha Trip 연동 아키텍처 설계

### 5.1 차량 호출 연동 전략

**Phase 1 - 어그리게이터 연동 (권장, 즉시 가능)**
- **Karhoo API** (Siemens 자회사): 2,500+ 택시/차량 플릿 통합, 1개 API로 전 세계 커버
  - Demand Partner API로 가입 → 5분 내 첫 예약 가능
  - 가격 비교, 실시간 ETA, 예약/취소 모두 지원
  - REST API + SDK (iOS/Android/Web)
  - 커버리지: 유럽, 중동, 아시아, 미주

**Phase 2 - 직접 API 연동 (주요 서비스)**
- **Uber API**: 80개국, Ride Request API로 직접 예약
- **Grab API**: 동남아 8개국, GrabTransport API
- **Lyft API**: 미국/캐나다

**Phase 3 - 딥링크 연동 (API 미제공 서비스)**
- Bolt, inDrive, Maxim 등: 앱 딥링크로 출발지/목적지 전달
- 사용자 기기에 해당 앱이 설치되어 있으면 자동 실행

### 5.2 배달 서비스 연동 전략

**Phase 1 - 택배/물류 배달 (밋업 참가자 물품 배달)**
- **Lalamove API**: 아시아/중남미 11개국, 즉시 배달
  - REST API, 실시간 추적, 다양한 차량 타입
  - 밋업 장소로 물품/서류 배달에 적합
- **GrabExpress API**: 동남아 8개국, 당일 배달

**Phase 2 - 음식 배달 (밋업 케이터링)**
- **Deliverect API**: 30+ 배달 플랫폼 통합 (Uber Eats, DoorDash, Grab Food 등)
  - 1개 API로 여러 배달 서비스 주문 가능
  - 밋업 장소로 단체 음식 주문에 적합

### 5.3 USDT 결제 통합

차량 호출/배달 서비스 모두 기존 NOWPayments + 직접 USDT 전송 결제 시스템과 연동:
1. 사용자가 차량/배달 서비스 선택
2. 서비스 가격을 USDT로 변환 (VAT 제거 + 마진)
3. USDT로 결제 → 플랫폼이 현지 통화로 서비스 대금 정산

### 5.4 DB 스키마 확장 (필요 테이블)

```
ride_requests: 차량 호출 요청 (출발지, 목적지, 서비스, 상태, 가격)
ride_providers: 국가별 차량 서비스 설정 (API 키, 활성화 여부)
delivery_orders: 배달 주문 (픽업지, 배달지, 물품, 상태, 가격)
delivery_providers: 국가별 배달 서비스 설정
```

### 5.5 구현 우선순위

| 순위 | 기능 | API | 난이도 | 비즈니스 가치 |
|------|------|-----|--------|-------------|
| 1 | 차량 호출 (어그리게이터) | Karhoo | 중 | 높음 - 밋업 참가자 공항↔호텔 이동 |
| 2 | 택배 배달 | Lalamove | 중 | 중 - 밋업 물품/서류 배달 |
| 3 | 차량 호출 (직접) | Uber/Grab | 높 | 높음 - 수수료 절감 |
| 4 | 음식 배달 | Deliverect | 높 | 중 - 밋업 케이터링 |
| 5 | 차량 호출 (딥링크) | Bolt 등 | 낮 | 중 - 커버리지 확장 |
