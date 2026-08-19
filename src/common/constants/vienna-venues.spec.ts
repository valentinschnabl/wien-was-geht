import { resolveViennaVenueCoordinates, VIENNA_VENUES } from './vienna-venues';

describe('Vienna Venues & Coordinate Resolution (Edge Cases)', () => {
  describe('Bounding Box & Data Integrity', () => {
    it('should ensure all registered Vienna venues fall strictly within greater Vienna bounding box', () => {
      // Greater Vienna Bounding Box: Lat [48.05, 48.36], Lng [16.15, 16.60]
      for (const [name, coords] of Object.entries(VIENNA_VENUES)) {
        expect(coords.lat).toBeGreaterThanOrEqual(48.05);
        expect(coords.lat).toBeLessThanOrEqual(48.36);
        expect(coords.lng).toBeGreaterThanOrEqual(16.15);
        expect(coords.lng).toBeLessThanOrEqual(16.60);
      }
    });

    it('should have exact coordinates for all 30 major Vienna clubs and live stages', () => {
      const targetClubs = [
        'flex', 'the loft', 'chelsea', 'u4', 'weberknecht', 'viper room',
        'grelle forelle', 'das werk', 'pratersauna', 'exil club', 'sass music club',
        'donautechno', 'fluc', 'celeste', 'camera club', 'club u',
        'volksgarten', 'o - der klub', 'prater dome', 'babenberger passage', 'vie i pee',
        'b72', 'rhiz', 'kramladen', 'venster99', 'arena', 'wuk',
        'metastadt', 'gasometer', 'schikaneder',
      ];

      for (const club of targetClubs) {
        const coords = resolveViennaVenueCoordinates(club);
        expect(coords).toBeDefined();
        expect(coords?.lat).toBeGreaterThan(48.1);
        expect(coords?.lng).toBeGreaterThan(16.2);
      }
    });
  });

  describe('Fuzzy Name Resolution & Quotation Edge Cases', () => {
    it('should resolve venues with German and typography quotation marks', () => {
      expect(resolveViennaVenueCoordinates('Heuriger „Zum Martin Sepp“')).toBeDefined();
      expect(resolveViennaVenueCoordinates('Heuriger "Zum Martin Sepp"')).toBeDefined();
      expect(resolveViennaVenueCoordinates('Heuriger »Zum Martin Sepp«')).toBeDefined();
    });

    it('should resolve venues with en-dashes and hyphens', () => {
      const enDash = resolveViennaVenueCoordinates('O – der Klub');
      const hyphen = resolveViennaVenueCoordinates('O - der Klub');
      expect(enDash).toBeDefined();
      expect(hyphen).toBeDefined();
      expect(enDash).toEqual(hyphen);
    });

    it('should resolve venues wrapped in district/address noise', () => {
      expect(resolveViennaVenueCoordinates('WUK Hof, Währinger Straße 59, 1090 Wien')).toBeDefined();
      expect(resolveViennaVenueCoordinates('Flex Club, Donaukanal / Augartenbrücke, 1010 Wien')).toBeDefined();
      expect(resolveViennaVenueCoordinates('U4 Diskothek, Schönbrunner Straße 222')).toBeDefined();
    });

    it('should return null for unknown or non-Vienna venues without crashing', () => {
      expect(resolveViennaVenueCoordinates('Musterbühne Graz')).toBeNull();
      expect(resolveViennaVenueCoordinates('')).toBeNull();
      expect(resolveViennaVenueCoordinates('   ')).toBeNull();
    });
  });
});
