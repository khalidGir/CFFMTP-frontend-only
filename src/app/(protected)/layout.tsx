"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { FleetProvider } from "@/contexts/fleet-context";
import Sidebar from "@/components/layout/sidebar";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-slate-600">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <FleetProvider>
      <div className="min-h-screen bg-slate-50">
        <Sidebar />
        <main className="lg:pl-64 p-4 lg:p-8 pt-16 lg:pt-8">
          {children}
        </main>
      </div>
    </FleetProvider>
  );
}
