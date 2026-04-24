// ============================================================
// @showbook/types — shared DTOs, enums, and API contracts
// ============================================================

// ---- Enums ---------------------------------------------------

export const UserRole = {
  USER: "USER",
  ADMIN: "ADMIN",
  CITY_ADMIN: "CITY_ADMIN",
  THEATER_PARTNER: "THEATER_PARTNER",
  EVENT_ORGANIZER: "EVENT_ORGANIZER",
  SUPPORT: "SUPPORT",
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const MovieStatus = {
  UPCOMING: "UPCOMING",
  NOW_SHOWING: "NOW_SHOWING",
  ENDED: "ENDED",
} as const;
export type MovieStatus = (typeof MovieStatus)[keyof typeof MovieStatus];

export const ShowStatus = {
  SCHEDULED: "SCHEDULED",
  CANCELLED: "CANCELLED",
  COMPLETED: "COMPLETED",
} as const;
export type ShowStatus = (typeof ShowStatus)[keyof typeof ShowStatus];

export const SeatStatus = {
  AVAILABLE: "AVAILABLE",
  LOCKED: "LOCKED",
  BOOKED: "BOOKED",
} as const;
export type SeatStatus = (typeof SeatStatus)[keyof typeof SeatStatus];

export const BookingStatus = {
  PENDING: "PENDING",
  CONFIRMED: "CONFIRMED",
  CANCELLED: "CANCELLED",
  FAILED: "FAILED",
} as const;
export type BookingStatus = (typeof BookingStatus)[keyof typeof BookingStatus];

export const PaymentStatus = {
  CREATED: "CREATED",
  PAID: "PAID",
  FAILED: "FAILED",
  REFUNDED: "REFUNDED",
} as const;
export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus];

export const PaymentMethod = {
  UPI: "UPI",
  CARD: "CARD",
  NETBANKING: "NETBANKING",
  WALLET: "WALLET",
  EMI: "EMI",
} as const;
export type PaymentMethod = (typeof PaymentMethod)[keyof typeof PaymentMethod];

export const EventType = {
  CONCERT: "CONCERT",
  PLAY: "PLAY",
  SPORTS: "SPORTS",
  ACTIVITY: "ACTIVITY",
  WORKSHOP: "WORKSHOP",
} as const;
export type EventType = (typeof EventType)[keyof typeof EventType];

export const OfferType = {
  FLAT: "FLAT",
  PERCENTAGE: "PERCENTAGE",
} as const;
export type OfferType = (typeof OfferType)[keyof typeof OfferType];

export const ReviewStatus = {
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
} as const;
export type ReviewStatus = (typeof ReviewStatus)[keyof typeof ReviewStatus];

// ---- Core entities (API responses) --------------------------

export interface CityDto {
  id: string;
  name: string;
  slug: string;
  state: string | null;
  latitude: number | null;
  longitude: number | null;
  isTop: boolean;
}

export interface UserDto {
  id: string;
  phone: string;
  email: string | null;
  name: string | null;
  role: UserRole;
  cityId: string | null;
}

export interface MovieDto {
  id: string;
  title: string;
  originalTitle: string | null;
  slug: string;
  synopsis: string;
  runtimeMinutes: number;
  certificate: string;
  releaseDate: string; // ISO date
  languages: string[];
  formats: string[];
  genres: string[];
  posterUrl: string;
  backdropUrl: string;
  trailerUrl: string | null;
  imdbRating: number | null;
  userRating: number | null;
  status: MovieStatus;
}

export interface CastCrewDto {
  id: string;
  personName: string;
  personImageUrl: string | null;
  role: string;
  characterName: string | null;
  displayOrder: number;
}

export interface MovieDetailDto extends MovieDto {
  castCrew: CastCrewDto[];
  reviewCount: number;
  averageRating: number | null;
}

export interface TheaterDto {
  id: string;
  name: string;
  slug: string;
  chain: string | null;
  cityId: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  amenities: string[];
  distanceKm?: number;
}

export interface SeatCategoryDto {
  id: string;
  name: string;
  colorHex: string;
  displayOrder: number;
  basePricePaise: number;
  convenienceFeePaise: number;
}

export interface SeatDto {
  id: string;
  rowLabel: string;
  seatNumber: number;
  categoryId: string;
  isAccessible: boolean;
  status: SeatStatus;
  lockedByMe?: boolean;
}

export interface SeatLayoutDto {
  showId: string;
  screen: { rows: number; cols: number };
  categories: SeatCategoryDto[];
  seats: SeatDto[];
  aisles: { afterCol: number }[];
  maxSeatsPerBooking: number;
}

