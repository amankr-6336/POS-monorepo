import { z } from "zod";

// Auth
export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

// Staff Management
export const staffRegisterSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  pin: z.string().regex(/^\d{4,6}$/, "PIN must be 4 to 6 digits").optional(),
  role: z.enum(["owner", "manager", "waiter", "chef"]),
  assignedStation: z.enum(["grill", "tandoor", "bar", "dessert", "main-kitchen"]).optional(),
  isActive: z.boolean().default(true),
});

export const staffUpdateSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").optional(),
  email: z.string().email("Invalid email address").optional(),
  password: z.string().min(6, "Password must be at least 6 characters").optional(),
  pin: z.string().regex(/^\d{4,6}$/, "PIN must be 4 to 6 digits").optional(),
  role: z.enum(["owner", "manager", "waiter", "chef"]).optional(),
  assignedStation: z.enum(["grill", "tandoor", "bar", "dessert", "main-kitchen"]).nullable().optional(),
  isActive: z.boolean().optional(),
});

export const staffSetPinSchema = z.object({
  staffId: z.string().optional(),
  pin: z.string().regex(/^\d{4,6}$/, "PIN must be 4 to 6 digits"),
});

export const staffPinSwitchSchema = z.object({
  staffId: z.string().min(1, "Staff member ID is required"),
  pin: z.string().regex(/^\d{4,6}$/, "PIN must be 4 to 6 digits"),
});


// Restaurant Profile
export const restaurantSchema = z.object({
  name: z.string().min(1, "Restaurant name is required"),
  logoUrl: z.string().url("Invalid logo URL").optional().or(z.literal("")),
  address: z.string().min(5, "Address must be at least 5 characters"),
  contactPhone: z.string().min(10, "Phone must be at least 10 digits"),
  contactEmail: z.string().email("Invalid contact email"),
  cuisineTags: z.array(z.string()).optional(),
  operatingHours: z.array(
    z.object({
      day: z.string(),
      open: z.string(),
      close: z.string(),
    })
  ).optional(),
  tableSessionTimeoutMinutes: z.number().int().positive().optional(),
});

// Table CRUD
export const tableSchema = z.object({
  label: z.string().min(1, "Table label is required (e.g. T1)"),
  capacity: z.number().int().min(1, "Capacity must be at least 1"),
  location: z.string().min(1, "Location is required (e.g. Indoor, Patio)"),
  status: z.enum(["available", "occupied", "reserved", "needs_cleaning"]).default("available"),
});

// Category CRUD
export const subcategorySchema = z.object({
  name: z.string().min(1, "Subcategory name is required"),
  order: z.number().int().default(0),
});

export const categorySchema = z.object({
  name: z.string().min(1, "Category name is required"),
  order: z.number().int().default(0),
  subcategories: z.array(subcategorySchema).default([]),
});

// Ingredient CRUD
export const ingredientSchema = z.object({
  name: z.string().min(1, "Ingredient name is required"),
  unit: z.enum(["g", "kg", "ml", "l", "pcs"]),
  currentStock: z.number().min(0, "Stock cannot be negative"),
  lowStockThreshold: z.number().min(0, "Threshold cannot be negative"),
  costPerUnit: z.number().min(0).optional(),
});

export const stockAdjustmentSchema = z.object({
  adjustmentQuantity: z.number(), // Positive for restock, negative for waste/adjust
  notes: z.string().optional(),
});

// MenuItem CRUD
export const recipeIngredientSchema = z.object({
  ingredientId: z.string().min(1, "Ingredient is required"),
  quantity: z.number().positive("Quantity must be positive"),
  unit: z.enum(["g", "kg", "ml", "l", "pcs"]),
});

export const ingredientOverrideSchema = z.object({
  ingredientId: z.string().min(1, "Ingredient is required"),
  quantity: z.number().nonnegative("Quantity cannot be negative"),
  unit: z.enum(["g", "kg", "ml", "l", "pcs"]).optional(),
});

export const variantOptionSchema = z.object({
  _id: z.string().optional(),
  name: z.string().min(1, "Option name is required"),
  priceDelta: z.number().default(0),
  ingredientOverrides: z.array(ingredientOverrideSchema).optional().default([]),
});

export const variantGroupSchema = z.object({
  _id: z.string().optional(),
  name: z.string().min(1, "Variant group name is required"),
  options: z.array(variantOptionSchema).min(1, "At least one option is required per variant group"),
});

export const modifierOptionIngredientSchema = z.object({
  ingredientId: z.string().min(1, "Ingredient is required"),
  quantity: z.number().positive("Quantity must be positive"),
  unit: z.enum(["g", "kg", "ml", "l", "pcs"]).optional(),
});

export const modifierOptionSchema = z.object({
  _id: z.string().optional(),
  name: z.string().min(1, "Modifier name is required"),
  priceDelta: z.number().default(0),
  ingredients: z.array(modifierOptionIngredientSchema).optional().default([]),
});

export const modifierGroupSchema = z.object({
  _id: z.string().optional(),
  name: z.string().min(1, "Modifier group name is required"),
  multiSelect: z.boolean().default(false),
  minSelections: z.number().int().nonnegative().optional(),
  maxSelections: z.number().int().positive().optional(),
  options: z.array(modifierOptionSchema).min(1, "At least one option is required per modifier group"),
});

