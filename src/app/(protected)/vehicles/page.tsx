"use client";

import { useState } from "react";
import { useFleet, Vehicle } from "@/contexts/fleet-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Pencil, Trash2, X } from "lucide-react";

const fuelTypes = ["Diesel", "Gasoline", "Electric"] as const;

export default function VehiclesPage() {
  const { vehicles, addVehicle, updateVehicle, deleteVehicle, loading } = useFleet();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    plateNumber: "",
    model: "",
    fuelType: "Diesel" as "Diesel" | "Gasoline" | "Electric",
    expectedEfficiency: "",
  });

  const resetForm = () => {
    setFormData({
      plateNumber: "",
      model: "",
      fuelType: "Diesel",
      expectedEfficiency: "",
    });
    setEditingVehicle(null);
  };

  const openAddModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const openEditModal = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
    setFormData({
      plateNumber: vehicle.plate_number,
      model: vehicle.model,
      fuelType: vehicle.fuel_type,
      expectedEfficiency: vehicle.expected_efficiency.toString(),
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const efficiency = parseFloat(formData.expectedEfficiency);
    if (isNaN(efficiency) || efficiency <= 0) {
      alert("Expected efficiency must be greater than 0");
      return;
    }

    if (editingVehicle) {
      await updateVehicle(editingVehicle.id, {
        plate_number: formData.plateNumber,
        model: formData.model,
        fuel_type: formData.fuelType,
        expected_efficiency: efficiency,
      });
    } else {
      await addVehicle({
        plate_number: formData.plateNumber,
        model: formData.model,
        fuel_type: formData.fuelType,
        expected_efficiency: efficiency,
      });
    }

    setIsModalOpen(false);
    resetForm();
  };

  const handleDelete = async (id: string) => {
    await deleteVehicle(id);
    setDeleteConfirm(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-500">Loading vehicles...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Vehicles</h1>
          <p className="text-slate-500">Manage your fleet vehicles</p>
        </div>
        <Button onClick={openAddModal}>
          <Plus size={20} className="mr-2" />
          Add Vehicle
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {vehicles.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              No vehicles yet. Add your first vehicle to get started.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-slate-50">
                    <th className="text-left py-3 px-4 font-medium text-slate-600">Plate Number</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-600">Model</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-600">Fuel Type</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-600">Expected Efficiency</th>
                    <th className="text-right py-3 px-4 font-medium text-slate-600">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {vehicles.map((vehicle) => (
                    <tr key={vehicle.id} className="border-b hover:bg-slate-50">
                      <td className="py-3 px-4 font-medium">{vehicle.plate_number}</td>
                      <td className="py-3 px-4">{vehicle.model}</td>
                      <td className="py-3 px-4">{vehicle.fuel_type}</td>
                      <td className="py-3 px-4">{vehicle.expected_efficiency} km/L</td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditModal(vehicle)}
                          >
                            <Pencil size={16} />
                          </Button>
                          {deleteConfirm === vehicle.id ? (
                            <div className="flex items-center gap-1">
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleDelete(vehicle.id)}
                              >
                                Confirm
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDeleteConfirm(null)}
                              >
                                Cancel
                              </Button>
                            </div>
                          ) : (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeleteConfirm(vehicle.id)}
                            >
                              <Trash2 size={16} className="text-red-500" />
                            </Button>
                          )}
                        </div>
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
              <h2 className="text-xl font-bold">
                {editingVehicle ? "Edit Vehicle" : "Add Vehicle"}
              </h2>
              <Button variant="ghost" size="icon" onClick={() => { setIsModalOpen(false); resetForm(); }}>
                <X size={20} />
              </Button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="plateNumber">Plate Number</Label>
                <Input
                  id="plateNumber"
                  value={formData.plateNumber}
                  onChange={(e) => setFormData({ ...formData, plateNumber: e.target.value.toUpperCase() })}
                  placeholder="ABC-1234"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="model">Model</Label>
                <Input
                  id="model"
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  placeholder="Toyota Hilux"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="fuelType">Fuel Type</Label>
                <select
                  id="fuelType"
                  className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                  value={formData.fuelType}
                  onChange={(e) => setFormData({ ...formData, fuelType: e.target.value as any })}
                >
                  {fuelTypes.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="expectedEfficiency">Expected Efficiency (km/L)</Label>
                <Input
                  id="expectedEfficiency"
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={formData.expectedEfficiency}
                  onChange={(e) => setFormData({ ...formData, expectedEfficiency: e.target.value })}
                  placeholder="12.5"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => { setIsModalOpen(false); resetForm(); }}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingVehicle ? "Update" : "Add"} Vehicle
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
