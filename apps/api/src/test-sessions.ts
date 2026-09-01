import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

import { RestaurantModel } from "./models/Restaurant";
import { TableModel } from "./models/Table";
import { CustomerModel } from "./models/Customer";
import { OrderModel } from "./models/Order";
import { MenuItemModel } from "./models/MenuItem";
import { StaffUserModel } from "./models/StaffUser";
import { TableSessionModel } from "./models/TableSession";
import { BillModel } from "./models/Bill";

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

async function runSessionTests() {
  const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/pos";
  console.log("Connecting to test db at:", uri);
  await mongoose.connect(uri);

  try {
    console.log("\n--- Setting up Mock Test Data ---");

    // 1. Setup Restaurant with configurable inactivity timeout (120 minutes = 2 hours)
    const restaurant = await RestaurantModel.create({
      name: "Session Test Bistro",
      slug: "session-test-bistro",
      address: "456 Ocean Ave",
      contactPhone: "555-123-4567",
      contactEmail: "contact@sessionbistro.com",
      subscriptionPlan: "pro",
      isActive: true,
      tableSessionTimeoutMinutes: 120, // 2 hours
    });

    const staffMember = await StaffUserModel.create({
      restaurantId: restaurant._id,
      name: "Manager Bob",
      email: "bob@sessionbistro.com",
      passwordHash: "fake_hash_123",
      role: "manager",
      isActive: true,
    });

    const table1 = await TableModel.create({
      restaurantId: restaurant._id,
      label: "Table T10",
      capacity: 4,
      location: "Patio",
      qrToken: "table_token_t10",
      qrCodeUrl: "url_t10",
      status: "available",
    });

    const customer1 = await CustomerModel.create({
      restaurantId: restaurant._id,
      name: "Charlie Customer",
      mobileNumber: "555-888-9999",
    });

    const menuItem1 = await MenuItemModel.create({
      restaurantId: restaurant._id,
      categoryId: new mongoose.Types.ObjectId(),
      name: "Truffle Fries",
      description: "Crispy fries with truffle oil",
      price: 8.5,
      isAvailable: true,
      isOutOfStock: false,
      ingredients: [],
    });

    console.log("Mock data created successfully.");
    console.log("\n==========================================");
    console.log("Starting Table Session Test Suite");
    console.log("==========================================");

    // ==========================================
    // TEST 1: QR Scan automatically opens session and marks table occupied
    // ==========================================
    console.log("\n[Test 1] QR Scan on available table opens fresh session & sets table to occupied...");
    const req1 = {
      params: { slug: restaurant.slug, qrToken: table1.qrToken },
    } as any;
    const res1 = mockResponse();
    await tableCtrl.resolveTableQR(req1, res1);

    console.log("Response status:", res1.statusCode, "(Expected: 200)");
    if (res1.statusCode !== 200) throw new Error("Test 1 failed: resolveTableQR returned non-200");

    const session1Id = res1.body.session?.id;
    console.log("Session ID returned:", session1Id);
    console.log("Session status:", res1.body.session?.status, "(Expected: active)");
    console.log("Session isNew:", res1.body.session?.isNew, "(Expected: true)");
    console.log("Table status in response:", res1.body.table?.status, "(Expected: occupied)");

    const table1AfterScan = await TableModel.findById(table1._id);
    const session1Doc = await TableSessionModel.findById(session1Id);

    if (
      !session1Doc ||
      session1Doc.status !== "active" ||
      table1AfterScan?.status !== "occupied" ||
      table1AfterScan?.currentSessionId?.toString() !== session1Id.toString()
    ) {
      throw new Error("Test 1 failed: Table and Session state not updated in DB correctly");
    }
    console.log("✓ Test 1 Passed: Table is occupied and session is active");

    // ==========================================
    // TEST 2: Customer registration attaches to active session & places order
    // ==========================================
    console.log("\n[Test 2] Customer registers session & places order against active session...");
    const req2_cust = {
      body: {
        name: "Charlie Customer",
        mobileNumber: "555-888-9999",
        tableId: table1._id.toString(),
        restaurantId: restaurant._id.toString(),
      },
    } as any;
    const res2_cust = mockResponse();
    await customerCtrl.getOrCreateCustomerSession(req2_cust, res2_cust);
    console.log("Customer token generated:", !!res2_cust.body.customerToken);

    // Place order under active session
    const req2_order = {
      params: { restaurantId: restaurant._id.toString() },
      customer: {
        customerId: customer1._id.toString(),
        tableId: table1._id.toString(),
        restaurantId: restaurant._id.toString(),
        tableSessionId: session1Id.toString(),
      },
      body: {
        tableId: table1._id.toString(),
        customerId: customer1._id.toString(),
        tableSessionId: session1Id.toString(),
        items: [{ menuItemId: menuItem1._id.toString(), quantity: 2 }],
      },
    } as any;
    const res2_order = mockResponse();
    await orderCtrl.createOrder(req2_order, res2_order);

    console.log("Order creation status:", res2_order.statusCode, "(Expected: 201)");
    if (res2_order.statusCode !== 201) throw new Error("Test 2 failed: Order creation returned non-201");

    const createdOrder = res2_order.body;
    console.log("Order tableSessionId:", createdOrder.tableSessionId, "(Expected:", session1Id.toString(), ")");
    if (createdOrder.tableSessionId.toString() !== session1Id.toString()) {
      throw new Error("Test 2 failed: Order tableSessionId mismatch");
    }
    console.log("✓ Test 2 Passed: Order placed successfully against active session");

    // ==========================================
    // TEST 3: Staff manually closes table session (table -> needs_cleaning)
    // ==========================================
    console.log("\n[Test 3] Staff manually closes session -> closedByStaffId recorded, table -> needs_cleaning...");
    const req3_close = {
      params: { tableId: table1._id.toString() },
      user: { id: staffMember._id.toString(), restaurantId: restaurant._id.toString(), role: "manager" },
      body: {},
    } as any;
    const res3_close = mockResponse();
    await tableCtrl.closeTableSession(req3_close, res3_close);

    console.log("Close session response status:", res3_close.statusCode, "(Expected: 200)");
    const closedSessionDoc = await TableSessionModel.findById(session1Id);
    const table1AfterClose = await TableModel.findById(table1._id);

    console.log("Session status after close:", closedSessionDoc?.status, "(Expected: closed)");
    console.log("Session closedByStaffId:", closedSessionDoc?.closedByStaffId?.toString(), "(Expected:", staffMember._id.toString(), ")");
    console.log("Session closedAt exists:", !!closedSessionDoc?.closedAt);
    console.log("Table status after close:", table1AfterClose?.status, "(Expected: needs_cleaning)");
    console.log("Table currentSessionId after close:", table1AfterClose?.currentSessionId, "(Expected: null/undefined)");

    if (
      closedSessionDoc?.status !== "closed" ||
      closedSessionDoc?.closedByStaffId?.toString() !== staffMember._id.toString() ||
      table1AfterClose?.status !== "needs_cleaning" ||
      table1AfterClose?.currentSessionId
    ) {
      throw new Error("Test 3 failed: Manual session close DB state verification failed");
    }
    console.log("✓ Test 3 Passed: Session closed with staffId attribution and table marked needs_cleaning");

    // ==========================================
    // TEST 4: Staff resets table to available
    // ==========================================
    console.log("\n[Test 4] Staff resets table -> table -> available...");
    const req4_reset = {
      params: { tableId: table1._id.toString() },
      user: { id: staffMember._id.toString(), restaurantId: restaurant._id.toString(), role: "manager" },
    } as any;
    const res4_reset = mockResponse();
    await tableCtrl.resetTable(req4_reset, res4_reset);

    console.log("Reset table response status:", res4_reset.statusCode, "(Expected: 200)");
    const table1AfterReset = await TableModel.findById(table1._id);
    console.log("Table status after reset:", table1AfterReset?.status, "(Expected: available)");

    if (table1AfterReset?.status !== "available") {
      throw new Error("Test 4 failed: Reset table did not transition to available");
    }
    console.log("✓ Test 4 Passed: Table successfully reset to available");

    // ==========================================
    // TEST 5: Rejecting order activity against closed session
    // ==========================================
    console.log("\n[Test 5] Rejecting order activity against closed session...");
    const req5_rejected = {
      params: { restaurantId: restaurant._id.toString() },
      customer: {
        customerId: customer1._id.toString(),
        tableId: table1._id.toString(),
        restaurantId: restaurant._id.toString(),
        tableSessionId: session1Id.toString(), // Closed session ID!
      },
      body: {
        tableId: table1._id.toString(),
        customerId: customer1._id.toString(),
        tableSessionId: session1Id.toString(),
        items: [{ menuItemId: menuItem1._id.toString(), quantity: 1 }],
      },
    } as any;
    const res5_rejected = mockResponse();
    await orderCtrl.createOrder(req5_rejected, res5_rejected);

    console.log("Order creation response status:", res5_rejected.statusCode, "(Expected: 400)");
    console.log("Order rejection message:", res5_rejected.body?.message);
    if (res5_rejected.statusCode !== 400) {
      throw new Error("Test 5 failed: Order against closed session was not rejected with 400");
    }
    console.log("✓ Test 5 Passed: Activity against closed session rejected gracefully");

    // ==========================================
    // TEST 6: Inactivity Auto-Close Lifecycle & Configurable Setting
    // ==========================================
    console.log("\n[Test 6] Inactivity timeout auto-close (closedByStaffId: null, table -> needs_cleaning)...");

    // Open a new session on table1
    const { session: session2 } = await sessionService.getOrOpenActiveSession(table1._id, restaurant._id);
    console.log("New Session 2 opened:", session2._id.toString());

    // Place an unbilled order on this session
    const unbilledOrder = await OrderModel.create({
      restaurantId: restaurant._id,
      tableId: table1._id,
      tableSessionId: session2._id,
      customerId: customer1._id,
      items: [{ menuItemId: menuItem1._id, name: menuItem1.name, price: menuItem1.price, quantity: 1, itemStatus: "queued" }],
      status: "placed",
      subtotal: 8.5,
      tax: 0.425,
      total: 8.925,
    });

    // Simulate inactivity by backdating lastActivityAt beyond the 120 minutes timeout (e.g. 150 minutes ago)
    await TableSessionModel.collection.updateOne(
      { _id: session2._id as any },
      {
        $set: {
          lastActivityAt: new Date(Date.now() - 150 * 60 * 1000),
          openedAt: new Date(Date.now() - 150 * 60 * 1000),
        },
      }
    );

    // Trigger auto-expiry check
    const expiryResult = await sessionService.checkAndExpireTableSession(table1._id);
    console.log("Auto-expiry triggered:", expiryResult?.expired, "(Expected: true)");

    const session2AfterExpiry = await TableSessionModel.findById(session2._id);
    const table1AfterExpiry = await TableModel.findById(table1._id);

    console.log("Session 2 status after auto-expiry:", session2AfterExpiry?.status, "(Expected: closed)");
    console.log("Session 2 closedByStaffId:", session2AfterExpiry?.closedByStaffId, "(Expected: null)");
    console.log("Session 2 closedAt exists:", !!session2AfterExpiry?.closedAt);
    console.log("Table status after auto-expiry:", table1AfterExpiry?.status, "(Expected: needs_cleaning)");

    if (
      !expiryResult?.expired ||
      session2AfterExpiry?.status !== "closed" ||
      session2AfterExpiry?.closedByStaffId !== null ||
      table1AfterExpiry?.status !== "needs_cleaning"
    ) {
      throw new Error("Test 6 failed: Inactivity auto-close verification failed");
    }

    // Verify unbilled order can STILL generate a bill after session auto-closed
    console.log("Verifying bill generation for unbilled order after auto-close...");
    const req6_bill = {
      params: { orderId: unbilledOrder._id.toString() },
      user: { id: staffMember._id.toString(), restaurantId: restaurant._id.toString() },
    } as any;
    const res6_bill = mockResponse();
    await billCtrl.generateBill(req6_bill, res6_bill);

    console.log("Bill generation status:", res6_bill.statusCode, "(Expected: 201)");
    if (res6_bill.statusCode !== 201 || !res6_bill.body?.total) {
      throw new Error("Test 6 failed: Failed to generate bill for order from auto-closed session");
    }
    console.log("✓ Test 6 Passed: Inactivity auto-close works and unbilled order bill generated successfully");

    // ==========================================
    // TEST 7: Fresh session started upon re-scan after session closure
    // ==========================================
    console.log("\n[Test 7] Fresh session opens on subsequent QR scan after session closure...");
    const req7 = {
      params: { slug: restaurant.slug, qrToken: table1.qrToken },
    } as any;
    const res7 = mockResponse();
    await tableCtrl.resolveTableQR(req7, res7);

    console.log("QR Resolve status:", res7.statusCode, "(Expected: 200)");
    const session3Id = res7.body.session?.id;
    console.log("New Session 3 ID:", session3Id);
    console.log("Session 3 isNew:", res7.body.session?.isNew, "(Expected: true)");
    console.log("Is different from Session 2:", session3Id !== session2._id.toString(), "(Expected: true)");

    if (
      res7.statusCode !== 200 ||
      !res7.body.session?.isNew ||
      session3Id === session2._id.toString() ||
      session3Id === session1Id.toString()
    ) {
      throw new Error("Test 7 failed: Subsequent QR scan did not start a fresh session");
    }
    console.log("✓ Test 7 Passed: Fresh session started cleanly after previous closed session");

    console.log("\n==========================================");
    console.log("ALL TABLE SESSION TESTS PASSED SUCCESSFULLY! ✓");
    console.log("==========================================\n");
  } finally {
    // Cleanup
    console.log("Cleaning up test database records...");
    await RestaurantModel.deleteMany({ slug: "session-test-bistro" });
    await StaffUserModel.deleteMany({ email: "bob@sessionbistro.com" });
    await TableModel.deleteMany({ qrToken: "table_token_t10" });
    await CustomerModel.deleteMany({ mobileNumber: "555-888-9999" });
    await MenuItemModel.deleteMany({ name: "Truffle Fries" });
    await OrderModel.deleteMany({ total: { $in: [17.85, 8.925] } });
    await TableSessionModel.deleteMany({});
    await BillModel.deleteMany({});
    await mongoose.disconnect();
  }
}

runSessionTests().catch((err) => {
  console.error("Session test suite error:", err);
  mongoose.disconnect();
  process.exit(1);
});
