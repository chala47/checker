"use client";

import React from "react";
import { Button } from "@/components/ui/button";

interface GameStatusProps {
  winner: "red" | "black" | null;
  currentPlayer: "red" | "black";
  isComputerThinking: boolean;
  findAllJumps: (color: "red" | "black") => any[];
  multipleJumpInProgress: boolean;
  onNewGame: () => void;
}

export function GameStatus({
  winner,
  currentPlayer,
  isComputerThinking,
  findAllJumps,
  multipleJumpInProgress,
  onNewGame,
}: GameStatusProps) {
  return (
    <div className="mb-4">
      {winner ? (
        <p className="text-lg font-semibold text-white">
          {winner.charAt(0).toUpperCase() + winner.slice(1)} wins!
        </p>
      ) : (
        <div className="flex flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <p className="text-lg font-semibold text-white">
              Current turn: {currentPlayer.charAt(0).toUpperCase() + currentPlayer.slice(1)}
            </p>
            {isComputerThinking && (
              <p className="text-sm text-blue-400">(...)</p>
            )}
          </div>
          {/* Right side div with proper text wrapping */}
          <div className="flex flex-col text-right break-words whitespace-normal max-w-[50%]">
            {findAllJumps(currentPlayer).length > 0 && (
              <p className="text-sm text-yellow-400">
                Jumps available! You must take them.
              </p>
            )}
            {multipleJumpInProgress && (
              <p className="text-sm text-yellow-400">
                Multiple jump in progress! Continue jumping with the same piece.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
