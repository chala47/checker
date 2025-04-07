"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { User } from "@/lib/auth";

interface GameStatusProps {
  winner: "red" | "black" | null;
  currentPlayer: "red" | "black";
  isComputerThinking: boolean;
  findAllJumps: (color: "red" | "black") => any[];
  multipleJumpInProgress: boolean;
  onNewGame: () => void;
  redPlayer?: User | null;
  blackPlayer?: User | null;
}

export function GameStatus({
  winner,
  currentPlayer,
  isComputerThinking,
  findAllJumps,
  multipleJumpInProgress,
  onNewGame,
  redPlayer,
  blackPlayer,
}: GameStatusProps) {
  const getDisplayName = (email?: string | null) => {
    if (!email) return "Waiting...";
    return email.split('@')[0]; // Show username part of email
  };

  return (
    <div className="mb-4 space-y-2">
      {/* Player names */}
      <div className="flex justify-between items-center px-2 py-1 rounded-lg bg-white/5">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <span className="text-white/90">{getDisplayName(redPlayer?.email)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-white/90">{getDisplayName(blackPlayer?.email)}</span>
          <div className="w-3 h-3 rounded-full bg-gray-900"></div>
        </div>
      </div>

      {/* Game status */}
      {winner ? (
        <p className="text-lg font-semibold text-white text-center">
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