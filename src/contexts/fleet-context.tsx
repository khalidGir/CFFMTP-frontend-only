"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/auth-context";

export interface Vehicle {
  id: string;
  company_id: string;
  plate_number: string;
  model: string;
  fuel_type: "Diesel" | "Gasoline" | "Electric";
  expected_efficiency: number;
  created_at: string;
}

export interface FuelLog {
  id: string;
  company_id: string;
  vehicle_id: string;
  date: string;
  liters_added: number;
  price_per_liter: number;
  odometer: number;
  distance: number;
  actual_efficiency: number;
  deviation: number;
  estimated_loss: number;
  risk_status: "normal" | "warning" | "high";
  late_entry: boolean;
  created_at: string;
}

interface FleetContextType {
  vehicles: Vehicle[];
  fuelLogs: FuelLog[];
  loading: boolean;
  addVehicle: (vehicle: Omit<Vehicle, "id" | "company_id" | "created_at">) => Promise<void>;
  updateVehicle: (id: string, vehicle: Partial<Vehicle>) => Promise<void>;
  deleteVehicle: (id: string) => Promise<void>;
  addFuelLog: (log: Omit<FuelLog, "id" | "company_id" | "created_at" | "distance" | "actual_efficiency" | "deviation" | "estimated_loss" | "risk_status" | "late_entry">) => Promise<void>;
  refreshData: () => Promise<void>;
}

const FleetContext = createContext<FleetContextType | undefined>(undefined);

export function FleetProvider({ children }: { children: ReactNode }) {
  const { userProfile } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [fuelLogs, setFuelLogs] = useState<FuelLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    if (!userProfile?.company_id) {
      setVehicles([]);
      setFuelLogs([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data: vehiclesData, error: vehiclesError } = await supabase
        .from("vehicles")
        .select("*")
        .eq("company_id", userProfile.company_id)
        .order("created_at", { ascending: false });

      if (vehiclesError) throw vehiclesError;
      setVehicles(vehiclesData || []);

      const { data: logsData, error: logsError } = await supabase
        .from("fuel_logs")
        .select("*")
        .eq("company_id", userProfile.company_id)
        .order("date", { ascending: false });

      if (logsError) throw logsError;
      setFuelLogs(logsData || []);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [userProfile?.company_id]);

  const addVehicle = async (vehicle: Omit<Vehicle, "id" | "company_id" | "created_at">) => {
    if (!userProfile) return;
    await supabase.from("vehicles").insert({
      ...vehicle,
      company_id: userProfile.company_id,
    });
    await fetchData();
  };

  const updateVehicle = async (id: string, vehicle: Partial<Vehicle>) => {
    await supabase.from("vehicles").update(vehicle).eq("id", id);
    await fetchData();
  };

  const deleteVehicle = async (id: string) => {
    await supabase.from("vehicles").delete().eq("id", id);
    await fetchData();
  };

  const addFuelLog = async (
    log: Omit<FuelLog, "id" | "company_id" | "created_at" | "distance" | "actual_efficiency" | "deviation" | "estimated_loss" | "risk_status" | "late_entry">
  ) => {
    if (!userProfile) return;

    const vehicle = vehicles.find((v) => v.id === log.vehicle_id);
    if (!vehicle) return;

    const previousLog = fuelLogs
      .filter((l) => l.vehicle_id === log.vehicle_id)
      .sort((a, b) => b.odometer - a.odometer)[0];

    const distance = previousLog ? log.odometer - previousLog.odometer : log.odometer;
    const actualEfficiency = distance > 0 ? distance / log.liters_added : 0;
    const expectedFuelUsed = distance / vehicle.expected_efficiency;
    const actualFuelUsed = distance / actualEfficiency;
    const estimatedLoss = (actualFuelUsed - expectedFuelUsed) * log.price_per_liter;
    const deviation = vehicle.expected_efficiency > 0 
      ? ((actualEfficiency - vehicle.expected_efficiency) / vehicle.expected_efficiency) * 100 
      : 0;

    const entryDate = new Date(log.date);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - entryDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const lateEntry = diffDays > 7;

    let riskStatus: "normal" | "warning" | "high" = "normal";
    if (deviation > 15) riskStatus = "high";
    else if (deviation > 10) riskStatus = "warning";

    await supabase.from("fuel_logs").insert({
      ...log,
      company_id: userProfile.company_id,
      distance,
      actual_efficiency: actualEfficiency,
      estimated_loss: estimatedLoss,
      deviation,
      risk_status: riskStatus,
      late_entry: lateEntry,
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
