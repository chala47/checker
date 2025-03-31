"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { GameBoard } from "./GameBoard";
import { GameStatus } from "./GameStatus";
import { GameHeader } from "./GameHeader";
import { GameDialogs } from "./GameDialogs";
import { Card } from "@/components/ui/card";
import { OnlineGame, Position } from "@/lib/types";
import { supabase } from "@/lib/supabase";
import { getAvailableJumps, makeMove } from "@/lib/game";

interface OnlineGameProps {
  gameId: string;
  userId: string;
  initialGame: OnlineGame;
}

export function OnlineGame({ gameId, userId, initialGame }: OnlineGameProps) {
  const router = useRouter();
  const [game, setGame] = React.useState<OnlineGame>(initialGame);
  const [selectedPiece, setSelectedPiece] = React.useState<Position | null>(null);
  const [showNewGameDialog, setShowNewGameDialog] = React.useState(false);
  const [showGameEndDialog, setShowGameEndDialog] = React.useState(false);
  const [multipleJumpInProgress, setMultipleJumpInProgress] = React.useState(false);
  const [mustJumpFrom, setMustJumpFrom] = React.useState<Position | null>(null);

  const isMyTurn = (game.current_player === "red" && game.red_player === userId) ||
                  (game.current_player === "black" && game.black_player === userId);

  React.useEffect(() => {
    const channel = supabase
      .channel(`game_${gameId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'games',
          filter: `id=eq.${gameId}`
        },
        (payload: any) => {
          if (payload.new) {
            setGame(payload.new as OnlineGame);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [gameId]);

  React.useEffect(() => {
    if (game.winner) {
      setShowGameEndDialog(true);
    }
  }, [game.winner]);

  const findAllJumps = (color: "red" | "black") => {
    const pieces: Position[] = [];
    let maxCaptures = 0;

    if (game.game_variant === "brazilian") {
      for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
          const piece = game.board[row][col];
          if (piece && piece.color === color) {
            const jumps = getAvailableJumps(row, col, game.board, game.game_variant);
            if (jumps.length > 0) {
              const maxCapturesForPiece = Math.max(...jumps.map(jump => jump.captures.length));
              if (maxCapturesForPiece > maxCaptures) {
                maxCaptures = maxCapturesForPiece;
                pieces.length = 0;
                pieces.push({ row, col });
              } else if (maxCapturesForPiece === maxCaptures) {
                pieces.push({ row, col });
              }
            }
          }
        }
      }
    } else {
      for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
          const piece = game.board[row][col];
          if (piece && piece.color === color && getAvailableJumps(row, col, game.board, game.game_variant).length > 0) {
            pieces.push({ row, col });
          }
        }
      }
    }

    return pieces;
  };

  const handleSquareClick = async (row: number, col: number) => {
    if (!isMyTurn || game.status !== "in_progress") return;

    const piece = game.board[row][col];
    const availableJumps = findAllJumps(game.current_player);

    if (piece && piece.color === game.current_player && !selectedPiece) {
      if (availableJumps.length > 0) {
        const canJump = availableJumps.some(pos => pos.row === row && pos.col === col);
        if (!canJump) return;
      }

      if (multipleJumpInProgress && mustJumpFrom &&
        (row !== mustJumpFrom.row || col !== mustJumpFrom.col)) {
        return;
      }

      setSelectedPiece({ row, col });
      return;
    }

    if (selectedPiece) {
      const isValidMove = (fromRow: number, fromCol: number, toRow: number, toCol: number): boolean => {
        const piece = game.board[fromRow][fromCol];
        if (!piece) return false;
      
        const rowDiff = toRow - fromRow;
        const colDiff = Math.abs(toCol - fromCol);
      
        const hasJumps = findAllJumps(game.current_player).length > 0;
        if (hasJumps && colDiff !== 2) return false;
      
        if (multipleJumpInProgress && mustJumpFrom &&
          (fromRow !== mustJumpFrom.row || fromCol !== mustJumpFrom.col)) {
          return false;
        }
      
        if (game.game_variant === "brazilian" && piece.isKing) {
          if (Math.abs(rowDiff) !== Math.abs(colDiff)) return false;
      
          const rowDir = Math.sign(rowDiff);
          const colDir = Math.sign(toCol - fromCol);
          let currentRow = fromRow + rowDir;
          let currentCol = fromCol + colDir;
          let piecesInPath = 0;
      
          while (currentRow !== toRow && currentCol !== toCol) {
            if (game.board[currentRow][currentCol]) piecesInPath++;
            currentRow += rowDir;
            currentCol += colDir;
          }
      
          if (hasJumps && piecesInPath !== 1) return false;
          if (!hasJumps && piecesInPath !== 0) return false;
      
          return true;
        }
      
        if (colDiff !== 1 && colDiff !== 2) return false;
      
        if (!piece.isKing && game.game_variant !== "brazilian") {
          if (piece.color === "red" && rowDiff >= 0) return false;
          if (piece.color === "black" && rowDiff <= 0) return false;
        } else if (!piece.isKing && game.game_variant === "brazilian") {
          if (colDiff === 1) {
            if (piece.color === "red" && rowDiff >= 0) return false;
            if (piece.color === "black" && rowDiff <= 0) return false;
          }
        }
      
        if (colDiff === 2) {
          const jumpedRow = fromRow + Math.sign(rowDiff);
          const jumpedCol = fromCol + Math.sign(toCol - fromCol);
          const jumpedPiece = game.board[jumpedRow][jumpedCol];
      
          if (!jumpedPiece || jumpedPiece.color === piece.color) return false;
        }
      
        return true;
      };

      if (isValidMove(selectedPiece.row, selectedPiece.col, row, col)) {
        const newBoard = makeMove(selectedPiece.row, selectedPiece.col, row, col, game.board, game.game_variant);
        
        const jumped = Math.abs(row - selectedPiece.row) === 2 ||
          (game.game_variant === "brazilian" &&
            game.board[selectedPiece.row][selectedPiece.col]?.isKing &&
            Math.abs(row - selectedPiece.row) > 1);

        if (jumped) {
          const additionalJumps = getAvailableJumps(row, col, newBoard, game.game_variant);
          if (additionalJumps.length > 0) {
            await supabase
              .from('games')
              .update({
                board: newBoard
              })
              .eq('id', gameId);

            setSelectedPiece({ row, col });
            setMustJumpFrom({ row, col });
            setMultipleJumpInProgress(true);
            return;
          }
        }

        const hasRedPieces = newBoard.some(row =>
          row.some(piece => piece && piece.color === "red")
        );
        const hasBlackPieces = newBoard.some(row =>
          row.some(piece => piece && piece.color === "black")
        );

        await supabase
          .from('games')
          .update({
            board: newBoard,
            current_player: game.current_player === "red" ? "black" : "red",
            winner: !hasRedPieces ? "black" : !hasBlackPieces ? "red" : null,
            status: (!hasRedPieces || !hasBlackPieces) ? "completed" : "in_progress"
          })
          .eq('id', gameId);

        setSelectedPiece(null);
        setMustJumpFrom(null);
        setMultipleJumpInProgress(false);
      } else {
        setSelectedPiece(null);
      }
    }
  };

  const resetGame = () => {
    router.push('/');
  };

  const restartGame = () => {
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex flex-col items-center justify-center p-4">
      <Card className="p-8 bg-white/5 backdrop-blur-lg rounded-xl shadow-2xl">
        <GameHeader
          gameVariant={game.game_variant}
          onNewGame={() => setShowNewGameDialog(true)}
        />

        <GameStatus
          winner={game.winner}
          currentPlayer={game.current_player}
          isComputerThinking={false}
          findAllJumps={findAllJumps}
          multipleJumpInProgress={multipleJumpInProgress}
          onNewGame={() => setShowNewGameDialog(true)}
        />

        <GameBoard
          board={game.board}
          currentPlayer={game.current_player}
          selectedPiece={selectedPiece}
          isComputerThinking={false}
          gameVariant={game.game_variant}
          findAllJumps={findAllJumps}
          multipleJumpInProgress={multipleJumpInProgress}
          handleSquareClick={handleSquareClick}
        />

        <GameDialogs
          showNewGameDialog={showNewGameDialog}
          setShowNewGameDialog={setShowNewGameDialog}
          showGameEndDialog={showGameEndDialog}
          setShowGameEndDialog={setShowGameEndDialog}
          winner={game.winner}
          restartGame={restartGame}
          resetGame={resetGame}
        />
      </Card>
    </div>
  );
}