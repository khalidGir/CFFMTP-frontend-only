"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  orderBy,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/auth-context";

export interface Vehicle {
  id: string;
  companyId: string;
  plateNumber: string;
  model: string;
  fuelType: "Diesel" | "Gasoline" | "Electric";
  expectedEfficiency: number;
  createdAt: string;
}

export interface FuelLog {
  id: string;
  companyId: string;
  vehicleId: string;
  date: string;
  litersAdded: number;
  pricePerLiter: number;
  odometer: number;
  distance: number;
  actualEfficiency: number;
  deviation: number;
  estimatedLoss: number;
  riskStatus: "normal" | "warning" | "high";
  lateEntry: boolean;
  createdAt: string;
}

interface FleetContextType {
  vehicles: Vehicle[];
  fuelLogs: FuelLog[];
  loading: boolean;
  addVehicle: (vehicle: Omit<Vehicle, "id" | "companyId" | "createdAt">) => Promise<void>;
  updateVehicle: (id: string, vehicle: Partial<Vehicle>) => Promise<void>;
  deleteVehicle: (id: string) => Promise<void>;
  addFuelLog: (log: Omit<FuelLog, "id" | "companyId" | "createdAt" | "distance" | "actualEfficiency" | "deviation" | "estimatedLoss" | "riskStatus" | "lateEntry">) => Promise<void>;
  refreshData: () => Promise<void>;
}

const FleetContext = createContext<FleetContextType | undefined>(undefined);

export function FleetProvider({ children }: { children: ReactNode }) {
  const { userProfile } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [fuelLogs, setFuelLogs] = useState<FuelLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    if (!userProfile?.companyId) {
      setVehicles([]);
      setFuelLogs([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const vehiclesQuery = query(
        collection(db, "vehicles"),
        where("companyId", "==", userProfile.companyId)
      );
      const vehiclesSnapshot = await getDocs(vehiclesQuery);
      const vehiclesData = vehiclesSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Vehicle[];
      setVehicles(vehiclesData);

      const logsQuery = query(
        collection(db, "fuelLogs"),
        where("companyId", "==", userProfile.companyId),
        orderBy("date", "desc")
      );
      const logsSnapshot = await getDocs(logsQuery);
      const logsData = logsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as FuelLog[];
      setFuelLogs(logsData);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [userProfile?.companyId]);

  const addVehicle = async (vehicle: Omit<Vehicle, "id" | "companyId" | "createdAt">) => {
    if (!userProfile) return;
    await addDoc(collection(db, "vehicles"), {
      ...vehicle,
      companyId: userProfile.companyId,
      createdAt: new Date().toISOString(),
    });
    await fetchData();
  };

  const updateVehicle = async (id: string, vehicle: Partial<Vehicle>) => {
    await updateDoc(doc(db, "vehicles", id), vehicle);
    await fetchData();
  };

  const deleteVehicle = async (id: string) => {
    await deleteDoc(doc(db, "vehicles", id));
    await fetchData();
  };

  const addFuelLog = async (
    log: Omit<FuelLog, "id" | "companyId" | "createdAt" | "distance" | "actualEfficiency" | "deviation" | "estimatedLoss" | "riskStatus" | "lateEntry">
  ) => {
    if (!userProfile) return;

    const vehicle = vehicles.find((v) => v.id === log.vehicleId);
    if (!vehicle) return;

    const previousLog = fuelLogs
      .filter((l) => l.vehicleId === log.vehicleId)
      .sort((a, b) => b.odometer - a.odometer)[0];

    const distance = previousLog ? log.odometer - previousLog.odometer : log.odometer;
    const actualEfficiency = distance > 0 ? distance / log.litersAdded : 0;
    const expectedFuelUsed = distance / vehicle.expectedEfficiency;
    const actualFuelUsed = distance / actualEfficiency;
    const estimatedLoss = (actualFuelUsed - expectedFuelUsed) * log.pricePerLiter;
    const deviation = vehicle.expectedEfficiency > 0 
      ? ((actualEfficiency - vehicle.expectedEfficiency) / vehicle.expectedEfficiency) * 100 
      : 0;

    const entryDate = new Date(log.date);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - entryDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const lateEntry = diffDays > 7;

    let riskStatus: "normal" | "warning" | "high" = "normal";
    if (deviation > 15) riskStatus = "high";
    else if (deviation > 10) riskStatus = "warning";

    await addDoc(collection(db, "fuelLogs"), {
      ...log,
      companyId: userProfile.companyId,
      distance,
      actualEfficiency,
      estimatedLoss,
      deviation,
      riskStatus,
      lateEntry,
      createdAt: new Date().toISOString(),
    });
    await fetchData();
  };

  const refreshData = async () => {
    await fetchData();
  };

  return (
    <FleetContext.Provider
      value={{
        vehicles,
        fuelLogs,
        loading,
        addVehicle,
        updateVehicle,
        deleteVehicle,
        addFuelLog,
        refreshData,
      }}
    >
      {children}
    </FleetContext.Provider>
  );
}

export function useFleet() {
  const context = useContext(FleetContext);
  if (context === undefined) {
    throw new Error("useFleet must be used within a FleetProvider");
  }
  return context;
}
