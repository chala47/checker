import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { OnlineGame } from "@/app/components/OnlineGame";
import { redirect } from "next/navigation";

export default async function GamePage({
  params: { id }
}: {
  params: { id: string }
}) {
  const supabase = createServerComponentClient({ cookies });
  
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect('/');
  }

  const { data: game } = await supabase
    .from('games')
    .select('*')
    .eq('id', id)
    .single();

  if (!game) {
    redirect('/');
  }

  return (
    <OnlineGame
      gameId={id}
      userId={session.user.id}
      initialGame={game}
    />
  );
}