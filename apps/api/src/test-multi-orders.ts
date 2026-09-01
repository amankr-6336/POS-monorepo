import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

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

import * as tableCtrl from "./controllers/table.controller";
import * as customerCtrl from "./controllers/customer.controller";
import * as orderCtrl from "./controllers/order.controller";
import * as billCtrl from "./controllers/bill.controller";
import * as sessionService from "./services/session.service";

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

async function runMultiOrderTests() {
  const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/pos";
  console.log("Connecting to test db at:", uri);
  await mongoose.connect(uri);

  try {
    console.log("\n--- Setting up Mock Test Entities ---");

    const restaurant = await RestaurantModel.create({
      name: "Multi Round Diner",
      slug: "multi-round-diner",
      address: "789 Broadway",
      contactPhone: "555-777-8888",
      contactEmail: "contact@multidiner.com",
      subscriptionPlan: "pro",
      isActive: true,
      tableSessionTimeoutMinutes: 180,
    });

    const staffMember = await StaffUserModel.create({
      restaurantId: restaurant._id,
      name: "Server Alice",
      email: "alice@multidiner.com",
      passwordHash: "secure_pass_123",
      role: "waiter",
      isActive: true,
    });

    const table1 = await TableModel.create({
      restaurantId: restaurant._id,
      label: "Table M1",
      capacity: 4,
      location: "Main Floor",
      qrToken: "token_m1_round",
      qrCodeUrl: "url_m1_round",
      status: "available",
    });

    const customer1 = await CustomerModel.create({
      restaurantId: restaurant._id,
      name: "David Diner",
      mobileNumber: "555-444-3333",
    });

    // Create ingredients with initial inventory stocks
    const cheeseIng = await IngredientModel.create({
      restaurantId: restaurant._id,
      name: "Mozzarella Cheese",
      unit: "g",
      currentStock: 1000,
      lowStockThreshold: 100,
    });

    const doughIng = await IngredientModel.create({
      restaurantId: restaurant._id,
      name: "Pizza Dough",
      unit: "pcs",
      currentStock: 50,
      lowStockThreshold: 5,
    });

    const coffeeBeansIng = await IngredientModel.create({
      restaurantId: restaurant._id,
      name: "Espresso Beans",
      unit: "g",
      currentStock: 500,
      lowStockThreshold: 50,
    });

    // Menu Item 1: Pizza (grill / main-kitchen)
    const pizzaItem = await MenuItemModel.create({
      restaurantId: restaurant._id,
      categoryId: new mongoose.Types.ObjectId(),
      name: "Margherita Pizza",
      description: "Classic pizza with mozzarella",
      price: 15.0,
      isAvailable: true,
      isOutOfStock: false,
      prepStation: "main-kitchen",
      ingredients: [
        { ingredientId: cheeseIng._id, quantity: 100, unit: "g" },
        { ingredientId: doughIng._id, quantity: 1, unit: "pcs" },
      ],
    });

    // Menu Item 2: Garlic Bread (grill)
    const garlicBreadItem = await MenuItemModel.create({
      restaurantId: restaurant._id,
      categoryId: new mongoose.Types.ObjectId(),
      name: "Garlic Bread",
      description: "Crispy garlic bread",
      price: 6.0,
      isAvailable: true,
      isOutOfStock: false,
      prepStation: "grill",
      ingredients: [
        { ingredientId: cheeseIng._id, quantity: 50, unit: "g" },
      ],
    });

    // Menu Item 3: Iced Latte (bar)
    const latteItem = await MenuItemModel.create({
      restaurantId: restaurant._id,
      categoryId: new mongoose.Types.ObjectId(),
      name: "Iced Latte",
      description: "Refreshing cold espresso with milk",
      price: 5.0,
      isAvailable: true,
      isOutOfStock: false,
      prepStation: "bar",
      ingredients: [
        { ingredientId: coffeeBeansIng._id, quantity: 20, unit: "g" },
      ],
    });

    console.log("Mock data created successfully.");
    console.log("\n==========================================");
    console.log("Starting Multi-Order Rounds & Billing Test Suite");
    console.log("==========================================");

    // ==========================================
    // TEST 1: QR Scan opens active session
    // ==========================================
    console.log("\n[Test 1] QR Scan on table opens active session...");
    const req1 = { params: { slug: restaurant.slug, qrToken: table1.qrToken } } as any;
    const res1 = mockResponse();
    await tableCtrl.resolveTableQR(req1, res1);
    const sessionId = res1.body.session?.id;
    console.log("Session ID:", sessionId, "Table status:", res1.body.table?.status);
    if (!sessionId || res1.body.table?.status !== "occupied") {
      throw new Error("Test 1 failed: Table session not initialized");
    }
    console.log("✓ Test 1 Passed: Active session initialized");

    // ==========================================
    // TEST 2: Round 1 Order placed & confirmed (KOT fired, stock deducted)
    // ==========================================
    console.log("\n[Test 2] Round 1: Place order (1 Pizza + 1 Garlic Bread) & confirm...");
    const req2_order = {
      params: { restaurantId: restaurant._id.toString() },
      customer: {
        customerId: customer1._id.toString(),
        tableId: table1._id.toString(),
        restaurantId: restaurant._id.toString(),
        tableSessionId: sessionId.toString(),
      },
      body: {
        tableId: table1._id.toString(),
        customerId: customer1._id.toString(),
        tableSessionId: sessionId.toString(),
        items: [
          { menuItemId: pizzaItem._id.toString(), quantity: 1 },
          { menuItemId: garlicBreadItem._id.toString(), quantity: 1 },
        ],
      },
    } as any;
    const res2_order = mockResponse();
    await orderCtrl.createOrder(req2_order, res2_order);
    const round1Order = res2_order.body;
    console.log("Round 1 Order ID:", round1Order._id, "Total:", round1Order.total);

    // Confirm Round 1 order (fires KOTs & deducts stock)
    const req2_confirm = {
      params: { id: round1Order._id.toString() },
      user: { id: staffMember._id.toString(), restaurantId: restaurant._id.toString(), role: "waiter" },
      body: { status: "confirmed" },
    } as any;
    const res2_confirm = mockResponse();
    await orderCtrl.updateOrderStatus(req2_confirm, res2_confirm);
    console.log("Round 1 Confirmation Status:", res2_confirm.statusCode);

    // Verify stock deducted for Round 1:
    // Cheese: 1000 - 100 (pizza) - 50 (garlic bread) = 850
    // Dough: 50 - 1 = 49
    const cheeseAfterR1 = await IngredientModel.findById(cheeseIng._id);
    const doughAfterR1 = await IngredientModel.findById(doughIng._id);
    console.log("Cheese stock after R1:", cheeseAfterR1?.currentStock, "(Expected: 850)");
    console.log("Dough stock after R1:", doughAfterR1?.currentStock, "(Expected: 49)");
    if (cheeseAfterR1?.currentStock !== 850 || doughAfterR1?.currentStock !== 49) {
      throw new Error("Test 2 failed: Stock deduction for Round 1 incorrect");
    }

    // Verify independent KOTs created for Round 1 (1 for main-kitchen, 1 for grill)
    const kotsR1 = await KOTModel.find({ orderId: round1Order._id });
    console.log("Round 1 KOTs generated count:", kotsR1.length, "(Expected: 2)");
    if (kotsR1.length !== 2) throw new Error("Test 2 failed: Expected 2 KOTs for Round 1");
    console.log("✓ Test 2 Passed: Round 1 placed, confirmed, KOTs fired & inventory deducted");

    // ==========================================
    // TEST 3: Round 2 Order placed & confirmed (appends to same session, fresh KOT)
    // ==========================================
    console.log("\n[Test 3] Round 2: Place second round order (2 Iced Lattes) under same session...");
    const req3_order = {
      params: { restaurantId: restaurant._id.toString() },
      customer: {
        customerId: customer1._id.toString(),
        tableId: table1._id.toString(),
        restaurantId: restaurant._id.toString(),
        tableSessionId: sessionId.toString(),
      },
      body: {
        tableId: table1._id.toString(),
        customerId: customer1._id.toString(),
        tableSessionId: sessionId.toString(),
        items: [
          { menuItemId: latteItem._id.toString(), quantity: 2 },
        ],
      },
    } as any;
    const res3_order = mockResponse();
    await orderCtrl.createOrder(req3_order, res3_order);
    const round2Order = res3_order.body;
    console.log("Round 2 Order ID:", round2Order._id, "Total:", round2Order.total);
    console.log("Round 2 tableSessionId:", round2Order.tableSessionId, "(Expected:", sessionId.toString(), ")");

    if (round2Order.tableSessionId.toString() !== sessionId.toString() || round2Order._id.toString() === round1Order._id.toString()) {
      throw new Error("Test 3 failed: Round 2 did not append cleanly to the same session");
    }

    // Confirm Round 2 order (fires fresh KOT to bar station independently)
    const req3_confirm = {
      params: { id: round2Order._id.toString() },
      user: { id: staffMember._id.toString(), restaurantId: restaurant._id.toString(), role: "waiter" },
      body: { status: "confirmed" },
    } as any;
    const res3_confirm = mockResponse();
    await orderCtrl.updateOrderStatus(req3_confirm, res3_confirm);

    // Coffee beans: 500 - 40 = 460
    const coffeeAfterR2 = await IngredientModel.findById(coffeeBeansIng._id);
    console.log("Coffee stock after R2:", coffeeAfterR2?.currentStock, "(Expected: 460)");
    if (coffeeAfterR2?.currentStock !== 460) throw new Error("Test 3 failed: Coffee stock deduction incorrect");

    const kotsR2 = await KOTModel.find({ orderId: round2Order._id });
    console.log("Round 2 KOTs generated count:", kotsR2.length, "(Expected: 1 for bar)");
    if (kotsR2.length !== 1 || kotsR2[0].station !== "bar") {
      throw new Error("Test 3 failed: Fresh KOT for bar was not created independently");
    }
    console.log("✓ Test 3 Passed: Round 2 placed in same session with independent bar KOT and stock deduction");

    // ==========================================
    // TEST 4: Consolidated Running Bill Generation for Multi-Round Session
    // ==========================================
    console.log("\n[Test 4] Generate consolidated bill for the session (Round 1 + Round 2 combined)...");
    const req4_bill = {
      params: { orderId: round2Order._id.toString() },
      user: { id: staffMember._id.toString(), restaurantId: restaurant._id.toString() },
    } as any;
    const res4_bill = mockResponse();
    await billCtrl.generateBill(req4_bill, res4_bill);
    const combinedBill = res4_bill.body;

    console.log("Combined Bill ID:", combinedBill._id);
    console.log("Combined Bill tableSessionId:", combinedBill.tableSessionId);
    console.log("Combined Bill items count:", combinedBill.items.length, "(Expected: 3 distinct items)");
    console.log("Combined Bill subtotal:", combinedBill.subtotal, "(Expected: 15 + 6 + 10 = 31)");
    console.log("Combined Bill tax (5%):", combinedBill.tax, "(Expected: 1.55)");
    console.log("Combined Bill total:", combinedBill.total, "(Expected: 32.55)");

    if (
      combinedBill.subtotal !== 31 ||
      combinedBill.tax !== 1.55 ||
      combinedBill.total !== 32.55 ||
      combinedBill.items.length !== 3
    ) {
      throw new Error("Test 4 failed: Combined bill math or aggregation incorrect");
    }

    // Verify both orders transitioned to status 'billed'
    const r1AfterBill = await OrderModel.findById(round1Order._id);
    const r2AfterBill = await OrderModel.findById(round2Order._id);
    console.log("Round 1 status after bill:", r1AfterBill?.status, "(Expected: billed)");
    console.log("Round 2 status after bill:", r2AfterBill?.status, "(Expected: billed)");

    if (r1AfterBill?.status !== "billed" || r2AfterBill?.status !== "billed") {
      throw new Error("Test 4 failed: Session orders not marked as billed");
    }
    console.log("✓ Test 4 Passed: Two rounds correctly roll into one consolidated running bill");

    // ==========================================
    // TEST 5: Cancelling an Item after KOT is sent (reverses inventory & updates totals)
    // ==========================================
    console.log("\n[Test 5] Cancelling fired item (Garlic Bread in Round 1) -> reverses inventory stock...");
    // Stock before cancel: Cheese was 850. Cancelling 1 Garlic Bread (50g cheese) should make cheese: 900
    const req5_cancelItem = {
      params: { id: round1Order._id.toString() },
      user: { id: staffMember._id.toString(), restaurantId: restaurant._id.toString(), role: "waiter" },
      body: { menuItemId: garlicBreadItem._id.toString(), reason: "Guest changed mind" },
    } as any;
    const res5_cancelItem = mockResponse();
    await orderCtrl.cancelOrderItem(req5_cancelItem, res5_cancelItem);

    console.log("Cancel item status:", res5_cancelItem.statusCode, "(Expected: 200)");
    const cheeseAfterCancel = await IngredientModel.findById(cheeseIng._id);
    console.log("Cheese stock after cancellation:", cheeseAfterCancel?.currentStock, "(Expected: 900)");
    if (cheeseAfterCancel?.currentStock !== 900) {
      throw new Error("Test 5 failed: Inventory stock was not reverted on item cancellation");
    }

    // Verify Round 1 Order totals updated:
    // Was 1 Pizza ($15) + 1 Garlic Bread ($6) = $21 (tax $1.05, total $22.05)
    // Now only 1 Pizza ($15) = $15 (tax $0.75, total $15.75)
    const r1AfterCancel = await OrderModel.findById(round1Order._id);
    console.log("Round 1 Subtotal after item cancel:", r1AfterCancel?.subtotal, "(Expected: 15)");
    console.log("Round 1 Total after item cancel:", r1AfterCancel?.total, "(Expected: 15.75)");
    if (r1AfterCancel?.subtotal !== 15 || r1AfterCancel?.total !== 15.75) {
      throw new Error("Test 5 failed: Order financial totals not recalculated after item cancel");
    }

    // Re-generating bill should reflect the cancelled item exclusion:
    // New total: 1 Pizza ($15) + 2 Lattes ($10) = $25 subtotal, $1.25 tax, $26.25 total
    const res5_billUpdate = mockResponse();
    await billCtrl.generateBill(req4_bill, res5_billUpdate);
    console.log("Updated Bill subtotal after cancellation:", res5_billUpdate.body.subtotal, "(Expected: 25)");
    console.log("Updated Bill total after cancellation:", res5_billUpdate.body.total, "(Expected: 26.25)");
    if (res5_billUpdate.body.subtotal !== 25 || res5_billUpdate.body.total !== 26.25) {
      throw new Error("Test 5 failed: Bill did not recalculate excluding cancelled item");
    }
    console.log("✓ Test 5 Passed: Item cancellation reversed stock, updated order totals & adjusted running bill");

    // ==========================================
    // TEST 6: Settle Bill & Close Session
    // ==========================================
    console.log("\n[Test 6] Settle Bill -> table session closed & table marked needs_cleaning...");
    const req6_settle = {
      params: { id: combinedBill._id.toString() },
      user: { id: staffMember._id.toString(), restaurantId: restaurant._id.toString() },
    } as any;
    const res6_settle = mockResponse();
    await billCtrl.settleBillPayment(req6_settle, res6_settle);

    const sessionAfterSettle = await TableSessionModel.findById(sessionId);
    const tableAfterSettle = await TableModel.findById(table1._id);
    console.log("Session status after settle:", sessionAfterSettle?.status, "(Expected: closed)");
    console.log("Table status after settle:", tableAfterSettle?.status, "(Expected: needs_cleaning)");

    if (sessionAfterSettle?.status !== "closed" || tableAfterSettle?.status !== "needs_cleaning") {
      throw new Error("Test 6 failed: Session not closed on settlement");
    }
    console.log("✓ Test 6 Passed: Bill settled and session closed");

    // ==========================================
    // TEST 7: Closed session cannot receive new order round
    // ==========================================
    console.log("\n[Test 7] Closed session rejects new order round attempt...");
    const req7_closedOrder = {
      params: { restaurantId: restaurant._id.toString() },
      customer: {
        customerId: customer1._id.toString(),
        tableId: table1._id.toString(),
        restaurantId: restaurant._id.toString(),
        tableSessionId: sessionId.toString(), // Closed session!
      },
      body: {
        tableId: table1._id.toString(),
        customerId: customer1._id.toString(),
        tableSessionId: sessionId.toString(),
        items: [{ menuItemId: pizzaItem._id.toString(), quantity: 1 }],
      },
    } as any;
    const res7_closedOrder = mockResponse();
    await orderCtrl.createOrder(req7_closedOrder, res7_closedOrder);

    console.log("New round against closed session response status:", res7_closedOrder.statusCode, "(Expected: 400)");
    console.log("Rejection message:", res7_closedOrder.body?.message);
    if (res7_closedOrder.statusCode !== 400) {
      throw new Error("Test 7 failed: Order round against closed session was not rejected with 400");
    }
    console.log("✓ Test 7 Passed: Activity against closed session rejected gracefully");

    console.log("\n==========================================");
    console.log("ALL MULTI-ORDER ROUNDS & BILLING TESTS PASSED! ✓");
    console.log("==========================================\n");
  } finally {
    // Cleanup
    console.log("Cleaning up test database records...");
    await RestaurantModel.deleteMany({ slug: "multi-round-diner" });
    await StaffUserModel.deleteMany({ email: "alice@multidiner.com" });
    await TableModel.deleteMany({ qrToken: "token_m1_round" });
    await CustomerModel.deleteMany({ mobileNumber: "555-444-3333" });
    await MenuItemModel.deleteMany({ name: { $in: ["Margherita Pizza", "Garlic Bread", "Iced Latte"] } });
    await IngredientModel.deleteMany({ name: { $in: ["Mozzarella Cheese", "Pizza Dough", "Espresso Beans"] } });
    await OrderModel.deleteMany({});
    await TableSessionModel.deleteMany({});
    await BillModel.deleteMany({});
    await KOTModel.deleteMany({});
    await mongoose.disconnect();
  }
}

runMultiOrderTests().catch((err) => {
  console.error("Multi-order test suite error:", err);
  mongoose.disconnect();
  process.exit(1);
});