export const selectedVariantSchema = z.object({
  groupName: z.string(),
  optionName: z.string(),
  priceDelta: z.number().default(0),
  ingredientOverrides: z.array(ingredientOverrideSchema).optional(),
});

export const selectedModifierSchema = z.object({
  groupName: z.string(),
  optionName: z.string(),
  priceDelta: z.number().default(0),
  ingredients: z.array(modifierOptionIngredientSchema).optional(),
});

export const menuItemSchema = z.object({
  categoryId: z.string().min(1, "Category is required"),
  subcategoryId: z.string().optional(),
  name: z.string().min(1, "Menu item name is required"),
  description: z.string().min(1, "Description is required"),
  imageUrl: z.string().optional().or(z.literal("")),
  price: z.number().positive("Price must be positive"),
  calories: z.number().nonnegative().optional(),
  dietaryTags: z.array(z.enum(["veg", "non-veg", "vegan", "gluten-free", "contains-nuts"])).optional(),
  spiceLevel: z.enum(["mild", "medium", "hot"]).optional(),
  ingredients: z.array(recipeIngredientSchema).default([]),
  variantGroups: z.array(variantGroupSchema).optional().default([]),
  modifierGroups: z.array(modifierGroupSchema).optional().default([]),
  isAvailable: z.boolean().default(true),
  isOutOfStock: z.boolean().default(false),
  prepStation: z.enum(["grill", "tandoor", "bar", "dessert", "main-kitchen"]).default("main-kitchen"),
  avgPrepTimeMinutes: z.number().int().positive().optional(),
});

// Customer Session Creation
export const customerSessionSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  mobileNumber: z.string().min(10, "Mobile number must be at least 10 digits"),
  restaurantId: z.string().min(1, "Restaurant ID is required"),
  tableId: z.string().min(1, "Table ID is required"),
});

// Order Creation
export const orderItemInputSchema = z.object({
  menuItemId: z.string().min(1, "MenuItem ID is required"),
  quantity: z.number().int().positive("Quantity must be at least 1"),
  specialInstructions: z.string().optional(),
  selectedVariant: selectedVariantSchema.optional(),
  selectedVariants: z.array(selectedVariantSchema).optional(),
  selectedModifiers: z.array(selectedModifierSchema).optional(),
});

export const orderCreateSchema = z.object({
  tableId: z.string().min(1, "Table ID is required"),
  tableSessionId: z.string().optional(),
  customerId: z.string().optional(),
  items: z.array(orderItemInputSchema).min(1, "At least one item is required to place an order"),
  notes: z.string().optional(),
});

export const orderEditSchema = z.object({
  items: z.array(orderItemInputSchema).min(1, "At least one item is required"),
  notes: z.string().optional(),
});


// Table Session Close
export const tableSessionCloseSchema = z.object({
  notes: z.string().optional(),
});

export const CANCELLATION_REASONS = [
  "customer changed mind",
  "kitchen out of stock",
  "made in error",
  "item spoiled / quality issue",
  "long wait time",
  "other",
] as const;

export const cancellationReasonSchema = z
  .string({
    required_error: "Cancellation reason is required",
    invalid_type_error: "Cancellation reason must be a string",
  })
  .min(1, "Cancellation reason is required");

// Order Item Cancel
export const orderItemCancelSchema = z.object({
  menuItemId: z.string().optional(),
  itemIndex: z.number().int().nonnegative().optional(),
  reason: cancellationReasonSchema,
  note: z.string().optional(),
});

// Whole Order Cancel
export const orderCancelSchema = z.object({
  reason: cancellationReasonSchema,
  note: z.string().optional(),
});

// Order Status Transitions
export const orderStatusUpdateSchema = z.object({
  status: z.enum(["placed", "confirmed", "preparing", "ready", "served", "billed", "cancelled"]),
  reason: z.string().optional(),
  note: z.string().optional(),
});

// Audit Log Query
export const auditLogQuerySchema = z.object({
  staffId: z.string().optional(),
  action: z.string().optional(),
  entityType: z.string().optional(),
  limit: z.coerce.number().int().positive().optional(),
  page: z.coerce.number().int().positive().optional(),
});

// KOT Status Update
export const kotStatusUpdateSchema = z.object({
  status: z.enum(["new", "in_progress", "ready", "acknowledged"]),
});

// Bill generation & settlement
export const billSettlementSchema = z.object({
  paymentStatus: z.enum(["pending", "settled_externally"]),
});

// Lead (contact form)
export const leadCreateSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  restaurantName: z.string().min(2, "Restaurant Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  message: z.string().min(5, "Message must be at least 5 characters"),
});

// Order Rating
export const dishRatingSchema = z.object({
  menuItemId: z.string().min(1, "MenuItem ID is required"),
  rating: z.number().int().min(1).max(5, "Rating must be between 1 and 5"),
  tags: z.array(z.string()).optional(),
  comment: z.string().optional(),
});

export const orderRatingCreateSchema = z.object({
  overallRating: z.number().int().min(1).max(5, "Overall rating must be between 1 and 5"),
  overallComment: z.string().optional(),
  dishRatings: z.array(dishRatingSchema).default([]),
});
