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
      'Große Vernissage im Atelier',
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

  describe('Museums and Cultural Institutions', () => {
    it('should recognize major paid museums as paid unless explicitly free for all', () => {
      expect(detectIsFree('RAUSGEGANGEN', 'Canaletto & Bellotto', 'Große Meisterausstellung', null, 'Kunsthistorisches Museum')).toBe(false);
      expect(detectIsFree('RAUSGEGANGEN', 'KAWS ART & COMIX', 'Ausstellung zeitgenössischer Kunst', null, 'Albertina Modern')).toBe(false);
      expect(detectIsFree('STADT_WIEN', 'Ausstellung im Belvedere', 'Schöne Gemälde', null, 'Belvedere')).toBe(false);
      expect(detectIsFree('RAUSGEGANGEN', 'MUMOK Führung', 'Rundgang durch die Sammlung', null, 'MUMOK')).toBe(false);
    });

    it('should allow free entry for museums on explicit open days / vernissages', () => {
      expect(detectIsFree('STADT_WIEN', 'Vernissage im Museum', 'Feierliche Eröffnung', null, 'MUMOK')).toBe(true);
      expect(detectIsFree('RAUSGEGANGEN', 'Tag der offenen Tür', 'Kostenloser Eintritt für alle Besucher', null, 'Albertina')).toBe(true);
    });

    it('should not mark adult museum entry as free when only youth/children are discounted', () => {
      const text = 'Ausstellung im KHM. Eintritt frei bis 19 Jahre. Erwachsene regulär 21 Euro.';
      expect(detectIsFree('STADT_WIEN', 'KHM Ausstellung', text, null, 'Kunsthistorisches Museum')).toBe(false);
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
  });
});
