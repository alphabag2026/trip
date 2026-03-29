# Mystifly API Workflow (HoldAllowedTrue)

## API 플로우 (Scribd 문서에서 확인)

### 1. CreateSession API Request
- 인증 요청
- SessionID를 Auth/Bearer Token으로 사용
- Response: CreateSession Response (SessionID 반환)

### 2. Search V2 API Request  
- FareSourceCode 기반 항공편 검색
- Request: OriginDestinationInformations, TravelPreferences, PassengerTypeQuantities
- Response: Search V2 API Response (항공편 목록 + FareSourceCode)

### 3. Revalidation API Request
- 선택한 항공편의 FareSourceCode 사용
- FareSourceCode from Search V2 API response
- ServiceID for adding Meal & Extra Bag
- Validate: IsValid, NameCharacterLimit, RequireMiddleName tags
- Validate itinerary from Search to Revalidation
- Check if any changes in the itinerary details
- Validate 'HoldAllowed' False = WebFare
- Response: Revalidation API Response

### 4. FareRules API Request
- FareSourceCode from Revalidation API response
- 약관/규정 확인
- Response: FareRules API Response

### 5. SeatMap API Request
- FareSourceCode from Revalidation API response
- ServiceID for Seat Map
- Response: SeatMap API Response

### 6. BookFlight API Request
- FareSourceCode from Revalidation API response
- Add ServiceID for Meal & Baggage
- Add ServiceID for Seat Map
- Add Traveler Information
- Response: BookFlight API Response

## API Base URLs
- **Legacy SOAP (V2)**: http://testapi.myfarebox.com/V2/OnePoint.svc?wsdl
- **Legacy SOAP Demo**: http://onepointdemo.myfarebox.com/V2/OnePoint.svc
- **New REST API (SSP)**: https://apidemo.mystifly.com/ (Test) / https://api.mystifly.com/ (Production)

## 인증 정보 구조
- account_number: 'MCN001047' (예시)
- username: 'HIDHXML' (예시)
- password: 'HIDH2016_xml' (예시)
- Target: 'Test' 또는 'Production'

## 주요 엔드포인트 (추정)
- POST /v2/CreateSession
- POST /v2/AirSearch  
- POST /v2/AirRevalidate
- POST /v2/FareRules
- POST /v2/SeatMap
- POST /v2/BookFlight
- POST /v2/AirTicket
- POST /v2/AirBookingData
- POST /v2/AirCancel

## 인증
- AccountNumber + UserName + Password → CreateSession → SessionID
- SessionID를 이후 모든 요청의 헤더에 포함

## 핵심 데이터 구조
- **FareSourceCode**: 검색 결과에서 반환되는 고유 운임 코드 (예약 시 사용)
- **ServiceID**: 부가서비스(식사, 수하물, 좌석) 식별자
- **ConversationId**: 세션 추적용 ID
- **Target**: "Test" 또는 "Production"
