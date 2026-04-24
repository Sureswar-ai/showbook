import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <h1 className="text-4xl font-bold">404</h1>
      <p className="text-muted-foreground">We couldn't find that page.</p>
      <Link href="/" className="text-brand underline">Back to home</Link>
    </div>
  );
}
