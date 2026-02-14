"use client";

import { useState, useMemo } from "react";
import { useFleet } from "@/contexts/fleet-context";
import { useAuth } from "@/contexts/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, X, AlertTriangle } from "lucide-react";
import { cn, formatCurrency, isLateEntry, isAdminOnlyEntry } from "@/lib/utils";

export default function FuelLogsPage() {
  const { vehicles, fuelLogs, addFuelLog, loading } = useFleet();
  const { userProfile } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<string>("all");

  const [formData, setFormData] = useState({
    vehicleId: "",
    date: "",
    litersAdded: "",
    pricePerLiter: "",
    odometer: "",
  });

  const [error, setError] = useState("");

  const filteredLogs = useMemo(() => {
    if (selectedVehicle === "all") return fuelLogs;
    return fuelLogs.filter((log) => log.vehicleId === selectedVehicle);
  }, [fuelLogs, selectedVehicle]);

  const getVehiclePlate = (vehicleId: string) => {
    const vehicle = vehicles.find((v) => v.id === vehicleId);
    return vehicle?.plateNumber || "Unknown";
  };

  const resetForm = () => {
    setFormData({
      vehicleId: "",
      date: "",
      litersAdded: "",
      pricePerLiter: "",
      odometer: "",
    });
    setError("");
  };

  const openAddModal = () => {
    resetForm();
    if (vehicles.length > 0) {
      setFormData((prev) => ({ ...prev, vehicleId: vehicles[0].id }));
    }
    setIsModalOpen(true);
  };

  const getLastOdometer = (vehicleId: string) => {
    const vehicleLogs = fuelLogs.filter((log) => log.vehicleId === vehicleId);
    if (vehicleLogs.length === 0) return 0;
    return Math.max(...vehicleLogs.map((log) => log.odometer));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const entryDate = new Date(formData.date);
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    if (entryDate > today) {
      setError("Cannot add fuel logs for future dates");
      return;
    }

    if (isAdminOnlyEntry(formData.date) && userProfile?.role !== "admin") {
      setError("Entries older than 30 days require admin access");
      return;
    }

    const odometer = parseFloat(formData.odometer);
    const lastOdometer = getLastOdometer(formData.vehicleId);

    if (odometer < lastOdometer) {
      setError(`Odometer must be greater than or equal to previous reading (${lastOdometer} km)`);
      return;
    }

    const litersAdded = parseFloat(formData.litersAdded);
    const pricePerLiter = parseFloat(formData.pricePerLiter);

    if (isNaN(odometer) || odometer <= 0) {
      setError("Odometer must be greater than 0");
      return;
    }

    if (isNaN(litersAdded) || litersAdded <= 0) {
      setError("Liters added must be greater than 0");
      return;
    }

    if (isNaN(pricePerLiter) || pricePerLiter <= 0) {
      setError("Price per liter must be greater than 0");
      return;
    }

    await addFuelLog({
      vehicleId: formData.vehicleId,
      date: formData.date,
      litersAdded,
      pricePerLiter,
      odometer,
    });

    setIsModalOpen(false);
    resetForm();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-500">Loading fuel logs...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Fuel Logs</h1>
          <p className="text-slate-500">Track fuel consumption and detect anomalies</p>
        </div>
        <Button onClick={openAddModal} disabled={vehicles.length === 0}>
          <Plus size={20} className="mr-2" />
          Add Fuel Log
        </Button>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Fuel Log History</CardTitle>
          <select
            className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
            value={selectedVehicle}
            onChange={(e) => setSelectedVehicle(e.target.value)}
          >
            <option value="all">All Vehicles</option>
            {vehicles.map((vehicle) => (
              <option key={vehicle.id} value={vehicle.id}>
                {vehicle.plateNumber}
              </option>
            ))}
          </select>
        </CardHeader>
        <CardContent>
          {filteredLogs.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              No fuel logs yet. Add your first fuel log to start tracking.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-slate-50">
                    <th className="text-left py-3 px-4 font-medium text-slate-600">Vehicle</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-600">Date</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-600">Liters</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-600">Distance</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-600">Deviation</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-600">Est. Loss</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-600">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.map((log) => (
                    <tr
                      key={log.id}
                      className={cn(
                        "border-b",
                        log.riskStatus === "high" && "bg-red-50",
                        log.lateEntry && !log.riskStatus && "bg-orange-50"
                      )}
                    >
                      <td className="py-3 px-4 font-medium">{getVehiclePlate(log.vehicleId)}</td>
                      <td className="py-3 px-4">
                        {new Date(log.date).toLocaleDateString("en-GB")}
                        {log.lateEntry && (
                          <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-700">
                            Late Entry
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">{log.litersAdded.toFixed(1)} L</td>
                      <td className="py-3 px-4">{log.distance.toFixed(0)} km</td>
                      <td className="py-3 px-4">
                        <span
                          className={cn(
                            log.deviation > 15 && "text-red-600 font-medium",
                            log.deviation > 10 && log.deviation <= 15 && "text-yellow-600 font-medium",
                            log.deviation <= 10 && "text-green-600"
                          )}
                        >
                          {log.deviation.toFixed(1)}%
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={log.estimatedLoss > 0 ? "text-red-600" : "text-green-600"}>
                          {formatCurrency(log.estimatedLoss)}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={cn(
                            "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium",
                            log.riskStatus === "high" && "bg-red-100 text-red-700",
                            log.riskStatus === "warning" && "bg-yellow-100 text-yellow-700",
                            log.riskStatus === "normal" && "bg-green-100 text-green-700"
                          )}
                        >
                          {log.riskStatus === "high" && "High Risk"}
                          {log.riskStatus === "warning" && "Warning"}
                          {log.riskStatus === "normal" && "Normal"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Add Fuel Log</h2>
              <Button variant="ghost" size="icon" onClick={() => { setIsModalOpen(false); resetForm(); }}>
                <X size={20} />
              </Button>
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 text-sm p-3 rounded-md mb-4 flex items-start gap-2">
                <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="vehicle">Vehicle</Label>
                <select
                  id="vehicle"
                  className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                  value={formData.vehicleId}
                  onChange={(e) => setFormData({ ...formData, vehicleId: e.target.value })}
                  required
                >
                  <option value="">Select vehicle</option>
                  {vehicles.map((vehicle) => (
                    <option key={vehicle.id} value={vehicle.id}>
                      {vehicle.plateNumber} - {vehicle.model}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  max={new Date().toISOString().split("T")[0]}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="odometer">Odometer Reading (km)</Label>
                <Input
                  id="odometer"
                  type="number"
                  min="0"
                  step="1"
                  value={formData.odometer}
                  onChange={(e) => setFormData({ ...formData, odometer: e.target.value })}
                  placeholder={getLastOdometer(formData.vehicleId) > 0 ? `Min: ${getLastOdometer(formData.vehicleId)}` : "Enter current odometer"}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="litersAdded">Liters Added</Label>
                <Input
                  id="litersAdded"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={formData.litersAdded}
                  onChange={(e) => setFormData({ ...formData, litersAdded: e.target.value })}
                  placeholder="0.00"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="pricePerLiter">Price per Liter (ETB)</Label>
                <Input
                  id="pricePerLiter"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={formData.pricePerLiter}
                  onChange={(e) => setFormData({ ...formData, pricePerLiter: e.target.value })}
                  placeholder="0.00"
                  required
                />
              </div>

              <div className="bg-slate-50 p-3 rounded-md text-sm text-slate-600">
                <p className="font-medium mb-1">Calculated fields (auto):</p>
                <ul className="space-y-1 text-slate-500">
                  <li>• Distance: Current odometer - Previous reading</li>
                  <li>• Deviation: % difference from expected efficiency</li>
                  <li>• Estimated Loss: Excess fuel × price per liter</li>
                </ul>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => { setIsModalOpen(false); resetForm(); }}>
                  Cancel
                </Button>
                <Button type="submit">
                  Add Fuel Log
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
