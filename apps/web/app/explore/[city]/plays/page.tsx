import EventsPage from "../events/page";
export default function PlaysPage({ params }: { params: { city: string } }) {
  return <EventsPage searchParams={{ type: "PLAY" }} />;
}
