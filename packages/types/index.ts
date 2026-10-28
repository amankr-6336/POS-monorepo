export interface Restaurant {
  _id: string;
  name: string;
  slug: string;                // used in public menu URL
  logoUrl?: string;
  address: string;
  contactPhone: string;
  contactEmail: string;
  cuisineTags?: string[];
  operatingHours?: { day: string; open: string; close: string }[];
  subscriptionPlan: "trial" | "basic" | "pro";
  isActive: boolean;
  tableSessionTimeoutMinutes?: number;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface Table {
  _id: string;
  restaurantId: string;
  label: string;               // "T1", "Patio 3"
  capacity: number;
  location: string;             // "Indoor", "Rooftop", "Patio", "Near Bar"
  qrCodeUrl: string;             // generated image pointing to signed customer URL
  qrToken: string;               // signed/unique token embedded in the QR URL
  status: "available" | "occupied" | "reserved" | "needs_cleaning";
  currentSessionId?: string | null;
  currentOrderId?: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface Subcategory {
  _id: string;
  name: string;                 // "Soups", "Mocktails"
  order: number;
}

export interface Category {
  _id: string;
  restaurantId: string;
  name: string;                 // "Starters", "Main Course", "Beverages"
  order: number;                // for display sorting
  subcategories: Subcategory[];
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface Ingredient {
  _id: string;
  restaurantId: string;
  name: string;                 // "Paneer", "Tomato"
  unit: "g" | "kg" | "ml" | "l" | "pcs";
  currentStock: number;
  lowStockThreshold: number;
  costPerUnit?: number;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface IngredientOverride {
  ingredientId: string;
  quantity: number;
  unit?: "g" | "kg" | "ml" | "l" | "pcs";
}

export interface VariantOption {
  _id?: string;
  name: string;                 // e.g. "Small", "Regular", "Large"
  priceDelta: number;           // delta from base price (e.g. 0, 2.50, 5.00)
  ingredientOverrides?: IngredientOverride[];
}

export interface VariantGroup {
  _id?: string;
  name: string;                 // e.g. "Size", "Portion"
  options: VariantOption[];
}

export interface ModifierOption {
  _id?: string;
  name: string;                 // e.g. "Extra Cheese", "Bacon", "Jalapenos"
  priceDelta: number;           // price delta for this add-on
  ingredients?: {
    ingredientId: string;
    quantity: number;
    unit?: "g" | "kg" | "ml" | "l" | "pcs";
  }[];
}

export interface ModifierGroup {
  _id?: string;
  name: string;                 // e.g. "Add-ons", "Choice of Dressing"
  multiSelect: boolean;         // true for multi-select, false for single-select
  minSelections?: number;
  maxSelections?: number;
  options: ModifierOption[];
}

export interface SelectedVariant {
  groupName: string;
  optionName: string;
  priceDelta: number;
  ingredientOverrides?: IngredientOverride[];
}

export interface SelectedModifier {
  groupName: string;
  optionName: string;
  priceDelta: number;
  ingredients?: {
    ingredientId: string;
    quantity: number;
    unit?: "g" | "kg" | "ml" | "l" | "pcs";
  }[];
}

export interface MenuItem {
  _id: string;
  restaurantId: string;
  categoryId: string;
  subcategoryId?: string;
  name: string;
  description: string;
  imageUrl: string;
  price: number;
  calories?: number;
  dietaryTags?: ("veg" | "non-veg" | "vegan" | "gluten-free" | "contains-nuts")[];
  spiceLevel?: "mild" | "medium" | "hot";
  ingredients: {
    ingredientId: string;
    quantity: number;           // amount consumed per one unit of this dish
    unit: "g" | "kg" | "ml" | "l" | "pcs";
  }[];
  variantGroups?: VariantGroup[];
  modifierGroups?: ModifierGroup[];
  isAvailable: boolean;         // toggled off when marked "out of stock"
  isOutOfStock: boolean;         // explicit manual/auto flag
  prepStation?: "grill" | "tandoor" | "bar" | "dessert" | "main-kitchen"; // routes KOT to correct chef
  avgPrepTimeMinutes?: number;
  avgRating?: number;
  ratingCount?: number;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface Customer {
  _id: string;
  restaurantId: string;
  name: string;
  mobileNumber: string;          // unique per restaurant, used to recognize repeat visits
  visitCount: number;
  totalSpend: number;
  lastVisitAt: Date | string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface OrderItem {
  menuItemId: string;
  name: string;                  // snapshot at order time
  price: number;                 // snapshot at order time (unit price including variant/modifier deltas)
  basePrice?: number;            // snapshot of base dish price
  quantity: number;
  itemStatus: "queued" | "preparing" | "ready" | "served" | "cancelled";
  specialInstructions?: string;
  prepStation?: string;
  selectedVariant?: SelectedVariant;
  selectedVariants?: SelectedVariant[];
  selectedModifiers?: SelectedModifier[];
}

export const CANCELLATION_REASONS = [
  "customer changed mind",
  "kitchen out of stock",
  "made in error",
  "item spoiled / quality issue",
  "long wait time",
  "other",
] as const;

export type CancellationReason = (typeof CANCELLATION_REASONS)[number] | string;

export type AuditLogAction =
  | "item_cancelled"
  | "order_cancelled"
  | "discount_applied"
  | "price_overridden"
  | "status_updated"
  | "stock_adjusted"
  | string;

export interface AuditLog {
  _id?: string;
  restaurantId: string;
  staffId?: string | null;
  staffName?: string;
  action: AuditLogAction;
  entityType: "order" | "order_item" | "bill" | "menu_item" | "ingredient" | string;
  entityId: string;
  reason?: string;
  note?: string;
  metadata?: Record<string, any>;
  timestamp: Date | string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface OrderAuditEntry {
  action: "placed" | "edited" | "status_updated" | "item_cancelled" | "order_cancelled" | string;
  staffId?: string;
  staffName?: string;
  timestamp: Date | string;
  note?: string;
}

export interface Order {
  _id: string;
  restaurantId: string;
  tableId: string;
  tableSessionId?: string;
  customerId?: string;
  items: OrderItem[];
  status: "placed" | "confirmed" | "preparing" | "ready" | "served" | "billed" | "cancelled";
  placedAt: Date | string;
  confirmedAt?: Date | string;
  servedAt?: Date | string;
  placedByStaffId?: string;
  lastEditedByStaffId?: string;
  auditLog?: OrderAuditEntry[];
  subtotal: number;
  tax: number;
  serviceCharge?: number;
  total: number;
  notes?: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface KOT {
  _id: string;
  restaurantId: string;
  orderId: string;
  tableLabel: string;
  station: string;               // which chef/station this ticket routes to
  items: {
    menuItemName: string;
    quantity: number;
    specialInstructions?: string;
    selectedVariant?: SelectedVariant;
    selectedVariants?: SelectedVariant[];
    selectedModifiers?: SelectedModifier[];
  }[];
  status: "new" | "in_progress" | "ready" | "acknowledged";
  createdAt: Date | string;
  readyAt?: Date | string;
  updatedAt?: string | Date;
}

export interface Bill {
  _id: string;
  restaurantId: string;
  tableSessionId?: string;
  orderId?: string;
  orderIds?: string[];
  tableLabel: string;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  serviceCharge?: number;
  total: number;
  generatedAt: Date | string;
  printedAt?: Date | string;
  paymentStatus: "pending" | "settled_externally";
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface StaffUser {
  _id: string;
  restaurantId: string;
  name: string;
  email: string;
  passwordHash?: string; // Optional on client side for safety
  pinHash?: string;      // Hashed 4-6 digit PIN
  pinAttempts?: number;  // Failed PIN counter
  pinLockedUntil?: Date | string | null; // Cooldown lockout timestamp
  hasPin?: boolean;      // Helper boolean for client without exposing hash
  role: "owner" | "manager" | "waiter" | "chef";
  assignedStation?: string;      // for chefs
  isActive: boolean;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface TableQuery {
  _id: string;
  restaurantId: string;
  tableId: string;
  tableLabel?: string; // Cached label for convenience
  raisedAt: Date | string;
  resolvedAt?: Date | string;
  resolvedByStaffId?: string;
  status: "open" | "resolved";
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface DishRating {
  menuItemId: string;
  rating: number; // 1-5
  tags?: string[];
  comment?: string;
}

export interface OrderRating {
  _id?: string;
  restaurantId: string;
  orderId: string;
  tableId: string;
  customerId: string;
  overallRating: number; // 1-5
  overallComment?: string;
  dishRatings: DishRating[];
  flaggedForFollowUp: boolean;
  resolvedByStaffId?: string;
  resolvedAt?: string | Date;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface TableSession {
  _id: string;
  tableId: string;
  restaurantId: string;
  status: "active" | "closed";
  openedAt: Date | string;
  closedAt?: Date | string | null;
  closedByStaffId?: string | null;
  lastActivityAt?: Date | string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

