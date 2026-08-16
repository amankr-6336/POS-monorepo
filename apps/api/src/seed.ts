import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import QRCode from "qrcode";
import { RestaurantModel } from "./models/Restaurant";
import { StaffUserModel } from "./models/StaffUser";
import { IngredientModel } from "./models/Ingredient";
import { CategoryModel } from "./models/Category";
import { MenuItemModel } from "./models/MenuItem";
import { TableModel } from "./models/Table";
import { CustomerModel } from "./models/Customer";
import { OrderModel } from "./models/Order";
import { BillModel } from "./models/Bill";

const CLIENT_CUSTOMER_URL = process.env.CLIENT_CUSTOMER_URL || "http://localhost:5174";

async function seed() {
  const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/pos";
  console.log("Seeding database at:", uri);
  
  try {
    await mongoose.connect(uri);

    // Clear existing data
    await RestaurantModel.deleteMany({});
    await StaffUserModel.deleteMany({});
    await IngredientModel.deleteMany({});
    await CategoryModel.deleteMany({});
    await MenuItemModel.deleteMany({});
    await TableModel.deleteMany({});
    await CustomerModel.deleteMany({});
    await OrderModel.deleteMany({});
    await BillModel.deleteMany({});
    console.log("Cleared existing collections.");

    // 1. Create Restaurant Tenant
    const restaurant = new RestaurantModel({
      name: "Gourmet Garden",
      slug: "gourmet-garden",
      logoUrl: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=120&h=120&q=80",
      address: "123 Orchard Lane, Culinary Heights",
      contactPhone: "555-019-2834",
      contactEmail: "hello@gourmetgarden.com",
      cuisineTags: ["Italian", "Continental", "Fusion"],
      subscriptionPlan: "pro",
      isActive: true,
    });
    await restaurant.save();
    console.log("Seeded Restaurant:", restaurant.name);

    // 2. Create Staff Accounts
    const passwordHash = bcrypt.hashSync("password", 10);
    
    const owner = new StaffUserModel({
      restaurantId: restaurant._id,
      name: "Aman Owner",
      email: "owner@gourmet.com",
      passwordHash,
      role: "owner",
      isActive: true,
    });
    await owner.save();

    const chef = new StaffUserModel({
      restaurantId: restaurant._id,
      name: "Chef Mario",
      email: "chef@gourmet.com",
      passwordHash,
      role: "chef",
      assignedStation: "main-kitchen",
      isActive: true,
    });
    await chef.save();

    const waiter = new StaffUserModel({
      restaurantId: restaurant._id,
      name: "Sarah Waiter",
      email: "waiter@gourmet.com",
      passwordHash,
      role: "waiter",
      isActive: true,
    });
    await waiter.save();
    console.log("Seeded Staff Users (password is 'password').");

    // 3. Create Ingredients (Inventory)
    const pizzaCrust = new IngredientModel({
      restaurantId: restaurant._id,
      name: "Pizza Crust",
      unit: "pcs",
      currentStock: 100,
      lowStockThreshold: 10,
      costPerUnit: 1.5,
    });
    await pizzaCrust.save();

    const cheese = new IngredientModel({
      restaurantId: restaurant._id,
      name: "Mozzarella Cheese",
      unit: "g",
      currentStock: 15000, // 15kg
      lowStockThreshold: 2000,
      costPerUnit: 0.01,
    });
    await cheese.save();

    const tomatoSauce = new IngredientModel({
      restaurantId: restaurant._id,
      name: "Tomato Sauce",
      unit: "ml",
      currentStock: 20000, // 20L
      lowStockThreshold: 3000,
      costPerUnit: 0.005,
    });
    await tomatoSauce.save();

    const basil = new IngredientModel({
      restaurantId: restaurant._id,
      name: "Fresh Basil",
      unit: "pcs",
      currentStock: 200,
      lowStockThreshold: 30,
      costPerUnit: 0.1,
    });
    await basil.save();

    const paneer = new IngredientModel({
      restaurantId: restaurant._id,
      name: "Cottage Paneer",
      unit: "g",
      currentStock: 5000, // 5kg
      lowStockThreshold: 1000,
      costPerUnit: 0.008,
    });
    await paneer.save();
    console.log("Seeded Ingredients.");

    // 4. Create Categories
    const starters = new CategoryModel({
      restaurantId: restaurant._id,
      name: "Starters",
      order: 0,
      subcategories: [
        { name: "Breads", order: 0 },
        { name: "Salads", order: 1 },
      ],
    });
    await starters.save();

    const mains = new CategoryModel({
      restaurantId: restaurant._id,
      name: "Mains",
      order: 1,
      subcategories: [
        { name: "Pizzas", order: 0 },
        { name: "Pasta", order: 1 },
      ],
    });
    await mains.save();

    const drinks = new CategoryModel({
      restaurantId: restaurant._id,
      name: "Drinks",
      order: 2,
      subcategories: [
        { name: "Mocktails", order: 0 },
        { name: "Soft Drinks", order: 1 },
      ],
    });
    await drinks.save();
    console.log("Seeded Categories.");

    // 5. Create Menu Items
    const garlicBread = new MenuItemModel({
      restaurantId: restaurant._id,
      categoryId: starters._id,
      subcategoryId: starters.subcategories[0]._id, // Breads
      name: "Tuscan Garlic Bread",
      description: "Crispy ciabatta slices rubbed with fresh garlic, topped with melted mozzarella cheese and oregano.",
      imageUrl: "https://images.unsplash.com/photo-1573140247632-f8fd74997d5c?auto=format&fit=crop&w=400&h=300&q=80",
      price: 6.99,
      calories: 320,
      dietaryTags: ["veg"],
      spiceLevel: "mild",
      ingredients: [
        { ingredientId: cheese._id, quantity: 80, unit: "g" },
      ],
      isAvailable: true,
      isOutOfStock: false,
      prepStation: "main-kitchen",
      avgPrepTimeMinutes: 8,
    });
    await garlicBread.save();

    const paneerTikka = new MenuItemModel({
      restaurantId: restaurant._id,
      categoryId: starters._id,
      subcategoryId: starters.subcategories[1]._id, // Salads/skewers
      name: "Clay Oven Paneer Tikka",
      description: "Cubes of paneer marinated in yogurt spices, grilled in a charcoal tandoor with onions and bell peppers.",
      imageUrl: "https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?auto=format&fit=crop&w=400&h=300&q=80",
      price: 11.99,
      calories: 450,
      dietaryTags: ["veg", "gluten-free"],
      spiceLevel: "medium",
      ingredients: [
        { ingredientId: paneer._id, quantity: 200, unit: "g" },
        { ingredientId: tomatoSauce._id, quantity: 50, unit: "ml" },
      ],
      isAvailable: true,
      isOutOfStock: false,
      prepStation: "grill",
      avgPrepTimeMinutes: 12,
    });
    await paneerTikka.save();

    const margherita = new MenuItemModel({
      restaurantId: restaurant._id,
      categoryId: mains._id,
      subcategoryId: mains.subcategories[0]._id, // Pizzas
      name: "Classic Margherita Pizza",
      description: "Woodfired pizza base topped with san marzano tomato sauce, fresh mozzarella cheese rounds, and basil leaves.",
      imageUrl: "https://images.unsplash.com/photo-1604068549290-dea0e4a305ca?auto=format&fit=crop&w=400&h=300&q=80",
      price: 13.99,
      calories: 780,
      dietaryTags: ["veg"],
      spiceLevel: "mild",
      ingredients: [
        { ingredientId: pizzaCrust._id, quantity: 1, unit: "pcs" },
        { ingredientId: cheese._id, quantity: 150, unit: "g" },
        { ingredientId: tomatoSauce._id, quantity: 100, unit: "ml" },
        { ingredientId: basil._id, quantity: 4, unit: "pcs" },
      ],
      isAvailable: true,
      isOutOfStock: false,
      prepStation: "main-kitchen",
      avgPrepTimeMinutes: 10,
    });
    await margherita.save();
    console.log("Seeded Menu Items.");

    // 6. Create Tables & QR codes
    const tableLabels = [
      { label: "Table 1 (Indoor)", capacity: 2, location: "Indoor" },
      { label: "Table 2 (Window)", capacity: 4, location: "Window Side" },
      { label: "Table 3 (Patio)", capacity: 4, location: "Patio" },
      { label: "Table 4 (Bar)", capacity: 2, location: "Bar Side" },
    ];

    const tables = [];
    for (const tInfo of tableLabels) {
      const qrToken = crypto.randomBytes(16).toString("hex");
      const qrUrl = `${CLIENT_CUSTOMER_URL}/r/${restaurant.slug}/t/${qrToken}`;
      const qrCodeUrl = await QRCode.toDataURL(qrUrl);

      const table = new TableModel({
        restaurantId: restaurant._id,
        label: tInfo.label,
        capacity: tInfo.capacity,
        location: tInfo.location,
        qrToken,
        qrCodeUrl,
        status: "available",
      });
      await table.save();
      tables.push(table);
    }
    console.log("Seeded Tables with base64 QR codes.");

    // 7. Seed Customers
    const customerNames = [
      "Liam Miller", "Olivia Davis", "Noah Garcia", "Emma Rodriguez",
      "Oliver Wilson", "Ava Thomas", "Elijah Martinez", "Charlotte Anderson"
    ];
    const customers = [];
    for (let i = 0; i < customerNames.length; i++) {
      const customer = new CustomerModel({
        restaurantId: restaurant._id,
        name: customerNames[i],
        mobileNumber: `555-010-000${i}`,
        visitCount: Math.floor(Math.random() * 5) + 1,
        totalSpend: 0,
        lastVisitAt: new Date(),
      });
      await customer.save();
      customers.push(customer);
    }
    console.log("Seeded Customers.");

    // 8. Seed Historical Orders & Bills (last 30 days)
    const menuItems = [garlicBread, paneerTikka, margherita];
    
    // Generate ~120 historical orders over the last 30 days
    const totalMockOrders = 120;
    const ordersToInsert = [];
    const billsToInsert = [];

    const now = new Date();

    for (let i = 0; i < totalMockOrders; i++) {
      // Pick random customer
      const cust = customers[Math.floor(Math.random() * customers.length)];
      // Pick random table
      const tbl = tables[Math.floor(Math.random() * tables.length)];
      
      // Determine date: distribute evenly or with weekend clusters
      const daysAgo = Math.floor(Math.random() * 30);
      
      // Hour of day: peak around lunch (12-14) and dinner (19-21)
      let hour = 12;
      const randType = Math.random();
      if (randType < 0.3) {
        hour = 12 + Math.floor(Math.random() * 3); // 12, 13, 14
      } else if (randType < 0.7) {
        hour = 19 + Math.floor(Math.random() * 3); // 19, 20, 21
      } else {
        hour = 8 + Math.floor(Math.random() * 14); // 8 to 22
      }
      
      const minute = Math.floor(Math.random() * 60);
      const placedDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
      placedDate.setHours(hour, minute, 0, 0);

      // Select 1 to 3 items
      const itemCount = Math.floor(Math.random() * 3) + 1;
      const orderItems = [];
      let subtotal = 0;

      for (let j = 0; j < itemCount; j++) {
        // Pick random menu item
        const item = menuItems[Math.floor(Math.random() * menuItems.length)];
        const qty = Math.floor(Math.random() * 2) + 1;
        orderItems.push({
          menuItemId: item._id,
          name: item.name,
          price: item.price,
          quantity: qty,
          itemStatus: "served" as const,
          specialInstructions: Math.random() > 0.8 ? "Extra cheese" : "",
          prepStation: item.prepStation,
        });
        subtotal += item.price * qty;
      }

      const tax = parseFloat((subtotal * 0.05).toFixed(2));
      const serviceCharge = parseFloat((subtotal * 0.02).toFixed(2));
      const total = parseFloat((subtotal + tax + serviceCharge).toFixed(2));

      // Decide status: 85% billed/completed, 10% served, 5% cancelled
      let status = "billed";
      const statusRand = Math.random();
      if (statusRand < 0.05) {
        status = "cancelled";
      } else if (statusRand < 0.15) {
        status = "served";
      }

      const order = new OrderModel({
        restaurantId: restaurant._id,
        tableId: tbl._id,
        customerId: cust._id,
        items: orderItems,
        status,
        placedAt: placedDate,
        subtotal,
        tax,
        serviceCharge,
        total,
        notes: "",
        createdAt: placedDate,
        updatedAt: placedDate,
      });

      ordersToInsert.push(order);

      // Create a bill for billed orders
      if (status === "billed") {
        const bill = new BillModel({
          restaurantId: restaurant._id,
          orderId: order._id,
          tableLabel: tbl.label,
          items: orderItems.map(oi => ({
            menuItemId: oi.menuItemId,
            name: oi.name,
            price: oi.price,
            quantity: oi.quantity,
          })),
          subtotal,
          tax,
          serviceCharge,
          total,
          generatedAt: placedDate,
          paymentStatus: Math.random() > 0.1 ? "settled_externally" : "pending",
          createdAt: placedDate,
          updatedAt: placedDate,
        });
        billsToInsert.push(bill);
        
        // Update customer spending
        cust.totalSpend = parseFloat((cust.totalSpend + total).toFixed(2));
      }
    }

    await OrderModel.insertMany(ordersToInsert);
    await BillModel.insertMany(billsToInsert);
    
    // Save updated customer total spendings
    for (const cust of customers) {
      await cust.save();
    }
    console.log(`Seeded ${totalMockOrders} historical orders & bills.`);

    console.log("Database seeded successfully.");
    process.exit(0);
  } catch (error) {
    console.error("Seeding failed:", error);
    process.exit(1);
  }
}

seed();
