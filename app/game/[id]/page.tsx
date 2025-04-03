import { OnlineGame } from "@/app/components/OnlineGame";
import { redirect } from "next/navigation";

export default async function GamePage({
  params: { id }
}: {
  params: { id: string }
}) {
  // Generate a random user ID (in a real app, this would come from authentication)
  const userId = Math.random().toString(36).substring(7);
  
  const response = await fetch(`http://localhost:5000/api/games/${id}`);
  const game = await response.json();

  if (!game || game.error) {
    redirect('/');
  }

  return (
    <OnlineGame
      gameId={id}
      userId={userId}
      initialGame={game}
    />
  );
}