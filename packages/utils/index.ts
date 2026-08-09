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