export interface ShowDto {
  id: string;
  movieId: string;
  screenId: string;
  theaterId: string;
  theaterName: string;
  screenName: string;
  startTime: string; // ISO datetime
  endTime: string;
  language: string;
  format: string;
  status: ShowStatus;
  availableSeatCount: number;
  totalSeatCount: number;
  minPricePaise: number;
  maxPricePaise: number;
}

export interface ShowtimesByTheaterDto {
  theater: TheaterDto;
  shows: ShowDto[];
}

export interface FnbItemDto {
  id: string;
  name: string;
  description: string;
  category: string;
  pricePaise: number;
  imageUrl: string;
  available: boolean;
}

export interface BookingSeatDto {
  seatId: string;
  rowLabel: string;
  seatNumber: number;
  categoryName: string;
  pricePaise: number;
}

export interface BookingFnbDto {
  itemId: string;
  name: string;
  quantity: number;
  pricePaise: number;
}

export interface BookingDto {
  id: string;
  bookingNumber: string;
  userId: string;
  showId: string;
  status: BookingStatus;
  subtotalPaise: number;
  convenienceFeePaise: number;
  gstPaise: number;
  discountPaise: number;
  totalPaise: number;
  offerCode: string | null;
  qrCodeData: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  createdAt: string;
  confirmedAt: string | null;
  cancelledAt: string | null;
  seats: BookingSeatDto[];
  fnb: BookingFnbDto[];
  show: ShowDto;
  movieTitle: string;
  moviePosterUrl: string;
}

export interface OfferDto {
  id: string;
  code: string;
  title: string;
  description: string;
  discountType: OfferType;
  discountValue: number;
  maxDiscountPaise: number | null;
  minOrderPaise: number;
  validFrom: string;
  validTo: string;
  isActive: boolean;
}

export interface ReviewDto {
  id: string;
  userId: string;
  userName: string;
  movieId: string | null;
  eventId: string | null;
  rating: number;
  text: string | null;
  helpfulCount: number;
  status: ReviewStatus;
  verifiedBooking: boolean;
  createdAt: string;
}

export interface NotificationDto {
  id: string;
  type: string;
  title: string;
  body: string;
  metadata: Record<string, unknown> | null;
  readAt: string | null;
  createdAt: string;
}

// ---- Request DTOs -------------------------------------------

export interface SendOtpRequest {
  phone: string;
}
export interface SendOtpResponse {
  success: true;
  devOtp?: string; // only present in demo mode
  expiresInSec: number;
}

export interface VerifyOtpRequest {
  phone: string;
  otp: string;
  name?: string;
  email?: string;
}
export interface VerifyOtpResponse {
  accessToken: string;
  refreshToken: string;
  user: UserDto;
}

export interface RefreshRequest {
  refreshToken: string;
}

export interface LockSeatsRequest {
  seatIds: string[];
}
export interface LockSeatsResponse {
  bookingIntentId: string;
  lockedSeatIds: string[];
  failedSeatIds: string[];
  lockExpiresAt: string;
}

export interface CreateBookingIntentRequest {
  showId: string;
  seatIds: string[];
  contactPhone?: string;
  contactEmail?: string;
}

export interface AddFnbRequest {
  items: { itemId: string; quantity: number }[];
}

export interface ApplyOfferRequest {
  code: string;
}
export interface ApplyOfferResponse {
  valid: boolean;
  discountPaise: number;
  message: string;
  offer?: OfferDto;
}

export interface CreatePaymentOrderRequest {
  bookingIntentId: string;
}
export interface CreatePaymentOrderResponse {
  orderId: string;
  amountPaise: number;
  currency: "INR";
  bookingIntentId: string;
}

export interface VerifyPaymentRequest {
  orderId: string;
  paymentId: string;
  signature: string;
  bookingIntentId: string;
  simulatedOutcome: "success" | "failure";
  method?: PaymentMethod;
}
export interface VerifyPaymentResponse {
  success: boolean;
  bookingId?: string;
  message: string;
}

export interface CreateReviewRequest {
  movieId?: string;
  eventId?: string;
  bookingId?: string;
  rating: number;
  text?: string;
}

export interface SearchResultDto {
  type: "movie" | "event" | "theater" | "city";
  id: string;
  title: string;
  subtitle: string | null;
  imageUrl: string | null;
  url: string;
}

// ---- Socket events (wire contract) --------------------------

export interface SeatLockedEvent {
  showId: string;
  seatIds: string[];
  lockedByUserId: string;
  lockExpiresAt: string;
}

export interface SeatReleasedEvent {
  showId: string;
  seatIds: string[];
}

export interface SeatBookedEvent {
  showId: string;
  seatIds: string[];
}

// ---- Pagination wrapper -------------------------------------

export interface Paginated<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
}

// ---- API error shape ----------------------------------------

export interface ApiError {
  statusCode: number;
  message: string;
  error?: string;
  details?: Record<string, unknown>;
}
