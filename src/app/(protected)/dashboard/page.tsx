"use client";

import { useMemo } from "react";
import { useFleet } from "@/contexts/fleet-context";
import { useAuth } from "@/contexts/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, cn } from "@/lib/utils";
import { Truck, Fuel, AlertTriangle, TrendingDown } from "lucide-react";

export default function DashboardPage() {
  const { vehicles, fuelLogs, loading } = useFleet();
  const { companySettings } = useAuth();

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const warningThreshold = companySettings?.warning_threshold ?? 10;
  const highRiskThreshold = companySettings?.high_risk_threshold ?? 15;

  const monthlyData = useMemo(() => {
    const thisMonthLogs = fuelLogs.filter((log) => {
      const logDate = new Date(log.date);
      return logDate.getMonth() === currentMonth && logDate.getFullYear() === currentYear;
    });

    const totalFuelThisMonth = thisMonthLogs.reduce((sum, log) => sum + log.liters_added, 0);
    const totalLossThisMonth = thisMonthLogs.reduce((sum, log) => sum + Math.max(0, log.estimated_loss), 0);

    const vehicleStats = vehicles.map((vehicle) => {
      const vehicleLogs = thisMonthLogs.filter((log) => log.vehicle_id === vehicle.id);
      const totalLoss = vehicleLogs.reduce((sum, log) => sum + Math.max(0, log.estimated_loss), 0);
      const highRisk = vehicleLogs.some((log) => log.risk_status === "high");
      const warning = vehicleLogs.some((log) => log.risk_status === "warning");
      
      let riskStatus: "normal" | "warning" | "high" = "normal";
      if (highRisk) riskStatus = "high";
      else if (warning) riskStatus = "warning";

      return {
        ...vehicle,
        totalLoss,
        riskStatus,
      };
    });

    const highRiskCount = vehicleStats.filter((v) => v.riskStatus === "high").length;

    // Top 5 high risk vehicles by loss
    const topRiskVehicles = [...vehicleStats]
      .filter(v => v.totalLoss > 0)
      .sort((a, b) => b.totalLoss - a.totalLoss)
      .slice(0, 5);

    return {
      totalFuelThisMonth,
      totalLossThisMonth,
      vehicleStats,
      highRiskCount,
      topRiskVehicles,
    };
  }, [vehicles, fuelLogs, currentMonth, currentYear]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-500">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500">Fleet overview and performance metrics</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Vehicles</CardTitle>
            <Truck className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{vehicles.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fuel This Month</CardTitle>
            <Fuel className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{monthlyData.totalFuelThisMonth.toFixed(1)} L</div>
          </CardContent>
        </Card>

        <Card className={monthlyData.totalLossThisMonth > 0 ? "border-red-200" : "border-green-200"}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Est. Fuel Loss This Month</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${monthlyData.totalLossThisMonth > 0 ? "text-red-600" : "text-green-600"}`}>
              {formatCurrency(monthlyData.totalLossThisMonth)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Risk Vehicles</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{monthlyData.highRiskCount}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>High Risk Vehicles - Top Loss</CardTitle>
          </CardHeader>
          <CardContent>
            {monthlyData.topRiskVehicles.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                No vehicles with losses this month.
              </div>
            ) : (
              <div className="space-y-3">
                {monthlyData.topRiskVehicles.map((vehicle, index) => (
                  <div
                    key={vehicle.id}
                    className="flex items-center justify-between p-3 bg-red-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex items-center justify-center w-6 h-6 bg-red-200 text-red-700 rounded-full text-sm font-bold">
                        {index + 1}
                      </span>
                      <div>
                        <div className="font-medium">{vehicle.plate_number}</div>
                        <div className="text-sm text-slate-500">{vehicle.model}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-red-600">{formatCurrency(vehicle.totalLoss)}</div>
                      <span
                        className={cn(
                          "text-xs px-2 py-0.5 rounded-full",
                          vehicle.riskStatus === "high" && "bg-red-100 text-red-700",
                          vehicle.riskStatus === "warning" && "bg-yellow-100 text-yellow-700"
                        )}
                      >
                        {vehicle.riskStatus === "high" ? "High Risk" : "Warning"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Vehicle Performance</CardTitle>
          </CardHeader>
          <CardContent>
            {monthlyData.vehicleStats.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                No vehicles yet. Add vehicles to see performance data.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium text-slate-600">Plate Number</th>
                      <th className="text-left py-3 px-4 font-medium text-slate-600">Expected Eff.</th>
                      <th className="text-left py-3 px-4 font-medium text-slate-600">Loss This Month</th>
                      <th className="text-left py-3 px-4 font-medium text-slate-600">Risk Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthlyData.vehicleStats.map((vehicle) => (
                      <tr
                        key={vehicle.id}
                        className={cn(
                          "border-b",
                          vehicle.riskStatus === "high" && "bg-red-50"
                        )}
                      >
                        <td className="py-3 px-4 font-medium">{vehicle.plate_number}</td>
                        <td className="py-3 px-4">{vehicle.expected_efficiency} km/L</td>
                        <td className="py-3 px-4">
                          <span className={vehicle.totalLoss > 0 ? "text-red-600" : "text-green-600"}>
                            {formatCurrency(vehicle.totalLoss)}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={cn(
                              "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium",
                              vehicle.riskStatus === "high" && "bg-red-100 text-red-700",
                              vehicle.riskStatus === "warning" && "bg-yellow-100 text-yellow-700",
                              vehicle.riskStatus === "normal" && "bg-green-100 text-green-700"
                            )}
                          >
                            {vehicle.riskStatus === "high" && "High Risk"}
                            {vehicle.riskStatus === "warning" && "Warning"}
                            {vehicle.riskStatus === "normal" && "Normal"}
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
      </div>
    </div>
  );
}
