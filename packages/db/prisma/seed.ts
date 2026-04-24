/* eslint-disable @typescript-eslint/no-explicit-any */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ============================================================
// Helpers
// ============================================================

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function escapeXml(s: string): string {
  return s.replace(/[<>&'"]/g, (c) => ({
    "<": "&lt;",
    ">": "&gt;",
    "&": "&amp;",
    "'": "&apos;",
    '"': "&quot;",
  })[c] as string);
}

function makePoster(title: string, subtitle: string, palette: [string, string]): string {
  const [a, b] = palette;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="600" viewBox="0 0 400 600">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${a}"/><stop offset="100%" stop-color="${b}"/></linearGradient></defs>
  <rect width="400" height="600" fill="url(#g)"/>
  <rect x="20" y="20" width="360" height="560" fill="none" stroke="rgba(255,255,255,0.25)" stroke-width="2"/>
  <text x="200" y="280" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="32" font-weight="700" fill="white">${escapeXml(title.slice(0, 22))}</text>
  <text x="200" y="320" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="18" fill="rgba(255,255,255,0.7)">${escapeXml(subtitle)}</text>
  <text x="200" y="560" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="14" fill="rgba(255,255,255,0.4)">ShowBook</text>
</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function makeBackdrop(title: string, palette: [string, string]): string {
  const [a, b] = palette;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${a}"/><stop offset="100%" stop-color="${b}"/></linearGradient>
    <radialGradient id="vignette" cx="50%" cy="50%"><stop offset="60%" stop-color="rgba(0,0,0,0)"/><stop offset="100%" stop-color="rgba(0,0,0,0.6)"/></radialGradient>
  </defs>
  <rect width="1280" height="720" fill="url(#bg)"/>
  <rect width="1280" height="720" fill="url(#vignette)"/>
  <text x="80" y="650" font-family="Inter, Arial, sans-serif" font-size="72" font-weight="800" fill="white" opacity="0.9">${escapeXml(title)}</text>
</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function makeAvatar(name: string): string {
  const initials = name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
  const hue = [...name].reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160">
  <rect width="160" height="160" fill="hsl(${hue},60%,55%)"/>
  <text x="80" y="92" text-anchor="middle" font-family="Inter, Arial" font-size="48" font-weight="700" fill="white">${initials}</text>
</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function makeFnbImage(name: string, color: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="240" viewBox="0 0 320 240">
  <rect width="320" height="240" fill="${color}"/>
  <text x="160" y="130" text-anchor="middle" font-family="Inter, Arial" font-size="24" font-weight="700" fill="white">${escapeXml(name)}</text>
</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

const J = (v: unknown): string => JSON.stringify(v);

// ============================================================
// Static demo data
// ============================================================

const CITIES = [
  { name: "Mumbai", slug: "mumbai", state: "Maharashtra", lat: 19.076, lng: 72.8777, isTop: true },
  { name: "Delhi NCR", slug: "ncr", state: "Delhi", lat: 28.6139, lng: 77.209, isTop: true },
  { name: "Bengaluru", slug: "bengaluru", state: "Karnataka", lat: 12.9716, lng: 77.5946, isTop: true },
  { name: "Hyderabad", slug: "hyderabad", state: "Telangana", lat: 17.385, lng: 78.4867, isTop: true },
  { name: "Chennai", slug: "chennai", state: "Tamil Nadu", lat: 13.0827, lng: 80.2707, isTop: true },
  { name: "Kolkata", slug: "kolkata", state: "West Bengal", lat: 22.5726, lng: 88.3639, isTop: true },
  { name: "Pune", slug: "pune", state: "Maharashtra", lat: 18.5204, lng: 73.8567, isTop: true },
  { name: "Ahmedabad", slug: "ahmedabad", state: "Gujarat", lat: 23.0225, lng: 72.5714, isTop: true },
  { name: "Jaipur", slug: "jaipur", state: "Rajasthan", lat: 26.9124, lng: 75.7873, isTop: true },
  { name: "Lucknow", slug: "lucknow", state: "Uttar Pradesh", lat: 26.8467, lng: 80.9462, isTop: true },
];

interface MovieSeed {
  title: string;
  synopsis: string;
  runtime: number;
  certificate: string;
  status: "NOW_SHOWING" | "UPCOMING" | "ENDED";
  releaseOffset: number;
  languages: string[];
  formats: string[];
  genres: string[];
  imdb: number;
  palette: [string, string];
  cast: { name: string; character?: string }[];
  director: string;
}

const MOVIES: MovieSeed[] = [
  { title: "Stellar Horizons", synopsis: "A lone astronomer decodes a signal that reshapes humanity's place in the cosmos. Part mystery, part meditation on discovery.", runtime: 142, certificate: "UA", status: "NOW_SHOWING", releaseOffset: -14, languages: ["English", "Hindi"], formats: ["2D", "IMAX", "Dolby Atmos"], genres: ["Sci-Fi", "Drama"], imdb: 8.4, palette: ["#1a1a2e", "#4361ee"], cast: [{ name: "Aarav Mehta", character: "Dr. Kabir Rao" }, { name: "Isha Kapoor", character: "Mira" }, { name: "Ronald Weiss", character: "Commander Hale" }], director: "Priya Shenoy" },
  { title: "The Monsoon Letters", synopsis: "Two estranged siblings reconstruct their late grandmother's life through letters uncovered in a Coonoor bungalow during a restless monsoon.", runtime: 128, certificate: "U", status: "NOW_SHOWING", releaseOffset: -7, languages: ["Hindi", "Tamil"], formats: ["2D"], genres: ["Drama", "Romance"], imdb: 7.8, palette: ["#2d6a4f", "#95d5b2"], cast: [{ name: "Meera Raghavan", character: "Anjali" }, { name: "Vikram Bose", character: "Deepak" }], director: "Anand Varma" },
  { title: "Concrete Heroes", synopsis: "A washed-up stunt coordinator trains a rookie police officer to take down a construction-mafia syndicate in South Mumbai.", runtime: 156, certificate: "A", status: "NOW_SHOWING", releaseOffset: -3, languages: ["Hindi", "Marathi"], formats: ["2D", "3D", "IMAX"], genres: ["Action", "Thriller"], imdb: 7.2, palette: ["#7f1d1d", "#f87171"], cast: [{ name: "Rajveer Malhotra", character: "Arjun" }, { name: "Farhan Khan", character: "Inspector Rana" }], director: "Dev Sinha" },
  { title: "Laugh Factory", synopsis: "Three underemployed comedians accidentally inherit a haunted stand-up club. The ghost only leaves if someone makes it laugh.", runtime: 112, certificate: "UA", status: "NOW_SHOWING", releaseOffset: -1, languages: ["Hindi", "English"], formats: ["2D"], genres: ["Comedy", "Horror"], imdb: 6.9, palette: ["#f59e0b", "#7c2d12"], cast: [{ name: "Nikhil Arora" }, { name: "Sana Qureshi" }, { name: "Tanvi Bhatt" }], director: "Ruhi Jain" },
  { title: "The Weaver of Benaras", synopsis: "An aging silk weaver must finish a masterpiece before his eyesight fails, while his granddaughter fights to keep the loom running.", runtime: 134, certificate: "U", status: "NOW_SHOWING", releaseOffset: -21, languages: ["Hindi", "Bhojpuri"], formats: ["2D"], genres: ["Drama"], imdb: 8.1, palette: ["#6b21a8", "#fbbf24"], cast: [{ name: "Bishan Tiwari", character: "Ramdas" }, { name: "Aisha Verma", character: "Nandini" }], director: "Karan Iyer" },
  { title: "Last Train from Goa", synopsis: "A locked-car murder on the Konkan Express. Six suspects. One thirteen-hour journey. No way off.", runtime: 121, certificate: "UA", status: "NOW_SHOWING", releaseOffset: -5, languages: ["English", "Hindi"], formats: ["2D", "4DX"], genres: ["Mystery", "Thriller"], imdb: 7.6, palette: ["#0f172a", "#64748b"], cast: [{ name: "Rhea D'Souza", character: "Inspector Pires" }, { name: "Armaan Gill" }], director: "Sameer Hegde" },
  { title: "Cosmic Canvas", synopsis: "An animated journey of a young girl who paints her grief into landscapes that slowly come alive.", runtime: 98, certificate: "U", status: "NOW_SHOWING", releaseOffset: -10, languages: ["Hindi", "English", "Tamil"], formats: ["2D", "3D"], genres: ["Animation", "Family"], imdb: 8.0, palette: ["#ec4899", "#8b5cf6"], cast: [{ name: "Voice: Aarohi Desai" }, { name: "Voice: Manav Joshi" }], director: "Studio Kaleidoscope" },
  { title: "Iron Bridge", synopsis: "Engineers race to retrofit a century-old bridge ahead of the monsoon that's already breached the upstream dams.", runtime: 138, certificate: "UA", status: "NOW_SHOWING", releaseOffset: -2, languages: ["Hindi", "English"], formats: ["2D", "IMAX"], genres: ["Drama", "Thriller"], imdb: 7.4, palette: ["#1e3a8a", "#f97316"], cast: [{ name: "Karthik Nair", character: "Engineer Rao" }, { name: "Priya Khurana" }], director: "Lakshmi Pillai" },
  { title: "Midnight at the Dhaba", synopsis: "A rain-soaked highway dhaba becomes the meeting point for five strangers with one impossible secret.", runtime: 118, certificate: "UA", status: "NOW_SHOWING", releaseOffset: -8, languages: ["Hindi", "Punjabi"], formats: ["2D"], genres: ["Drama", "Romance", "Mystery"], imdb: 7.5, palette: ["#0891b2", "#facc15"], cast: [{ name: "Siddharth Batra" }, { name: "Nysa Oberoi" }], director: "Akash Gupta" },
  { title: "Roar of the Rann", synopsis: "A nomadic Rabari woman protects a wounded lion from poachers across the white desert.", runtime: 126, certificate: "U", status: "NOW_SHOWING", releaseOffset: -15, languages: ["Hindi", "Gujarati"], formats: ["2D", "IMAX"], genres: ["Drama", "Adventure"], imdb: 8.2, palette: ["#a16207", "#fef3c7"], cast: [{ name: "Urvashi Dalal", character: "Kamli" }], director: "Bhavik Shah" },
  { title: "Phoenix Protocol", synopsis: "A hacker-for-hire stumbles on a rogue AI running elections in three countries. Now it's hunting her.", runtime: 145, certificate: "A", status: "NOW_SHOWING", releaseOffset: -4, languages: ["English", "Hindi", "Telugu"], formats: ["2D", "IMAX", "Dolby Atmos"], genres: ["Thriller", "Sci-Fi", "Action"], imdb: 7.9, palette: ["#18181b", "#22d3ee"], cast: [{ name: "Ayesha Sinha", character: "Reya" }, { name: "Marcus Lim" }], director: "Dev Sinha" },
  { title: "The Unwritten Song", synopsis: "A veteran playback singer confronts the young star remixing her unfinished work into a viral sensation.", runtime: 115, certificate: "U", status: "NOW_SHOWING", releaseOffset: -6, languages: ["Hindi"], formats: ["2D"], genres: ["Drama", "Music"], imdb: 7.3, palette: ["#831843", "#fbcfe8"], cast: [{ name: "Nandita Rajan", character: "Savitri" }, { name: "Zoya Khan" }], director: "Anand Varma" },
  { title: "Kalyug Chronicles", synopsis: "A mythological saga reimagined on a dying Earth in 2187. Gods return, but humanity has forgotten how to recognize them.", runtime: 165, certificate: "UA", status: "UPCOMING", releaseOffset: 14, languages: ["Hindi", "Tamil", "Telugu", "Malayalam"], formats: ["2D", "3D", "IMAX", "Dolby Atmos"], genres: ["Fantasy", "Action", "Drama"], imdb: 0, palette: ["#0c4a6e", "#fde68a"], cast: [{ name: "Rajveer Malhotra", character: "Yudh" }, { name: "Meera Raghavan" }], director: "Lakshmi Pillai" },
  { title: "Sunday Morning Songs", synopsis: "A Parsi bakery in Dadar, a missing recipe book, and a love story spanning four decades.", runtime: 124, certificate: "U", status: "UPCOMING", releaseOffset: 21, languages: ["Hindi", "English"], formats: ["2D"], genres: ["Drama", "Romance"], imdb: 0, palette: ["#be123c", "#fda4af"], cast: [{ name: "Isha Kapoor" }, { name: "Vikram Bose" }], director: "Priya Shenoy" },
  { title: "Nightshift", synopsis: "A hospital cleaner witnesses a crime no one else remembers the next morning.", runtime: 108, certificate: "A", status: "UPCOMING", releaseOffset: 10, languages: ["Hindi", "English"], formats: ["2D"], genres: ["Horror", "Thriller"], imdb: 0, palette: ["#111827", "#dc2626"], cast: [{ name: "Tanvi Bhatt" }, { name: "Siddharth Batra" }], director: "Ruhi Jain" },
  { title: "The Nine Faces of Rati", synopsis: "A dance documentary exploring a lost form of Bharatanatyam revived by nine contemporary dancers.", runtime: 95, certificate: "U", status: "ENDED", releaseOffset: -60, languages: ["Tamil", "Hindi", "English"], formats: ["2D"], genres: ["Documentary"], imdb: 8.6, palette: ["#4c1d95", "#fde68a"], cast: [{ name: "Various Artists" }], director: "Studio Kaleidoscope" },
];

const THEATERS_PLAN = [
  { city: "mumbai", name: "PVR Phoenix Lower Parel", chain: "PVR", screens: 3 },
  { city: "mumbai", name: "INOX R-City Ghatkopar", chain: "INOX", screens: 2 },
  { city: "mumbai", name: "Cinepolis Andheri West", chain: "Cinepolis", screens: 2 },
  { city: "ncr", name: "PVR Select Citywalk Saket", chain: "PVR", screens: 3 },
  { city: "ncr", name: "INOX Nehru Place", chain: "INOX", screens: 2 },
  { city: "bengaluru", name: "PVR Orion Mall Rajajinagar", chain: "PVR", screens: 3 },
  { city: "bengaluru", name: "INOX Garuda Mall", chain: "INOX", screens: 2 },
  { city: "hyderabad", name: "PVR Inorbit Cyberabad", chain: "PVR", screens: 2 },
  { city: "chennai", name: "SPI Sathyam", chain: "SPI", screens: 3 },
  { city: "kolkata", name: "INOX Quest Ballygunge", chain: "INOX", screens: 2 },
  { city: "pune", name: "PVR Phoenix Marketcity Viman Nagar", chain: "PVR", screens: 2 },
  { city: "ahmedabad", name: "Cinepolis AlphaOne", chain: "Cinepolis", screens: 2 },
];

const AMENITIES_POOL = ["M_TICKET", "FOOD_AND_BEVERAGE", "PARKING", "WHEELCHAIR", "RECLINERS", "DOLBY_ATMOS"];

const EVENTS_PLAN = [
  { title: "Arijit Singh Live in Concert", type: "CONCERT", city: "mumbai", description: "The voice of a generation, live with a 40-piece orchestra.", durationHours: 3, palette: ["#0c0a09", "#f59e0b"] as [string, string], seatingType: "GENERAL" },
  { title: "Shakespeare's Macbeth (Bilingual)", type: "PLAY", city: "bengaluru", description: "A searing reinterpretation in Kannada and English.", durationHours: 2.5, palette: ["#450a0a", "#fecaca"] as [string, string], seatingType: "RESERVED" },
  { title: "IPL — Mumbai vs Chennai", type: "SPORTS", city: "mumbai", description: "The rivalry continues at Wankhede.", durationHours: 4, palette: ["#1e40af", "#fbbf24"] as [string, string], seatingType: "RESERVED" },
  { title: "Stand-up Comedy Night", type: "ACTIVITY", city: "ncr", description: "Six new voices from the Delhi circuit.", durationHours: 2, palette: ["#7c2d12", "#fdba74"] as [string, string], seatingType: "GENERAL" },
  { title: "Pottery Weekend Workshop", type: "WORKSHOP", city: "pune", description: "Hands-on wheel-throwing and glaze techniques.", durationHours: 6, palette: ["#365314", "#d9f99d"] as [string, string], seatingType: "STANDING" },
];

const FNB_ITEMS = [
  { name: "Large Popcorn", description: "Buttery, salted, freshly popped.", category: "POPCORN", price: 35000, color: "#f59e0b" },
  { name: "Medium Popcorn", description: "Just the right amount.", category: "POPCORN", price: 25000, color: "#fbbf24" },
  { name: "Caramel Popcorn", description: "Sweet and crunchy.", category: "POPCORN", price: 38000, color: "#b45309" },
  { name: "Coke (Large)", description: "Chilled Coca-Cola, 600ml.", category: "DRINKS", price: 18000, color: "#dc2626" },
  { name: "Pepsi (Medium)", description: "Classic Pepsi, 400ml.", category: "DRINKS", price: 14000, color: "#1d4ed8" },
  { name: "Lemonade", description: "House-made with fresh mint.", category: "DRINKS", price: 16000, color: "#84cc16" },
  { name: "Veg Combo", description: "Popcorn + drink + veg nachos.", category: "COMBOS", price: 55000, color: "#059669" },
  { name: "Couple Combo", description: "2 popcorn + 2 drinks.", category: "COMBOS", price: 78000, color: "#be185d" },
  { name: "Family Feast", description: "4 popcorn + 4 drinks + 2 nachos.", category: "COMBOS", price: 145000, color: "#7c2d12" },
  { name: "Nachos with Cheese", description: "Warm tortilla chips with cheddar.", category: "SNACKS", price: 28000, color: "#eab308" },
  { name: "Cheese Samosa", description: "Crispy, spicy, melty.", category: "SNACKS", price: 18000, color: "#c2410c" },
  { name: "Chocolate Brownie", description: "Warm with vanilla ice cream.", category: "DESSERTS", price: 22000, color: "#78350f" },
];

const OFFERS = [
  { code: "FLAT150", title: "Flat ₹150 off", description: "On bookings over ₹500.", type: "FLAT", value: 15000, minOrder: 50000 },
  { code: "WELCOME20", title: "20% off for new users", description: "Up to ₹200.", type: "PERCENTAGE", value: 20, maxDiscount: 20000, minOrder: 30000 },
  { code: "TUESDAY50", title: "Tuesday Special", description: "50% off convenience fee (capped at ₹100).", type: "FLAT", value: 10000, minOrder: 40000 },
  { code: "IMAX100", title: "₹100 off on IMAX", description: "Premium viewing, less cost.", type: "FLAT", value: 10000, minOrder: 80000 },
  { code: "WEEKEND15", title: "Weekend 15% off", description: "On Saturday & Sunday shows.", type: "PERCENTAGE", value: 15, maxDiscount: 30000, minOrder: 60000 },
];

// ---- Seat layout generator ---------------------------------

interface GeneratedLayout {
  rows: number;
  cols: number;
  aisles: number[];
  rowsByCategory: { categoryIdx: number; rows: string[] }[];
}

function generateLayout(variant: "standard" | "recliner" | "imax"): GeneratedLayout {
  if (variant === "recliner") return { rows: 8, cols: 12, aisles: [4, 8], rowsByCategory: [{ categoryIdx: 0, rows: ["A", "B"] }, { categoryIdx: 1, rows: ["C", "D", "E"] }, { categoryIdx: 2, rows: ["F", "G", "H"] }] };
  if (variant === "imax") return { rows: 14, cols: 20, aisles: [6, 14], rowsByCategory: [{ categoryIdx: 0, rows: ["A", "B", "C"] }, { categoryIdx: 1, rows: ["D", "E", "F", "G", "H"] }, { categoryIdx: 2, rows: ["I", "J", "K", "L", "M", "N"] }] };
  return { rows: 10, cols: 14, aisles: [5, 10], rowsByCategory: [{ categoryIdx: 1, rows: ["A", "B", "C"] }, { categoryIdx: 2, rows: ["D", "E", "F", "G"] }, { categoryIdx: 3, rows: ["H", "I", "J"] }] };
}

const CATEGORY_DEFS = [
  { name: "Recliner", color: "#d4af37", basePrice: 55000, convenience: 3500 },
  { name: "Premium", color: "#6366f1", basePrice: 35000, convenience: 3000 },
  { name: "Executive", color: "#0891b2", basePrice: 22000, convenience: 2500 },
  { name: "Normal", color: "#64748b", basePrice: 15000, convenience: 2000 },
];

// ============================================================
// Main seed
// ============================================================

async function main() {
  console.log("🌱 Resetting tables...");
  await prisma.userOffer.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.review.deleteMany();
  await prisma.refund.deleteMany();
  await prisma.bookingFnb.deleteMany();
  await prisma.bookingSeat.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.paymentIntent.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.showSeat.deleteMany();
  await prisma.showPricing.deleteMany();
  await prisma.show.deleteMany();
  await prisma.eventOccurrence.deleteMany();
  await prisma.event.deleteMany();
  await prisma.seat.deleteMany();
  await prisma.seatCategory.deleteMany();
  await prisma.screen.deleteMany();
  await prisma.theater.deleteMany();
  await prisma.fnbItem.deleteMany();
  await prisma.offer.deleteMany();
  await prisma.movieCastCrew.deleteMany();
  await prisma.movie.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.otpRequest.deleteMany();
  await prisma.user.deleteMany();
  await prisma.city.deleteMany();

  console.log("🌱 Cities...");
  const cityMap = new Map<string, string>();
  for (let i = 0; i < CITIES.length; i++) {
    const c = CITIES[i]!;
    const row = await prisma.city.create({
      data: {
        name: c.name,
        slug: c.slug,
        state: c.state,
        latitude: c.lat,
        longitude: c.lng,
        isTop: c.isTop,
        displayOrder: i,
      },
    });
    cityMap.set(c.slug, row.id);
  }

  console.log("🌱 Users...");
  const admin = await prisma.user.create({
    data: { phone: "+911111111111", email: "admin@showbook.local", name: "Admin Demo", role: "ADMIN", phoneVerified: true, emailVerified: true, cityId: cityMap.get("mumbai")! },
  });
  const customer = await prisma.user.create({
    data: { phone: "+912222222222", email: "ravi@showbook.local", name: "Ravi Demo", role: "USER", phoneVerified: true, cityId: cityMap.get("mumbai")! },
  });
  const partner = await prisma.user.create({
    data: { phone: "+913333333333", email: "partner@showbook.local", name: "Partner Demo", role: "THEATER_PARTNER", phoneVerified: true, cityId: cityMap.get("mumbai")! },
  });

  console.log("🌱 Movies...");
  const today = new Date();
  for (const m of MOVIES) {
    const releaseDate = new Date(today);
    releaseDate.setDate(today.getDate() + m.releaseOffset);
    const movie = await prisma.movie.create({
      data: {
        title: m.title,
        slug: slugify(m.title),
        synopsis: m.synopsis,
        runtimeMinutes: m.runtime,
        certificate: m.certificate,
        releaseDate,
        languages: J(m.languages),
        formats: J(m.formats),
        genres: J(m.genres),
        posterUrl: makePoster(m.title, m.genres.join(" · "), m.palette),
        backdropUrl: makeBackdrop(m.title, m.palette),
        trailerUrl: null,
        imdbRating: m.imdb || null,
        userRating: m.imdb ? Math.min(5, m.imdb / 2) : null,
        status: m.status,
      },
    });
    await prisma.movieCastCrew.create({
      data: { movieId: movie.id, personName: m.director, personImageUrl: makeAvatar(m.director), role: "DIRECTOR", displayOrder: 0 },
    });
    for (let i = 0; i < m.cast.length; i++) {
      const c = m.cast[i]!;
      await prisma.movieCastCrew.create({
        data: { movieId: movie.id, personName: c.name, personImageUrl: makeAvatar(c.name), role: "ACTOR", characterName: c.character || null, displayOrder: i + 1 },
      });
    }
  }

  console.log("🌱 Theaters / Screens / Seats...");
  for (const plan of THEATERS_PLAN) {
    const baseLat = CITIES.find((c) => c.slug === plan.city)!.lat;
    const baseLng = CITIES.find((c) => c.slug === plan.city)!.lng;
    const theater = await prisma.theater.create({
      data: {
        name: plan.name,
        slug: slugify(plan.name),
        chain: plan.chain,
        cityId: cityMap.get(plan.city)!,
        address: `${plan.name}, ${plan.city.toUpperCase()}`,
        amenities: J(AMENITIES_POOL.slice(0, 4 + rand(0, 2))),
        phone: "+91" + rand(6000000000, 9999999999),
        partnerId: partner.id,
        latitude: baseLat + (Math.random() - 0.5) * 0.1,
        longitude: baseLng + (Math.random() - 0.5) * 0.1,
      },
    });
    for (let s = 0; s < plan.screens; s++) {
      const variant: "standard" | "recliner" | "imax" =
        s === 0 && plan.chain === "PVR" ? "imax" : s === 0 ? "recliner" : "standard";
      const layout = generateLayout(variant);
      const formatsSupported =
        variant === "imax" ? ["2D", "3D", "IMAX", "Dolby Atmos"] : variant === "recliner" ? ["2D", "3D", "Dolby Atmos"] : ["2D", "3D"];
      const screen = await prisma.screen.create({
        data: {
          theaterId: theater.id,
          name: variant === "imax" ? "IMAX" : `Audi ${s + 1}`,
          totalSeats: 0,
          layoutJson: J({ rows: layout.rows, cols: layout.cols, aisles: layout.aisles.map((c) => ({ afterCol: c })) }),
          formatsSupported: J(formatsSupported),
        },
      });

      const usedIdxs = [...new Set(layout.rowsByCategory.map((r) => r.categoryIdx))].sort();
      const categoryIds: string[] = new Array(CATEGORY_DEFS.length).fill("");
      for (const ci of usedIdxs) {
        const def = CATEGORY_DEFS[ci]!;
        const cat = await prisma.seatCategory.create({
          data: { screenId: screen.id, name: def.name, colorHex: def.color, displayOrder: ci },
        });
        categoryIds[ci] = cat.id;
      }

      let totalSeats = 0;
      for (const band of layout.rowsByCategory) {
        const catId = categoryIds[band.categoryIdx];
        if (!catId) continue;
        for (const rowLabel of band.rows) {
          for (let col = 1; col <= layout.cols; col++) {
            await prisma.seat.create({
              data: { screenId: screen.id, categoryId: catId, rowLabel, seatNumber: col, isAccessible: rowLabel === "A" && col === 1 },
            });
            totalSeats++;
          }
        }
      }
      await prisma.screen.update({ where: { id: screen.id }, data: { totalSeats } });
    }
  }

  console.log("🌱 Shows (next 14 days)...");
  const nowShowingMovies = await prisma.movie.findMany({ where: { status: "NOW_SHOWING" } });
  const screens = await prisma.screen.findMany({ include: { seatCategories: true, seats: true } });

  const SHOW_SLOTS = [10, 13, 16, 19, 22];
  let showCount = 0;
  for (let dayOffset = 0; dayOffset < 14; dayOffset++) {
    for (const screen of screens) {
      const slots = SHOW_SLOTS.slice(0, 3);
      const formatsSupported = JSON.parse(screen.formatsSupported) as string[];
      for (let si = 0; si < slots.length; si++) {
        const movieId = nowShowingMovies[(dayOffset + screens.indexOf(screen) + si) % nowShowingMovies.length]!.id;
        const movie = nowShowingMovies.find((m) => m.id === movieId)!;
        const hour = slots[si]!;
        const start = new Date();
        start.setDate(start.getDate() + dayOffset);
        start.setHours(hour, 0, 0, 0);
        const end = new Date(start.getTime() + movie.runtimeMinutes * 60_000);
        const format = pick(formatsSupported);
        const movieLangs = JSON.parse(movie.languages) as string[];
        const language = pick(movieLangs);

        const show = await prisma.show.create({
          data: { movieId: movie.id, screenId: screen.id, startTime: start, endTime: end, language, format, status: "SCHEDULED" },
        });

        for (const cat of screen.seatCategories) {
          const def = CATEGORY_DEFS.find((d) => d.name === cat.name)!;
          const formatMultiplier = format === "IMAX" ? 1.5 : format === "4DX" ? 1.8 : format === "3D" ? 1.2 : 1;
          await prisma.showPricing.create({
            data: { showId: show.id, categoryId: cat.id, basePricePaise: Math.round(def.basePrice * formatMultiplier), convenienceFeePaise: def.convenience },
          });
        }

        await prisma.showSeat.createMany({
          data: screen.seats.map((s) => ({ showId: show.id, seatId: s.id, status: "AVAILABLE" })),
        });
        showCount++;
      }
    }
  }
  console.log(`  created ${showCount} shows`);

  console.log("🌱 F&B items...");
  for (let i = 0; i < FNB_ITEMS.length; i++) {
    const f = FNB_ITEMS[i]!;
    await prisma.fnbItem.create({
      data: { name: f.name, description: f.description, category: f.category, pricePaise: f.price, imageUrl: makeFnbImage(f.name, f.color), displayOrder: i },
    });
  }

  console.log("🌱 Offers...");
  const now = new Date();
  const twoMonths = new Date(now);
  twoMonths.setDate(now.getDate() + 60);
  for (const o of OFFERS) {
    await prisma.offer.create({
      data: {
        code: o.code,
        title: o.title,
        description: o.description,
        discountType: o.type,
        discountValue: o.value,
        maxDiscountPaise: o.maxDiscount ?? null,
        minOrderPaise: o.minOrder,
        validFrom: now,
        validTo: twoMonths,
        totalLimit: null,
        perUserLimit: 5,
        applicableCities: J([]),
        applicablePaymentMethods: J([]),
        isActive: true,
      },
    });
  }

  console.log("🌱 Events...");
  for (const e of EVENTS_PLAN) {
    const ev = await prisma.event.create({
      data: {
        title: e.title,
        slug: slugify(e.title),
        eventType: e.type,
        description: e.description,
        durationHours: e.durationHours,
        ageRestriction: null,
        bannerUrl: makeBackdrop(e.title, e.palette),
        organizerId: partner.id,
        status: "PUBLISHED",
      },
    });
    const venue = await prisma.theater.findFirst({ where: { cityId: cityMap.get(e.city)! } });
    if (venue) {
      for (let d = 2; d <= 10; d += 3) {
        const start = new Date();
        start.setDate(start.getDate() + d);
        start.setHours(19, 0, 0, 0);
        const end = new Date(start.getTime() + e.durationHours * 60 * 60_000);
        await prisma.eventOccurrence.create({
          data: { eventId: ev.id, venueId: venue.id, startTime: start, endTime: end, seatingType: e.seatingType, layoutJson: J({}) },
        });
      }
    }
  }

  console.log("🌱 Reviews...");
  for (const m of nowShowingMovies.slice(0, 4)) {
    for (let i = 0; i < 3; i++) {
      await prisma.review.create({
        data: {
          userId: customer.id,
          movieId: m.id,
          rating: rand(7, 10) / 2,
          text: pick([
            "Absolutely brilliant. Stayed with me long after the credits.",
            "Great performances, though the second act dragged a bit.",
            "Visually stunning. Worth catching on IMAX if you can.",
            "Solid watch. Recommended for a weekend afternoon.",
            "Not my cup of tea, but well-crafted.",
          ]),
          status: "APPROVED",
        },
      });
    }
  }

  await prisma.notification.create({
    data: {
      userId: customer.id,
      type: "OFFER",
      title: "Welcome to ShowBook!",
      body: "Use code WELCOME20 on your first booking for 20% off (up to ₹200).",
      metadata: J({ code: "WELCOME20" }),
    },
  });

  console.log(`✅ Seed complete. Admin: ${admin.phone}  Customer: ${customer.phone}  Partner: ${partner.phone}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
