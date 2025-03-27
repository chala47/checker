"use client";

import React from "react";
import { Crown, SquareStack } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GameVariant } from "@/lib/types";

interface GameHeaderProps {
  gameVariant: GameVariant;
  onNewGame: () => void;
}

export function GameHeader({ gameVariant, onNewGame }: GameHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-2">
        {gameVariant === "brazilian" ? (
          <Crown className="w-6 h-6 text-white" />
        ) : (
          <SquareStack className="w-6 h-6 text-white" />
        )}
        <h1 className="text-2xl font-bold text-white">
          {gameVariant === "brazilian" ? "Brazilian Checkers" : "Checkers"}
        </h1>
      </div>
      <div className="flex gap-2">
        <Button
          onClick={onNewGame}
          variant="outline"
          className="hover:bg-white/10"
        >
          New Game
        </Button>
      </div>
    </div>
  );
}