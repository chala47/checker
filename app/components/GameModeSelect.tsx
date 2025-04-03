"use client";

import React from "react";
import { Monitor, Users, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { GameMode } from "@/lib/types";

interface GameModeSelectProps {
  gameVariant: "normal" | "brazilian";
  onSelectMode: (mode: GameMode) => void;
}

export function GameModeSelect({ gameVariant, onSelectMode }: GameModeSelectProps) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex flex-col items-center justify-center p-4">
      <Card className="p-8 bg-white/5 backdrop-blur-lg rounded-xl shadow-2xl">
        <h1 className="text-3xl font-bold text-white text-center mb-8">
          {gameVariant === "brazilian" ? "Brazilian Checkers" : "Checkers"}
        </h1>
        <div className="flex flex-col gap-4">
          <Button
            onClick={() => onSelectMode("computer")}
            variant="outline"
            className="flex items-center gap-2 text-lg py-6 hover:bg-white/10"
          >
            <Monitor className="w-6 h-6" />
            Play vs Computer
          </Button>
          <Button
            onClick={() => onSelectMode("twoPlayer")}
            variant="outline"
            className="flex items-center gap-2 text-lg py-6 hover:bg-white/10"
          >
            <Users className="w-6 h-6" />
            Local Two Players
          </Button>
          <Button
            onClick={() => onSelectMode("online")}
            variant="outline"
            className="flex items-center gap-2 text-lg py-6 hover:bg-white/10"
          >
            <Globe className="w-6 h-6" />
            Play Online
          </Button>
        </div>
      </Card>
    </div>
  );
}