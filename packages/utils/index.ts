/**
 * Formats a numeric amount as currency (defaulting to USD / standard format)
 */
export function formatCurrency(amount: number, locale = "en-US", currency = "USD"): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currency,
  }).format(amount);
}

/**
 * Formats a date string or Date object to a readable string representation
 */
export function formatDate(date: string | Date, includeTime = true): string {
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "Invalid Date";
  
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    ...(includeTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}

/**
 * Generates an URL-friendly slug from a text string (e.g., "Cafe Coffee Day" -> "cafe-coffee-day")
 */
export function generateSlug(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-") // Replace spaces with -
    .replace(/[^\w\-]+/g, "") // Remove all non-word chars
    .replace(/\-\-+/g, "-") // Replace multiple - with single -
    .replace(/^-+/, "") // Trim - from start of text
    .replace(/-+$/, ""); // Trim - from end of text
}

interface ItemInput {
  price: number;
  quantity: number;
}

/**
 * Calculates subtotals, tax (5%), service charge (optional, e.g. 10%), and total.
 */
export function calculateOrderTotals(
  items: ItemInput[],
  taxRatePercent = 5,
  serviceChargePercent = 0
) {
  const subtotal = items.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const tax = Math.round(subtotal * (taxRatePercent / 100) * 100) / 100;
  const serviceCharge = Math.round(subtotal * (serviceChargePercent / 100) * 100) / 100;
  const total = Math.round((subtotal + tax + serviceCharge) * 100) / 100;

  return {
    subtotal,
    tax,
    serviceCharge,
    total,
  };
}

export interface CustomizationValidationResult {
  canAddToCart: boolean;
  missingVariantGroups: string[];
  unitPrice: number;
}

export interface CustomizationItemInput {
  price: number;
  variantGroups?: {
    name: string;
    options: { name: string; priceDelta: number }[];
  }[];
  modifierGroups?: {
    name: string;
    multiSelect: boolean;
    options: { name: string; priceDelta: number }[];
  }[];
}

export interface CartKeyItemInput {
  menuItemId: string;
  selectedVariant?: { groupName?: string; optionName: string };
  selectedVariants?: { groupName?: string; optionName: string }[];
  selectedModifiers?: { groupName?: string; optionName: string }[];
  specialInstructions?: string;
}

/**
 * Validates whether all required variant groups have an option selected,
 * and calculates the customized unit price with variant & modifier deltas.
 */
export function validateAndComputeItemCustomization(
  item: CustomizationItemInput,
  selectedVariants: Record<string, { priceDelta?: number }>,
  selectedModifiers: { priceDelta?: number }[]
): CustomizationValidationResult {
  const missingVariantGroups: string[] = [];

  if (item.variantGroups && item.variantGroups.length > 0) {
    for (const vg of item.variantGroups) {
      if (vg.options && vg.options.length > 0 && !selectedVariants[vg.name]) {
        missingVariantGroups.push(vg.name);
      }
    }
  }

  let unitPrice = item.price;
  for (const v of Object.values(selectedVariants)) {
    if (v) unitPrice += v.priceDelta || 0;
  }
  for (const m of selectedModifiers) {
    if (m) unitPrice += m.priceDelta || 0;
  }

  unitPrice = Math.max(0, Math.round(unitPrice * 100) / 100);

  return {
    canAddToCart: missingVariantGroups.length === 0,
    missingVariantGroups,
    unitPrice,
  };
}

/**
 * Produces a deterministic key identifying a specific customization of a menu item.
 */
export function getCartItemKey(item: CartKeyItemInput): string {
  const variants = item.selectedVariants || (item.selectedVariant ? [item.selectedVariant] : []);
  const vKey = variants.map((v) => `${v.groupName || ""}:${v.optionName}`).sort().join("|");
  const mKey = (item.selectedModifiers || []).map((m) => `${m.groupName || ""}:${m.optionName}`).sort().join("|");
  return `${item.menuItemId}__v[${vKey}]__m[${mKey}]__notes[${item.specialInstructions || ""}]`;
}

export interface SharedCartItem {
  id?: string;
  menuItemId: string;
  name: string;
  price: number;
  basePrice?: number;
  quantity: number;
  specialInstructions?: string;
  imageUrl?: string;
  selectedVariant?: { groupName?: string; optionName: string; priceDelta?: number; ingredientOverrides?: any[] };
  selectedVariants?: { groupName?: string; optionName: string; priceDelta?: number; ingredientOverrides?: any[] }[];
  selectedModifiers?: { groupName?: string; optionName: string; priceDelta?: number; ingredients?: any[] }[];
}

export function addToCartList(
  currentItems: SharedCartItem[],
  item: Omit<SharedCartItem, "quantity"> & { quantity?: number }
): SharedCartItem[] {
  const key = item.id || getCartItemKey(item);
  const existing = currentItems.find((i) => (i.id || getCartItemKey(i)) === key);

  if (existing) {
    return currentItems.map((i) =>
      (i.id || getCartItemKey(i)) === key
        ? { ...i, quantity: i.quantity + (item.quantity || 1) }
        : i
    );
  }

  return [
    ...currentItems,
    {
      ...item,
      id: key,
      quantity: item.quantity || 1,
    },
  ];
}

export function removeFromCartList(currentItems: SharedCartItem[], idOrMenuItemId: string): SharedCartItem[] {
  return currentItems.filter(
    (i) => i.id !== idOrMenuItemId && i.menuItemId !== idOrMenuItemId
  );
}

export function updateCartItemQuantity(
  currentItems: SharedCartItem[],
  idOrMenuItemId: string,
  quantity: number
): SharedCartItem[] {
  if (quantity <= 0) {
    return removeFromCartList(currentItems, idOrMenuItemId);
  }
  return currentItems.map((i) =>
    i.id === idOrMenuItemId || i.menuItemId === idOrMenuItemId
      ? { ...i, quantity }
      : i
  );
}

export function updateCartItemInstructions(
  currentItems: SharedCartItem[],
  idOrMenuItemId: string,
  specialInstructions: string
): SharedCartItem[] {
  return currentItems.map((i) =>
    i.id === idOrMenuItemId || i.menuItemId === idOrMenuItemId
      ? { ...i, specialInstructions }
      : i
  );
}


