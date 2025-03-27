"use client";

import React from "react";
import { SquareStack, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { GameVariant } from "@/lib/types";

interface GameVariantSelectProps {
  onSelectVariant: (variant: GameVariant) => void;
}

export function GameVariantSelect({ onSelectVariant }: GameVariantSelectProps) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex flex-col items-center justify-center p-4">
      <Card className="p-8 bg-white/5 backdrop-blur-lg rounded-xl shadow-2xl">
        <h1 className="text-3xl font-bold text-white text-center mb-8">Choose Game Variant</h1>
        <div className="flex flex-col gap-4">
          <Button
            onClick={() => onSelectVariant("normal")}
            variant="outline"
            className="flex items-center gap-2 text-lg py-6 hover:bg-white/10"
          >
            <SquareStack className="w-6 h-6" />
            Normal Checkers
          </Button>
          <Button
            onClick={() => onSelectVariant("brazilian")}
            variant="outline"
            className="flex items-center gap-2 text-lg py-6 hover:bg-white/10"
          >
            <Crown className="w-6 h-6" />
            Brazilian Checkers
          </Button>
        </div>
      </Card>
    </div>
  );
}