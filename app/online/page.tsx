"use client";

import { OnlineGameList } from "@/app/components/OnlineGameList";

export default function OnlinePage() {
  // Generate a random user ID (in a real app, this would come from authentication)
  const userId = Math.random().toString(36).substring(7);
  
  return <OnlineGameList userId={userId} />;
}