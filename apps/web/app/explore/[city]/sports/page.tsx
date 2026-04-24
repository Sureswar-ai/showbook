import EventsPage from "../events/page";
export default function SportsPage({ params }: { params: { city: string } }) {
  return <EventsPage searchParams={{ type: "SPORTS" }} />;
}
