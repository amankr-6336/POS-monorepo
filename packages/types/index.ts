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
  price: number;                 // snapshot at order time
  quantity: number;
  itemStatus: "queued" | "preparing" | "ready" | "served" | "cancelled";
  specialInstructions?: string;
  prepStation?: string;
}

export interface Order {
  _id: string;
  restaurantId: string;
  tableId: string;
  tableSessionId?: string;
  customerId: string;
  items: OrderItem[];
  status: "placed" | "confirmed" | "preparing" | "ready" | "served" | "billed" | "cancelled";
  placedAt: Date | string;
  confirmedAt?: Date | string;
  servedAt?: Date | string;
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
  items: { menuItemName: string; quantity: number; specialInstructions?: string }[];
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

