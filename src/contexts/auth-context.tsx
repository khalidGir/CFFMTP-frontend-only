"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

export interface UserProfile {
  id: string;
  email: string;
  company_id: string;
  role: "admin" | "driver";
  vehicle_ids: string[];
}

export interface CompanySettings {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
  is_demo: boolean;
  warning_threshold: number;
  high_risk_threshold: number;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userProfile: UserProfile | null;
  companySettings: CompanySettings | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, companyName: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshCompanySettings: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserProfile(session.user.id);
      } else {
        setUserProfile(null);
        setCompanySettings(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("*")
        .eq("id", userId)
        .single();

      if (userError) throw userError;
      setUserProfile(userData as UserProfile);

      if (userData?.company_id) {
        const { data: companyData, error: companyError } = await supabase
          .from("companies")
          .select("*")
          .eq("id", userData.company_id)
          .single();

        if (!companyError && companyData) {
          setCompanySettings({
            ...companyData,
            warning_threshold: companyData.warning_threshold ?? 10,
            high_risk_threshold: companyData.high_risk_threshold ?? 15,
          } as CompanySettings);
        }
      }
    } catch (error) {
      console.error("Error fetching user profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const refreshCompanySettings = async () => {
    if (!userProfile?.company_id) return;
    const { data, error } = await supabase
      .from("companies")
      .select("*")
      .eq("id", userProfile.company_id)
      .single();
    
    if (!error && data) {
      setCompanySettings({
        ...data,
        warning_threshold: data.warning_threshold ?? 10,
        high_risk_threshold: data.high_risk_threshold ?? 15,
      } as CompanySettings);
    }
  };

  const login = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const register = async (email: string, password: string, companyName: string) => {
    const { data, error } = await supabase.auth.signUp({ 
      email, 
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`
      }
    });
    if (error) throw error;

    if (data.user) {
      const companyId = data.user.id;

      await supabase.from("companies").insert({
        id: companyId,
        name: companyName,
        owner_id: companyId,
        created_at: new Date().toISOString(),
        is_demo: false,
        warning_threshold: 10,
        high_risk_threshold: 15,
      });

      await supabase.from("users").insert({
        id: data.user.id,
        email,
        company_id: companyId,
        role: "admin",
        vehicle_ids: [],
      });
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setUserProfile(null);
    setCompanySettings(null);
  };

  return (
    <AuthContext.Provider
      value={{ 
        user, 
        session, 
        userProfile, 
        companySettings, 
        loading, 
        login, 
        register, 
        logout,
        refreshCompanySettings,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
