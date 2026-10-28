import { MenuItem, SelectedVariant, SelectedModifier } from "@pos/types";
import { validateAndComputeItemCustomization, getCartItemKey } from "@pos/utils";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ Assertion Failed: ${message}`);
    process.exit(1);
  }
}

interface CartItem {
  id?: string;
  menuItemId: string;
  name: string;
  price: number;
  basePrice?: number;
  quantity: number;
  specialInstructions?: string;
  imageUrl?: string;
  selectedVariant?: SelectedVariant;
  selectedVariants?: SelectedVariant[];
  selectedModifiers?: SelectedModifier[];
}

class CustomerCartManager {
  items: CartItem[] = [];

  clearCart() {
    this.items = [];
  }

  addToCart(item: Omit<CartItem, "quantity"> & { quantity?: number }) {
    const key = item.id || getCartItemKey(item);
    const existing = this.items.find((i) => (i.id || getCartItemKey(i)) === key);
    if (existing) {
      existing.quantity += item.quantity || 1;
    } else {
      this.items.push({
        ...item,
        id: key,
        quantity: item.quantity || 1,
      });
    }
  }
}

async function runCustomerCartTests() {
  console.log("=======================================================");
  console.log("  RUNNING CUSTOMER CART & VARIANT VALIDATION TESTS");
  console.log("=======================================================\n");

  const testMenuItem: MenuItem = {
    _id: "item_burger_123",
    restaurantId: "rest_1",
    categoryId: "cat_1",
    name: "Classic Cheeseburger",
    description: "Juicy beef burger with fresh toppings",
    price: 12.00,
    imageUrl: "https://example.com/burger.jpg",
    ingredients: [],
    isAvailable: true,
    isOutOfStock: false,
    avgPrepTimeMinutes: 15,
    dietaryTags: ["non-veg"],
    variantGroups: [
      {
        name: "Size",
        options: [
          { name: "Single Patty", priceDelta: 0 },
          { name: "Double Patty", priceDelta: 4.50 },
          { name: "Triple Monster", priceDelta: 8.00 },
        ],
      },
      {
        name: "Spice Level",
        options: [
          { name: "Mild", priceDelta: 0 },
          { name: "Medium", priceDelta: 0 },
          { name: "Fiery Hot", priceDelta: 0.50 },
        ],
      },
    ],
    modifierGroups: [
      {
        name: "Add-ons",
        multiSelect: true,
        options: [
          { name: "Extra Cheddar Cheese", priceDelta: 1.50 },
          { name: "Crispy Bacon Strips", priceDelta: 2.00 },
          { name: "Avocado Slices", priceDelta: 2.50 },
        ],
      },
    ],
  };

  // -------------------------------------------------------------------------
  // Test 1: Item with required variant cannot be added without selecting one
  // -------------------------------------------------------------------------
  console.log("[Test 1] Validating item when required variants are NOT selected...");
  const unselectedResult = validateAndComputeItemCustomization(
    testMenuItem,
    {}, // no variants selected
    []
  );

  assert(
    unselectedResult.canAddToCart === false,
    "Item with unselected variant should NOT be allowed to add to cart"
  );
  assert(
    unselectedResult.missingVariantGroups.includes("Size"),
    "Size variant group should be reported as missing"
  );
  assert(
    unselectedResult.missingVariantGroups.includes("Spice Level"),
    "Spice Level variant group should be reported as missing"
  );
  console.log("✓ Test 1 Passed: Item with required variant cannot be added to cart without selecting one (Missing: " + unselectedResult.missingVariantGroups.join(", ") + ")");

  // -------------------------------------------------------------------------
  // Test 2: Selecting variants satisfies validation and computes price
  // -------------------------------------------------------------------------
  console.log("\n[Test 2] Selecting variants ('Double Patty', 'Mild') and 2 modifiers ('Extra Cheddar Cheese', 'Crispy Bacon Strips')...");
  const selectedVariants: Record<string, SelectedVariant> = {
    Size: {
      groupName: "Size",
      optionName: "Double Patty",
      priceDelta: 4.50,
    },
    "Spice Level": {
      groupName: "Spice Level",
      optionName: "Mild",
      priceDelta: 0,
    },
  };

  const selectedModifiers: SelectedModifier[] = [
    {
      groupName: "Add-ons",
      optionName: "Extra Cheddar Cheese",
      priceDelta: 1.50,
    },
    {
      groupName: "Add-ons",
      optionName: "Crispy Bacon Strips",
      priceDelta: 2.00,
    },
  ];

  const customResult = validateAndComputeItemCustomization(
    testMenuItem,
    selectedVariants,
    selectedModifiers
  );

  assert(
    customResult.canAddToCart === true,
    "Item with all variants selected must be allowed to add to cart"
  );
  // Base $12.00 + Double Patty ($4.50) + Mild ($0) + Extra Cheese ($1.50) + Bacon ($2.00) = $20.00
  assert(
    customResult.unitPrice === 20.00,
    `Calculated price must be 20.00, received ${customResult.unitPrice}`
  );
  console.log(`✓ Test 2 Passed: Customization valid! Computed Unit Price: $${customResult.unitPrice.toFixed(2)} (Base $12 + $4.50 + $1.50 + $2.00)`);

  // -------------------------------------------------------------------------
  // Test 3: Cart Store composite keying and item segregation
  // -------------------------------------------------------------------------
  console.log("\n[Test 3] Adding customized item to cart store and verifying composite keys...");
  const cart = new CustomerCartManager();
  assert(cart.items.length === 0, "Cart must start empty");

  // Add Item 1: Double Patty + Extra Cheese + Bacon x Qty 2
  cart.addToCart({
    menuItemId: testMenuItem._id,
    name: testMenuItem.name,
    basePrice: testMenuItem.price,
    price: customResult.unitPrice,
    quantity: 2,
    selectedVariants: Object.values(selectedVariants),
    selectedVariant: selectedVariants.Size,
    selectedModifiers,
    specialInstructions: "Extra napkins please",
  });

  assert(cart.items.length === 1, "Cart should have 1 unique entry");
  assert(cart.items[0].quantity === 2, "Cart item quantity should be 2");
  assert(cart.items[0].price === 20.00, "Cart item price should be $20.00");

  // Add exact same customization again -> should increment quantity to 3
  cart.addToCart({
    menuItemId: testMenuItem._id,
    name: testMenuItem.name,
    basePrice: testMenuItem.price,
    price: customResult.unitPrice,
    quantity: 1,
    selectedVariants: Object.values(selectedVariants),
    selectedVariant: selectedVariants.Size,
    selectedModifiers,
    specialInstructions: "Extra napkins please",
  });

  assert(cart.items.length === 1, "Duplicate customization should merge into same line item");
  assert(cart.items[0].quantity === 3, "Merged quantity should be 3");
  console.log("✓ Test 3a Passed: Identical item customization merged properly into single line item (Qty: 3)");

  // Add Item 2: Same dish, but different variant ('Single Patty') and NO modifiers
  const singlePattyVariants: Record<string, SelectedVariant> = {
    Size: { groupName: "Size", optionName: "Single Patty", priceDelta: 0 },
    "Spice Level": { groupName: "Spice Level", optionName: "Mild", priceDelta: 0 },
  };
  const singleResult = validateAndComputeItemCustomization(
    testMenuItem,
    singlePattyVariants,
    []
  );
  assert(singleResult.unitPrice === 12.00, "Single patty without modifiers should be base price $12.00");

  cart.addToCart({
    menuItemId: testMenuItem._id,
    name: testMenuItem.name,
    basePrice: testMenuItem.price,
    price: singleResult.unitPrice,
    quantity: 1,
    selectedVariants: Object.values(singlePattyVariants),
    selectedVariant: singlePattyVariants.Size,
    selectedModifiers: [],
  });

  assert(cart.items.length === 2, "Different variant selection should create a distinct cart line item");
  assert(cart.items[0].price === 20.00, "First line item price intact ($20.00)");
  assert(cart.items[1].price === 12.00, "Second line item price is $12.00");

  const totalCartValue = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  // (3 * $20.00) + (1 * $12.00) = $72.00
  assert(totalCartValue === 72.00, `Total cart value should be $72.00, got ${totalCartValue}`);
  console.log(`✓ Test 3b Passed: Different variant configurations segregated cleanly into separate lines! Total Cart Value: $${totalCartValue.toFixed(2)}`);

  console.log("\n=======================================================");
  console.log("  ALL CUSTOMER CART & VARIANT TESTS PASSED (3/3)!");
  console.log("=======================================================");
}

runCustomerCartTests().catch((err) => {
  console.error("Test failed with error:", err);
  process.exit(1);
});
