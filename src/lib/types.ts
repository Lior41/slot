export type Actor = {
  id: string;
  workspaceId: string;
  name: string;
  role: "COACH" | "CLIENT";
  demo: boolean;
  timezone: string;
};
export type Service = {
  id: string;
  name: string;
  description: string;
  duration: number;
  buffer: number;
  capacity: number;
  price: number;
  active: boolean;
};
export type Slot = {
  id: string;
  service_id: string;
  name: string;
  description: string;
  starts_at: string;
  ends_at: string;
  capacity: number;
  price: number;
  remaining: number;
  coach: string;
  cancelled: boolean;
};
export type Booking = {
  id: string;
  slot_id: string;
  person_id: string;
  client: string;
  name: string;
  starts_at: string;
  ends_at: string;
  status: string;
  payment: string;
  price: number;
  expires_at: string | null;
};
export type StudioData = {
  stripeEnabled: boolean;
  now: number;
  actor: Actor;
  services: Service[];
  slots: Slot[];
  bookings: Booking[];
  availability: { id: string; weekday: number; start_min: number; end_min: number }[];
  absences: { id: string; starts_at: string; ends_at: string; reason: string }[];
  audit: { id: string; action: string; created_at: string }[];
};
