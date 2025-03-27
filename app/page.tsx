'use client'
import React, { useState, useEffect } from "react";
import { SquareStack as Square2Stack, Users, Monitor, Home as HomeIcon, RotateCcw, Crown } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type GameVariant = "normal" | "brazilian";
type Piece = {
  color: "red" | "black";
  isKing: boolean;
};

type Square = Piece | null;
type Board = Square[][];
type Position = { row: number; col: number };
type GameMode = "computer" | "twoPlayer";
type CaptureMove = { from: Position; to: Position; captures: Position[] };

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
  const [gameVariant, setGameVariant] = useState<GameVariant | null>(null);
  const [isComputerThinking, setIsComputerThinking] = useState(false);
  const [showNewGameDialog, setShowNewGameDialog] = useState(false);
  const [showGameEndDialog, setShowGameEndDialog] = useState(false);
  const [showVariantDialog, setShowVariantDialog] = useState(true);

  const getAvailableJumps = (row: number, col: number, currentBoard: Board = board): CaptureMove[] => {
    const piece = currentBoard[row][col];
    if (!piece) return [];

    const jumps: CaptureMove[] = [];
    const directions = piece.isKing ? [-2, 2] : piece.color === "red" ? [-2] : [2];

    // For Brazilian kings, we need to check the entire diagonal
    if (gameVariant === "brazilian" && piece.isKing) {
      // Check all possible diagonal directions
      const checkDirection = (rowDir: number, colDir: number, startRow: number, startCol: number) => {
        let currentRow = startRow + rowDir;
        let currentCol = startCol + colDir;
        let jumpedPieces: Position[] = [];

        while (currentRow >= 0 && currentRow < 8 && currentCol >= 0 && currentCol < 8) {
          const jumpedPiece = currentBoard[currentRow][currentCol];

          if (jumpedPiece) {
            if (jumpedPiece.color === piece.color || jumpedPieces.length > 0) break;

            // Check if we can land after the jumped piece
            const landingRow = currentRow + rowDir;
            const landingCol = currentCol + colDir;

            if (landingRow >= 0 && landingRow < 8 && landingCol >= 0 && landingCol < 8 && !currentBoard[landingRow][landingCol]) {
              jumps.push({
                from: { row, col },
                to: { row: landingRow, col: landingCol },
                captures: [{ row: currentRow, col: currentCol }]
              });
            }
            break;
          }
          currentRow += rowDir;
          currentCol += colDir;
        }
      };

      [-1, 1].forEach(rowDir => {
        [-1, 1].forEach(colDir => {
          checkDirection(rowDir, colDir, row, col);
        });
      });
    } else {
      // Normal pieces and normal kings
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
              jumps.push({
                from: { row, col },
                to: { row: newRow, col: newCol },
                captures: [{ row: jumpedRow, col: jumpedCol }]
              });
            }
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

    if (gameVariant === "brazilian" && piece.isKing) {
      // Brazilian kings can move any number of squares diagonally
      [-1, 1].forEach(rowDir => {
        [-1, 1].forEach(colDir => {
          let currentRow = row + rowDir;
          let currentCol = col + colDir;
          while (currentRow >= 0 && currentRow < 8 && currentCol >= 0 && currentCol < 8) {
            if (!currentBoard[currentRow][currentCol]) {
              moves.push({ row: currentRow, col: currentCol });
            } else {
              break;
            }
            currentRow += rowDir;
            currentCol += colDir;
          }
        });
      });
    } else {
      // Normal pieces and normal kings
      for (const rowDiff of directions) {
        for (const colDiff of [-1, 1]) {
          const newRow = row + rowDiff;
          const newCol = col + colDiff;

          if (newRow >= 0 && newRow < 8 && newCol >= 0 && newCol < 8 && !currentBoard[newRow][newCol]) {
            moves.push({ row: newRow, col: newCol });
          }
        }
      }
    }

    return moves;
  };

  const findAllJumps = (color: "red" | "black", currentBoard: Board = board): Position[] => {
    const pieces: Position[] = [];
    let maxCaptures = 0;

    // For Brazilian rules, we need to find the moves that capture the most pieces
    if (gameVariant === "brazilian") {
      for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
          const piece = currentBoard[row][col];
          if (piece && piece.color === color) {
            const jumps = getAvailableJumps(row, col, currentBoard);
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
      // Normal rules
      for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
          const piece = currentBoard[row][col];
          if (piece && piece.color === color && getAvailableJumps(row, col, currentBoard).length > 0) {
            pieces.push({ row, col });
          }
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
          moves.push({ from: piece, to: jump.to });
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
    newBoard[toRow][toCol] = { ...movingPiece };
    newBoard[fromRow][fromCol] = null;

    // Handle jumps
    if (Math.abs(toRow - fromRow) === 2 || (gameVariant === "brazilian" && movingPiece.isKing)) {
      // For Brazilian kings, we need to remove the jumped piece based on the path
      if (gameVariant === "brazilian" && movingPiece.isKing) {
        const rowDir = Math.sign(toRow - fromRow);
        const colDir = Math.sign(toCol - fromCol);
        let currentRow = fromRow + rowDir;
        let currentCol = fromCol + colDir;

        while (currentRow !== toRow && currentCol !== toCol) {
          if (newBoard[currentRow][currentCol]) {
            newBoard[currentRow][currentCol] = null;
            break;
          }
          currentRow += rowDir;
          currentCol += colDir;
        }
      } else {
        const jumpedRow = fromRow + Math.sign(toRow - fromRow);
        const jumpedCol = fromCol + Math.sign(toCol - fromCol);
        newBoard[jumpedRow][jumpedCol] = null;
      }
    }

    // King promotion - do this AFTER handling jumps
    if (!newBoard[toRow][toCol].isKing &&
      ((toRow === 0 && movingPiece.color === "red") ||
        (toRow === 7 && movingPiece.color === "black"))) {
      newBoard[toRow][toCol].isKing = true;
      // For Brazilian checkers, immediately check for available jumps after promotion
      if (gameVariant === "brazilian") {
        const jumps = getAvailableJumps(toRow, toCol, newBoard);
        if (jumps.length === 0) {
          // If no jumps available after promotion, the turn ends
          return newBoard;
        }
        // If jumps are available, the piece must continue moving
      }
    }

    return newBoard;
  };

  const evaluateBoard = (currentBoard: Board): number => {
    let score = 0;
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = currentBoard[row][col];
        if (piece) {
          // In Brazilian checkers, kings are more valuable
          const value = piece.isKing ? (gameVariant === "brazilian" ? 5 : 3) : 1;
          score += piece.color === "black" ? value : -value;
        }
      }
    }
    return score;
  };

  const computerMove = async () => {
    setIsComputerThinking(true);

    // Helper function to find all possible jump sequences
    const findJumpSequences = (
      startRow: number,
      startCol: number,
      currentBoard: Board,
      sequence: CaptureMove[] = []
    ): CaptureMove[][] => {
      const jumps = getAvailableJumps(startRow, startCol, currentBoard);

      if (jumps.length === 0) {
        return sequence.length > 0 ? [sequence] : [];
      }

      const sequences: CaptureMove[][] = [];

      for (const jump of jumps) {
        const newBoard = makeMove(jump.from.row, jump.from.col, jump.to.row, jump.to.col, currentBoard);
        const nextSequences = findJumpSequences(
          jump.to.row,
          jump.to.col,
          newBoard,
          [...sequence, jump]
        );
        sequences.push(...nextSequences);
      }

      return sequences.length > 0 ? sequences : [sequence];
    };

    // Find all possible moves including complete jump sequences
    const allMoves: Array<{ sequence: CaptureMove[]; score: number }> = [];

    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = board[row][col];
        if (piece && piece.color === "black") {
          // Check for jump sequences
          const jumpSequences = findJumpSequences(row, col, board);
          for (const sequence of jumpSequences) {
            if (sequence.length > 0) {
              let tempBoard = JSON.parse(JSON.stringify(board));
              for (const jump of sequence) {
                tempBoard = makeMove(jump.from.row, jump.from.col, jump.to.row, jump.to.col, tempBoard);
              }
              allMoves.push({
                sequence,
                score: evaluateBoard(tempBoard) + sequence.length * 10 // Prioritize sequences with more captures
              });
            }
          }

          // Add regular moves if no jumps are available
          if (jumpSequences.length === 0) {
            const regularMoves = getAvailableMoves(row, col, board);
            for (const move of regularMoves) {
              const newBoard = makeMove(row, col, move.row, move.col, board);
              allMoves.push({
                sequence: [{
                  from: { row, col },
                  to: move,
                  captures: []
                }],
                score: evaluateBoard(newBoard)
              });
            }
          }
        }
      }
    }

    if (allMoves.length === 0) {
      setWinner("red");
      setIsComputerThinking(false);
      return;
    }

    // Sort moves by score and get the best one
    allMoves.sort((a, b) => b.score - a.score);
    const bestMove = allMoves[0];

    // Execute the sequence of moves
    let currentBoard = JSON.parse(JSON.stringify(board));

    for (let i = 0; i < bestMove.sequence.length; i++) {
      const move = bestMove.sequence[i];
      currentBoard = makeMove(move.from.row, move.from.col, move.to.row, move.to.col, currentBoard);
      setBoard(currentBoard);

      // Add delay between moves in the sequence
      if (i < bestMove.sequence.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }

    // End turn
    setSelectedPiece(null);
    setMustJumpFrom(null);
    setMultipleJumpInProgress(false);
    setIsComputerThinking(false);
    setCurrentPlayer("red");

    // Check for winner
    const hasRedPieces = currentBoard.some(row =>
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

    // Brazilian kings can move any number of squares
    if (gameVariant === "brazilian" && piece.isKing) {
      if (Math.abs(rowDiff) !== Math.abs(colDiff)) return false;

      // Check if path is clear
      const rowDir = Math.sign(rowDiff);
      const colDir = Math.sign(toCol - fromCol);
      let currentRow = fromRow + rowDir;
      let currentCol = fromCol + colDir;
      let piecesInPath = 0;

      while (currentRow !== toRow && currentCol !== toCol) {
        if (board[currentRow][currentCol]) piecesInPath++;
        currentRow += rowDir;
        currentCol += colDir;
      }

      // For captures, exactly one piece should be in path
      if (hasJumps && piecesInPath !== 1) return false;
      // For normal moves, path should be clear
      if (!hasJumps && piecesInPath !== 0) return false;

      return true;
    }

    // Normal pieces and normal kings
    if (colDiff !== 1 && colDiff !== 2) return false;

    // In Brazilian checkers, regular pieces can capture backward and forward
    if (!piece.isKing && gameVariant !== "brazilian") {
      // Only apply directional restrictions for normal checkers
      if (piece.color === "red" && rowDiff >= 0) return false;
      if (piece.color === "black" && rowDiff <= 0) return false;
    } else if (!piece.isKing && gameVariant === "brazilian") {
      // For Brazilian checkers, only apply directional restrictions for non-capture moves
      if (colDiff === 1) { // Regular move
        if (piece.color === "red" && rowDiff >= 0) return false;
        if (piece.color === "black" && rowDiff <= 0) return false;
      }
      // Captures can be made in any direction, so no directional restrictions needed
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
    if (winner || !gameMode || !gameVariant || isComputerThinking) return;
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
        const jumped = Math.abs(row - selectedPiece.row) === 2 ||
          (gameVariant === "brazilian" &&
            board[selectedPiece.row][selectedPiece.col]?.isKing &&
            Math.abs(row - selectedPiece.row) > 1);

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
    setBoard(initialBoard());
    setSelectedPiece(null);
    setCurrentPlayer("red");
    setWinner(null);
    setMustJumpFrom(null);
    setMultipleJumpInProgress(false);
    setGameMode(null);
    setGameVariant(null);
    setIsComputerThinking(false);
    setShowNewGameDialog(false);
    setShowGameEndDialog(false);
    setShowVariantDialog(true);
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

  if (!gameVariant) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex flex-col items-center justify-center p-4">
        <Card className="p-8 bg-white/5 backdrop-blur-lg rounded-xl shadow-2xl">
          <h1 className="text-3xl font-bold text-white text-center mb-8">Choose Game Variant</h1>
          <div className="flex flex-col gap-4">
            <Button
              onClick={() => {
                setGameVariant("normal");
                setShowVariantDialog(false);
              }}
              variant="outline"
              className="flex items-center gap-2 text-lg py-6 hover:bg-white/10"
            >
              <Square2Stack className="w-6 h-6" />
              Normal Checkers
            </Button>
            <Button
              onClick={() => {
                setGameVariant("brazilian");
                setShowVariantDialog(false);
              }}
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

  if (!gameMode) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex flex-col items-center justify-center p-4">
        <Card className="p-8 bg-white/5 backdrop-blur-lg rounded-xl shadow-2xl">
          <h1 className="text-3xl font-bold text-white text-center mb-8">
            {gameVariant === "brazilian" ? "Brazilian Checkers" : "Checkers"}
          </h1>
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
            {gameVariant === "brazilian" ? (
              <Crown className="w-6 h-6 text-white" />
            ) : (
              <Square2Stack className="w-6 h-6 text-white" />
            )}
            <h1 className="text-2xl font-bold text-white">
              {gameVariant === "brazilian" ? "Brazilian Checkers" : "Checkers"}
            </h1>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => setShowNewGameDialog(true)}
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
                      w-8 h-8 sm:w-12 sm:h-12 rounded-full relative
                      ${piece.color === 'red' ? 'bg-red-500' : 'bg-gray-900'}
                      transition-transform transform hover:scale-105
                    `}>
                      {piece.isKing && (
                        <Crown className={`
                          absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2
                          w-6 h-6 sm:w-8 sm:h-8
                          ${piece.color === 'red' ? 'text-red-800' : 'text-gray-600'}
                        `} />
                      )}
                    </div>
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
              <HomeIcon className="w-4 h-4" />
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
              {winner?.charAt(0).toUpperCase() + winner?.slice(1)} wins! What would you like to do?
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
              <HomeIcon className="w-4 h-4" />
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
              {winner?.charAt(0).toUpperCase() + winner?.slice(1)} wins! What would you like to do?
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
              <HomeIcon className="w-4 h-4" />
              Main Menu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}