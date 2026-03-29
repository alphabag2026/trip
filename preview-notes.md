# Preview Notes - v10.6 Final

## Screenshot Observations
1. Logged-in user "bro bro" - sees ORGANIZER menu (ATTENDEE & BOOKING + OPERATIONS)
2. ATTENDEE & BOOKING: Attendees, Flights, Hotels, Schedule
3. OPERATIONS: Rail, Vehicles, Announce, Comms
4. "More" toggle visible for additional items
5. Promo carousel working (USDT Payment slide 1/5)
6. CTA: Search Bookings + My Page
7. Onboarding banner showing
8. TS errors: 0
9. Tests: 15/15 passed (notes + translator)
10. Server: running, healthy

## Completed Features
- Role-based home screen menus (attendee/organizer/superadmin/agency/partner)
- Notes page (/notes) with CRUD, tags, colors, pin, search
- Translator page (/translator) with LLM-based translation, 19 languages
- i18n keys added for all role-based menus (ko/en)
- notes DB table created
- translator tRPC router added
