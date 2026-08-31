import EventMap from "@/components/EventMap";
import type { EventRecord } from "@/components/MapView";

async function getInitialEvents(): Promise<EventRecord[]> {
  try {
    const rawApiBase =
      process.env.INTERNAL_API_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      "http://localhost:3000";
    const apiBase = rawApiBase.replace(/\/+$/, "");

    const res = await fetch(`${apiBase}/api/v1/events?limit=1000`, {
      next: { revalidate: 300 }, // ISR: refresh every 5 minutes
    });

    if (!res.ok) {
      return [];
    }

    const json = await res.json();
    return json.data ?? [];
  } catch {
    return [];
  }
}

export default async function Home() {
  const initialEvents = await getInitialEvents();

  const todayStr = new Date().toLocaleDateString("de-AT", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const todayStrEn = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  // Top event sample for crawler keywords
  const eventHighlights = initialEvents.slice(0, 25);

  return (
    <main className="main-wrapper">
      {/* Semantic Search Engine Crawler Header & FAQ (Indexed by Googlebot & Search Engines) */}
      <section className="sr-only" aria-label="WienWasGeht — Events heute in Wien & Vienna Events Today">
        <h1>WienWasGeht — Events heute in Wien &amp; Vienna Events Today</h1>
        <p>
          Was geht heute in Wien ({todayStr} / {todayStrEn})? WienWasGeht ist die
          tagesaktuelle Live-Event-Karte für Wien. Entdecke Live-Konzerte, Club-Partys,
          Techno-Nächte, Theater, Kunst-Ausstellungen, Flohmärkte, Food-Festivals und
          kostenlose Veranstaltungen in Wien heute und morgen.
        </p>

        <h2>Tagesaktuelle Event-Kategorien in Wien (Vienna Event Categories)</h2>
        <ul>
          <li><strong>Konzerte &amp; Live-Musik Wien heute (Vienna Concerts Today):</strong> Rock, Pop, Indie, Klassik, Jazz in Locations wie Arena Wien, Porgy &amp; Bess, Konzerthaus, Gasometer, Szene Wien.</li>
          <li><strong>Nightlife, Clubs &amp; Partys heute in Wien (Vienna Nightlife &amp; Clubbing):</strong> Techno, Electro, House, Hip-Hop in Clubs wie Fluc, Flex, Pratersauna, O der Klub, Sass, Werk, Grelle Forelle.</li>
          <li><strong>Kultur, Theater &amp; Kabarett Wien (Vienna Culture &amp; Theatre):</strong> Burgtheater, Volkstheater, Staatsoper, Kabarett Niedermair, Theater an der Wien.</li>
          <li><strong>Kunst &amp; Ausstellungen Wien (Museums &amp; Exhibitions):</strong> Museumsquartier (MQ), Albertina, Kunsthistorisches Museum (KHM), Belvedere, Mumok.</li>
          <li><strong>Gratis Events &amp; Open Air Wien (Free Things to do in Vienna):</strong> Kostenlose Konzerte, Straßenfeste, Freiluftkinos, Märkte &amp; Street Food.</li>
          <li><strong>Familie &amp; Kinderaktivitäten Wien (Vienna Family &amp; Kids Events):</strong> Kinder-Theater, Workshops, Tiergarten Schönbrunn, Prater.</li>
        </ul>

        {eventHighlights.length > 0 && (
          <div>
            <h2>Aktuelle Events heute &amp; morgen in Wien (Live Highlights)</h2>
            <ul>
              {eventHighlights.map((ev) => (
                <li key={ev.id}>
                  <strong>{ev.title}</strong>
                  {ev.venueName ? ` — Location: ${ev.venueName}` : ""}
                  {ev.category ? ` (${ev.category})` : ""}
                </li>
              ))}
            </ul>
          </div>
        )}

        <h2>Häufige Fragen zu Events in Wien heute (FAQ)</h2>
        <div>
          <h3>Was geht heute in Wien?</h3>
          <p>
            Auf WienWasGeht siehst du alle Events, Konzerte, Club-Nächte und kulturellen Highlights,
            die heute in Wien stattfinden, direkt auf einer interaktiven Karte mit Entfernungsanzeige.
          </p>
          <h3>What to do in Vienna today and tonight?</h3>
          <p>
            Find today&apos;s best things to do in Vienna, including live music concerts, DJ club nights,
            art exhibitions, and free entry events on our real-time interactive map.
          </p>
          <h3>Wo finden heute Partys und Konzerte in Wien statt?</h3>
          <p>
            In beliebten Wiener Locations wie Arena Wien, Fluc, Flex, Porgy &amp; Bess, Pratersauna,
            Konzerthaus und vielen weiteren Venues.
          </p>
          <h3>Gibt es heute kostenlose Veranstaltungen in Wien?</h3>
          <p>
            Ja, nutze einfach den Filter &quot;Gratis / Free&quot;, um alle eintrittsfreien Events
            und Ausstellungen in Wien anzuzeigen.
          </p>
        </div>
      </section>

      <EventMap initialEvents={initialEvents} />
    </main>
  );
}
