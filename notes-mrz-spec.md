# MRZ TD3 Specification (Passport)

## Format: 2 lines x 44 characters
Characters: A-Z, 0-9, < (filler)

## Line 1:
- Pos 1: P (passport indicator)
- Pos 2: Type (< or letter)
- Pos 3-5: Issuing country (ISO 3166-1 alpha-3)
- Pos 6-44: Surname << Given names (separated by <)

## Line 2:
- Pos 1-9: Passport number
- Pos 10: Check digit over pos 1-9
- Pos 11-13: Nationality (ISO 3166-1 alpha-3)
- Pos 14-19: Date of birth (YYMMDD)
- Pos 20: Check digit over pos 14-19
- Pos 21: Sex (M, F, <)
- Pos 22-27: Expiry date (YYMMDD)
- Pos 28: Check digit over pos 22-27
- Pos 29-42: Personal number
- Pos 43: Check digit over pos 29-42
- Pos 44: Overall check digit over pos 1-10, 14-20, 22-43

## Check Digit Algorithm (ICAO 9303):
- Character values: 0-9 = 0-9, A-Z = 10-35, < = 0
- Weights cycle: 7, 3, 1, 7, 3, 1, ...
- Sum = Σ(value × weight) for each character
- Check digit = Sum mod 10

## TD1 (ID card): 3 lines x 30 characters
## TD2: 2 lines x 36 characters
