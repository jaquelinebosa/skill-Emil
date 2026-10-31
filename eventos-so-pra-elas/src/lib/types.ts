export type RegistrationStatus = "pending" | "paid" | "expired" | "cancelled";
export type StaffRole = "admin" | "sales" | "checkin";

export interface EventRow {
  id: string;
  slug: string;
  name: string;
  code_prefix: string;
  event_date: string;
  start_time: string | null;
  venue_name: string | null;
  venue_address: string | null;
  price_cents: number;
  capacity: number;
  pix_key: string | null;
  pix_holder: string | null;
  sales_whatsapp: string | null;
  menu_info: string | null;
  ask_dietary: boolean;
  pending_ttl_hours: number;
  image_consent_version: string;
  image_consent_text: string;
  registrations_open: boolean;
}

export interface Registration {
  id: string;
  event_id: string;
  seq: number;
  code: string;
  name: string;
  email: string;
  phone: string;
  instagram: string | null;
  dietary: string | null;
  image_consent: boolean;
  image_consent_version: string;
  marketing_consent: boolean;
  privacy_accepted_at: string;
  status: RegistrationStatus;
  ticket_token: string;
  expires_at: string;
  paid_at: string | null;
  checked_in_at: string | null;
  cancelled_at: string | null;
  notes: string | null;
  created_at: string;
}

export interface Staff {
  user_id: string;
  name: string;
  role: StaffRole;
}
