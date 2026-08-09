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
    }
    console.log("Seeded Tables with base64 QR codes.");

    console.log("Database seeded successfully.");
    process.exit(0);
  } catch (error) {
    console.error("Seeding failed:", error);
    process.exit(1);
  }
}

seed();
