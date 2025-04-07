import { cookies } from "next/headers";
import { OnlineGame } from "@/app/components/OnlineGame";
import { redirect } from "next/navigation";

export default async function GamePage({
  params: { id }
}: {
  params: { id: string }
}) {
  const cookieStore = cookies();
  const cookieString = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");

  const response = await fetch(`http://localhost:5000/api/games/${id}`, {
    method: "GET",
    headers: {
      Cookie: cookieString, // 🔥 this is key!
    },
  });

  if (!response.ok) {
    console.error("Failed to fetch game:", await response.text());
    redirect("/");
  }

  const game = await response.json();
  const userId = game.user_id; 
  return (
    <OnlineGame
      gameId={id}
      userId={userId}
      initialGame={game}
    />
  );
}
