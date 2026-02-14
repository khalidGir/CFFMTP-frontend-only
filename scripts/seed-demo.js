const { initializeApp } = require("firebase/app");
const { getFirestore, collection, addDoc, getDocs, query, where, deleteDoc, doc } = require("firebase/firestore");
const { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } = require("firebase/auth");

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const DEMO_EMAIL = "demo@fleetmonitor.com";
const DEMO_PASSWORD = "demo123456";
const DEMO_COMPANY_ID = "demo-company-001";

async function seedDemoData() {
  console.log("Starting demo data seeding...");

  try {
    await signInWithEmailAndPassword(auth, DEMO_EMAIL, DEMO_PASSWORD);
    console.log("Already signed in");
  } catch (signInError) {
    try {
      await createUserWithEmailAndPassword(auth, DEMO_EMAIL, DEMO_PASSWORD);
      console.log("Created demo user");
    } catch (createError) {
      console.log("User may already exist, trying to sign in anyway...");
    }
  }

  const companyRef = doc(db, "companies", DEMO_COMPANY_ID);
  const { setDoc } = await import("firebase/firestore");
  
  await setDoc(companyRef, {
    name: "Demo Fleet Company",
    ownerId: DEMO_COMPANY_ID,
    createdAt: new Date().toISOString(),
    isDemo: true,
  });
  console.log("Created demo company");

  const vehicles = [
    { plateNumber: "ABC-1234", model: "Toyota Hilux", fuelType: "Diesel", expectedEfficiency: 12 },
    { plateNumber: "ABC-5678", model: "Isuzu D-Max", fuelType: "Diesel", expectedEfficiency: 14 },
    { plateNumber: "ABC-9012", model: "Ford Ranger", fuelType: "Diesel", expectedEfficiency: 11 },
    { plateNumber: "ABC-3456", model: "Nissan Patrol", fuelType: "Gasoline", expectedEfficiency: 8 },
    { plateNumber: "ABC-7890", model: "Mitsubishi L200", fuelType: "Diesel", expectedEfficiency: 13 },
  ];

  const vehicleIds = [];

  for (const vehicle of vehicles) {
    const vehicleRef = await addDoc(collection(db, "vehicles"), {
      companyId: DEMO_COMPANY_ID,
      ...vehicle,
      createdAt: new Date().toISOString(),
    });
    vehicleIds.push(vehicleRef.id);
    console.log(`Added vehicle: ${vehicle.plateNumber}`);
  }

  const now = new Date();
  const fuelLogs = [
    { vehicleIndex: 0, daysAgo: 5, liters: 45, price: 52, odometer: 125000 },
    { vehicleIndex: 1, daysAgo: 3, liters: 38, price: 52, odometer: 98000 },
    { vehicleIndex: 2, daysAgo: 8, liters: 55, price: 52, odometer: 145000 },
    { vehicleIndex: 3, daysAgo: 2, liters: 60, price: 48, odometer: 76000 },
    { vehicleIndex: 4, daysAgo: 1, liters: 42, price: 52, odometer: 112000 },
    { vehicleIndex: 0, daysAgo: 12, liters: 48, price: 51, odometer: 124500 },
    { vehicleIndex: 1, daysAgo: 15, liters: 40, price: 50, odometer: 97800 },
    { vehicleIndex: 2, daysAgo: 20, liters: 52, price: 49, odometer: 144500 },
  ];

  let prevOdometers = [0, 0, 0, 0, 0];

  for (const log of fuelLogs) {
    const date = new Date(now);
    date.setDate(date.getDate() - log.daysAgo);
    
    const distance = log.odometer - prevOdometers[log.vehicleIndex];
    const actualEfficiency = distance / log.liters;
    const expectedEfficiency = vehicles[log.vehicleIndex].expectedEfficiency;
    const expectedFuelUsed = distance / expectedEfficiency;
    const actualFuelUsed = distance / actualEfficiency;
    const estimatedLoss = (actualFuelUsed - expectedFuelUsed) * log.price;
    const deviation = ((actualEfficiency - expectedEfficiency) / expectedEfficiency) * 100;

    let riskStatus = "normal";
    if (deviation > 15) riskStatus = "high";
    else if (deviation > 10) riskStatus = "warning";

    const lateEntry = log.daysAgo > 7;

    await addDoc(collection(db, "fuelLogs"), {
      companyId: DEMO_COMPANY_ID,
      vehicleId: vehicleIds[log.vehicleIndex],
      date: date.toISOString(),
      litersAdded: log.liters,
      pricePerLiter: log.price,
      odometer: log.odometer,
      distance,
      actualEfficiency,
      deviation,
      estimatedLoss,
      riskStatus,
      lateEntry,
      createdAt: new Date().toISOString(),
    });

    prevOdometers[log.vehicleIndex] = log.odometer;
    console.log(`Added fuel log for ${vehicles[log.vehicleIndex].plateNumber}`);
  }

  console.log("Demo data seeding complete!");
  console.log(`Demo credentials: ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
}

seedDemoData().catch(console.error);
