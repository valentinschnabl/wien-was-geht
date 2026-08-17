import { resolveViennaVenueCoordinates, VIENNA_VENUES } from './vienna-venues';

describe('resolveViennaVenueCoordinates', () => {
  it('should return exact coordinates for direct matches', () => {
    const coords = resolveViennaVenueCoordinates('Flex');
    expect(coords).toEqual({ lat: 48.2185, lng: 16.3705 });
  });

  it('should normalize punctuation and whitespace', () => {
    const coords = resolveViennaVenueCoordinates('  WUK, Halle (Wien)  ');
    expect(coords).toBeDefined();
    expect(coords?.lat).toBeCloseTo(48.2229, 3);
  });

  it('should prioritize longer specific venue names over short substrings', () => {
    const pavillon = resolveViennaVenueCoordinates('Volksgarten Pavillon, 1010 Wien');
    expect(pavillon).toEqual(VIENNA_VENUES['volksgarten pavillon']);

    const flexCafe = resolveViennaVenueCoordinates('Flex Cafe, Wien');
    expect(flexCafe).toEqual(VIENNA_VENUES['flex cafe']);
  });

  it('should not false-match words containing substrings like gaswerk -> werk', () => {
    const coords = resolveViennaVenueCoordinates('Gaswerkstraße 12, 1110 Wien');
    // Gaswerkstraße should NOT match "werk" (Das Werk)
    expect(coords).toBeNull();
  });

  it('should match standalone venue names within complex address strings', () => {
    const coords = resolveViennaVenueCoordinates('Live at Arena Wien, Baumgasse 80');
    expect(coords).toEqual(VIENNA_VENUES['arena wien']);
  });

  it('should return null for unknown addresses or empty input', () => {
    expect(resolveViennaVenueCoordinates('')).toBeNull();
    expect(resolveViennaVenueCoordinates(null)).toBeNull();
    expect(resolveViennaVenueCoordinates(undefined)).toBeNull();
    expect(resolveViennaVenueCoordinates('Unbekannter Ort 99, 9999 Nirgendwo')).toBeNull();
  });
});
