export type GameVariant = "normal" | "brazilian";
export type GameMode = "computer" | "twoPlayer";

export type Piece = {
  color: "red" | "black";
  isKing: boolean;
};

export type Square = Piece | null;
export type Board = Square[][];
export type Position = { row: number; col: number };
export type CaptureMove = { from: Position; to: Position; captures: Position[] };