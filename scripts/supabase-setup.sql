-- Create companies table
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  is_demo BOOLEAN DEFAULT FALSE
);

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  company_id UUID NOT NULL REFERENCES companies(id),
  role TEXT NOT NULL CHECK (role IN ('admin', 'driver')),
  vehicle_ids TEXT[] DEFAULT '{}'
);

-- Create vehicles table
CREATE TABLE IF NOT EXISTS vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  plate_number TEXT NOT NULL,
  model TEXT NOT NULL,
  fuel_type TEXT NOT NULL CHECK (fuel_type IN ('Diesel', 'Gasoline', 'Electric')),
  expected_efficiency NUMERIC NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create fuel_logs table
CREATE TABLE IF NOT EXISTS fuel_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  vehicle_id UUID NOT NULL REFERENCES vehicles(id),
  date DATE NOT NULL,
  liters_added NUMERIC NOT NULL,
  price_per_liter NUMERIC NOT NULL,
  odometer NUMERIC NOT NULL,
  distance NUMERIC DEFAULT 0,
  actual_efficiency NUMERIC DEFAULT 0,
  deviation NUMERIC DEFAULT 0,
  estimated_loss NUMERIC DEFAULT 0,
  risk_status TEXT DEFAULT 'normal' CHECK (risk_status IN ('normal', 'warning', 'high')),
  late_entry BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE fuel_logs ENABLE ROW LEVEL SECURITY;

-- Companies RLS
CREATE POLICY "Users can view own company" ON companies
  FOR SELECT USING (id IN (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can insert own company" ON companies
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own company" ON companies
  FOR UPDATE USING (auth.uid() = owner_id);

-- Users RLS
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "Users can insert own profile" ON users
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Vehicles RLS
CREATE POLICY "Users can view own vehicles" ON vehicles
  FOR SELECT USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can insert own vehicles" ON vehicles
  FOR INSERT WITH CHECK (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can update own vehicles" ON vehicles
  FOR UPDATE USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can delete own vehicles" ON vehicles
  FOR DELETE USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

-- Fuel Logs RLS
CREATE POLICY "Users can view own fuel logs" ON fuel_logs
  FOR SELECT USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can insert own fuel logs" ON fuel_logs
  FOR INSERT WITH CHECK (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can update own fuel logs" ON fuel_logs
  FOR UPDATE USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can delete own fuel logs" ON fuel_logs
  FOR DELETE USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_vehicles_company ON vehicles(company_id);
CREATE INDEX IF NOT EXISTS idx_fuel_logs_company ON fuel_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_fuel_logs_vehicle ON fuel_logs(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_fuel_logs_date ON fuel_logs(date);
