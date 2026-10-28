import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import { StaffUserModel } from "./models/StaffUser";

dotenv.config();

async function updateStaffPins() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("MONGODB_URI is not defined in .env");
    process.exit(1);
  }

  console.log("Connecting to MongoDB Atlas...");
  await mongoose.connect(uri);

  const staff = await StaffUserModel.find({});
  console.log(`Found ${staff.length} staff members.`);

  for (const s of staff) {
    let defaultPin = "1234";
    if (s.role === "owner") defaultPin = "1111";
    if (s.role === "chef") defaultPin = "2222";

    s.pinHash = await bcrypt.hash(defaultPin, 10);
    s.pinAttempts = 0;
    s.pinLockedUntil = null;
    await s.save();
    console.log(`✓ Set PIN '${defaultPin}' for ${s.name} (${s.email}, role: ${s.role})`);
  }

  await mongoose.disconnect();
  console.log("\nAll staff PINs updated successfully!");
}

updateStaffPins().catch((err) => {
  console.error("Failed to update staff PINs:", err);
  process.exit(1);
});
