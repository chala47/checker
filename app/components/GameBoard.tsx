"use client";

import React from "react";
import { Crown } from "lucide-react";
import { Board, Position, GameVariant } from "@/lib/types";

interface GameBoardProps {
  board: Board;
  currentPlayer: "red" | "black";
  selectedPiece: Position | null;
  isComputerThinking: boolean;
  gameVariant: GameVariant;
  findAllJumps: (color: "red" | "black") => Position[];
  multipleJumpInProgress: boolean;
  handleSquareClick: (row: number, col: number) => void;
}

export function GameBoard({
  board,
  currentPlayer,
  selectedPiece,
  isComputerThinking,
  gameVariant,
  findAllJumps,
  multipleJumpInProgress,
  handleSquareClick,
}: GameBoardProps) {
  return (
    <div
      className="grid grid-cols-8 gap-1 bg-white/10"
      style={{
        width: "min(90vw, 480px)", // Ensures proper scaling on small screens
        height: "min(90vw, 480px)", // Keeps board square
      }}
    >
      {board.map((row, rowIndex) =>
        row.map((piece, colIndex) => {
          const isBlackSquare = (rowIndex + colIndex) % 2 === 1;
          const isSelected = selectedPiece?.row === rowIndex && selectedPiece?.col === colIndex;
          const canJump = findAllJumps(currentPlayer).some(
            (pos) => pos.row === rowIndex && pos.col === colIndex
          );

          return (
            <div
              key={`${rowIndex}-${colIndex}`}
              onClick={() => isBlackSquare && handleSquareClick(rowIndex, colIndex)}
              className={`
                flex items-center justify-center 
                transition-all duration-200 aspect-square
                ${isBlackSquare ? "bg-slate-700 cursor-pointer hover:bg-slate-600" : "bg-green-200"}
                ${isSelected ? "ring-2 ring-yellow-400" : ""}
                ${canJump && piece?.color === currentPlayer ? "ring-2 ring-blue-400" : ""}
              `}
            >
              {piece && (
                <div
                  className={`
                    relative rounded-full transition-transform transform hover:scale-105
                    ${piece.color === "red" ? "bg-red-500" : "bg-gray-900"}
                  `}
                  style={{
                    width: "80%",
                    height: "80%",
                  }}
                >
                  {piece.isKing && (
                    <Crown
                      className={`absolute top-[45%] left-1/2 -translate-x-1/2 -translate-y-1/2
                      w-5 h-5 sm:w-6 sm:h-6
                      ${piece.color === "red" ? "text-red-800" : "text-gray-400"}`}
                    />
                  )}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
