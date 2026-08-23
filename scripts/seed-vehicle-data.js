// Seeds vehicle-service with realistic demo data for one account, via the API Gateway —
// the same path the mobile app uses. Run with the gateway + vehicle-service + auth-service
// all up locally:
//
//   node scripts/seed-vehicle-data.js
//
// Override the target account or gateway URL with env vars:
//   SEED_EMAIL=you@example.com SEED_PASSWORD=yourpass GATEWAY_URL=http://localhost:8000 node scripts/seed-vehicle-data.js

const GATEWAY_URL = process.env.GATEWAY_URL || 'http://localhost:8000';
const EMAIL = process.env.SEED_EMAIL || 'smoketest@example.com';
const PASSWORD = process.env.SEED_PASSWORD || 'password123';

function daysAgo(n) {
  return new Date(Date.now() - n * 86400000).toISOString();
}

function daysFromNow(n) {
  return new Date(Date.now() + n * 86400000).toISOString();
}

async function request(path, token, options = {}) {
  const res = await fetch(`${GATEWAY_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) {
    throw new Error(`${options.method || 'GET'} ${path} -> ${res.status}: ${JSON.stringify(data)}`);
  }
  return data;
}

async function login() {
  try {
    return await request('/auth/login', null, {
      method: 'POST',
      body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
    });
  } catch {
    console.log(`No existing account for ${EMAIL}, registering instead...`);
    return request('/auth/register', null, {
      method: 'POST',
      body: JSON.stringify({ email: EMAIL, password: PASSWORD, name: 'Smoke Test' }),
    });
  }
}

async function seedVehicle(token, { make, model, year, plate_number, fuel_type, startOdometer, fuelFillUps, maintenance, expenses, reminders }) {
  const vehicle = await request('/vehicle/vehicles', token, {
    method: 'POST',
    body: JSON.stringify({ make, model, year, plate_number, fuel_type, odometer: startOdometer }),
  });
  console.log(`Created vehicle ${vehicle.id} — ${make} ${model} (${plate_number})`);

  for (const f of fuelFillUps) {
    await request(`/vehicle/vehicles/${vehicle.id}/fuel`, token, {
      method: 'POST',
      body: JSON.stringify(f),
    });
  }
  console.log(`  + ${fuelFillUps.length} fuel logs`);

  for (const m of maintenance) {
    await request(`/vehicle/vehicles/${vehicle.id}/maintenance`, token, {
      method: 'POST',
      body: JSON.stringify(m),
    });
  }
  console.log(`  + ${maintenance.length} maintenance logs`);

  for (const e of expenses) {
    await request(`/vehicle/vehicles/${vehicle.id}/expenses`, token, {
      method: 'POST',
      body: JSON.stringify(e),
    });
  }
  console.log(`  + ${expenses.length} expenses`);

  for (const r of reminders) {
    await request(`/vehicle/vehicles/${vehicle.id}/reminders`, token, {
      method: 'POST',
      body: JSON.stringify(r),
    });
  }
  console.log(`  + ${reminders.length} reminders`);

  return vehicle;
}

async function main() {
  const tokens = await login();
  const token = tokens.access_token;
  console.log(`Authenticated as ${EMAIL}`);

  const car = await seedVehicle(token, {
    make: 'Toyota',
    model: 'Aqua',
    year: 2017,
    plate_number: 'CAR-4821',
    fuel_type: 'Hybrid',
    startOdometer: 82386,
    fuelFillUps: [
      { date: daysAgo(28), litres: 29.3, cost: 7010, odometer: 82386, station: 'Lanka · Borella' },
      { date: daysAgo(19), litres: 27.9, cost: 6680, odometer: 82994, station: 'Shell · Nugegoda' },
      { date: daysAgo(10), litres: 30.1, cost: 7200, odometer: 83602, station: 'IOC · Rajagiriya' },
      { date: daysAgo(1), litres: 28.4, cost: 6800, odometer: 84210, station: 'Shell · Nugegoda' },
    ],
    maintenance: [
      { service_name: 'Brake pads (front)', date: daysAgo(96), odometer: 76400, cost: 12400 },
      { service_name: 'Tyre rotation', date: daysAgo(53), odometer: 80100, cost: 1500, next_due_date: daysFromNow(150) },
      { service_name: 'Engine oil change', date: daysAgo(21), odometer: 81900, cost: 9800, next_due_odometer: 86900 },
    ],
    expenses: [
      { type: 'insurance', amount: 18500, date: daysAgo(65), note: 'Annual comprehensive cover' },
      { type: 'parking', amount: 500, date: daysAgo(6), note: 'Mall parking' },
    ],
    reminders: [
      { title: 'Insurance renewal', kind: 'insurance', due_date: daysFromNow(3), notify_days_before: 7 },
      { title: 'Revenue licence', kind: 'revenue_licence', due_date: daysFromNow(6), notify_days_before: 7 },
      { title: 'Emission test', kind: 'emission_test', due_date: daysFromNow(24), notify_days_before: 7 },
      { title: 'Next service', kind: 'service', due_odometer: 86900, notify_days_before: 7 },
    ],
  });

  const bike = await seedVehicle(token, {
    make: 'Honda',
    model: 'Dio',
    year: 2021,
    plate_number: 'BIKE-9930',
    fuel_type: 'Petrol',
    startOdometer: 18260,
    fuelFillUps: [
      { date: daysAgo(12), litres: 4.0, cost: 1320, odometer: 18260, station: 'IOC · Rajagiriya' },
      { date: daysAgo(1), litres: 4.2, cost: 1380, odometer: 18450, station: 'Lanka · Borella' },
    ],
    maintenance: [
      { service_name: 'Engine oil change', date: daysAgo(24), odometer: 17800, cost: 2200, next_due_odometer: 20800 },
    ],
    expenses: [],
    reminders: [
      { title: 'Insurance renewal', kind: 'insurance', due_date: daysFromNow(41), notify_days_before: 7 },
    ],
  });

  await request(`/vehicle/vehicles/${car.id}/primary`, token, { method: 'POST' });

  console.log('\nDone. Log in as', EMAIL, '/', PASSWORD, 'in the app to see this data.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
