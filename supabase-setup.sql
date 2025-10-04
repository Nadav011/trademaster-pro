-- TradeMaster Pro - Supabase Database Setup
-- Run this SQL in your Supabase SQL editor

-- Create user_data table for syncing
CREATE TABLE IF NOT EXISTS user_data (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  trades JSONB DEFAULT '[]'::jsonb,
  capital JSONB DEFAULT '[]'::jsonb,
  settings JSONB DEFAULT '{}'::jsonb,
  last_sync TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_user_data_user_id ON user_data(user_id);

-- Enable Row Level Security (RLS)
ALTER TABLE user_data ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own data" ON user_data
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own data" ON user_data
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own data" ON user_data
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own data" ON user_data
  FOR DELETE USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_user_data_updated_at
  BEFORE UPDATE ON user_data
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON user_data TO anon, authenticated;
