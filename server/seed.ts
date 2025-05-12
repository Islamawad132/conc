import { storage } from './storage';
import { hashPassword } from './auth';
import { db } from "./db";
import { users, UserRole } from "@shared/schema";

async function seedUsers() {
  try {
    // Admin user
    const adminUser = await storage.getUserByUsername('admin');
    if (!adminUser) {
      await storage.createUser({
        username: 'admin',
        password: await hashPassword('admin123'),
        name: 'مسؤول النظام',
        role: 'admin',
        email: 'admin@example.com',
        phone: '01234567890'
      });
      console.log('Admin user created');
    }

    // Secretary user
    const secretaryUser = await storage.getUserByUsername('secretary');
    if (!secretaryUser) {
      await storage.createUser({
        username: 'secretary',
        password: await hashPassword('secretary123'),
        name: 'سكرتير',
        role: 'secretary',
        email: 'secretary@example.com',
        phone: '01234567891'
      });
      console.log('Secretary user created');
    }

    // Engineer user
    const engineerUser = await storage.getUserByUsername('engineer');
    if (!engineerUser) {
      await storage.createUser({
        username: 'engineer',
        password: await hashPassword('engineer123'),
        name: 'مهندس',
        role: 'engineer',
        email: 'engineer@example.com',
        phone: '01234567892'
      });
      console.log('Engineer user created');
    }

    // Client user
    const clientUser = await storage.getUserByUsername('client');
    if (!clientUser) {
      await storage.createUser({
        username: 'client',
        password: await hashPassword('client123'),
        name: 'عميل',
        role: 'client',
        email: 'client@example.com',
        phone: '01234567893'
      });
      console.log('Client user created');
    }

    // Chairman users
    const chairmen = [
      {
        username: 'chairman1',
        password: 'chairmanpass',
        name: 'د. أحمد محمد علي',
        role: 'chairman' as const,
        email: 'chairman1@example.com',
        phone: '01234567894'
      },
      {
        username: 'chairman2',
        password: 'chairmanpass2',
        name: 'د. محمد عبدالله حسن',
        role: 'chairman' as const,
        email: 'chairman2@example.com',
        phone: '01234567895'
      },
      {
        username: 'chairman3',
        password: 'chairmanpass3',
        name: 'د. خالد محمود سعيد',
        role: 'chairman' as const,
        email: 'chairman3@example.com',
        phone: '01234567896'
      },
      {
        username: 'chairman4',
        password: 'chairmanpass4',
        name: 'د. محمود علي حسين',
        role: 'chairman' as const,
        email: 'chairman4@example.com',
        phone: '01234567897'
      },
      {
        username: 'chairman5',
        password: 'chairmanpass5',
        name: 'د. علي محمد عبدالرحمن',
        role: 'chairman' as const,
        email: 'chairman5@example.com',
        phone: '01234567898'
      }
    ];

    for (const chairman of chairmen) {
      const existingChairman = await storage.getUserByUsername(chairman.username);
      if (!existingChairman) {
        await storage.createUser({
          ...chairman,
          password: await hashPassword(chairman.password)
        });
        console.log(`Chairman ${chairman.name} created`);
      }
    }

    console.log('Seed completed successfully');
  } catch (error) {
    console.error('Error seeding users:', error);
  }
}

async function seed() {
  await db.delete(users);
  const now = new Date();
  const userList = [
    { username: "admin", password: "adminpass", name: "مسؤول النظام", role: "admin" as UserRole, active: true, createdAt: now, updatedAt: now },
    { username: "secretary1", password: "secretarypass", name: "سكرتير 1", role: "secretary" as UserRole, active: true, createdAt: now, updatedAt: now },
    { username: "engineer1", password: "engineerpass", name: "مهندس 1", role: "engineer" as UserRole, active: true, createdAt: now, updatedAt: now },
    { username: "chairman1", password: "chairmanpass", name: "د. أحمد محمد علي", role: "chairman" as UserRole, active: true, createdAt: now, updatedAt: now },
    { username: "secretary2", password: "secretarypass2", name: "سكرتير 2", role: "secretary" as UserRole, active: true, createdAt: now, updatedAt: now },
    { username: "engineer2", password: "engineerpass2", name: "مهندس 2", role: "engineer" as UserRole, active: true, createdAt: now, updatedAt: now },
    { username: "chairman2", password: "chairmanpass2", name: "د. محمد عبدالله حسن", role: "chairman" as UserRole, active: true, createdAt: now, updatedAt: now },
    { username: "chairman3", password: "chairmanpass3", name: "د. خالد محمود سعيد", role: "chairman" as UserRole, active: true, createdAt: now, updatedAt: now },
    { username: "chairman4", password: "chairmanpass4", name: "د. محمود علي حسين", role: "chairman" as UserRole, active: true, createdAt: now, updatedAt: now },
    { username: "chairman5", password: "chairmanpass5", name: "د. علي محمد عبدالرحمن", role: "chairman" as UserRole, active: true, createdAt: now, updatedAt: now },
    { username: "client1", password: "clientpass", name: "عميل 1", role: "client" as UserRole, active: true, createdAt: now, updatedAt: now },
  ];
  for (const user of userList) {
    await db.insert(users).values(user);
  }
  console.log("Seeded users with various roles.");
}

// Run the seed
seedUsers();
seed().then(() => process.exit()); 