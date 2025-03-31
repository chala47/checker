export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      games: {
        Row: {
          id: string
          created_at: string
          current_player: "red" | "black"
          winner: "red" | "black" | null
          game_variant: "normal" | "brazilian"
          board: Json
          red_player: string
          black_player: string | null
          status: "waiting" | "in_progress" | "completed"
          last_move_at: string
        }
        Insert: {
          id?: string
          created_at?: string
          current_player?: "red" | "black"
          winner?: "red" | "black" | null
          game_variant: "normal" | "brazilian"
          board: Json
          red_player: string
          black_player?: string | null
          status?: "waiting" | "in_progress" | "completed"
          last_move_at?: string
        }
        Update: {
          id?: string
          created_at?: string
          current_player?: "red" | "black"
          winner?: "red" | "black" | null
          game_variant?: "normal" | "brazilian"
          board?: Json
          red_player?: string
          black_player?: string | null
          status?: "waiting" | "in_progress" | "completed"
          last_move_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}