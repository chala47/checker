"use client";

import React from "react";
import { HomeIcon, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface GameDialogsProps {
  showNewGameDialog: boolean;
  setShowNewGameDialog: (show: boolean) => void;
  showGameEndDialog: boolean;
  setShowGameEndDialog: (show: boolean) => void;
  winner: "red" | "black" | null;
  restartGame: () => void;
  resetGame: () => void;
}

export function GameDialogs({
  showNewGameDialog,
  setShowNewGameDialog,
  showGameEndDialog,
  setShowGameEndDialog,
  winner,
  restartGame,
  resetGame,
}: GameDialogsProps) {
  return (
    <>
      <Dialog open={showNewGameDialog} onOpenChange={setShowNewGameDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Game</DialogTitle>
            <DialogDescription>
              What would you like to do?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setShowNewGameDialog(false)}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              variant="outline"
              onClick={restartGame}
              className="w-full sm:w-auto flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Restart Game
            </Button>
            <Button
              onClick={resetGame}
              className="w-full sm:w-auto flex items-center gap-2"
            >
              <HomeIcon className="w-4 h-4" />
              Main Menu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showGameEndDialog} onOpenChange={setShowGameEndDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Game Over!</DialogTitle>
            <DialogDescription>
              {winner && winner?.charAt(0).toUpperCase() + winner?.slice(1)} wins! What would you like to do?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setShowGameEndDialog(false)}
              className="w-full sm:w-auto"
            >
              Stay Here
            </Button>
            <Button
              variant="outline"
              onClick={restartGame}
              className="w-full sm:w-auto flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Play Again
            </Button>
            <Button
              onClick={resetGame}
              className="w-full sm:w-auto flex items-center gap-2"
            >
              <HomeIcon className="w-4 h-4" />
              Main Menu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}