"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { GameBoard } from "./GameBoard";
import { GameStatus } from "./GameStatus";
import { GameHeader } from "./GameHeader";
import { GameDialogs } from "./GameDialogs";
import { Card } from "@/components/ui/card";
import { OnlineGame as OnlineGameType, Position } from "@/lib/types";
import { socket } from "@/lib/socket";
import { getAvailableJumps, makeMove, getAvailableMoves } from "@/lib/game";

interface OnlineGameProps {
  gameId: string;
  userId: string;
  initialGame: OnlineGameType;
}

export function OnlineGame({ gameId, userId, initialGame }: OnlineGameProps) {
  const router = useRouter();
  const [game, setGame] = React.useState<OnlineGameType>(initialGame);
  const [selectedPiece, setSelectedPiece] = React.useState<Position | null>(null);
  const [showNewGameDialog, setShowNewGameDialog] = React.useState(false);
  const [showGameEndDialog, setShowGameEndDialog] = React.useState(false);
  const [multipleJumpInProgress, setMultipleJumpInProgress] = React.useState(false);
  const [mustJumpFrom, setMustJumpFrom] = React.useState<Position | null>(null);
  const [isConnected, setIsConnected] = React.useState(false);

  const isMyTurn =
  (game.current_player === "red" && parseInt(game.red_player.id) === parseInt(userId)) ||
  (game.current_player === "black" && parseInt(game.black_player.id) === parseInt(userId));


  React.useEffect(() => {
    const setupSocket = () => {
      socket.connect();

      socket.on('connect', () => {
        console.log('Connected to WebSocket');
        setIsConnected(true);
        
        // Join the game room after connection
        if (game.status === "waiting" && game.red_player.id !== userId) {
          socket.emit('join_game', { game_id: gameId, player_id: userId });
        }
      });

      socket.on('disconnect', () => {
        console.log('Disconnected from WebSocket');
        setIsConnected(false);
      });

      socket.on('game_updated', (updatedGame: OnlineGameType) => {
        console.log('Game updated:', updatedGame);
        if (updatedGame.id === gameId) {
          setGame(updatedGame);
          // Reset selection state when game updates
          setSelectedPiece(null);
          setMultipleJumpInProgress(false);
          setMustJumpFrom(null);
        }
      });

      socket.on('connect_error', (error) => {
        console.error('Connection error:', error);
      });
    };

    setupSocket();

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('game_updated');
      socket.off('connect_error');
      socket.disconnect();
    };
  }, [gameId, userId, game.status, game.red_player]);

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

  const isValidMove = (fromRow: number, fromCol: number, toRow: number, toCol: number): boolean => {
    const piece = game.board[fromRow][fromCol];
    if (!piece) return false;

    const availableJumps = findAllJumps(game.current_player);
    if (availableJumps.length > 0) {
      // If jumps are available, only allow jump moves
      const jumps = getAvailableJumps(fromRow, fromCol, game.board, game.game_variant);
      return jumps.some(jump => jump.to.row === toRow && jump.to.col === toCol);
    }

    // If no jumps are available, check regular moves
    const moves = getAvailableMoves(fromRow, fromCol, game.board, game.game_variant);
    return moves.some(move => move.row === toRow && move.col === toCol);
  };

  const handleSquareClick = (row: number, col: number) => {
    console.log("turn", isMyTurn, userId,game.black_player,game.red_player);
    
    // Ensure that the game is in progress and the user is connected, and it's their turn
    if (!isMyTurn || game.status !== "in_progress" || !isConnected) {
      return;
    }
  
    const piece = game.board[row][col];
  
    // Selecting a piece
    if (piece && piece.color === game.current_player && !selectedPiece) {
      if (multipleJumpInProgress && mustJumpFrom && (row !== mustJumpFrom.row || col !== mustJumpFrom.col)) {
        // If there are multiple jumps in progress, prevent selecting non-jumping pieces
        return;
      }
  
      // Check if any available jumps exist for this piece
      const availableJumps = findAllJumps(game.current_player);
  
      if (availableJumps.length > 0) {
        // If jumps are available, allow selecting only pieces that can jump
        const canJump = availableJumps.some(pos => pos.row === row && pos.col === col);
        if (!canJump) return;
      }
  
      // Allow selection if the piece belongs to the current player
      setSelectedPiece({ row, col });
      return;
    }
  
    // Moving a selected piece
    if (selectedPiece) {
      if (isValidMove(selectedPiece.row, selectedPiece.col, row, col)) {
        const newBoard = makeMove(selectedPiece.row, selectedPiece.col, row, col, game.board, game.game_variant);
  
        const jumped = Math.abs(row - selectedPiece.row) === 2 ||
          (game.game_variant === "brazilian" && game.board[selectedPiece.row][selectedPiece.col]?.isKing && Math.abs(row - selectedPiece.row) > 1);
  
        if (jumped) {
          const additionalJumps = getAvailableJumps(row, col, newBoard, game.game_variant);
          if (additionalJumps.length > 0) {
            socket.emit('make_move', {
              game_id: gameId,
              board: newBoard
            });
  
            setSelectedPiece({ row, col });
            setMustJumpFrom({ row, col });
            setMultipleJumpInProgress(true);
            return;
          }
        }
  
        const hasRedPieces = newBoard.some(row => row.some(piece => piece && piece.color === "red"));
        const hasBlackPieces = newBoard.some(row => row.some(piece => piece && piece.color === "black"));
  
        socket.emit('make_move', {
          game_id: gameId,
          board: newBoard,
          winner: !hasRedPieces ? "black" : !hasBlackPieces ? "red" : null
        });
  
        setSelectedPiece(null);
        setMustJumpFrom(null);
        setMultipleJumpInProgress(false);
      } else {
        setSelectedPiece(null);  // Reset selection if move is invalid
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
      <div className="p-8 bg-white/5 backdrop-blur-lg  shadow-2xl">
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
          redPlayer={game.red_player}
          blackPlayer={game.black_player}
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
      </div>
    </div>
  );
}