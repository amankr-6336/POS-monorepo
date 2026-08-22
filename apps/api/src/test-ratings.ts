import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

import { RestaurantModel } from "./models/Restaurant";
import { TableModel } from "./models/Table";
import { CustomerModel } from "./models/Customer";
import { OrderModel } from "./models/Order";
import { MenuItemModel } from "./models/MenuItem";
import { OrderRatingModel } from "./models/OrderRating";
import * as ratingCtrl from "./controllers/rating.controller";

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

async function runTests() {
  const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/pos";
  console.log("Connecting to test db at:", uri);
  await mongoose.connect(uri);

  try {
    // 1. Setup Mock Restaurant & Related Entities
    console.log("Setting up mock database entities...");
    const restaurant = await RestaurantModel.create({
      name: "Test Garden",
      slug: "test-garden",
      address: "123 Test St",
      contactPhone: "555-999-8888",
      contactEmail: "test@garden.com",
      subscriptionPlan: "pro",
      isActive: true,
    });

    const table1 = await TableModel.create({
      restaurantId: restaurant._id,
      label: "Table T1",
      capacity: 4,
      location: "Indoor",
      qrToken: "token123",
      qrCodeUrl: "url123",
      status: "occupied",
    });

    const customer1 = await CustomerModel.create({
      restaurantId: restaurant._id,
      name: "Alice Tester",
      mobileNumber: "555-111-2222",
    });

    const menuItem1 = await MenuItemModel.create({
      restaurantId: restaurant._id,
      categoryId: new mongoose.Types.ObjectId(),
      name: "Garlic Bread",
      description: "Yummy",
      price: 5.99,
      isAvailable: true,
      ingredients: [],
      avgRating: 4.0,
      ratingCount: 1, // Start with 1 rating of 4.0
    });

    const orderPlaced = await OrderModel.create({
      restaurantId: restaurant._id,
      tableId: table1._id,
      customerId: customer1._id,
      items: [
        {
          menuItemId: menuItem1._id,
          name: "Garlic Bread",
          price: 5.99,
          quantity: 1,
          itemStatus: "queued",
        },
      ],
      status: "placed",
      subtotal: 5.99,
      tax: 0.3,
      total: 6.29,
    });

    const orderServed = await OrderModel.create({
      restaurantId: restaurant._id,
      tableId: table1._id,
      customerId: customer1._id,
      items: [
        {
          menuItemId: menuItem1._id,
          name: "Garlic Bread",
          price: 5.99,
          quantity: 1,
          itemStatus: "served",
        },
      ],
      status: "served",
      subtotal: 5.99,
      tax: 0.3,
      total: 6.29,
    });

    // 2. RUN TEST SUITE
    console.log("\n--- Starting Tests ---");

    // Test 1: Submit rating for an order that is NOT served or billed
    console.log("Test 1: Submit rating on 'placed' order...");
    const req1 = {
      params: { id: orderPlaced._id.toString() },
      customer: { customerId: customer1._id.toString(), tableId: table1._id.toString(), restaurantId: restaurant._id.toString() },
      body: {
        overallRating: 5,
        overallComment: "Great!",
        dishRatings: [],
      },
    } as any;
    const res1 = mockResponse();
    await ratingCtrl.createOrUpdateRating(req1, res1);
    console.log("Result status:", res1.statusCode, "(Expected: 400)");
    if (res1.statusCode !== 400) throw new Error("Test 1 failed");

    // Test 2: Submit rating from a different table session
    console.log("Test 2: Submit rating from different table session...");
    const req2 = {
      params: { id: orderServed._id.toString() },
      customer: { customerId: customer1._id.toString(), tableId: new mongoose.Types.ObjectId().toString(), restaurantId: restaurant._id.toString() },
      body: {
        overallRating: 5,
        overallComment: "Great!",
        dishRatings: [],
      },
    } as any;
    const res2 = mockResponse();
    await ratingCtrl.createOrUpdateRating(req2, res2);
    console.log("Result status:", res2.statusCode, "(Expected: 403)");
    if (res2.statusCode !== 403) throw new Error("Test 2 failed");

    // Test 3: Submit dish rating for item not in the order
    console.log("Test 3: Submit dish rating for item not in the order...");
    const req3 = {
      params: { id: orderServed._id.toString() },
      customer: { customerId: customer1._id.toString(), tableId: table1._id.toString(), restaurantId: restaurant._id.toString() },
      body: {
        overallRating: 5,
        overallComment: "Great!",
        dishRatings: [{ menuItemId: new mongoose.Types.ObjectId().toString(), rating: 5 }],
      },
    } as any;
    const res3 = mockResponse();
    await ratingCtrl.createOrUpdateRating(req3, res3);
    console.log("Result status:", res3.statusCode, "(Expected: 400)");
    if (res3.statusCode !== 400) throw new Error("Test 3 failed");

    // Test 4: Submit a valid rating (overall = 5, dish rating = 5)
    console.log("Test 4: Submit valid rating...");
    const req4 = {
      params: { id: orderServed._id.toString() },
      customer: { customerId: customer1._id.toString(), tableId: table1._id.toString(), restaurantId: restaurant._id.toString() },
      body: {
        overallRating: 5,
        overallComment: "Amazing food!",
        dishRatings: [{ menuItemId: menuItem1._id.toString(), rating: 5 }],
      },
    } as any;
    const res4 = mockResponse();
    await ratingCtrl.createOrUpdateRating(req4, res4);
    console.log("Result status:", res4.statusCode, "(Expected: 201)");
    if (res4.statusCode !== 201) throw new Error("Test 4 failed");

    // Verify MenuItem rating count and average
    // Starting state was avg: 4.0, count: 1. Adding 5 should make:
    // count: 2, avg: (4.0 * 1 + 5) / 2 = 4.5
    const menuItem1Updated = await MenuItemModel.findById(menuItem1._id);
    console.log("MenuItem1 avgRating:", menuItem1Updated?.avgRating, "(Expected: 4.5)");
    console.log("MenuItem1 ratingCount:", menuItem1Updated?.ratingCount, "(Expected: 2)");
    if (menuItem1Updated?.avgRating !== 4.5 || menuItem1Updated?.ratingCount !== 2) {
      throw new Error("Test 4 math verification failed");
    }

    // Test 5: Edit rating within 30 minutes window (dish rating edit to 3)
    console.log("Test 5: Edit rating within 30 minutes...");
    const req5 = {
      params: { id: orderServed._id.toString() },
      customer: { customerId: customer1._id.toString(), tableId: table1._id.toString(), restaurantId: restaurant._id.toString() },
      body: {
        overallRating: 4,
        overallComment: "Still good, but not perfect",
        dishRatings: [{ menuItemId: menuItem1._id.toString(), rating: 3 }],
      },
    } as any;
    const res5 = mockResponse();
    await ratingCtrl.createOrUpdateRating(req5, res5);
    console.log("Result status:", res5.statusCode, "(Expected: 200)");
    if (res5.statusCode !== 200) throw new Error("Test 5 failed");

    // Verify MenuItem average rating update:
    // Initial was: 4.0, count 1. Added 5 (avg became 4.5, count 2).
    // Now edited from 5 to 3. New average should be:
    // avg = (4.0 * 1 + 3) / 2 = 3.5
    const menuItem1Edited = await MenuItemModel.findById(menuItem1._id);
    console.log("MenuItem1 avgRating after edit:", menuItem1Edited?.avgRating, "(Expected: 3.5)");
    if (menuItem1Edited?.avgRating !== 3.5 || menuItem1Edited?.ratingCount !== 2) {
      throw new Error("Test 5 math verification failed");
    }

    // Test 6: Try to edit rating after the 30-minute window (simulate edit window expired)
    console.log("Test 6: Edit rating after edit window...");
    // Manually backdate the rating createdAt field in DB
    const ratingObj = await OrderRatingModel.findOne({ orderId: orderServed._id });
    console.log("ratingObj before backdate:", ratingObj);
    if (ratingObj) {
      const updateRes = await OrderRatingModel.collection.updateOne(
        { _id: ratingObj._id as any },
        { $set: { createdAt: new Date(Date.now() - 40 * 60 * 1000) } }
      );
      console.log("Update result:", updateRes);
      const ratingObjAfter = await OrderRatingModel.findOne({ orderId: orderServed._id });
      console.log("ratingObj after backdate:", ratingObjAfter);
    }

    const req6 = {
      params: { id: orderServed._id.toString() },
      customer: { customerId: customer1._id.toString(), tableId: table1._id.toString(), restaurantId: restaurant._id.toString() },
      body: {
        overallRating: 5,
        overallComment: "Actually changed my mind",
        dishRatings: [{ menuItemId: menuItem1._id.toString(), rating: 5 }],
      },
    } as any;
    const res6 = mockResponse();
    await ratingCtrl.createOrUpdateRating(req6, res6);
    console.log("Result status:", res6.statusCode, "(Expected: 403)");
    console.log("Result message:", res6.body?.message, "(Expected: ratings can no longer be edited)");
    if (res6.statusCode !== 403 || res6.body?.message !== "ratings can no longer be edited") {
      throw new Error("Test 6 failed");
    }

    // Test 7: Settle/Resolve followup flagged low rating
    console.log("Test 7: Settle/Resolve low rating follow up...");
    // Create a low rating to trigger follow up flag
    const orderLow = await OrderModel.create({
      restaurantId: restaurant._id,
      tableId: table1._id,
      customerId: customer1._id,
      items: [{ menuItemId: menuItem1._id, name: "Garlic Bread", price: 5.99, quantity: 1, itemStatus: "served" }],
      status: "served",
      subtotal: 5.99,
      tax: 0.3,
      total: 6.29,
    });

    const req7_create = {
      params: { id: orderLow._id.toString() },
      customer: { customerId: customer1._id.toString(), tableId: table1._id.toString(), restaurantId: restaurant._id.toString() },
      body: {
        overallRating: 2, // low rating
        overallComment: "Terrible service",
        dishRatings: [],
      },
    } as any;
    const res7_create = mockResponse();
    await ratingCtrl.createOrUpdateRating(req7_create, res7_create);
    const createdRating = res7_create.body;
    console.log("Created rating flaggedForFollowUp:", createdRating.flaggedForFollowUp, "(Expected: true)");

    const req7_resolve = {
      params: { id: createdRating._id.toString() },
      user: { id: new mongoose.Types.ObjectId().toString(), restaurantId: restaurant._id.toString() },
    } as any;
    const res7_resolve = mockResponse();
    await ratingCtrl.resolveFollowUp(req7_resolve, res7_resolve);
    console.log("Resolve followup status:", res7_resolve.statusCode, "(Expected: 200)");
    console.log("Resolved rating flaggedForFollowUp:", res7_resolve.body.flaggedForFollowUp, "(Expected: false)");
    console.log("Resolved by staff:", !!res7_resolve.body.resolvedByStaffId, "(Expected: true)");

    if (res7_resolve.statusCode !== 200 || res7_resolve.body.flaggedForFollowUp !== false || !res7_resolve.body.resolvedByStaffId) {
      throw new Error("Test 7 failed");
    }

    console.log("\n--- All Tests Passed Successfully! ---");
  } finally {
    // Cleanup test data
    console.log("Cleaning up database collections...");
    await RestaurantModel.deleteMany({ name: "Test Garden" });
    await TableModel.deleteMany({ qrToken: "token123" });
    await CustomerModel.deleteMany({ mobileNumber: "555-111-2222" });
    await MenuItemModel.deleteMany({ name: "Garlic Bread", description: "Yummy" });
    await OrderModel.deleteMany({ subtotal: 5.99 });
    await OrderRatingModel.deleteMany({});
    await mongoose.disconnect();
  }
}

runTests().catch((err) => {
  console.error("Test suite failed:", err);
  mongoose.disconnect();
  process.exit(1);
});
