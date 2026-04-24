import EventsPage from "../events/page";
export default function ActivitiesPage({ params }: { params: { city: string } }) {
  return <EventsPage searchParams={{ type: "ACTIVITY" }} />;
}
