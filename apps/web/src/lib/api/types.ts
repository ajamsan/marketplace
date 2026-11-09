/** Tipe DTO yang mencerminkan kontrak Go API (PRD §10). */

export interface ApiMeta {
  request_id: string;
}

export interface ApiSuccess<T> {
  data: T;
  meta: ApiMeta;
}

export interface ApiErrorBody {
  code: string;
  message: string;
  fields?: Record<string, string>;
}

export interface ApiFailure {
  error: ApiErrorBody;
  meta: ApiMeta;
}

export type Role = "buyer" | "seller" | "admin";

export interface UserInfo {
  id: string;
  username: string;
  role: Role;
}

export interface Profile {
  id: string;
  username: string;
  email: string;
  role: Role;
  status: string;
  profile_image_url: string | null;
  preferences: Record<string, string>;
  created_at: string;
}

export interface AuthTokens {
  access_token: string;
  token_type: string;
  expires_in: number;
  csrf_token?: string;
  user: UserInfo;
}

export interface RegisterResult {
  status: string;
}

export interface LoginStartResult {
  status: string;
  pre_auth_token: string;
}

export interface SessionView {
  id: string;
  label: string;
  platform: string;
  ip_masked: string;
  created_at: string;
  last_seen_at: string;
  is_current: boolean;
}

export interface Stall {
  id: string;
  name: string;
  description: string;
  location_label: string;
  status: string;
  created_at: string;
}

export interface AdminStall extends Stall {
  owner_username: string;
  owner_email: string;
}

export interface Product {
  id: string;
  stall_id: string;
  stall_name: string;
  name: string;
  description: string;
  price_minor: number;
  currency: string;
  availability_status: string;
  image_url: string | null;
  created_at: string;
  archived_at?: string;
}

export interface CartItem {
  product_id: string;
  name: string;
  stall_id: string;
  stall_name: string;
  unit_price_minor: number;
  quantity: number;
  line_total_minor: number;
  availability_status: string;
  image_url: string | null;
}

export interface Cart {
  items: CartItem[];
  subtotal_minor: number;
  currency: string;
}

export interface OrderItemLine {
  product_id: string;
  name: string;
  stall_id: string;
  stall_name: string;
  unit_price_minor: number;
  quantity: number;
  line_total_minor: number;
}

export interface OrderStallSummary {
  stall_id: string;
  stall_name: string;
  subtotal_minor: number;
}

export interface PaymentLine {
  id: string;
  stall_id: string;
  stall_name: string;
  method: string;
  status: string;
  amount_minor: number;
  currency: string;
  paid_at: string | null;
}

export interface FulfillmentLine {
  id: string;
  stall_id: string;
  stall_name: string;
  status: string;
  in_preparation_at: string | null;
  ready_for_pickup_at: string | null;
  completed_at: string | null;
}

export interface OrderPreview {
  items: OrderItemLine[];
  stalls: OrderStallSummary[];
  subtotal_minor: number;
  total_minor: number;
  currency: string;
}

export interface OrderDetail {
  id: string;
  public_code: string;
  status: string;
  queue_number: number;
  buyer_username: string;
  currency: string;
  subtotal_minor: number;
  total_minor: number;
  created_at: string;
  items: OrderItemLine[];
  payments: PaymentLine[];
  fulfillments: FulfillmentLine[];
}

export interface OrderSummary {
  id: string;
  public_code: string;
  status: string;
  total_minor: number;
  currency: string;
  created_at: string;
  payments_total: number;
  payments_paid: number;
}

export interface SellerOrder extends OrderDetail {
  stall_total_minor: number;
}

export interface ConfirmCashResult {
  payment: PaymentLine;
  order_id: string;
  order_status: string;
}

export interface FulfillmentResult {
  fulfillment_id: string;
  status: string;
  order_id: string;
  order_status: string;
}

export interface CursorPage<T> {
  items: T[];
  next_cursor: string | null;
}

export interface OrderPage {
  orders: OrderSummary[];
  next_cursor: string | null;
}

export interface SellerOrderPage {
  orders: SellerOrder[];
  next_cursor: string | null;
}

export interface ProductPage {
  items: Product[];
  next_cursor: string | null;
}
