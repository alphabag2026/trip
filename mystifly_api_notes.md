# Mystifly API 조사 결과

## 1. 개요
- Mystifly SSP (Smart Selling Platform) PaaS
- B2B 항공권 플랫폼, 80+ 국가, 500+ 항공사
- GDS 3개 (Sabre, Amadeus, Travelport) + NDC + LCC 200+ + Marketplace
- REST/JSON API 제공 (이전 XML에서 전환)

## 2. API 엔드포인트 (공식 사이트 샘플에서 확인)

### Flight Search Request
```json
{
  "OriginDestinationInformations": [
    {
      "DepartureDateTime": "2020-02-03T00:00:00",
      "OriginLocationCode": "BLR",
      "DestinationLocationCode": "DXB"
    }
  ],
  "TravelPreferences": {
    "MaxStopsQuantity": "Direct",
    "VendorPreferenceCodes": ["EK"],
    "CabinPreference": "Y",
    "AirTripType": "Return"
  },
  "PricingSourceType": "Public",
  "IsRefundable": true,
  "PassengerTypeQuantities": [
    { "Code": "ADT", "Quantity": 1 }
  ],
  "RequestOptions": "Fifty",
  "NearByAirports": true,
  "Target": "Test",
  "ConversationId": "string"
}
```

### Book Flight Request (FareSourceCode 기반)
```json
{
  "FareSourceCode": "T054NjA1...",
  "TravelerInfo": {
    "AirTravelers": [{
      "PassengerType": "ADT",
      "Gender": "M",
      "PassengerName": {
        "PassengerTitle": "MR",
        "PassengerFirstName": "ABRAHAM",
        "PassengerLastName": "LINCOLN"
      },
      "DateOfBirth": "1988-01-03T00:00:00",
      "Passport": {
        "PassportNumber": "Z876789",
        "ExpiryDate": "2025-01-03T00:00:00",
        "Country": "IN"
      }
    }],
    "Email": "apisupport@mystifly.com",
    "PhoneNumber": "87657897"
  },
  "Target": "Test"
}
```

### Post-Booking (환불/변경)
```json
{
  "ptrType": "Refund",
  "mFRef": "MF09536419",
  "passengers": [{
    "firstName": "Tim",
    "lastName": "Cook",
    "title": "Mr",
    "eTicket": "1234678",
    "passengerType": "ADT"
  }]
}
```

## 3. 핵심 API 플로우
1. **인증** → Session token 발급
2. **AirSearch** → 항공편 검색 (FareSourceCode 반환)
3. **AirRevalidate** → 가격 재확인
4. **AirBook** → 예약 생성 (PNR 생성)
5. **AirTicket** → 발권
6. **AirBookingData** → 예약 조회
7. **AirCancel** → 취소
8. **PostBookingRequest** → 환불/변경 요청

## 4. 인증 방식
- API Key + Account Code 기반
- Session Token 발급 후 모든 요청에 포함
- Test/Production 환경 분리 (Target: "Test" / "Production")

## 5. API Base URL
- Test: https://apidemo.mystifly.com/
- Production: https://api.mystifly.com/
- 공식 API 문서: 파트너 등록 후 접근 가능
