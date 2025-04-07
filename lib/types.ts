export type GameVariant = "normal" | "brazilian";
export type GameMode = "computer" | "twoPlayer" | "online";
export type GameStatus = "waiting" | "in_progress" | "completed";

export type Piece = {
  color: "red" | "black";
  isKing: boolean;
};

export type Square = Piece | null;
export type Board = Square[][];
export type Position = { row: number; col: number };
export type CaptureMove = { from: Position; to: Position; captures: Position[] };

export type User ={
   id: string,
   email: string,
   created_at: string
}
export type OnlineGame = {
  id: string;
  created_at: string;
  current_player: "red" | "black";
  winner: "red" | "black" | null;
  game_variant: GameVariant;
  board: Board;
  red_player: User;
  black_player: User;
  status: GameStatus;
  last_move_at: string;
};