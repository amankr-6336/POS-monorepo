import { OrderItem } from "@pos/types";
import { MenuItemModel } from "../models/MenuItem";
import { IngredientModel } from "../models/Ingredient";

export const PREDEFINED_CANCELLATION_REASONS = [
  "customer changed mind",
  "kitchen out of stock",
  "made in error",
  "item spoiled / quality issue",
  "long wait time",
  "other",
] as const;

export type PredefinedCancellationReason = (typeof PREDEFINED_CANCELLATION_REASONS)[number];

/**
 * Combines dish base recipe ingredients, variant overrides, and modifier additions
 * into a single Map of ingredientId -> quantity required per 1 unit of the dish.
 */
export function getCombinedIngredientsForItem(
  baseIngredients: { ingredientId: any; quantity: number; unit?: string }[],
  selectedVariants?: { ingredientOverrides?: { ingredientId: any; quantity: number }[] }[],
  selectedModifiers?: { ingredients?: { ingredientId: any; quantity: number }[] }[]
): Map<string, number> {
  const map = new Map<string, number>();

  // 1. Base recipe ingredients
  if (baseIngredients && baseIngredients.length > 0) {
    for (const ing of baseIngredients) {
      if (ing && ing.ingredientId) {
        const idStr = ing.ingredientId._id ? ing.ingredientId._id.toString() : ing.ingredientId.toString();
        map.set(idStr, ing.quantity || 0);
      }
    }
  }

  // 2. Variant ingredient overrides
  if (selectedVariants && selectedVariants.length > 0) {
    for (const v of selectedVariants) {
      if (v.ingredientOverrides && v.ingredientOverrides.length > 0) {
        for (const override of v.ingredientOverrides) {
          if (override && override.ingredientId) {
            const idStr = override.ingredientId._id
              ? override.ingredientId._id.toString()
              : override.ingredientId.toString();
            // Override replaces the quantity for this ingredient
            map.set(idStr, override.quantity);
          }
        }
      }
    }
  }

  // 3. Modifier additional ingredients consumption
  if (selectedModifiers && selectedModifiers.length > 0) {
    for (const mod of selectedModifiers) {
      if (mod.ingredients && mod.ingredients.length > 0) {
        for (const modIng of mod.ingredients) {
          if (modIng && modIng.ingredientId) {
            const idStr = modIng.ingredientId._id
              ? modIng.ingredientId._id.toString()
              : modIng.ingredientId.toString();
            const curr = map.get(idStr) || 0;
            map.set(idStr, curr + (modIng.quantity || 0));
          }
        }
      }
    }
  }

  return map;
}

/**
 * Validates whether a provided reason matches one of the predefined cancellation reasons
 * or acceptable standardized synonyms.
 */
export function validateAndNormalizeReason(rawReason?: string): {
  isValid: boolean;
  reason?: string;
  error?: string;
} {
  if (!rawReason || typeof rawReason !== "string" || !rawReason.trim()) {
    return {
      isValid: false,
      error: "Cancellation reason is required",
    };
  }

  const normalized = rawReason.trim().toLowerCase();

  // Direct match with predefined reasons
  const directMatch = PREDEFINED_CANCELLATION_REASONS.find(
    (r) => r.toLowerCase() === normalized
  );
  if (directMatch) {
    return { isValid: true, reason: directMatch };
  }

  // Handle common aliases/synonyms gracefully
  if (
    normalized.includes("changed mind") ||
    normalized.includes("requested change") ||
    normalized.includes("customer change")
  ) {
    return { isValid: true, reason: "customer changed mind" };
  }
  if (
    normalized.includes("out of stock") ||
    normalized.includes("stock out") ||
    normalized.includes("unavailable")
  ) {
    return { isValid: true, reason: "kitchen out of stock" };
  }
  if (
    normalized.includes("error") ||
    normalized.includes("mistake") ||
    normalized.includes("accidental") ||
    normalized.includes("wrong item")
  ) {
    return { isValid: true, reason: "made in error" };
  }
  if (
    normalized.includes("spoil") ||
    normalized.includes("quality") ||
    normalized.includes("damaged")
  ) {
    return { isValid: true, reason: "item spoiled / quality issue" };
  }
  if (
    normalized.includes("wait") ||
    normalized.includes("delay") ||
    normalized.includes("too long")
  ) {
    return { isValid: true, reason: "long wait time" };
  }
  if (normalized === "other") {
    return { isValid: true, reason: "other" };
  }

  return {
    isValid: false,
    error: `Invalid cancellation reason "${rawReason}". Reason must be selected from predefined list: ${PREDEFINED_CANCELLATION_REASONS.join(", ")}`,
  };
}

/**
 * Reverses inventory deduction for a specific order item.
 * Mirrors the exact consumption math at order confirmation (base ingredients + variant overrides + modifiers)
 * and increments stock back into inventory atomically.
 */
export async function reverseItemInventory(
  item: OrderItem
): Promise<Array<{ ingredientId: string; name: string; quantityRestored: number; unit?: string }>> {
  const menuItem = await MenuItemModel.findById(item.menuItemId);
  const baseIngredients = menuItem?.ingredients || [];
  const variants =
    item.selectedVariants && item.selectedVariants.length > 0
      ? item.selectedVariants
      : item.selectedVariant
      ? [item.selectedVariant]
      : [];
  const modifiers = item.selectedModifiers || [];

  const combinedMap = getCombinedIngredientsForItem(baseIngredients, variants, modifiers);
  const restored: Array<{ ingredientId: string; name: string; quantityRestored: number; unit?: string }> = [];

  for (const [ingIdStr, perUnitQty] of combinedMap.entries()) {
    const totalQty = perUnitQty * (item.quantity || 1);
    const updatedIng = await IngredientModel.findByIdAndUpdate(
      ingIdStr,
      { $inc: { currentStock: totalQty } },
      { new: true }
    );
    if (updatedIng) {
      restored.push({
        ingredientId: ingIdStr,
        name: updatedIng.name,
        quantityRestored: totalQty,
        unit: updatedIng.unit,
      });
    }
  }

  return restored;
}
