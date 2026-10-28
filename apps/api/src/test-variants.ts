import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { RestaurantModel } from "./models/Restaurant";
import { TableModel } from "./models/Table";
import { CustomerModel } from "./models/Customer";
import { OrderModel } from "./models/Order";
import { MenuItemModel } from "./models/MenuItem";
import { IngredientModel } from "./models/Ingredient";
import { StaffUserModel } from "./models/StaffUser";
import { TableSessionModel } from "./models/TableSession";
import { BillModel } from "./models/Bill";
import { KOTModel } from "./models/KOT";
import { CategoryModel } from "./models/Category";

import * as orderCtrl from "./controllers/order.controller";
import * as billCtrl from "./controllers/bill.controller";

const mockResponse = () => {
  const res: any = {};
  res.statusCode = 200;
  res.status = (code: number) => {
    res.statusCode = code;
    return res;
  };
  res.json = (data: any) => {
    res.body = data;
    return res;
  };
  return res;
};

async function runVariantsAndModifiersTests() {
  console.log("Starting in-memory MongoDB server for testing...");
  const mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  console.log("Connected to in-memory test database at:", uri);
  await mongoose.connect(uri);

  try {
    console.log("\n=======================================================");
    console.log("  SETTING UP TEST RESTAURANT, DISH, VARIANTS & MODIFIERS");
    console.log("=======================================================");

    const restaurant = await RestaurantModel.create({
      name: "Burger Craft Co.",
      slug: "burger-craft-co",
      address: "100 Artisan Way",
      contactPhone: "555-0199",
      contactEmail: "admin@burgercraft.com",
      subscriptionPlan: "pro",
      isActive: true,
      tableSessionTimeoutMinutes: 180,
    });

    const staffMember = await StaffUserModel.create({
      restaurantId: restaurant._id,
      name: "Chef Mario",
      email: "mario@burgercraft.com",
      passwordHash: "secure_hash",
      role: "chef",
      isActive: true,
    });

    const table = await TableModel.create({
      restaurantId: restaurant._id,
      label: "Table B4",
      capacity: 4,
      location: "Patio",
      qrToken: "token_patio_b4",
      qrCodeUrl: "url_patio_b4",
      status: "occupied",
    });

    const customer = await CustomerModel.create({
      restaurantId: restaurant._id,
      name: "Gordon Ramsay",
      mobileNumber: "9876543210",
      visitCount: 1,
      totalSpend: 0,
      lastVisitAt: new Date(),
    });

    const session = await TableSessionModel.create({
      restaurantId: restaurant._id,
      tableId: table._id,
      customers: [customer._id],
      status: "active",
      openedAt: new Date(),
      lastActivityAt: new Date(),
    });

    table.currentSessionId = session._id as any;
    await table.save();

    // Create 4 Ingredients with 100 stock each
    const bun = await IngredientModel.create({
      restaurantId: restaurant._id,
      name: "Brioche Bun",
      unit: "pcs",
      currentStock: 100,
      lowStockThreshold: 10,
    });

    const patty = await IngredientModel.create({
      restaurantId: restaurant._id,
      name: "Beef Patty",
      unit: "pcs",
      currentStock: 100,
      lowStockThreshold: 10,
    });

    const cheese = await IngredientModel.create({
      restaurantId: restaurant._id,
      name: "Cheddar Cheese Slice",
      unit: "pcs",
      currentStock: 100,
      lowStockThreshold: 10,
    });

    const bacon = await IngredientModel.create({
      restaurantId: restaurant._id,
      name: "Crispy Bacon Strip",
      unit: "pcs",
      currentStock: 100,
      lowStockThreshold: 10,
    });

    const category = await CategoryModel.create({
      restaurantId: restaurant._id,
      name: "Burgers",
      order: 1,
    });

    // Create MenuItem: Base Price $10.00
    // Base recipe: 1 Bun, 1 Patty, 1 Cheese
    // Variant Group: "Size"
    //   - "Regular": priceDelta: 0 (uses base 1 Patty)
    //   - "Double (Extra Patty)": priceDelta: +4.00 (ingredientOverrides: Patty = 2 pcs)
    // Modifier Group: "Add-ons" (multiSelect: true)
    //   - "Extra Cheese": priceDelta: +1.50 (additionalIngredients: Cheese = 1 pcs)
    //   - "Crispy Bacon": priceDelta: +2.00 (additionalIngredients: Bacon = 2 pcs)
    const burgerItem = await MenuItemModel.create({
      restaurantId: restaurant._id,
      categoryId: category._id,
      name: "Signature Gourmet Burger",
      description: "Juicy handcrafted beef patty with artisan cheddar on toasted brioche.",
      price: 10.0,
      ingredients: [
        { ingredientId: bun._id, quantity: 1, unit: "pcs" },
        { ingredientId: patty._id, quantity: 1, unit: "pcs" },
        { ingredientId: cheese._id, quantity: 1, unit: "pcs" },
      ],
      variantGroups: [
        {
          name: "Size",
          options: [
            {
              name: "Regular",
              priceDelta: 0,
              ingredientOverrides: [],
            },
            {
              name: "Double (Extra Patty)",
              priceDelta: 4.0,
              ingredientOverrides: [{ ingredientId: patty._id, quantity: 2, unit: "pcs" }],
            },
          ],
        },
      ],
      modifierGroups: [
        {
          name: "Add-ons",
          multiSelect: true,
          options: [
            {
              name: "Extra Cheese",
              priceDelta: 1.5,
              ingredients: [{ ingredientId: cheese._id, quantity: 1, unit: "pcs" }],
            },
            {
              name: "Crispy Bacon",
              priceDelta: 2.0,
              ingredients: [{ ingredientId: bacon._id, quantity: 2, unit: "pcs" }],
            },
          ],
        },
      ],
      isAvailable: true,
      isOutOfStock: false,
      prepStation: "grill",
    });

    console.log("✓ Created dish with base price $10.00, Size variant group, and Add-ons modifier group");

    // =========================================================================
    // TEST 1: Required variant cannot be ordered without selecting one
    // =========================================================================
    console.log("\n[Test 1] Attempting to order dish WITHOUT selecting required 'Size' variant...");
    const req1: any = {
      params: { restaurantId: restaurant._id.toString() },
      customer: { restaurantId: restaurant._id.toString(), tableSessionId: session._id.toString() },
      body: {
        tableId: table._id.toString(),
        customerId: customer._id.toString(),
        tableSessionId: session._id.toString(),
        items: [
          {
            menuItemId: burgerItem._id.toString(),
            quantity: 1,
            // Notice: No selectedVariant or selectedVariants provided!
          },
        ],
      },
    };
    const res1 = mockResponse();
    await orderCtrl.createOrder(req1, res1);

    if (res1.statusCode !== 400 || !res1.body.message.includes("Variant selection required")) {
      throw new Error(`Test 1 Failed: Expected HTTP 400 with 'Variant selection required', got status ${res1.statusCode}: ${JSON.stringify(res1.body)}`);
    }
    console.log("✓ Test 1 Passed: Order rejected when required variant is not selected:", res1.body.message);

    // =========================================================================
    // TEST 2: Ordering a dish with a variant and two modifiers computes price correctly
    // =========================================================================
    console.log("\n[Test 2] Ordering dish with Variant ('Double') + 2 Modifiers ('Extra Cheese', 'Crispy Bacon') x Qty 2...");
    // Expected unit price:
    // Base: $10.00
    // Variant Double: +$4.00
    // Modifier Extra Cheese: +$1.50
    // Modifier Crispy Bacon: +$2.00
    // Total Unit Price = $17.50
    // For 2 items: Subtotal = 2 * 17.50 = $35.00
    // Tax (5%): $1.75
    // Total: $36.75
    const req2: any = {
      params: { restaurantId: restaurant._id.toString() },
      customer: { restaurantId: restaurant._id.toString(), tableSessionId: session._id.toString() },
      body: {
        tableId: table._id.toString(),
        customerId: customer._id.toString(),
        tableSessionId: session._id.toString(),
        items: [
          {
            menuItemId: burgerItem._id.toString(),
            quantity: 2,
            specialInstructions: "Well done, no mustard",
            selectedVariant: {
              groupName: "Size",
              optionName: "Double (Extra Patty)",
            },
            selectedModifiers: [
              { groupName: "Add-ons", optionName: "Extra Cheese" },
              { groupName: "Add-ons", optionName: "Crispy Bacon" },
            ],
          },
        ],
      },
    };
    const res2 = mockResponse();
    await orderCtrl.createOrder(req2, res2);

    if (res2.statusCode !== 201) {
      throw new Error(`Test 2 Failed: Could not create order, got status ${res2.statusCode}: ${JSON.stringify(res2.body)}`);
    }

    const order = res2.body;
    const orderItem = order.items[0];

    console.log("  Order placed successfully. ID:", order._id);
    console.log(`  Snapshotted Item Price: $${orderItem.price} (Expected: $17.50)`);
    console.log(`  Subtotal: $${order.subtotal} (Expected: $35.00)`);
    console.log(`  Tax: $${order.tax} (Expected: $1.75)`);
    console.log(`  Total: $${order.total} (Expected: $36.75)`);

    if (orderItem.price !== 17.5) {
      throw new Error(`Test 2 Failed: Expected snapshotted item price 17.5, got ${orderItem.price}`);
    }
    if (order.subtotal !== 35.0) {
      throw new Error(`Test 2 Failed: Expected subtotal 35.0, got ${order.subtotal}`);
    }
    if (order.tax !== 1.75) {
      throw new Error(`Test 2 Failed: Expected tax 1.75, got ${order.tax}`);
    }
    if (order.total !== 36.75) {
      throw new Error(`Test 2 Failed: Expected total 36.75, got ${order.total}`);
    }
    if (!orderItem.selectedVariant || orderItem.selectedVariant.optionName !== "Double (Extra Patty)") {
      throw new Error("Test 2 Failed: selectedVariant was not snapshotted correctly");
    }
    if (orderItem.selectedVariant.priceDelta !== 4.0) {
      throw new Error(`Test 2 Failed: selectedVariant priceDelta expected 4.0, got ${orderItem.selectedVariant.priceDelta}`);
    }
    if (orderItem.selectedModifiers.length !== 2) {
      throw new Error(`Test 2 Failed: Expected 2 snapshotted modifiers, got ${orderItem.selectedModifiers.length}`);
    }
    console.log("✓ Test 2 Passed: Dish with variant and two modifiers computed price and snapshotted selections accurately!");

    // =========================================================================
    // TEST 3: Confirming order deducts the right combined ingredient quantities
    // =========================================================================
    console.log("\n[Test 3] Confirming order -> verifying inventory deduction for variant override + modifiers...");
    // Expected combined consumption per unit:
    // - Brioche Bun: 1 (base)
    // - Beef Patty: 2 (variant 'Double' overrides base 1 to 2!)
    // - Cheddar Cheese: 1 (base) + 1 (Extra Cheese modifier) = 2
    // - Crispy Bacon: 0 (base) + 2 (Crispy Bacon modifier) = 2
    // Total for Quantity 2:
    // - Bun: 2 * 1 = 2 -> Stock: 100 - 2 = 98
    // - Patty: 2 * 2 = 4 -> Stock: 100 - 4 = 96
    // - Cheese: 2 * 2 = 4 -> Stock: 100 - 4 = 96
    // - Bacon: 2 * 2 = 4 -> Stock: 100 - 4 = 96
    const req3: any = {
      params: { id: order._id.toString() },
      user: { restaurantId: restaurant._id.toString(), role: "chef" },
      body: { status: "confirmed" },
    };
    const res3 = mockResponse();
    await orderCtrl.updateOrderStatus(req3, res3);

    if (res3.statusCode !== 200) {
      throw new Error(`Test 3 Failed: Confirming order failed: ${JSON.stringify(res3.body)}`);
    }

    const bunAfter = await IngredientModel.findById(bun._id);
    const pattyAfter = await IngredientModel.findById(patty._id);
    const cheeseAfter = await IngredientModel.findById(cheese._id);
    const baconAfter = await IngredientModel.findById(bacon._id);

    console.log(`  Bun Stock: ${bunAfter?.currentStock} (Expected: 98)`);
    console.log(`  Patty Stock: ${pattyAfter?.currentStock} (Expected: 96, overridden by Double variant)`);
    console.log(`  Cheese Stock: ${cheeseAfter?.currentStock} (Expected: 96, 1 base + 1 modifier x 2)`);
    console.log(`  Bacon Stock: ${baconAfter?.currentStock} (Expected: 96, 2 modifier x 2)`);

    if (bunAfter?.currentStock !== 98) {
      throw new Error(`Test 3 Failed: Bun stock expected 98, got ${bunAfter?.currentStock}`);
    }
    if (pattyAfter?.currentStock !== 96) {
      throw new Error(`Test 3 Failed: Patty stock expected 96 (override accounted for), got ${pattyAfter?.currentStock}`);
    }
    if (cheeseAfter?.currentStock !== 96) {
      throw new Error(`Test 3 Failed: Cheese stock expected 96, got ${cheeseAfter?.currentStock}`);
    }
    if (baconAfter?.currentStock !== 96) {
      throw new Error(`Test 3 Failed: Bacon stock expected 96, got ${baconAfter?.currentStock}`);
    }
    console.log("✓ Test 3 Passed: Inventory deduction accounted for base ingredients, variant overrides, and modifier add-ons combined!");

    // =========================================================================
    // TEST 4: KOT ticket includes variant and modifier details
    // =========================================================================
    console.log("\n[Test 4] Verifying KOT ticket generated for Kitchen Display System (KDS)...");
    const kotTickets = await KOTModel.find({ orderId: order._id });
    if (kotTickets.length === 0) {
      throw new Error("Test 4 Failed: No KOT ticket found for confirmed order");
    }

    const kot = kotTickets[0];
    const kotItem = kot.items[0];

    console.log(`  KOT Table: ${kot.tableLabel}`);
    console.log(`  KOT Station: ${kot.station} (routed to grill)`);
    console.log(`  Item: ${kotItem.menuItemName} x${kotItem.quantity}`);
    console.log(`  Variant: ${kotItem.selectedVariant?.groupName}: ${kotItem.selectedVariant?.optionName}`);
    console.log(`  Modifiers: ${kotItem.selectedModifiers?.map((m) => m.optionName).join(", ")}`);
    console.log(`  Instructions: ${kotItem.specialInstructions}`);

    if (kotItem.selectedVariant?.optionName !== "Double (Extra Patty)") {
      throw new Error("Test 4 Failed: KOT item does not contain the selected variant");
    }
    if (!kotItem.selectedModifiers || kotItem.selectedModifiers.length !== 2) {
      throw new Error("Test 4 Failed: KOT item does not contain the 2 selected modifiers");
    }
    console.log("✓ Test 4 Passed: KOT ticket successfully includes variant and modifiers for kitchen display!");

    // =========================================================================
    // TEST 5: Bill receipt includes snapshotted variant and modifiers
    // =========================================================================
    console.log("\n[Test 5] Generating bill receipt for the order session...");
    const req5: any = {
      params: { orderId: order._id.toString() },
      user: { restaurantId: restaurant._id.toString() },
    };
    const res5 = mockResponse();
    await billCtrl.generateBill(req5, res5);

    if (res5.statusCode !== 200 && res5.statusCode !== 201) {
      throw new Error(`Test 5 Failed: Generating bill failed: ${JSON.stringify(res5.body)}`);
    }

    const bill = res5.body;
    const billItem = bill.items[0];

    console.log(`  Bill Total: $${bill.total}`);
    console.log(`  Bill Item: ${billItem.name} x${billItem.quantity} @ $${billItem.price}`);
    console.log(`  Bill Variant: ${billItem.selectedVariant?.optionName}`);
    console.log(`  Bill Modifiers: ${billItem.selectedModifiers?.map((m: any) => m.optionName).join(", ")}`);

    if (bill.total !== 36.75) {
      throw new Error(`Test 5 Failed: Bill total expected 36.75, got ${bill.total}`);
    }
    if (billItem.selectedVariant?.optionName !== "Double (Extra Patty)") {
      throw new Error("Test 5 Failed: Bill item does not contain variant snapshot");
    }
    console.log("✓ Test 5 Passed: Consolidated bill maintains snapshot of variant and modifiers!");

    // =========================================================================
    // TEST 6: Item cancellation restores combined inventory
    // =========================================================================
    console.log("\n[Test 6] Cancelling the item -> verifying stock is restored back to 100...");
    const req6: any = {
      params: { orderId: order._id.toString(), itemId: orderItem._id.toString() },
      user: { restaurantId: restaurant._id.toString() },
      body: { reason: "Customer requested change" },
    };
    const res6 = mockResponse();
    await orderCtrl.cancelOrderItem(req6, res6);

    if (res6.statusCode !== 200) {
      throw new Error(`Test 6 Failed: Cancel item failed: ${JSON.stringify(res6.body)}`);
    }

    const bunRestored = await IngredientModel.findById(bun._id);
    const pattyRestored = await IngredientModel.findById(patty._id);
    const cheeseRestored = await IngredientModel.findById(cheese._id);
    const baconRestored = await IngredientModel.findById(bacon._id);

    console.log(`  Restored Bun Stock: ${bunRestored?.currentStock} (Expected: 100)`);
    console.log(`  Restored Patty Stock: ${pattyRestored?.currentStock} (Expected: 100)`);
    console.log(`  Restored Cheese Stock: ${cheeseRestored?.currentStock} (Expected: 100)`);
    console.log(`  Restored Bacon Stock: ${baconRestored?.currentStock} (Expected: 100)`);

    if (bunRestored?.currentStock !== 100 || pattyRestored?.currentStock !== 100 || cheeseRestored?.currentStock !== 100 || baconRestored?.currentStock !== 100) {
      throw new Error("Test 6 Failed: Stock was not restored accurately to 100 after item cancellation");
    }
    console.log("✓ Test 6 Passed: Item cancellation accurately restored combined inventory stock!");

    console.log("\n=======================================================");
    console.log("  ALL VARIANT AND MODIFIER BACKEND TESTS PASSED (6/6)!");
    console.log("=======================================================\n");
  } finally {
    await mongoose.disconnect();
    await mongoServer.stop();
  }
}

runVariantsAndModifiersTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
