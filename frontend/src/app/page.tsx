import EventMap from "@/components/EventMap";

export default function Home() {
  return (
    <main className="main-wrapper">
      {/* Semantic Search Engine Crawler Header (Indexed by Googlebot) */}
      <section className="sr-only" aria-label="Wien Events Heute Übersicht">
        <h1>WienWasGeht — Events &amp; Veranstaltungen heute in Wien</h1>
        <p>
          Was geht heute in Wien? Finde die besten Events, Konzerte, Club-Partys,
          Theateraufführungen, Ausstellungen, Familienaktivitäten und kulinarische
          Highlights am heutigen Tag in Wien auf unserer interaktiven Event-Karte.
        </p>
        <h2>Tagesaktuelle Event-Kategorien in Wien</h2>
        <ul>
          <li>Kultur &amp; Theater Wien heute</li>
          <li>Nightlife, Clubs &amp; Partys in Wien</li>
          <li>Live-Konzerte &amp; Musik in Wien</li>
          <li>Familien-Events &amp; Kinderaktivitäten Wien</li>
          <li>Sport-Events &amp; Outdoor in Wien</li>
          <li>Kulinarik, Märkte &amp; Street Food Wien</li>
        </ul>
      </section>

      <EventMap />
    </main>
  );
}
