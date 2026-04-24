import { redirect } from "next/navigation";
import { cookies } from "next/headers";

export default function RootPage() {
  const city = cookies().get("selectedCity")?.value || "mumbai";
  redirect(`/explore/${city}`);
}
