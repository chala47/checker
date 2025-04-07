"use client";

import { OnlineGameList } from "@/app/components/OnlineGameList";
import { GameVariant } from "@/lib/types";
import { useSearchParams } from "next/navigation";

export default function OnlinePage() {
  const searchParams = useSearchParams();
  const variant = searchParams.get("game_variant") as GameVariant;
  
  return <OnlineGameList gameVariant={variant} />;
}