# Research: Trip.com + USDT Payment Gateway Integration

## 1. Trip.com API
- Trip.com Connect API (connect.trip.com): 호텔 전용 API, 파트너 계약 필요
- Trip.com Developers (developers.trip.com): 항공/호텔/기차 등, 파트너 계정 필요 (로그인 필수)
- Trip.com Affiliate Program: 딥링크 방식, 커미션 기반 (최대 7%)
- 현재 접근 가능한 방식: Affiliate 딥링크 + 자체 결제 시스템

## 2. Crypto Payment Gateway 비교 (2026년 기준)

| Gateway | Fee | Custody | USDT | KYC | Settlement |
|---------|-----|---------|------|-----|------------|
| NOWPayments | 0.5% (+0.5% 변환) | Custodial | O | 볼륨 의존 | 자동변환 |
| CoinRemitter | 0.23% | Custodial | O | 최소 | 크립토 |
| Aurpay | 0.8% | Non-custodial | O | 없음 | 즉시 지갑 |
| BitPay | 1% | Custodial | O | 필수 | 1-2일 Fiat |
| CoinGate | 1% | Custodial | O | 필수 | SEPA/EUR |
| BTCPay Server | 0% (호스팅비만) | Non-custodial | 플러그인 | 없음 | 즉시 |

## 3. 추천 아키텍처

### 결제 옵션 3가지 동시 지원:
1. **NOWPayments** (0.5%) - 가장 저렴한 custodial, 350+ 코인, API 우수
2. **직접 USDT 전송** (0%) - TRC20/ERC20 지갑 직접 전송, TX 해시 수동 확인
3. **자체 카드/자체 화폐** - 플랫폼 내부 포인트/토큰 결제

### 결제 플로우:
1. 사용자가 Trip.com에서 항공권/호텔 검색 (Affiliate 딥링크)
2. 가격 확인 후 USDT 결제 선택
3. NOWPayments Invoice 생성 → 사용자 USDT 송금
4. 결제 확인 후 → 시스템이 Trip.com에서 실제 예약 (VISA 카드 또는 법인 계정)
5. 예약 확인서 사용자에게 전달

### Trip.com 항공권 구매 방식:
- 방법 A: Trip.com Affiliate 딥링크로 사용자 직접 구매 유도 (커미션 수익)
- 방법 B: 자체 법인 VISA 카드로 대리 구매 후 USDT 수령 (VAT 차익)
- 방법 C: Trip.com Partner API 계약 후 직접 예약 생성 (장기 목표)
