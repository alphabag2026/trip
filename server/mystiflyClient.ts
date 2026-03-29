// ── Mystifly API Client ──────────────────────────────────────────
// GDS-integrated flight search & booking via Mystifly SSP PaaS
// Supports both REST API (production) and demo fallback mode
//
// API Flow: CreateSession → AirSearch → AirRevalidate → BookFlight → TicketOrder
// Docs: https://mystifly.com/ssp-paas/

interface MystiflyConfig {
  accountNumber: string;
  userName: string;
  password: string;
  baseUrl: string; // https://apidemo.mystifly.com or https://api.mystifly.com
}

interface MystiflySession {
  sessionId: string;
  expiresAt: number;
}

// ── Types ──

export interface MystiflySearchParams {
  origin: string;       // IATA code e.g. "ICN"
  destination: string;  // IATA code e.g. "BKK"
  departDate: string;   // YYYY-MM-DD
  returnDate?: string;
  adults: number;
  children?: number;
  infants?: number;
  cabinClass: 'Y' | 'C' | 'F'; // Economy / Business / First
  directOnly?: boolean;
}

export interface MystiflyFlight {
  fareSourceCode: string;   // Unique identifier for revalidation/booking
  validatingCarrier: string;
  validatingCarrierName: string;
  flightNumber: string;
  origin: string;
  destination: string;
  departureTime: string;
  arrivalTime: string;
  duration: string;
  stops: number;
  stopCities: string[];
  cabinClass: string;
  fareType: string;
  baseFare: number;       // USD
  taxes: number;          // USD
  totalFare: number;      // USD
  currency: string;
  baggageAllowance: string;
  aircraft: string;
  isRefundable: boolean;
  lastTicketDate?: string;
  segments: MystiflySegment[];
}

export interface MystiflySegment {
  departureAirport: string;
  arrivalAirport: string;
  departureTime: string;
  arrivalTime: string;
  flightNumber: string;
  carrier: string;
  aircraft: string;
  cabinClass: string;
  duration: string;
}

export interface MystiflyRevalidation {
  fareSourceCode: string;
  isValid: boolean;
  totalFare: number;
  currency: string;
  fareChanged: boolean;
  newTotalFare?: number;
}

export interface MystiflyBookingParams {
  fareSourceCode: string;
  passengers: MystiflyPassenger[];
  contactEmail: string;
  contactPhone: string;
}

export interface MystiflyPassenger {
  type: 'ADT' | 'CHD' | 'INF';
  title: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  nationality: string;
  passportNumber?: string;
  passportExpiry?: string;
  passportCountry?: string;
}

export interface MystiflyBookingResult {
  bookingId: string;
  pnr: string;
  status: string;
  ticketNumbers?: string[];
  totalFare: number;
  currency: string;
}

// ── Mystifly Client Class ──

class MystiflyClient {
  private config: MystiflyConfig | null = null;
  private session: MystiflySession | null = null;

  isConfigured(): boolean {
    return !!(
      process.env.MYSTIFLY_ACCOUNT_NUMBER &&
      process.env.MYSTIFLY_USERNAME &&
      process.env.MYSTIFLY_PASSWORD
    );
  }

  private getConfig(): MystiflyConfig {
    if (!this.config) {
      this.config = {
        accountNumber: process.env.MYSTIFLY_ACCOUNT_NUMBER || '',
        userName: process.env.MYSTIFLY_USERNAME || '',
        password: process.env.MYSTIFLY_PASSWORD || '',
        baseUrl: process.env.MYSTIFLY_BASE_URL || 'https://apidemo.mystifly.com',
      };
    }
    return this.config;
  }

  // ── Session Management ──

