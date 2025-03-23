"use client";

import { useState, useEffect } from "react";
import { SquareStack as Square2Stack, Users, Monitor, Home as HomeButton, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Piece = {
  color: "red" | "black";
  isKing: boolean;
};

type Square = Piece | null;
type Board = Square[][];
type Position = { row: number; col: number };
type GameMode = "computer" | "twoPlayer";

const initialBoard = (): Board => {
  const board: Board = Array(8)
    .fill(null)
    .map(() => Array(8).fill(null));

  // Place black pieces
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 8; col++) {
      if ((row + col) % 2 === 1) {
        board[row][col] = { color: "black", isKing: false };
      }
    }
  }

  // Place red pieces
  for (let row = 5; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      if ((row + col) % 2 === 1) {
        board[row][col] = { color: "red", isKing: false };
      }
    }
  }

  return board;
};

export default function Home() {
  const [board, setBoard] = useState<Board>(initialBoard);
  const [selectedPiece, setSelectedPiece] = useState<Position | null>(null);
  const [currentPlayer, setCurrentPlayer] = useState<"red" | "black">("red");
  const [winner, setWinner] = useState<"red" | "black" | null>(null);
  const [mustJumpFrom, setMustJumpFrom] = useState<Position | null>(null);
  const [multipleJumpInProgress, setMultipleJumpInProgress] = useState<boolean>(false);
  const [gameMode, setGameMode] = useState<GameMode | null>(null);
  const [isComputerThinking, setIsComputerThinking] = useState(false);
  const [showNewGameDialog, setShowNewGameDialog] = useState(false);
  const [showGameEndDialog, setShowGameEndDialog] = useState(false);

  const getAvailableJumps = (row: number, col: number, currentBoard: Board = board): Position[] => {
    const piece = currentBoard[row][col];
    if (!piece) return [];

    const jumps: Position[] = [];
    const directions = piece.isKing ? [-2, 2] : piece.color === "red" ? [-2] : [2];

    for (const rowDiff of directions) {
      for (const colDiff of [-2, 2]) {
        const newRow = row + rowDiff;
        const newCol = col + colDiff;

        if (newRow >= 0 && newRow < 8 && newCol >= 0 && newCol < 8) {
          const jumpedRow = row + rowDiff / 2;
          const jumpedCol = col + colDiff / 2;
          const jumpedPiece = currentBoard[jumpedRow][jumpedCol];

          if (!currentBoard[newRow][newCol] &&
            jumpedPiece &&
            jumpedPiece.color !== piece.color) {
            jumps.push({ row: newRow, col: newCol });
          }
        }
      }
    }

    return jumps;
  };

  const getAvailableMoves = (row: number, col: number, currentBoard: Board = board): Position[] => {
    const piece = currentBoard[row][col];
    if (!piece) return [];

    const moves: Position[] = [];
    const directions = piece.isKing ? [-1, 1] : piece.color === "red" ? [-1] : [1];

    for (const rowDiff of directions) {
      for (const colDiff of [-1, 1]) {
        const newRow = row + rowDiff;
        const newCol = col + colDiff;

        if (newRow >= 0 && newRow < 8 && newCol >= 0 && newCol < 8 && !currentBoard[newRow][newCol]) {
          moves.push({ row: newRow, col: newCol });
        }
      }
    }

    return moves;
  };

  const findAllJumps = (color: "red" | "black", currentBoard: Board = board): Position[] => {
    const pieces: Position[] = [];

    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = currentBoard[row][col];
        if (piece && piece.color === color && getAvailableJumps(row, col, currentBoard).length > 0) {
          pieces.push({ row, col });
        }
      }
    }

    return pieces;
  };

  const findAllMoves = (color: "red" | "black", currentBoard: Board = board): Array<{ from: Position, to: Position }> => {
    const moves: Array<{ from: Position, to: Position }> = [];
    const jumps = findAllJumps(color, currentBoard);

    // If jumps are available, only return jumps
    if (jumps.length > 0) {
      for (const piece of jumps) {
        const availableJumps = getAvailableJumps(piece.row, piece.col, currentBoard);
        for (const jump of availableJumps) {
          moves.push({ from: piece, to: jump });
        }
      }
      return moves;
    }

    // Otherwise, return regular moves
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = currentBoard[row][col];
        if (piece && piece.color === color) {
          const availableMoves = getAvailableMoves(row, col, currentBoard);
          for (const move of availableMoves) {
            moves.push({ from: { row, col }, to: move });
          }
        }
      }
    }

    return moves;
  };

  const makeMove = (fromRow: number, fromCol: number, toRow: number, toCol: number, currentBoard: Board): Board => {
    const newBoard = JSON.parse(JSON.stringify(currentBoard));
    const movingPiece = newBoard[fromRow][fromCol];

    // Move the piece
    newBoard[toRow][toCol] = movingPiece;
    newBoard[fromRow][fromCol] = null;

    // Handle jumps
    if (Math.abs(toRow - fromRow) === 2) {
      const jumpedRow = fromRow + Math.sign(toRow - fromRow);
      const jumpedCol = fromCol + Math.sign(toCol - fromCol);
      newBoard[jumpedRow][jumpedCol] = null;
    }

    // King promotion
    if ((toRow === 0 && movingPiece.color === "red") ||
      (toRow === 7 && movingPiece.color === "black")) {
      newBoard[toRow][toCol].isKing = true;
    }

    return newBoard;
  };

  const evaluateBoard = (currentBoard: Board): number => {
    let score = 0;
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = currentBoard[row][col];
        if (piece) {
          const value = piece.isKing ? 3 : 1;
          score += piece.color === "black" ? value : -value;
        }
      }
    }
    return score;
  };

  const computerMove = async () => {
    setIsComputerThinking(true);

    // Add a small delay to make the computer's move visible
    await new Promise(resolve => setTimeout(resolve, 500));

    const availableMoves = findAllMoves("black", board);
    if (availableMoves.length === 0) {
      setWinner("red");
      setIsComputerThinking(false);
      return;
    }

    // Simple strategy: evaluate each move and choose the best one
    let bestScore = -Infinity;
    let bestMove = availableMoves[0];

    for (const move of availableMoves) {
      const newBoard = makeMove(move.from.row, move.from.col, move.to.row, move.to.col, board);
      const score = evaluateBoard(newBoard);

      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
    }

    // Make the best move
    const newBoard = makeMove(bestMove.from.row, bestMove.from.col, bestMove.to.row, bestMove.to.col, board);
    setBoard(newBoard);

    // Check for additional jumps
    const additionalJumps = getAvailableJumps(bestMove.to.row, bestMove.to.col, newBoard);
    if (Math.abs(bestMove.to.row - bestMove.from.row) === 2 && additionalJumps.length > 0) {
      // Continue with multiple jumps
      await computerMove();
      return;
    }

    setIsComputerThinking(false);
    setCurrentPlayer("red");

    // Check for winner
    const hasRedPieces = newBoard.some(row =>
      row.some(piece => piece && piece.color === "red")
    );
    if (!hasRedPieces) setWinner("black");
  };

  useEffect(() => {
    if (gameMode === "computer" && currentPlayer === "black" && !winner && !isComputerThinking) {
      computerMove();
    }
  }, [currentPlayer, gameMode, winner]);

  useEffect(() => {
    if (winner) {
      setShowGameEndDialog(true);
    }
  }, [winner]);

  const isValidMove = (fromRow: number, fromCol: number, toRow: number, toCol: number): boolean => {
    const piece = board[fromRow][fromCol];
    if (!piece) return false;

    const rowDiff = toRow - fromRow;
    const colDiff = Math.abs(toCol - fromCol);

    // If there are mandatory jumps, only allow jumping
    const hasJumps = findAllJumps(currentPlayer).length > 0;
    if (hasJumps && colDiff !== 2) return false;

    // If multiple jump is in progress, only allow jumps from the same piece
    if (multipleJumpInProgress && mustJumpFrom &&
      (fromRow !== mustJumpFrom.row || fromCol !== mustJumpFrom.col)) {
      return false;
    }

    // Basic movement rules
    if (colDiff !== 1 && colDiff !== 2) return false;

    if (!piece.isKing) {
      if (piece.color === "red" && rowDiff >= 0) return false;
      if (piece.color === "black" && rowDiff <= 0) return false;
    }

    // Jump movement
    if (colDiff === 2) {
      const jumpedRow = fromRow + Math.sign(rowDiff);
      const jumpedCol = fromCol + Math.sign(toCol - fromCol);
      const jumpedPiece = board[jumpedRow][jumpedCol];

      if (!jumpedPiece || jumpedPiece.color === piece.color) return false;
    }

    return true;
  };

  const handleSquareClick = (row: number, col: number) => {
    if (winner || !gameMode || isComputerThinking) return;
    if (gameMode === "computer" && currentPlayer === "black") return;

    const piece = board[row][col];
    const availableJumps = findAllJumps(currentPlayer);

    // Select piece
    if (piece && piece.color === currentPlayer && !selectedPiece) {
      // If there are mandatory jumps, only allow selecting pieces that can jump
      if (availableJumps.length > 0) {
        const canJump = availableJumps.some(pos => pos.row === row && pos.col === col);
        if (!canJump) return;
      }

      // If multiple jump is in progress, only allow selecting the jumping piece
      if (multipleJumpInProgress && mustJumpFrom &&
        (row !== mustJumpFrom.row || col !== mustJumpFrom.col)) {
        return;
      }

      setSelectedPiece({ row, col });
      return;
    }

    // Move piece
    if (selectedPiece) {
      if (isValidMove(selectedPiece.row, selectedPiece.col, row, col)) {
        const newBoard = makeMove(selectedPiece.row, selectedPiece.col, row, col, board);
        setBoard(newBoard);

        // Handle jumps
        const jumped = Math.abs(row - selectedPiece.row) === 2;
        if (jumped) {
          const additionalJumps = getAvailableJumps(row, col, newBoard);
          if (additionalJumps.length > 0) {
            setSelectedPiece({ row, col });
            setMustJumpFrom({ row, col });
            setMultipleJumpInProgress(true);
            return;
          }
        }

        // End turn
        setSelectedPiece(null);
        setMustJumpFrom(null);
        setMultipleJumpInProgress(false);
        setCurrentPlayer(currentPlayer === "red" ? "black" : "red");

        // Check for winner
        const hasRedPieces = newBoard.some(row =>
          row.some(piece => piece && piece.color === "red")
        );
        const hasBlackPieces = newBoard.some(row =>
          row.some(piece => piece && piece.color === "black")
        );

        if (!hasRedPieces) setWinner("black");
        if (!hasBlackPieces) setWinner("red");
      } else {
        setSelectedPiece(null);
      }
    }
  };

  const resetGame = () => {
    setShowNewGameDialog(false); // Close the dialog first

    setTimeout(() => {
      setBoard(initialBoard());
      setSelectedPiece(null);
      setCurrentPlayer("red");
      setWinner(null);
      setMustJumpFrom(null);
      setMultipleJumpInProgress(false);
      setIsComputerThinking(false);
      setShowGameEndDialog(false);

    }, 100); // Small delay ensures the dialog closes first
  };


  const restartGame = () => {
    setBoard(initialBoard());
    setSelectedPiece(null);
    setCurrentPlayer("red");
    setWinner(null);
    setMustJumpFrom(null);
    setMultipleJumpInProgress(false);
    setIsComputerThinking(false);
    setShowNewGameDialog(false);
    setShowGameEndDialog(false);
  };

  if (!gameMode) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex flex-col items-center justify-center p-4">
        <Card className="p-8 bg-white/5 backdrop-blur-lg rounded-xl shadow-2xl">
          <h1 className="text-3xl font-bold text-white text-center mb-8">Checkers</h1>
          <div className="flex flex-col gap-4">
            <Button
              onClick={() => setGameMode("computer")}
              variant="outline"
              className="flex items-center gap-2 text-lg py-6 hover:bg-white/10"
            >
              <Monitor className="w-6 h-6" />
              Play vs Computer
            </Button>
            <Button
              onClick={() => setGameMode("twoPlayer")}
              variant="outline"
              className="flex items-center gap-2 text-lg py-6 hover:bg-white/10"
            >
              <Users className="w-6 h-6" />
              Two Players
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex flex-col items-center justify-center p-4">
      <Card className="p-8 bg-white/5 backdrop-blur-lg rounded-xl shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Square2Stack className="w-6 h-6 text-white" />
            <h1 className="text-2xl font-bold text-white">Checkers</h1>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => {
                setShowNewGameDialog(true);
              }}
              variant="outline"
              className="hover:bg-white/10"
            >
              New Game
            </Button>

          </div>
        </div>

        <div className="mb-4">
          {winner ? (
            <p className="text-lg font-semibold text-white">
              {winner.charAt(0).toUpperCase() + winner.slice(1)} wins!
            </p>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <p className="text-lg font-semibold text-white">
                  Current turn: {currentPlayer.charAt(0).toUpperCase() + currentPlayer.slice(1)}
                </p>
                {isComputerThinking && (
                  <p className="text-sm text-blue-400">(Computer is thinking...)</p>
                )}
              </div>
              {findAllJumps(currentPlayer).length > 0 && (
                <p className="text-sm text-yellow-400">
                  Jumps available! You must take them.
                </p>
              )}
              {multipleJumpInProgress && (
                <p className="text-sm text-yellow-400">
                  Multiple jump in progress! Continue jumping with the same piece.
                </p>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-8 gap-1 bg-white/10 p-2 rounded-lg">
          {board.map((row, rowIndex) => (
            row.map((piece, colIndex) => {
              const isBlackSquare = (rowIndex + colIndex) % 2 === 1;
              const isSelected = selectedPiece?.row === rowIndex && selectedPiece?.col === colIndex;
              const canJump = findAllJumps(currentPlayer).some(
                pos => pos.row === rowIndex && pos.col === colIndex
              );

              return (
                <div
                  key={`${rowIndex}-${colIndex}`}
                  onClick={() => isBlackSquare && handleSquareClick(rowIndex, colIndex)}
                  className={`
                    w-12 h-12 sm:w-16 sm:h-16 flex items-center justify-center rounded-md
                    transition-all duration-200
                    ${isBlackSquare ? 'bg-slate-700 cursor-pointer hover:bg-slate-600' : 'bg-slate-300'}
                    ${isSelected ? 'ring-2 ring-yellow-400' : ''}
                    ${canJump && piece?.color === currentPlayer ? 'ring-2 ring-blue-400' : ''}
                  `}
                >
                  {piece && (
                    <div className={`
                      w-8 h-8 sm:w-12 sm:h-12 rounded-full 
                      ${piece.color === 'red' ? 'bg-red-500' : 'bg-gray-900'}
                      ${piece.isKing ? 'ring-2 ring-yellow-400 ring-inset' : ''}
                      transition-transform transform hover:scale-105
                    `} />
                  )}
                </div>
              );
            })
          ))}
        </div>
      </Card>

      {/* New Game Dialog */}
      <Dialog open={showNewGameDialog} onOpenChange={setShowNewGameDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Game</DialogTitle>
            <DialogDescription>
              What would you like to do?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setShowNewGameDialog(false)}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              variant="outline"
              onClick={restartGame}
              className="w-full sm:w-auto flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Restart Game
            </Button>
            <Button
              onClick={resetGame}
              className="w-full sm:w-auto flex items-center gap-2"
            >
              <HomeButton className="w-4 h-4" />
              Main Menu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Game End Dialog */}
      <Dialog open={showGameEndDialog} onOpenChange={setShowGameEndDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Game Over!</DialogTitle>
            <DialogDescription>
              {winner ? `${winner.charAt(0).toUpperCase()}${winner.slice(1)} wins!` : "No winner yet. What would you like to do?"}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setShowGameEndDialog(false)}
              className="w-full sm:w-auto"
            >
              Stay Here
            </Button>
            <Button
              variant="outline"
              onClick={restartGame}
              className="w-full sm:w-auto flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Play Again
            </Button>
            <Button
              onClick={resetGame}
              className="w-full sm:w-auto flex items-center gap-2"
            >
              <HomeButton className="w-4 h-4" />
              Main Menu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}