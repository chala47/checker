/*
  # Create games and moves tables for online multiplayer

  1. New Tables
    - `games`
      - `id` (uuid, primary key)
      - `created_at` (timestamp)
      - `current_player` (text) - 'red' or 'black'
      - `winner` (text) - null, 'red', or 'black'
      - `game_variant` (text) - 'normal' or 'brazilian'
      - `board` (jsonb) - current game board state
      - `red_player` (uuid) - reference to auth.users
      - `black_player` (uuid) - reference to auth.users
      - `status` (text) - 'waiting', 'in_progress', 'completed'
      
  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Create games table
CREATE TABLE IF NOT EXISTS games (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  current_player text NOT NULL DEFAULT 'red',
  winner text,
  game_variant text NOT NULL,
  board jsonb NOT NULL,
  red_player uuid REFERENCES auth.users,
  black_player uuid REFERENCES auth.users,
  status text NOT NULL DEFAULT 'waiting',
  last_move_at timestamptz DEFAULT now(),
  
  CONSTRAINT valid_current_player CHECK (current_player IN ('red', 'black')),
  CONSTRAINT valid_winner CHECK (winner IN ('red', 'black')),
  CONSTRAINT valid_game_variant CHECK (game_variant IN ('normal', 'brazilian')),
  CONSTRAINT valid_status CHECK (status IN ('waiting', 'in_progress', 'completed'))
);

-- Enable RLS
ALTER TABLE games ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view available games"
  ON games
  FOR SELECT
  TO authenticated
  USING (
    status = 'waiting' OR 
    red_player = auth.uid() OR 
    black_player = auth.uid()
  );

CREATE POLICY "Users can create games"
  ON games
  FOR INSERT
  TO authenticated
  WITH CHECK (
    red_player = auth.uid() OR 
    black_player = auth.uid()
  );

CREATE POLICY "Players can update their games"
  ON games
  FOR UPDATE
  TO authenticated
  USING (
    red_player = auth.uid() OR 
    black_player = auth.uid()
  )
  WITH CHECK (
    red_player = auth.uid() OR 
    black_player = auth.uid()
  );

-- Create function to update last_move_at
CREATE OR REPLACE FUNCTION update_last_move_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_move_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update last_move_at on board update
CREATE TRIGGER update_game_last_move_at
  BEFORE UPDATE OF board
  ON games
  FOR EACH ROW
  EXECUTE FUNCTION update_last_move_at();