  async createSession(): Promise<string> {
    // Return cached session if still valid (with 5 min buffer)
    if (this.session && this.session.expiresAt > Date.now() + 5 * 60 * 1000) {
      return this.session.sessionId;
    }

    const config = this.getConfig();
    const response = await fetch(`${config.baseUrl}/v2/CreateSession`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        AccountNumber: config.accountNumber,
        UserName: config.userName,
        Password: config.password,
        Target: config.baseUrl.includes('apidemo') ? 'Test' : 'Production',
      }),
    });

    if (!response.ok) {
      throw new Error(`Mystifly CreateSession failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    if (data.Success === false || !data.SessionId) {
      throw new Error(`Mystifly auth failed: ${data.Message || JSON.stringify(data)}`);
    }

    this.session = {
      sessionId: data.SessionId,
      expiresAt: Date.now() + 55 * 60 * 1000, // Sessions valid for ~60 min
    };

    return this.session.sessionId;
  }

  // ── Air Search ──

  async searchFlights(params: MystiflySearchParams): Promise<MystiflyFlight[]> {
    const sessionId = await this.createSession();
    const config = this.getConfig();

    // Build Mystifly search request
    const searchRequest = {
      SessionId: sessionId,
      IsRefundable: false,
      IsResidentFare: false,
      NearByAirports: false,
      OriginDestinationInformations: [
        {
          DepartureDateTime: `${params.departDate}T00:00:00`,
          OriginLocationCode: params.origin,
          DestinationLocationCode: params.destination,
        },
        ...(params.returnDate ? [{
          DepartureDateTime: `${params.returnDate}T00:00:00`,
          OriginLocationCode: params.destination,
          DestinationLocationCode: params.origin,
        }] : []),
      ],
      PassengerTypeQuantities: [
        { Code: 'ADT', Quantity: params.adults },
        ...(params.children ? [{ Code: 'CHD', Quantity: params.children }] : []),
        ...(params.infants ? [{ Code: 'INF', Quantity: params.infants }] : []),
      ],
      PricingSourceType: 'All', // Public + Private fares
      RequestOptions: 'Fifty', // Return up to 50 results
      TravelPreferences: {
        AirTripType: params.returnDate ? 'Return' : 'OneWay',
        CabinPreference: params.cabinClass,
        MaxStopsQuantity: params.directOnly ? 'Direct' : 'All',
      },
    };

    const response = await fetch(`${config.baseUrl}/v2/AirSearch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(searchRequest),
    });

    if (!response.ok) {
      throw new Error(`Mystifly AirSearch failed: ${response.status}`);
    }

    const data = await response.json();
    if (data.Success === false) {
      throw new Error(`Mystifly search error: ${data.Message || 'Unknown error'}`);
    }

    // Parse Mystifly response into our format
    return this.parseSearchResults(data);
  }

  private parseSearchResults(data: any): MystiflyFlight[] {
    const flights: MystiflyFlight[] = [];
    const pricedItineraries = data.PricedItineraries || [];

    for (const itinerary of pricedItineraries) {
      try {
        const airItinerary = itinerary.AirItineraryPricingInfo || {};
        const fareInfo = airItinerary.ItinTotalFare || {};
        const segments = itinerary.OriginDestinationOptions?.[0]?.FlightSegments || [];

        if (segments.length === 0) continue;

        const firstSeg = segments[0];
        const lastSeg = segments[segments.length - 1];

        // Calculate total duration
        const depTime = new Date(firstSeg.DepartureDateTime);
        const arrTime = new Date(lastSeg.ArrivalDateTime);
        const durationMs = arrTime.getTime() - depTime.getTime();
        const hours = Math.floor(durationMs / (1000 * 60 * 60));
        const mins = Math.round((durationMs % (1000 * 60 * 60)) / (1000 * 60));

        // Stop cities (intermediate segments)
        const stopCities: string[] = [];
        if (segments.length > 1) {
          for (let i = 0; i < segments.length - 1; i++) {
            stopCities.push(segments[i].ArrivalAirportLocationCode || '');
          }
        }

        const baseFare = parseFloat(fareInfo.BaseFare?.Amount || '0');
        const taxes = parseFloat(fareInfo.TotalTax?.Amount || '0');
        const totalFare = parseFloat(fareInfo.TotalFare?.Amount || '0') || (baseFare + taxes);

        const parsedSegments: MystiflySegment[] = segments.map((seg: any) => {
          const segDep = new Date(seg.DepartureDateTime);
          const segArr = new Date(seg.ArrivalDateTime);
          const segDurMs = segArr.getTime() - segDep.getTime();
          const segH = Math.floor(segDurMs / (1000 * 60 * 60));
          const segM = Math.round((segDurMs % (1000 * 60 * 60)) / (1000 * 60));
          return {
            departureAirport: seg.DepartureAirportLocationCode || '',
            arrivalAirport: seg.ArrivalAirportLocationCode || '',
            departureTime: seg.DepartureDateTime || '',
            arrivalTime: seg.ArrivalDateTime || '',
            flightNumber: `${seg.MarketingAirlineCode || ''}${seg.FlightNumber || ''}`,
            carrier: seg.MarketingAirlineCode || '',
            aircraft: seg.OperatingAirline?.Equipment || seg.Equipment || '',
            cabinClass: seg.CabinClassCode || 'Y',
            duration: `${segH}h ${segM}m`,
          };
        });

        flights.push({
          fareSourceCode: itinerary.FareSourceCode || '',
          validatingCarrier: itinerary.ValidatingAirlineCode || firstSeg.MarketingAirlineCode || '',
          validatingCarrierName: AIRLINE_NAMES[itinerary.ValidatingAirlineCode || firstSeg.MarketingAirlineCode] || itinerary.ValidatingAirlineCode || '',
          flightNumber: `${firstSeg.MarketingAirlineCode || ''}${firstSeg.FlightNumber || ''}`,
          origin: firstSeg.DepartureAirportLocationCode || '',
          destination: lastSeg.ArrivalAirportLocationCode || '',
          departureTime: firstSeg.DepartureDateTime || '',
          arrivalTime: lastSeg.ArrivalDateTime || '',
          duration: `${hours}h ${mins}m`,
          stops: segments.length - 1,
          stopCities,
          cabinClass: firstSeg.CabinClassCode === 'C' ? 'Business' : firstSeg.CabinClassCode === 'F' ? 'First' : 'Economy',
          fareType: airItinerary.FareType || 'Public',
          baseFare,
          taxes,
          totalFare,
          currency: fareInfo.TotalFare?.CurrencyCode || 'USD',
          baggageAllowance: itinerary.BaggageAllowance || '23kg',
          aircraft: firstSeg.OperatingAirline?.Equipment || firstSeg.Equipment || '',
          isRefundable: itinerary.IsRefundable === true,
          lastTicketDate: itinerary.LastTicketDate,
          segments: parsedSegments,
        });
      } catch (e) {
        console.error('[Mystifly] Error parsing itinerary:', e);
      }
    }

    return flights.sort((a, b) => a.totalFare - b.totalFare);
  }

  // ── Fare Revalidation ──

  async revalidateFare(fareSourceCode: string): Promise<MystiflyRevalidation> {
    const sessionId = await this.createSession();
    const config = this.getConfig();

    const response = await fetch(`${config.baseUrl}/v2/AirRevalidate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        SessionId: sessionId,
        FareSourceCode: fareSourceCode,
      }),
    });

    if (!response.ok) {
      throw new Error(`Mystifly Revalidate failed: ${response.status}`);
    }

    const data = await response.json();
    const isValid = data.Success !== false && data.IsValid !== false;
    const fareInfo = data.PricedItineraries?.[0]?.AirItineraryPricingInfo?.ItinTotalFare;
    const newTotal = fareInfo ? parseFloat(fareInfo.TotalFare?.Amount || '0') : undefined;

    return {
      fareSourceCode,
      isValid,
      totalFare: newTotal || 0,
      currency: fareInfo?.TotalFare?.CurrencyCode || 'USD',
      fareChanged: false, // Will be compared by caller
      newTotalFare: newTotal,
    };
  }

  // ── Fare Rules ──

  async getFareRules(fareSourceCode: string): Promise<string> {
    const sessionId = await this.createSession();
    const config = this.getConfig();

    const response = await fetch(`${config.baseUrl}/v2/AirFareRules`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        SessionId: sessionId,
        FareSourceCode: fareSourceCode,
      }),
    });

    if (!response.ok) return 'Fare rules unavailable';
    const data = await response.json();
    return data.FareRules?.[0]?.RuleDetails || 'No fare rules available';
  }

  // ── Book Flight ──

  async bookFlight(params: MystiflyBookingParams): Promise<MystiflyBookingResult> {
    const sessionId = await this.createSession();
    const config = this.getConfig();

    const bookRequest = {
      SessionId: sessionId,
      FareSourceCode: params.fareSourceCode,
      TravelerInfo: {
        AirTravelers: params.passengers.map((pax, idx) => ({
          PassengerType: pax.type,
          Gender: pax.title === 'Mr' ? 'M' : 'F',
          PassengerName: {
            PassengerTitle: pax.title,
            PassengerFirstName: pax.firstName,
            PassengerLastName: pax.lastName,
          },
          DateOfBirth: pax.dateOfBirth,
          Passport: pax.passportNumber ? {
            PassportNumber: pax.passportNumber,
            ExpiryDate: pax.passportExpiry,
            Country: pax.passportCountry,
          } : undefined,
          PassengerNationality: pax.nationality,
          SpecialServiceRequest: null,
        })),
        CountryCode: params.passengers[0]?.nationality || 'KR',
        AreaCode: '82',
        PhoneNumber: params.contactPhone.replace(/[^0-9]/g, ''),
        Email: params.contactEmail,
        PostCode: '00000',
      },
      Target: config.baseUrl.includes('apidemo') ? 'Test' : 'Production',
    };

    const response = await fetch(`${config.baseUrl}/v2/BookFlight`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bookRequest),
    });

    if (!response.ok) {
      throw new Error(`Mystifly BookFlight failed: ${response.status}`);
    }

    const data = await response.json();
    if (data.Success === false) {
      throw new Error(`Booking failed: ${data.Message || 'Unknown error'}`);
    }

    return {
      bookingId: data.UniqueID || data.BookingID || '',
      pnr: data.TripDetailsPTC_FareBreakdowns?.[0]?.PNR || data.PNR || '',
      status: data.Status || 'Confirmed',
      ticketNumbers: data.TripDetailsPTC_FareBreakdowns?.[0]?.TicketNumbers,
      totalFare: parseFloat(data.TotalFare?.Amount || '0'),
      currency: data.TotalFare?.CurrencyCode || 'USD',
    };
  }

  // ── Ticket Order (Issue Ticket) ──

  async issueTicket(bookingId: string): Promise<{ success: boolean; ticketNumbers?: string[] }> {
    const sessionId = await this.createSession();
    const config = this.getConfig();

    const response = await fetch(`${config.baseUrl}/v2/TicketOrder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        SessionId: sessionId,
        UniqueID: bookingId,
        Target: config.baseUrl.includes('apidemo') ? 'Test' : 'Production',
      }),
    });

    if (!response.ok) {
      throw new Error(`Mystifly TicketOrder failed: ${response.status}`);
    }

    const data = await response.json();
    return {
      success: data.Success !== false,
      ticketNumbers: data.TicketNumbers || [],
    };
  }

  // ── Cancel Booking ──

  async cancelBooking(bookingId: string): Promise<{ success: boolean; message: string }> {
    const sessionId = await this.createSession();
    const config = this.getConfig();

    const response = await fetch(`${config.baseUrl}/v2/CancelBooking`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        SessionId: sessionId,
        UniqueID: bookingId,
        Target: config.baseUrl.includes('apidemo') ? 'Test' : 'Production',
      }),
    });

    if (!response.ok) {
      throw new Error(`Mystifly CancelBooking failed: ${response.status}`);
    }

    const data = await response.json();
    return {
      success: data.Success !== false,
      message: data.Message || 'Cancellation processed',
    };
  }

  // ── Booking Details ──

  async getBookingDetails(bookingId: string): Promise<any> {
    const sessionId = await this.createSession();
    const config = this.getConfig();

    const response = await fetch(`${config.baseUrl}/v2/TripDetails`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        SessionId: sessionId,
        UniqueID: bookingId,
        Target: config.baseUrl.includes('apidemo') ? 'Test' : 'Production',
      }),
    });

    if (!response.ok) {
      throw new Error(`Mystifly TripDetails failed: ${response.status}`);
    }

    return await response.json();
  }
}

