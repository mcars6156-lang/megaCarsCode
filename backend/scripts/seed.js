// Run: node backend/scripts/seed.js
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Car  = require('../models/Car');
const User = require('../models/User');

const cars = [
  { brand: 'Toyota',   model: 'Camry',       year: 2022, price: 24000, mileage: 18000, color: 'White',      fuel: 'petrol',   transmission: 'automatic', bodyType: 'sedan',    condition: 'used',      status: 'available', description: 'Well maintained, single owner, full service history.' },
  { brand: 'Toyota',   model: 'Land Cruiser', year: 2021, price: 72000, mileage: 32000, color: 'Silver',     fuel: 'diesel',   transmission: 'automatic', bodyType: 'suv',      condition: 'used',      status: 'available', description: 'Premium SUV, leather interior, panoramic roof.' },
  { brand: 'Hyundai',  model: 'Tucson',       year: 2023, price: 31000, mileage:  5000, color: 'Blue',       fuel: 'petrol',   transmission: 'automatic', bodyType: 'suv',      condition: 'new',       status: 'available', description: 'Brand new 2023 model, full warranty.' },
  { brand: 'Kia',      model: 'Sportage',     year: 2022, price: 27500, mileage: 22000, color: 'Black',      fuel: 'petrol',   transmission: 'automatic', bodyType: 'suv',      condition: 'used',      status: 'available', description: 'Excellent condition, low mileage, premium trim.' },
  { brand: 'Honda',    model: 'Civic',        year: 2021, price: 19000, mileage: 41000, color: 'Red',        fuel: 'petrol',   transmission: 'automatic', bodyType: 'sedan',    condition: 'used',      status: 'available', description: 'Sporty design, fuel-efficient engine.' },
  { brand: 'BMW',      model: '320i',         year: 2020, price: 38000, mileage: 55000, color: 'Gray',       fuel: 'petrol',   transmission: 'automatic', bodyType: 'sedan',    condition: 'certified', status: 'available', description: 'Certified pre-owned, BMW warranty included.' },
  { brand: 'Mercedes', model: 'C200',         year: 2021, price: 45000, mileage: 28000, color: 'Black',      fuel: 'petrol',   transmission: 'automatic', bodyType: 'sedan',    condition: 'used',      status: 'available', description: 'Luxury sedan, AMG package, low mileage.' },
  { brand: 'Nissan',   model: 'Patrol',       year: 2020, price: 55000, mileage: 67000, color: 'White',      fuel: 'petrol',   transmission: 'automatic', bodyType: 'suv',      condition: 'used',      status: 'pending',   description: 'V8 engine, 7 seats, bull bar included.' },
  { brand: 'Ford',     model: 'F-150',        year: 2022, price: 48000, mileage: 15000, color: 'Blue',       fuel: 'petrol',   transmission: 'automatic', bodyType: 'pickup',   condition: 'used',      status: 'available', description: 'Full-size pickup, towing package, tough bed liner.' },
  { brand: 'Kia',      model: 'Cerato',       year: 2023, price: 21000, mileage:  2000, color: 'White',      fuel: 'petrol',   transmission: 'automatic', bodyType: 'sedan',    condition: 'new',       status: 'available', description: 'Latest 2023 model, 5-year warranty.' },
  { brand: 'Mitsubishi',model:'Pajero',       year: 2019, price: 34000, mileage: 82000, color: 'Silver',     fuel: 'diesel',   transmission: 'automatic', bodyType: 'suv',      condition: 'used',      status: 'sold',      description: 'Classic 4x4, well serviced, GLS trim.' },
  { brand: 'Chevrolet',model: 'Tahoe',        year: 2021, price: 58000, mileage: 39000, color: 'Black',      fuel: 'petrol',   transmission: 'automatic', bodyType: 'suv',      condition: 'used',      status: 'available', description: 'Full-size SUV, 8 seats, premium sound system.' },
  { brand: 'Toyota',   model: 'Hilux',        year: 2022, price: 42000, mileage: 11000, color: 'Gray',       fuel: 'diesel',   transmission: 'manual',    bodyType: 'pickup',   condition: 'used',      status: 'available', description: 'Double cab, 4WD, diesel engine.' },
  { brand: 'Hyundai',  model: 'Elantra',      year: 2023, price: 20000, mileage:  3000, color: 'Pearl White',fuel: 'petrol',   transmission: 'automatic', bodyType: 'sedan',    condition: 'new',       status: 'available', description: 'Smart sedan with advanced safety features.' },
  { brand: 'Audi',     model: 'A4',           year: 2020, price: 41000, mileage: 47000, color: 'Dark Blue',  fuel: 'petrol',   transmission: 'automatic', bodyType: 'sedan',    condition: 'certified', status: 'available', description: 'Quattro AWD, S-Line package, Audi certified.' },
];

const users = [
  { name: 'Admin User',  email: 'admin@megacars.com',  phone: '+964 750 000 0001', password: 'Admin@1234',  role: 'admin', city: 'Dohok', address: 'Dohok, Iraq' },
  { name: 'Staff Member',email: 'staff@megacars.com',  phone: '+964 750 000 0002', password: 'Staff@1234',  role: 'user',  city: 'Dohok', address: 'Dohok, Iraq' },
  { name: 'John Smith',  email: 'john@example.com',    phone: '+964 750 111 1111', password: 'User@1234',   role: 'user',  city: 'Dohok', address: '12 Main St, Dohok' },
];

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Cars
    await Car.deleteMany({});
    const inserted = await Car.insertMany(cars);
    console.log(`✔ Inserted ${inserted.length} cars`);

    // Users (skip if already exist)
    for (const u of users) {
      const exists = await User.findOne({ email: u.email });
      if (!exists) {
        await User.create(u); // pre('save') hook handles hashing
        console.log(`✔ Created user: ${u.email}`);
      } else {
        // Re-set password so it gets hashed correctly
        const doc = await User.findOne({ email: u.email });
        doc.password = u.password;
        await doc.save();
        console.log(`✔ Reset password for: ${u.email}`);
      }
    }

    console.log('\nSeed complete.');
    console.log('Login credentials:');
    users.forEach(u => console.log(`  ${u.role.padEnd(6)} | ${u.email} / ${u.password}`));
  } catch (err) {
    console.error('Seed error:', err.message);
  } finally {
    await mongoose.disconnect();
  }
}

seed();
