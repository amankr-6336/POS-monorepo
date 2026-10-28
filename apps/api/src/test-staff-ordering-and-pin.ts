import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { MongoMemoryServer } from "mongodb-memory-server";
import { RestaurantModel } from "./models/Restaurant";
import { TableModel } from "./models/Table";
import { MenuItemModel } from "./models/MenuItem";
import { IngredientModel } from "./models/Ingredient";
import { StaffUserModel } from "./models/StaffUser";
import { TableSessionModel } from "./models/TableSession";
import { OrderModel } from "./models/Order";
import { KOTModel } from "./models/KOT";
import { BillModel } from "./models/Bill";

import * as authCtrl from "./controllers/auth.controller";
import * as orderCtrl from "./controllers/order.controller";
import * as sessionService from "./services/session.service";

const JWT_SECRET = process.env.JWT_SECRET || "super_secret_pos_jwt_key_991823";

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

async function runStaffOrderingAndPinTests() {
  console.log("Starting in-memory MongoDB server for testing...");
  const mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  console.log("Connected to in-memory test database at:", uri);
  await mongoose.connect(uri);

  try {
    console.log("\n=======================================================");
    console.log("  SETTING UP TEST RESTAURANT, STAFF WITH PINS, & MENU  ");
    console.log("=======================================================");

    const restaurant = await RestaurantModel.create({
      name: "Bistro Terminal",
      slug: "bistro-terminal",
      address: "123 Main St",
      contactPhone: "555-1234",
      contactEmail: "terminal@bistro.com",
      subscriptionPlan: "pro",
      isActive: true,
      tableSessionTimeoutMinutes: 180,
    });

    const otherRestaurant = await RestaurantModel.create({
      name: "Foreign Diner",
      slug: "foreign-diner",
      address: "456 Cross St",
      contactPhone: "555-9999",
      contactEmail: "admin@foreigndiner.com",
      subscriptionPlan: "pro",
      isActive: true,
    });

    // Create Staff with hashed PINs
    const pinBobHash = await bcrypt.hash("1234", 10);
    const pinAliceHash = await bcrypt.hash("5678", 10);

    const staffBob = await StaffUserModel.create({
      restaurantId: restaurant._id,
      name: "Manager Bob",
      email: "bob@bistro.com",
      passwordHash: await bcrypt.hash("password123", 10),
      pinHash: pinBobHash,
      role: "manager",
      isActive: true,
    });

    const staffAlice = await StaffUserModel.create({
      restaurantId: restaurant._id,
      name: "Waiter Alice",
      email: "alice@bistro.com",
      passwordHash: await bcrypt.hash("password123", 10),
      pinHash: pinAliceHash,
      role: "waiter",
      isActive: true,
    });

    const foreignStaff = await StaffUserModel.create({
      restaurantId: otherRestaurant._id,
      name: "Foreign Waiter",
      email: "foreign@other.com",
      passwordHash: await bcrypt.hash("password123", 10),
      pinHash: await bcrypt.hash("9999", 10),
      role: "waiter",
      isActive: true,
    });

    // Create Tables
    const table1 = await TableModel.create({
      restaurantId: restaurant._id,
      label: "Table T1",
      capacity: 4,
      location: "Indoor",
      qrCodeUrl: "data:image/png;base64,mockqr",
      qrToken: "token_t1",
      status: "available",
    });

    // Create Ingredients
    const bun = await IngredientModel.create({
      restaurantId: restaurant._id,
      name: "Brioche Bun",
      unit: "pcs",
      currentStock: 50,
      lowStockThreshold: 10,
    });

    const beefPatty = await IngredientModel.create({
      restaurantId: restaurant._id,
      name: "Beef Patty",
      unit: "pcs",
      currentStock: 50,
      lowStockThreshold: 10,
    });

    const cheddarCheese = await IngredientModel.create({
      restaurantId: restaurant._id,
      name: "Cheddar Cheese",
      unit: "pcs",
      currentStock: 50,
      lowStockThreshold: 10,
    });

    // Create Menu Item with variants & modifiers
    const dish = await MenuItemModel.create({
      restaurantId: restaurant._id,
      categoryId: new mongoose.Types.ObjectId(),
      name: "Prime Artisan Burger",
      description: "Juicy burger with custom size and toppings",
      imageUrl: "https://example.com/burger.jpg",
      price: 12.0,
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
              priceDelta: 4.0,
              ingredientOverrides: [{ ingredientId: beefPatty._id, quantity: 2, unit: "pcs" }],
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
              ingredients: [{ ingredientId: cheddarCheese._id, quantity: 1, unit: "pcs" }],
            },
          ],
        },
      ],
    });

    console.log("✓ Entities seeded: 2 staff with hashed PINs, 1 table, 1 customizable dish\n");

    // =======================================================
    // PART B TESTS: FAST PIN-BASED STAFF SWITCH
    // =======================================================
    console.log("-------------------------------------------------------");
    console.log("  PART B: PIN-BASED AUTHENTICATION & LOCKOUT TESTS     ");
    console.log("-------------------------------------------------------");

    // Mock terminal session logged in as Manager Bob
    const bobTerminalUser = {
      id: staffBob._id.toString(),
      restaurantId: restaurant._id.toString(),
      role: staffBob.role,
      name: staffBob.name,
    };

    console.log("[Test 1] Correct PIN switches active staff context to Waiter Alice...");
    {
      const req: any = {
        user: bobTerminalUser,
        body: {
          staffId: staffAlice._id.toString(),
          pin: "5678",
        },
      };
      const res = mockResponse();
      await authCtrl.switchStaffPin(req, res);

      if (res.statusCode !== 200) {
        throw new Error(`Expected 200, got ${res.statusCode}: ${res.body?.message}`);
      }
      if (res.body.user.name !== "Waiter Alice" || res.body.user.role !== "waiter") {
        throw new Error(`Expected user to be Waiter Alice, got: ${JSON.stringify(res.body.user)}`);
      }
      // Verify returned token is a valid JWT with Alice's identity
      const decoded = jwt.verify(res.body.accessToken, JWT_SECRET) as any;
      if (decoded.id !== staffAlice._id.toString() || decoded.name !== "Waiter Alice") {
        throw new Error(`JWT payload does not match Alice: ${JSON.stringify(decoded)}`);
      }
      console.log(`✓ Test 1 Passed: Correct PIN switched context to ${res.body.user.name} (${res.body.user.role})`);
    }

    console.log("\n[Test 2] Wrong PIN is rejected and attempts remaining is decremented...");
    {
      const req: any = {
        user: bobTerminalUser,
        body: {
          staffId: staffAlice._id.toString(),
          pin: "0000", // Wrong PIN
        },
      };
      const res = mockResponse();
      await authCtrl.switchStaffPin(req, res);

      if (res.statusCode !== 401) {
        throw new Error(`Expected 401 for wrong PIN, got ${res.statusCode}`);
      }
      if (res.body.attemptsRemaining !== 4) {
        throw new Error(`Expected 4 attempts remaining, got ${res.body.attemptsRemaining}`);
      }
      console.log(`✓ Test 2 Passed: Wrong PIN rejected with 401: "${res.body.message}"`);
    }

    console.log("\n[Test 3] Lockout triggers after 5 failed attempts with a cooldown period...");
    {
      // Already failed 1 time. Let's fail 3 more times:
      for (let attempt = 2; attempt <= 4; attempt++) {
        const req: any = {
          user: bobTerminalUser,
          body: { staffId: staffAlice._id.toString(), pin: "0000" },
        };
        const res = mockResponse();
        await authCtrl.switchStaffPin(req, res);
        if (res.statusCode !== 401) {
          throw new Error(`Attempt ${attempt} expected 401, got ${res.statusCode}`);
        }
      }

      // 5th failed attempt should trigger lockout (423 Locked)
      const fifthReq: any = {
        user: bobTerminalUser,
        body: { staffId: staffAlice._id.toString(), pin: "0000" },
      };
      const fifthRes = mockResponse();
      await authCtrl.switchStaffPin(fifthReq, fifthRes);

      if (fifthRes.statusCode !== 423) {
        throw new Error(`Expected 423 for 5th failed attempt, got ${fifthRes.statusCode}: ${fifthRes.body?.message}`);
      }
      if (!fifthRes.body.lockedUntil) {
        throw new Error(`Expected lockedUntil timestamp on lockout response`);
      }

      // Check DB record
      const aliceDoc = await StaffUserModel.findById(staffAlice._id);
      if (!aliceDoc?.pinLockedUntil || aliceDoc.pinLockedUntil <= new Date()) {
        throw new Error(`Alice document not locked in DB! pinLockedUntil: ${aliceDoc?.pinLockedUntil}`);
      }
      console.log(`✓ Test 3 Passed: 5th failure locked out Alice until ${fifthRes.body.lockedUntil}`);
    }

    console.log("\n[Test 4] PIN entry while locked out is rejected even with correct PIN...");
    {
      const req: any = {
        user: bobTerminalUser,
        body: {
          staffId: staffAlice._id.toString(),
          pin: "5678", // Correct PIN, but account is locked!
        },
      };
      const res = mockResponse();
      await authCtrl.switchStaffPin(req, res);

      if (res.statusCode !== 423) {
        throw new Error(`Expected 423 when locked out, got ${res.statusCode}: ${res.body?.message}`);
      }
      console.log(`✓ Test 4 Passed: Locked account rejected even with correct PIN: "${res.body.message}"`);

      // Reset Alice's lockout so we can continue with ordering tests
      await StaffUserModel.findByIdAndUpdate(staffAlice._id, { pinAttempts: 0, pinLockedUntil: null });
    }

    console.log("\n[Test 5] Session-switch to staff from another restaurant is blocked on trusted device...");
    {
      const req: any = {
        user: bobTerminalUser, // Restaurant A
        body: {
          staffId: foreignStaff._id.toString(), // Restaurant B
          pin: "9999",
        },
      };
      const res = mockResponse();
      await authCtrl.switchStaffPin(req, res);

      if (res.statusCode !== 404) {
        throw new Error(`Expected 404 for cross-restaurant staff switch, got ${res.statusCode}`);
      }
      console.log(`✓ Test 5 Passed: Cross-restaurant staff access blocked successfully`);
    }

    // =======================================================
    // PART A TESTS: STAFF-ASSISTED ORDERING & EDITING
    // =======================================================
    console.log("\n-------------------------------------------------------");
    console.log("  PART A: STAFF-ASSISTED ORDERING & AUDIT TESTS        ");
    console.log("-------------------------------------------------------");

    let createdOrderId = "";

    console.log("[Test 6] Waiter Alice opens Table T1 and places order with variants & modifiers...");
    {
      const aliceStaffUser = {
        id: staffAlice._id.toString(),
        restaurantId: restaurant._id.toString(),
        role: "waiter",
        name: "Waiter Alice",
      };

      const req: any = {
        user: aliceStaffUser,
        body: {
          tableId: table1._id.toString(),
          items: [
            {
              menuItemId: dish._id.toString(),
              quantity: 2,
              specialInstructions: "Extra crispy bun",
              selectedVariants: [
                {
                  groupName: "Size",
                  optionName: "Double",
                  priceDelta: 4.0,
                },
              ],
              selectedModifiers: [
                {
                  groupName: "Add-ons",
                  optionName: "Extra Cheese",
                  priceDelta: 1.5,
                },
              ],
            },
          ],
          notes: "Table VIP guests",
        },
      };

      const res = mockResponse();
      await orderCtrl.createOrder(req, res);

      if (res.statusCode !== 201) {
        throw new Error(`Expected 201, got ${res.statusCode}: ${res.body?.message}`);
      }

      createdOrderId = res.body._id.toString();

      // Price calculation check:
      // Base: $12.00, Double: +$4.00, Cheese: +$1.50 = $17.50 unit price
      // Qty: 2 => Subtotal $35.00, Tax 5% => $1.75, Total => $36.75
      if (res.body.subtotal !== 35 || res.body.total !== 36.75) {
        throw new Error(`Expected subtotal $35 and total $36.75, got subtotal: ${res.body.subtotal}, total: ${res.body.total}`);
      }

      // Check audit tracking
      if (res.body.placedByStaffId !== staffAlice._id.toString()) {
        throw new Error(`Expected placedByStaffId to be Alice, got: ${res.body.placedByStaffId}`);
      }
      if (!res.body.auditLog || res.body.auditLog.length === 0) {
        throw new Error(`Expected auditLog entries on order placed by staff`);
      }
      const initialLog = res.body.auditLog[0];
      if (initialLog.action !== "placed" || initialLog.staffName !== "Waiter Alice") {
        throw new Error(`Audit log entry does not reflect Alice: ${JSON.stringify(initialLog)}`);
      }

      // Verify table status is now occupied and active session is created
      const tableDoc = await TableModel.findById(table1._id);
      if (tableDoc?.status !== "occupied" || !tableDoc.currentSessionId) {
        throw new Error(`Table not marked occupied with session! Status: ${tableDoc?.status}`);
      }

      console.log(`✓ Test 6 Passed: Waiter Alice placed order #${createdOrderId.slice(-6)} on behalf of Table T1 ($36.75)`);
      console.log(`  Audit Entry: ${initialLog.note}`);
    }

    console.log("\n[Test 7] Order advances through standard Order/KOT pipeline (inventory deduction & KOT creation)...");
    {
      const req: any = {
        params: { id: createdOrderId },
        body: { status: "confirmed" },
        user: {
          id: staffBob._id.toString(),
          restaurantId: restaurant._id.toString(),
          role: "manager",
          name: "Manager Bob",
        },
      };

      const res = mockResponse();
      await orderCtrl.updateOrderStatus(req, res);

      if (res.statusCode !== 200) {
        throw new Error(`Expected 200 confirming order, got ${res.statusCode}: ${res.body?.message}`);
      }

      // Check inventory deductions:
      // Bun: 50 - 2 = 48
      // Beef Patty: 50 - (2 * 2 Double) = 46
      // Cheddar: 50 - 2 = 48
      const bunDoc = await IngredientModel.findById(bun._id);
      const pattyDoc = await IngredientModel.findById(beefPatty._id);
      const cheeseDoc = await IngredientModel.findById(cheddarCheese._id);

      if (bunDoc?.currentStock !== 48 || pattyDoc?.currentStock !== 46 || cheeseDoc?.currentStock !== 48) {
        throw new Error(
          `Inventory deduction mismatch! Bun: ${bunDoc?.currentStock} (exp 48), Patty: ${pattyDoc?.currentStock} (exp 46), Cheese: ${cheeseDoc?.currentStock} (exp 48)`
        );
      }

      // Verify KOT ticket was created for grill station
      const kots = await KOTModel.find({ orderId: createdOrderId });
      if (kots.length === 0) {
        throw new Error(`No KOT generated for confirmed order`);
      }
      if (kots[0].station !== "grill" || kots[0].items[0].quantity !== 2) {
        throw new Error(`KOT details mismatch: ${JSON.stringify(kots[0])}`);
      }

      console.log(`✓ Test 7 Passed: Order confirmed, KOT generated for station '${kots[0].station}', inventory stock deducted`);
    }

    console.log("\n[Test 8] Manager Bob edits order items on behalf of table, updating totals & audit log...");
    {
      // Bob updates the order: increases quantity to 3
      const req: any = {
        params: { id: createdOrderId },
        user: {
          id: staffBob._id.toString(),
          restaurantId: restaurant._id.toString(),
          role: "manager",
          name: "Manager Bob",
        },
        body: {
          items: [
            {
              menuItemId: dish._id.toString(),
              quantity: 3, // Changed from 2 to 3
              specialInstructions: "Extra crispy bun, well done",
              selectedVariants: [
                {
                  groupName: "Size",
                  optionName: "Double",
                  priceDelta: 4.0,
                },
              ],
              selectedModifiers: [
                {
                  groupName: "Add-ons",
                  optionName: "Extra Cheese",
                  priceDelta: 1.5,
                },
              ],
            },
          ],
          notes: "Table VIP guests - updated round",
        },
      };

      const res = mockResponse();
      await orderCtrl.editOrder(req, res);

      if (res.statusCode !== 200) {
        throw new Error(`Expected 200 editing order, got ${res.statusCode}: ${res.body?.message}`);
      }

      // New Totals: 3 * $17.50 = $52.50 subtotal, 5% tax = $2.63, total = $55.13
      if (res.body.subtotal !== 52.5 || res.body.total !== 55.13) {
        throw new Error(`Expected subtotal $52.5 and total $55.13, got subtotal: ${res.body.subtotal}, total: ${res.body.total}`);
      }

      // Verify audit log tracking
      if (res.body.lastEditedByStaffId !== staffBob._id.toString()) {
        throw new Error(`Expected lastEditedByStaffId to be Bob, got: ${res.body.lastEditedByStaffId}`);
      }
      const editLog = res.body.auditLog.find((l: any) => l.action === "edited");
      if (!editLog || editLog.staffName !== "Manager Bob") {
        throw new Error(`Edit audit log not recorded properly: ${JSON.stringify(res.body.auditLog)}`);
      }

      console.log(`✓ Test 8 Passed: Order edited by Manager Bob ($55.13). Audit history contains 'edited' by Bob.`);
    }

    console.log("\n[Test 9] Editing is rejected once an order is billed...");
    {
      // Mark order as billed
      await OrderModel.findByIdAndUpdate(createdOrderId, { status: "billed" });

      const req: any = {
        params: { id: createdOrderId },
        user: {
          id: staffBob._id.toString(),
          restaurantId: restaurant._id.toString(),
          role: "manager",
          name: "Manager Bob",
        },
        body: {
          items: [{ menuItemId: dish._id.toString(), quantity: 1 }],
        },
      };

      const res = mockResponse();
      await orderCtrl.editOrder(req, res);

      if (res.statusCode !== 400) {
        throw new Error(`Expected 400 when editing billed order, got ${res.statusCode}`);
      }
      console.log(`✓ Test 9 Passed: Billed order successfully locked against further edits: "${res.body.message}"`);
    }

    console.log("\n=======================================================");
    console.log("  ALL STAFF-ASSISTED ORDERING & PIN TESTS PASSED (9/9)!");
    console.log("=======================================================");
  } finally {
    await mongoose.disconnect();
    await mongoServer.stop();
  }
}

runStaffOrderingAndPinTests().catch((err) => {
  console.error("Test Suite Failed with error:", err);
  process.exit(1);
});