// ── Airline name lookup ──
const AIRLINE_NAMES: Record<string, string> = {
  'KE': 'Korean Air', 'OZ': 'Asiana Airlines', 'SQ': 'Singapore Airlines',
  'CX': 'Cathay Pacific', 'TG': 'Thai Airways', 'JL': 'Japan Airlines',
  'NH': 'ANA', 'EK': 'Emirates', 'QR': 'Qatar Airways', 'TK': 'Turkish Airlines',
  'CA': 'Air China', 'MU': 'China Eastern', 'CZ': 'China Southern',
  'VN': 'Vietnam Airlines', 'PR': 'Philippine Airlines', 'MH': 'Malaysia Airlines',
  'GA': 'Garuda Indonesia', 'BR': 'EVA Air', 'CI': 'China Airlines',
  'AI': 'Air India', 'LH': 'Lufthansa', 'AF': 'Air France', 'BA': 'British Airways',
  'AA': 'American Airlines', 'UA': 'United Airlines', 'DL': 'Delta Air Lines',
  'QF': 'Qantas', 'NZ': 'Air New Zealand', 'JQ': 'Jetstar', '7C': 'Jeju Air',
  'LJ': 'Jin Air', 'TW': 'T\'way Air', 'ZE': 'Eastar Jet', 'BX': 'Air Busan',
  'FD': 'AirAsia', 'AK': 'AirAsia', 'TR': 'Scoot', '5J': 'Cebu Pacific',
  'VJ': 'VietJet Air', 'QZ': 'AirAsia Indonesia',
};

// Singleton instance
export const mystiflyClient = new MystiflyClient();

// ── Helper: Convert Mystifly cabin code to our format ──
export function cabinClassToMystifly(cabin: string): 'Y' | 'C' | 'F' {
  switch (cabin) {
    case 'economy': return 'Y';
    case 'premium_economy': return 'Y'; // Mystifly doesn't distinguish premium economy
    case 'business': return 'C';
    case 'first': return 'F';
    default: return 'Y';
  }
}

export function cabinClassFromMystifly(code: string): string {
  switch (code) {
    case 'Y': return 'economy';
    case 'C': return 'business';
    case 'F': return 'first';
    default: return 'economy';
  }
}
