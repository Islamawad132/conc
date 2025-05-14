import { storage } from './storage';
import { hashPassword } from './auth';
import { db } from "./db";
import { users, UserRole, approvalTypes, mixingTypes } from "@shared/schema";

async function seedDefaultUsers() {
  try {
    console.log("Starting to seed default users...");
    
    // Clear existing users
    console.log("Clearing existing users...");
    await db.delete(users);
    console.log("Existing users cleared");
    
    // Default users from README
    const defaultUsers = [
      {
        username: 'admin',
        password: 'admin123',
        name: 'مسؤول النظام',
        role: 'admin' as UserRole,
        email: 'admin@example.com',
        phone: '01234567890'
      },
      {
        username: 'secretary',
        password: 'secretary123',
        name: 'سكرتير',
        role: 'secretary' as UserRole,
        email: 'secretary@example.com',
        phone: '01234567891'
      },
      {
        username: 'engineer',
        password: 'engineer123',
        name: 'مهندس',
        role: 'engineer' as UserRole,
        email: 'engineer@example.com',
        phone: '01234567892'
      },
      {
        username: 'client',
        password: 'client123',
        name: 'عميل',
        role: 'client' as UserRole,
        email: 'client@example.com',
        phone: '01234567893'
      }
    ];

    // Create each user with hashed password
    for (const user of defaultUsers) {
      const hashedPassword = await hashPassword(user.password);
      await storage.createUser({
        ...user,
        password: hashedPassword
      });
      console.log(`Created ${user.role} user: ${user.username}`);
    }

    console.log("Default users seeded successfully!");
  } catch (error) {
    console.error("Error seeding default users:", error);
    throw error;
  }
}

async function seedApprovalTypes() {
  try {
    console.log("Starting to seed approval types...");
    
    // Clear existing approval types
    await db.delete(approvalTypes);
    
    const types = [
      { name: "first-time" },
      { name: "renewal" }
    ];
    
    for (const type of types) {
      await db.insert(approvalTypes).values(type);
      console.log(`Created approval type: ${type.name}`);
    }
    
    console.log("Approval types seeded successfully!");
  } catch (error) {
    console.error("Error seeding approval types:", error);
    throw error;
  }
}

async function seedMixingTypes() {
  try {
    console.log("Starting to seed mixing types...");
    
    // Clear existing mixing types
    await db.delete(mixingTypes);
    
    const types = [
      { name: "normal" },
      { name: "dry" }
    ];
    
    for (const type of types) {
      await db.insert(mixingTypes).values(type);
      console.log(`Created mixing type: ${type.name}`);
    }
    
    console.log("Mixing types seeded successfully!");
  } catch (error) {
    console.error("Error seeding mixing types:", error);
    throw error;
  }
}

// Run all seeds
async function seedAll() {
  try {
    // Seed data
    await seedDefaultUsers();
    await seedApprovalTypes();
    await seedMixingTypes();
    
    console.log("All data seeded successfully!");
  } catch (error) {
    console.error("Error in seed process:", error);
    process.exit(1);
  }
}

// Run the seed
seedAll().then(() => {
  console.log("Seeding completed");
  process.exit(0);
}); 