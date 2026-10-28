import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { RestaurantModel } from "./models/Restaurant";
import { TableModel } from "./models/Table";
import { OrderModel } from "./models/Order";
import { MenuItemModel } from "./models/MenuItem";
import { IngredientModel } from "./models/Ingredient";
import { StaffUserModel } from "./models/StaffUser";
import { AuditLogModel } from "./models/AuditLog";
import { CategoryModel } from "./models/Category";
import { KOTModel } from "./models/KOT";

import * as orderCtrl from "./controllers/order.controller";
import * as auditCtrl from "./controllers/audit.controller";

const mockResponse = () => {
  const res: any = {};
  res.statusCode = 200;
  res.status = (code: number) => {
    res.statusCode = code;
    return res;
  };
  res.json = (data: any) => {
    res.body = data ? JSON.parse(JSON.stringify(data)) : data;
    return res;
  };
  return res;
};

async function runCancellationAndAuditTests() {
  console.log("Starting in-memory MongoDB server for Cancellation & Audit testing...");
  const mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  console.log("Connected to in-memory test database at:", uri);
  await mongoose.connect(uri);

  try {
    console.log("\n=======================================================");
    console.log("  SETTING UP TEST RESTAURANT, STAFF, INGREDIENTS & MENU ");
    console.log("=======================================================");

    const restaurant = await RestaurantModel.create({
      name: "The Royal Grill",
      slug: "the-royal-grill",
      address: "77 Crown Ave",
      contactPhone: "555-7788",
      contactEmail: "admin@royalgrill.com",
      subscriptionPlan: "pro",
      isActive: true,
    });

    const manager = await StaffUserModel.create({
      restaurantId: restaurant._id,
      name: "Manager Marcus",
      email: "marcus@royalgrill.com",
      passwordHash: "dummy_hash_pass",
      role: "manager",
      isActive: true,
    });

    const waiter = await StaffUserModel.create({
      restaurantId: restaurant._id,
      name: "Waiter Wendy",
      email: "wendy@royalgrill.com",
      passwordHash: "dummy_hash_pass",
      role: "waiter",
      isActive: true,
    });

    const table = await TableModel.create({
      restaurantId: restaurant._id,
      label: "Table 5",
      capacity: 4,
      location: "Indoor",
      qrToken: "test-token-table-5",
      qrCodeUrl: "http://example.com/qr",
      status: "occupied",
    });

    const category = await CategoryModel.create({
      restaurantId: restaurant._id,
      name: "Mains",
      order: 1,
      subcategories: [],
    });

    // Create 4 Ingredients with 100 stock each
    const bun = await IngredientModel.create({
      restaurantId: restaurant._id,
      name: "Brioche Bun",
      unit: "pcs",
      currentStock: 100,
      lowStockThreshold: 10,
    });

    const beefPatty = await IngredientModel.create({
      restaurantId: restaurant._id,
      name: "Angus Beef Patty",
      unit: "pcs",
      currentStock: 100,
      lowStockThreshold: 10,
    });

    const truffleCheese = await IngredientModel.create({
      restaurantId: restaurant._id,
      name: "Truffle Cheese",
      unit: "pcs",
      currentStock: 100,
      lowStockThreshold: 10,
    });

    const potatoes = await IngredientModel.create({
      restaurantId: restaurant._id,
      name: "Russet Potatoes",
      unit: "g",
      currentStock: 5000,
      lowStockThreshold: 500,
    });

    // Create customizable Burger:
    // Base recipe: 1 Bun, 1 Patty
    // Variant: "Double" -> overrides Patty = 2
    // Modifier: "Extra Truffle Cheese" -> adds 1 Truffle Cheese
    const burgerItem = await MenuItemModel.create({
      restaurantId: restaurant._id,
      categoryId: category._id,
      name: "Royal Truffle Burger",
      description: "Signature gourmet burger",
      price: 15.0,
      isAvailable: true,
      isOutOfStock: false,
      prepStation: "grill",
      ingredients: [
        { ingredientId: bun._id, quantity: 1, unit: "pcs" },
        { ingredientId: beefPatty._id, quantity: 1, unit: "pcs" },
      ],
      variantGroups: [
        {
          name: "Size",
          options: [
            { name: "Single", priceDelta: 0, ingredientOverrides: [] },
            {
              name: "Double",
              priceDelta: 5.0,
              ingredientOverrides: [{ ingredientId: beefPatty._id, quantity: 2, unit: "pcs" }],
            },
          ],
        },
      ],
      modifierGroups: [
        {
          name: "Cheese Options",
          multiSelect: true,
          options: [
            {
              name: "Extra Truffle Cheese",
              priceDelta: 3.0,
              ingredients: [{ ingredientId: truffleCheese._id, quantity: 1, unit: "pcs" }],
            },
          ],
        },
      ],
    });

    // Create Fries:
    // Base recipe: 200g Potatoes
    const friesItem = await MenuItemModel.create({
      restaurantId: restaurant._id,
      categoryId: category._id,
      name: "Rustic Truffle Fries",
      description: "Crispy hand-cut fries",
      price: 6.0,
      isAvailable: true,
      isOutOfStock: false,
      prepStation: "grill",
      ingredients: [{ ingredientId: potatoes._id, quantity: 200, unit: "g" }],
      variantGroups: [],
      modifierGroups: [],
    });

    console.log("✓ Test setup completed: Restaurant, Staff, Tables, Ingredients, & Menu Items created.");

    // =========================================================================
    // TEST 1: Cancellation without a reason is rejected (400)
    // =========================================================================
    console.log("\n[Test 1] Attempting to cancel an item WITHOUT a reason...");

    // First, place an order with 2 Double Burgers and 1 Fries
    const reqOrder = {
      body: {
        tableId: table._id.toString(),
        items: [
          {
            menuItemId: burgerItem._id.toString(),
            quantity: 2,
            selectedVariants: [{ groupName: "Size", optionName: "Double", priceDelta: 5.0 }],
            selectedModifiers: [{ groupName: "Cheese Options", optionName: "Extra Truffle Cheese", priceDelta: 3.0 }],
          },
          {
            menuItemId: friesItem._id.toString(),
            quantity: 1,
          },
        ],
      },
      user: { id: waiter._id.toString(), restaurantId: restaurant._id.toString(), role: "waiter", name: waiter.name },
    } as any;
    const resOrder = mockResponse();
    await orderCtrl.createOrder(reqOrder, resOrder);

    const placedOrder = resOrder.body;
    console.log("  Order placed successfully. ID:", placedOrder._id);

    // Confirm order to trigger inventory deduction & KOT creation
    const reqConfirm = {
      params: { id: placedOrder._id.toString() },
      body: { status: "confirmed" },
      user: { id: manager._id.toString(), restaurantId: restaurant._id.toString(), role: "manager", name: manager.name },
    } as any;
    const resConfirm = mockResponse();
    await orderCtrl.updateOrderStatus(reqConfirm, resConfirm);
    console.log("  Order confirmed. Status:", resConfirm.body.status);

    // Verify stock deduction after confirmation:
    // 2 Double Burgers (1 Bun x 2 = 2, 2 Patties x 2 = 4, 1 Truffle Cheese x 2 = 2)
    // 1 Fries (200g Potatoes)
    const bunAfterConfirm = await IngredientModel.findById(bun._id);
    const pattyAfterConfirm = await IngredientModel.findById(beefPatty._id);
    const cheeseAfterConfirm = await IngredientModel.findById(truffleCheese._id);
    const potatoesAfterConfirm = await IngredientModel.findById(potatoes._id);

    if (
      bunAfterConfirm?.currentStock !== 98 ||
      pattyAfterConfirm?.currentStock !== 96 ||
      cheeseAfterConfirm?.currentStock !== 98 ||
      potatoesAfterConfirm?.currentStock !== 4800
    ) {
      throw new Error("Initial inventory deduction failed!");
    }
    console.log("  Inventory stock correctly deducted upon confirmation.");

    // Now test: cancel the Fries item without providing any reason
    const burgerOrderItem = placedOrder.items[0];
    const friesOrderItem = placedOrder.items[1];

    const reqCancelNoReason = {
      params: { id: placedOrder._id.toString(), itemId: friesOrderItem._id.toString() },
      body: {}, // Missing reason!
      user: { id: waiter._id.toString(), restaurantId: restaurant._id.toString(), role: "waiter", name: waiter.name },
    } as any;
    const resCancelNoReason = mockResponse();
    await orderCtrl.cancelOrderItem(reqCancelNoReason, resCancelNoReason);

    console.log("  Cancel response status:", resCancelNoReason.statusCode);
    console.log("  Cancel response body:", resCancelNoReason.body);

    if (resCancelNoReason.statusCode !== 400) {
      throw new Error(`Test 1 Failed: Expected status 400 for cancellation without reason, got ${resCancelNoReason.statusCode}`);
    }
    console.log("✓ Test 1 Passed: Cancellation without a reason was rejected with 400 Bad Request!");

    // =========================================================================
    // TEST 2: Cancellation with invalid/empty reason is rejected (400)
    // =========================================================================
    console.log("\n[Test 2] Attempting to cancel an item with invalid reason string...");
    const reqCancelInvalidReason = {
      params: { id: placedOrder._id.toString(), itemId: friesOrderItem._id.toString() },
      body: { reason: "   " }, // whitespace only!
      user: { id: waiter._id.toString(), restaurantId: restaurant._id.toString(), role: "waiter", name: waiter.name },
    } as any;
    const resCancelInvalidReason = mockResponse();
    await orderCtrl.cancelOrderItem(reqCancelInvalidReason, resCancelInvalidReason);

    if (resCancelInvalidReason.statusCode !== 400) {
      throw new Error(`Test 2 Failed: Expected status 400 for empty reason, got ${resCancelInvalidReason.statusCode}`);
    }

    const reqCancelBogus = {
      params: { id: placedOrder._id.toString(), itemId: friesOrderItem._id.toString() },
      body: { reason: "completely bogus reason 123456" },
      user: { id: waiter._id.toString(), restaurantId: restaurant._id.toString(), role: "waiter", name: waiter.name },
    } as any;
    const resCancelBogus = mockResponse();
    await orderCtrl.cancelOrderItem(reqCancelBogus, resCancelBogus);

    if (resCancelBogus.statusCode !== 400) {
      throw new Error(`Test 2 Failed: Expected status 400 for bogus reason, got ${resCancelBogus.statusCode}`);
    }
    console.log("✓ Test 2 Passed: Cancellation with empty or non-predefined reason was rejected!");

    // =========================================================================
    // TEST 3: Cancelling an item with valid reason reverses inventory correctly
    // =========================================================================
    console.log("\n[Test 3] Cancelling confirmed item (Burger x2 with Double variant & Extra Cheese)...");
    // Cancelling 2 Double Burgers should restore:
    // +2 Buns (98 -> 100)
    // +4 Patties (96 -> 100)
    // +2 Truffle Cheese (98 -> 100)
    // Potatoes should stay at 4800 (Fries not cancelled yet)
    const reqCancelBurger = {
      params: { id: placedOrder._id.toString(), itemId: burgerOrderItem._id.toString() },
      body: {
        reason: "customer changed mind",
        note: "Customer decided on salad instead",
      },
      user: { id: waiter._id.toString(), restaurantId: restaurant._id.toString(), role: "waiter", name: waiter.name },
    } as any;
    const resCancelBurger = mockResponse();
    await orderCtrl.cancelOrderItem(reqCancelBurger, resCancelBurger);

    if (resCancelBurger.statusCode !== 200) {
      throw new Error(`Test 3 Failed: Cancelling burger item failed: ${JSON.stringify(resCancelBurger.body)}`);
    }

    const bunAfterCancel = await IngredientModel.findById(bun._id);
    const pattyAfterCancel = await IngredientModel.findById(beefPatty._id);
    const cheeseAfterCancel = await IngredientModel.findById(truffleCheese._id);
    const potatoesAfterCancel = await IngredientModel.findById(potatoes._id);

    console.log(`  Restored Bun Stock: ${bunAfterCancel?.currentStock} (Expected: 100)`);
    console.log(`  Restored Patty Stock: ${pattyAfterCancel?.currentStock} (Expected: 100)`);
    console.log(`  Restored Cheese Stock: ${cheeseAfterCancel?.currentStock} (Expected: 100)`);
    console.log(`  Potatoes Stock: ${potatoesAfterCancel?.currentStock} (Expected: 4800)`);

    if (
      bunAfterCancel?.currentStock !== 100 ||
      pattyAfterCancel?.currentStock !== 100 ||
      cheeseAfterCancel?.currentStock !== 100 ||
      potatoesAfterCancel?.currentStock !== 4800
    ) {
      throw new Error("Test 3 Failed: Inventory stock was not correctly reversed for variant & modifier ingredients!");
    }
    console.log("✓ Test 3 Passed: Cancelling an item reversed base, variant override, and modifier stock accurately!");

    // =========================================================================
    // TEST 4: Single item cancellation writes a proper AuditLog document
    // =========================================================================
    console.log("\n[Test 4] Verifying AuditLog entry created for the cancelled burger item...");
    const burgerAuditEntry = await AuditLogModel.findOne({
      restaurantId: restaurant._id,
      action: "item_cancelled",
      entityType: "order_item",
      entityId: burgerOrderItem._id.toString(),
    });

    if (!burgerAuditEntry) {
      throw new Error("Test 4 Failed: No AuditLog entry found in database for cancelled item!");
    }

    console.log("  Audit Entry ID:", burgerAuditEntry._id);
    console.log("  Staff ID:", burgerAuditEntry.staffId?.toString(), "(Expected:", waiter._id.toString(), ")");
    console.log("  Action:", burgerAuditEntry.action, "(Expected: item_cancelled)");
    console.log("  Reason:", burgerAuditEntry.reason, "(Expected: customer changed mind)");
    console.log("  Note:", burgerAuditEntry.note, "(Expected: Customer decided on salad instead)");
    console.log("  Metadata restoredIngredients count:", burgerAuditEntry.metadata?.restoredIngredients?.length);

    if (
      burgerAuditEntry.staffId?.toString() !== waiter._id.toString() ||
      burgerAuditEntry.action !== "item_cancelled" ||
      burgerAuditEntry.reason !== "customer changed mind" ||
      burgerAuditEntry.note !== "Customer decided on salad instead" ||
      !burgerAuditEntry.metadata?.inventoryReversed
    ) {
      throw new Error("Test 4 Failed: AuditLog entry fields or metadata did not match expected values!");
    }
    console.log("✓ Test 4 Passed: Generic AuditLog entry accurately captured item cancellation with metadata!");

    // =========================================================================
    // TEST 5: Cancelling whole order without reason is rejected
    // =========================================================================
    console.log("\n[Test 5] Placing a new order and attempting whole-order cancellation without a reason...");
    const reqOrder2 = {
      body: {
        tableId: table._id.toString(),
        items: [{ menuItemId: friesItem._id.toString(), quantity: 2 }],
      },
      user: { id: waiter._id.toString(), restaurantId: restaurant._id.toString(), role: "waiter", name: waiter.name },
    } as any;
    const resOrder2 = mockResponse();
    await orderCtrl.createOrder(reqOrder2, resOrder2);
    const order2 = resOrder2.body;

    // Confirm order 2 (deducts 400g potatoes: 4800 -> 4400)
    const reqConfirm2 = {
      params: { id: order2._id.toString() },
      body: { status: "confirmed" },
      user: { id: manager._id.toString(), restaurantId: restaurant._id.toString(), role: "manager" },
    } as any;
    const resConfirm2 = mockResponse();
    await orderCtrl.updateOrderStatus(reqConfirm2, resConfirm2);

    const potatoesAfterOrder2 = await IngredientModel.findById(potatoes._id);
    console.log("  Potatoes stock after order 2 confirmation:", potatoesAfterOrder2?.currentStock, "(Expected: 4400)");

    // Attempt whole order cancel without reason via cancelOrder endpoint
    const reqCancelOrderNoReason = {
      params: { id: order2._id.toString() },
      body: {},
      user: { id: manager._id.toString(), restaurantId: restaurant._id.toString(), role: "manager", name: manager.name },
    } as any;
    const resCancelOrderNoReason = mockResponse();
    await orderCtrl.cancelOrder(reqCancelOrderNoReason, resCancelOrderNoReason);

    if (resCancelOrderNoReason.statusCode !== 400) {
      throw new Error(`Test 5 Failed: Expected 400 when cancelling order without reason, got ${resCancelOrderNoReason.statusCode}`);
    }
    console.log("✓ Test 5 Passed: Whole order cancellation without reason is rejected with 400 Bad Request!");

    // =========================================================================
    // TEST 6: Cancelling whole order with reason reverses inventory & creates audit entry
    // =========================================================================
    console.log("\n[Test 6] Cancelling whole order with valid reason ('kitchen out of stock')...");
    const reqCancelOrderValid = {
      params: { id: order2._id.toString() },
      body: {
        reason: "kitchen out of stock",
        note: "Fryer malfunction, kitchen unable to prepare fries",
      },
      user: { id: manager._id.toString(), restaurantId: restaurant._id.toString(), role: "manager", name: manager.name },
    } as any;
    const resCancelOrderValid = mockResponse();
    await orderCtrl.cancelOrder(reqCancelOrderValid, resCancelOrderValid);

    if (resCancelOrderValid.statusCode !== 200) {
      throw new Error(`Test 6 Failed: Whole order cancellation failed: ${JSON.stringify(resCancelOrderValid.body)}`);
    }

    // Check inventory stock reversed back (4400 + 400 = 4800)
    const potatoesAfterOrderCancel = await IngredientModel.findById(potatoes._id);
    console.log("  Potatoes stock after whole order cancellation:", potatoesAfterOrderCancel?.currentStock, "(Expected: 4800)");
    if (potatoesAfterOrderCancel?.currentStock !== 4800) {
      throw new Error("Test 6 Failed: Inventory was not reversed on whole order cancellation!");
    }

    // Verify AuditLog entry for order_cancelled
    const orderAuditEntry = await AuditLogModel.findOne({
      restaurantId: restaurant._id,
      action: "order_cancelled",
      entityId: order2._id.toString(),
    });

    if (!orderAuditEntry) {
      throw new Error("Test 6 Failed: No AuditLog entry found for order_cancelled!");
    }

    console.log("  Order Audit Action:", orderAuditEntry.action);
    console.log("  Order Audit Reason:", orderAuditEntry.reason);
    console.log("  Order Audit Staff:", orderAuditEntry.staffName);
    console.log("  Order Audit Restored Ingredients:", orderAuditEntry.metadata?.restoredIngredients?.length);

    if (
      orderAuditEntry.action !== "order_cancelled" ||
      orderAuditEntry.reason !== "kitchen out of stock" ||
      !orderAuditEntry.metadata?.inventoryReversed
    ) {
      throw new Error("Test 6 Failed: order_cancelled AuditLog details mismatch!");
    }
    console.log("✓ Test 6 Passed: Whole order cancellation reversed inventory and logged audit entry!");

    // =========================================================================
    // TEST 7: Query audit logs API and verify filtering by staff & action
    // =========================================================================
    console.log("\n[Test 7] Querying audit logs via admin endpoint with filters...");

    // 1. Fetch all audit logs for restaurant
    const reqAllLogs = {
      params: { id: restaurant._id.toString() },
      query: {},
      user: { id: manager._id.toString(), restaurantId: restaurant._id.toString(), role: "manager" },
    } as any;
    const resAllLogs = mockResponse();
    await auditCtrl.getAuditLogs(reqAllLogs, resAllLogs);

    console.log("  Total audit logs returned:", resAllLogs.body.total);
    if (resAllLogs.body.total < 2) {
      throw new Error("Test 7 Failed: Expected at least 2 audit logs!");
    }

    // 2. Filter by staff member (Waiter Wendy)
    const reqWendyLogs = {
      params: { id: restaurant._id.toString() },
      query: { staffId: waiter._id.toString() },
      user: { id: manager._id.toString(), restaurantId: restaurant._id.toString(), role: "manager" },
    } as any;
    const resWendyLogs = mockResponse();
    await auditCtrl.getAuditLogs(reqWendyLogs, resWendyLogs);

    console.log("  Audit logs for Waiter Wendy:", resWendyLogs.body.total);
    if (resWendyLogs.body.total !== 1 || resWendyLogs.body.auditLogs[0].action !== "item_cancelled") {
      throw new Error("Test 7 Failed: Filtering audit logs by staffId did not return expected entry!");
    }

    // 3. Filter by action type ('order_cancelled')
    const reqOrderCancelLogs = {
      params: { id: restaurant._id.toString() },
      query: { action: "order_cancelled" },
      user: { id: manager._id.toString(), restaurantId: restaurant._id.toString(), role: "manager" },
    } as any;
    const resOrderCancelLogs = mockResponse();
    await auditCtrl.getAuditLogs(reqOrderCancelLogs, resOrderCancelLogs);

    console.log("  Audit logs for action 'order_cancelled':", resOrderCancelLogs.body.total);
    if (resOrderCancelLogs.body.total !== 1 || resOrderCancelLogs.body.auditLogs[0].action !== "order_cancelled") {
      throw new Error("Test 7 Failed: Filtering audit logs by action did not return expected entry!");
    }
    console.log("✓ Test 7 Passed: Audit log query endpoint successfully filtered by staffId and action!");

    console.log("\n=======================================================");
    console.log("  ALL CANCELLATION & AUDIT LOG TESTS PASSED (7/7)!     ");
    console.log("=======================================================\n");
  } finally {
    await mongoose.disconnect();
    await mongoServer.stop();
  }
}

runCancellationAndAuditTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Test execution failed with error:", err);
    process.exit(1);
  });
