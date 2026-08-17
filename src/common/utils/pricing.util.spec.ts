import { detectIsFree } from './pricing.util';

describe('pricing.util detectIsFree', () => {
  describe('Provider deterministic overrides', () => {
    it('should return true for EINTRITT_FREI provider regardless of text', () => {
      expect(detectIsFree('EINTRITT_FREI')).toBe(true);
      expect(detectIsFree('EINTRITT_FREI', 'Konzert', 'Super Show')).toBe(true);
    });

    it('should return true for KULTURSOMMER provider', () => {
      expect(detectIsFree('KULTURSOMMER', 'Open Air')).toBe(true);
    });

    it('should return false for TICKETMASTER when no free text is present', () => {
      expect(detectIsFree('TICKETMASTER', 'Rock Concert')).toBe(false);
    });
  });

  describe('Numeric price amounts', () => {
    it('should return true for priceAmount === 0', () => {
      expect(detectIsFree('STADT_WIEN', 'Fest', null, 0)).toBe(true);
    });

    it('should return false for positive priceAmount', () => {
      expect(detectIsFree('EVENTBRITE', 'Workshop', null, 19.99)).toBe(false);
      expect(detectIsFree('EVENTFROG', 'Party', null, 15)).toBe(false);
    });
  });

  describe('Free keyword patterns in German and English', () => {
    const freePhrases = [
      'Eintritt frei für alle Besucher',
      'Freier Eintritt den ganzen Abend',
      'Kostenlose Führung durch das Museum',
      'Gratis Open Air Konzert',
      'Free Entry before midnight',
      'Free admission for community talk',
      'Konzert auf Spendenbasis',
      'Pay as you wish!',
      'Eintritt: Freie Spende erbeten',
      'Kultur ohne Eintritt',
      'Kein Eintritt erforderlich',
      'Kostenfreier Zugang',
      'Gebührenfrei teilnehmen',
      'Eintritt: frei',
      'Eintritt: 0 €',
      'Eintritt frei bis 22 Uhr',
    ];

    test.each(freePhrases)('detects free phrase: "%s"', (phrase) => {
      expect(detectIsFree('GOODNIGHT', 'Event Title', phrase)).toBe(true);
    });
  });

  describe('Paid keyword patterns', () => {
    const paidPhrases = [
      'Tickets ab 18€ auf oeticket',
      'VVK: 12€ / AK: 15€',
      'Eintritt: 10 € an der Abendkasse',
      '15€ Eintritt',
      'Ticketpreis: 25 EUR',
      'Hier online Ticket kaufen',
      'Tickets von 15€ bis 30€',
    ];

    test.each(paidPhrases)('detects paid phrase: "%s"', (phrase) => {
      expect(detectIsFree('GENERIC', 'Event Title', phrase)).toBe(false);
    });
  });

  describe('Edge cases and disambiguation', () => {
    it('should return null when text is ambiguous or neutral', () => {
      expect(detectIsFree('EVENTS_AT', 'Lesung im Café', 'Autor liest aus neuem Buch.')).toBeNull();
      expect(detectIsFree('LUMA', 'Tech Stammtisch', 'Netzwerken und Austausch')).toBeNull();
    });

    it('should handle null/undefined/empty string inputs gracefully', () => {
      expect(detectIsFree('LUMA', null, null, null)).toBeNull();
      expect(detectIsFree('STADT_WIEN', '', '')).toBeNull();
    });

    it('should correctly prioritize explicit paid tickets over conditional free child text', () => {
      // Event with paid tickets that mentions free entry for toddlers
      const mixedText = 'Großes Familienkonzert in Wien. Tickets ab 25€ (Kinder bis 3 Jahre frei).';
      // If tickets start at 25€, it is an admission-charging event
      expect(detectIsFree('EVENTS_AT', 'Familienkonzert', mixedText)).toBe(false);
    });
  });
});
