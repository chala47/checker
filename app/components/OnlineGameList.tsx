"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Users, Crown, SquareStack } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { OnlineGame, GameVariant } from "@/lib/types";
import { supabase } from "@/lib/supabase";
import { initialBoard } from "@/lib/game";

interface OnlineGameListProps {
  userId: string;
}

export function OnlineGameList({ userId }: OnlineGameListProps) {
  const router = useRouter();
  const [games, setGames] = React.useState<OnlineGame[]>([]);

  React.useEffect(() => {
    // Fetch available games
    const fetchGames = async () => {
      const { data } = await supabase
        .from('games')
        .select('*')
        .eq('status', 'waiting')
        .order('created_at', { ascending: false });
      
      if (data) setGames(data as OnlineGame[]);
    };

    fetchGames();

    // Subscribe to changes
    const channel = supabase
      .channel('games_channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'games'
        },
        () => fetchGames()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const createGame = async (variant: GameVariant) => {
    const { data: game } = await supabase
      .from('games')
      .insert({
        game_variant: variant,
        board: initialBoard(),
        red_player: userId,
        status: 'waiting'
      })
      .select()
      .single();

    if (game) {
      router.push(`/game/${game.id}`);
    }
  };

  const joinGame = async (gameId: string) => {
    const { data: game } = await supabase
      .from('games')
      .update({
        black_player: userId,
        status: 'in_progress'
      })
      .eq('id', gameId)
      .select()
      .single();

    if (game) {
      router.push(`/game/${game.id}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex flex-col items-center justify-center p-4">
      <Card className="p-8 bg-white/5 backdrop-blur-lg rounded-xl shadow-2xl w-full max-w-2xl">
        <div className="flex flex-col gap-8">
          <div>
            <h1 className="text-3xl font-bold text-white text-center mb-4">
              Online Checkers
            </h1>
            <div className="flex gap-4 justify-center">
              <Button
                onClick={() => createGame("normal")}
                variant="outline"
                className="flex items-center gap-2 text-lg py-6 hover:bg-white/10"
              >
                <SquareStack className="w-6 h-6" />
                Create Normal Game
              </Button>
              <Button
                onClick={() => createGame("brazilian")}
                variant="outline"
                className="flex items-center gap-2 text-lg py-6 hover:bg-white/10"
              >
                <Crown className="w-6 h-6" />
                Create Brazilian Game
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-white">Available Games</h2>
            {games.length === 0 ? (
              <p className="text-white/60 text-center py-4">No games available</p>
            ) : (
              <div className="grid gap-4">
                {games.map((game) => (
                  <div
                    key={game.id}
                    className="bg-white/10 p-4 rounded-lg flex items-center justify-between"
                  >
                    <div className="flex items-center gap-4">
                      {game.game_variant === "brazilian" ? (
                        <Crown className="w-6 h-6 text-white/60" />
                      ) : (
                        <SquareStack className="w-6 h-6 text-white/60" />
                      )}
                      <div>
                        <p className="text-white font-medium">
                          {game.game_variant === "brazilian" ? "Brazilian" : "Normal"} Game
                        </p>
                        <p className="text-sm text-white/60">
                          Created {new Date(game.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <Button
                      onClick={() => joinGame(game.id)}
                      variant="outline"
                      className="hover:bg-white/10"
                    >
                      <Users className="w-4 h-4 mr-2" />
                      Join Game
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}