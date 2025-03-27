"use client";

import React, { useState, useEffect } from "react";
import { GameBoard } from "@/app/components/GameBoard";
import { GameStatus } from "@/app/components/GameStatus";
import { GameHeader } from "@/app/components/GameHeader";
import { GameDialogs } from "@/app/components/GameDialogs";
import { GameModeSelect } from "@/app/components/GameModeSelect";
import { GameVariantSelect } from "@/app/components/GameVariantSelect";
import { Card } from "@/components/ui/card";
import { GameMode, GameVariant, Board, Position, CaptureMove } from "@/lib/types";
import { initialBoard, getAvailableJumps, getAvailableMoves, makeMove } from "@/lib/game";

export default function Home() {
  const [board, setBoard] = useState<Board>(initialBoard());
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

  const findAllJumps = (color: "red" | "black", currentBoard: Board = board): Position[] => {
    const pieces: Position[] = [];
    let maxCaptures = 0;

    if (gameVariant === "brazilian") {
      for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
          const piece = currentBoard[row][col];
          if (piece && piece.color === color) {
            const jumps = getAvailableJumps(row, col, currentBoard, gameVariant);
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
          const piece = currentBoard[row][col];
          if (piece && piece.color === color && getAvailableJumps(row, col, currentBoard, gameVariant!).length > 0) {
            pieces.push({ row, col });
          }
        }
      }
    }

    return pieces;
  };

  const evaluateBoard = (currentBoard: Board): number => {
    let score = 0;
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = currentBoard[row][col];
        if (piece) {
          const value = piece.isKing ? (gameVariant === "brazilian" ? 5 : 3) : 1;
          score += piece.color === "black" ? value : -value;
        }
      }
    }
    return score;
  };

  const computerMove = async () => {
    if (!gameVariant) return;
    
    setIsComputerThinking(true);

    const findJumpSequences = (
      startRow: number,
      startCol: number,
      currentBoard: Board,
      sequence: CaptureMove[] = []
    ): CaptureMove[][] => {
      const jumps = getAvailableJumps(startRow, startCol, currentBoard, gameVariant);

      if (jumps.length === 0) {
        return sequence.length > 0 ? [sequence] : [];
      }

      const sequences: CaptureMove[][] = [];

      for (const jump of jumps) {
        const newBoard = makeMove(jump.from.row, jump.from.col, jump.to.row, jump.to.col, currentBoard, gameVariant);
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

    const allMoves: Array<{ sequence: CaptureMove[]; score: number }> = [];

    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = board[row][col];
        if (piece && piece.color === "black") {
          const jumpSequences = findJumpSequences(row, col, board);
          for (const sequence of jumpSequences) {
            if (sequence.length > 0) {
              let tempBoard = JSON.parse(JSON.stringify(board));
              for (const jump of sequence) {
                tempBoard = makeMove(jump.from.row, jump.from.col, jump.to.row, jump.to.col, tempBoard, gameVariant);
              }
              allMoves.push({
                sequence,
                score: evaluateBoard(tempBoard) + sequence.length * 10
              });
            }
          }

          if (jumpSequences.length === 0) {
            const regularMoves = getAvailableMoves(row, col, board, gameVariant);
            for (const move of regularMoves) {
              const newBoard = makeMove(row, col, move.row, move.col, board, gameVariant);
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

    allMoves.sort((a, b) => b.score - a.score);
    const bestMove = allMoves[0];

    let currentBoard = JSON.parse(JSON.stringify(board));

    for (let i = 0; i < bestMove.sequence.length; i++) {
      const move = bestMove.sequence[i];
      currentBoard = makeMove(move.from.row, move.from.col, move.to.row, move.to.col, currentBoard, gameVariant);
      setBoard(currentBoard);

      if (i < bestMove.sequence.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }

    setSelectedPiece(null);
    setMustJumpFrom(null);
    setMultipleJumpInProgress(false);
    setIsComputerThinking(false);
    setCurrentPlayer("red");

    const hasRedPieces = currentBoard.some((row: any[]) =>
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
    if (!gameVariant) return false;
    
    const piece = board[fromRow][fromCol];
    if (!piece) return false;

    const rowDiff = toRow - fromRow;
    const colDiff = Math.abs(toCol - fromCol);

    const hasJumps = findAllJumps(currentPlayer).length > 0;
    if (hasJumps && colDiff !== 2) return false;

    if (multipleJumpInProgress && mustJumpFrom &&
      (fromRow !== mustJumpFrom.row || fromCol !== mustJumpFrom.col)) {
      return false;
    }

    if (gameVariant === "brazilian" && piece.isKing) {
      if (Math.abs(rowDiff) !== Math.abs(colDiff)) return false;

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

      if (hasJumps && piecesInPath !== 1) return false;
      if (!hasJumps && piecesInPath !== 0) return false;

      return true;
    }

    if (colDiff !== 1 && colDiff !== 2) return false;

    if (!piece.isKing && gameVariant !== "brazilian") {
      if (piece.color === "red" && rowDiff >= 0) return false;
      if (piece.color === "black" && rowDiff <= 0) return false;
    } else if (!piece.isKing && gameVariant === "brazilian") {
      if (colDiff === 1) {
        if (piece.color === "red" && rowDiff >= 0) return false;
        if (piece.color === "black" && rowDiff <= 0) return false;
      }
    }

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

    if (piece && piece.color === currentPlayer && !selectedPiece) {
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

    if (selectedPiece && gameVariant) {
      if (isValidMove(selectedPiece.row, selectedPiece.col, row, col)) {
        const newBoard = makeMove(selectedPiece.row, selectedPiece.col, row, col, board, gameVariant);
        setBoard(newBoard);

        const jumped = Math.abs(row - selectedPiece.row) === 2 ||
          (gameVariant === "brazilian" &&
            board[selectedPiece.row][selectedPiece.col]?.isKing &&
            Math.abs(row - selectedPiece.row) > 1);

        if (jumped) {
          const additionalJumps = getAvailableJumps(row, col, newBoard, gameVariant);
          if (additionalJumps.length > 0) {
            setSelectedPiece({ row, col });
            setMustJumpFrom({ row, col });
            setMultipleJumpInProgress(true);
            return;
          }
        }

        setSelectedPiece(null);
        setMustJumpFrom(null);
        setMultipleJumpInProgress(false);
        setCurrentPlayer(currentPlayer === "red" ? "black" : "red");

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
    return <GameVariantSelect onSelectVariant={setGameVariant} />;
  }

  if (!gameMode) {
    return <GameModeSelect gameVariant={gameVariant} onSelectMode={setGameMode} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex flex-col items-center justify-center p-4">
      <Card className="p-8 bg-white/5 backdrop-blur-lg rounded-xl shadow-2xl">
        <GameHeader
          gameVariant={gameVariant}
          onNewGame={() => setShowNewGameDialog(true)}
        />

        <GameStatus
          winner={winner}
          currentPlayer={currentPlayer}
          isComputerThinking={isComputerThinking}
          findAllJumps={findAllJumps}
          multipleJumpInProgress={multipleJumpInProgress}
          onNewGame={() => setShowNewGameDialog(true)}
        />

        <GameBoard
          board={board}
          currentPlayer={currentPlayer}
          selectedPiece={selectedPiece}
          isComputerThinking={isComputerThinking}
          gameVariant={gameVariant}
          findAllJumps={findAllJumps}
          multipleJumpInProgress={multipleJumpInProgress}
          handleSquareClick={handleSquareClick}
        />

        <GameDialogs
          showNewGameDialog={showNewGameDialog}
          setShowNewGameDialog={setShowNewGameDialog}
          showGameEndDialog={showGameEndDialog}
          setShowGameEndDialog={setShowGameEndDialog}
          winner={winner}
          restartGame={restartGame}
          resetGame={resetGame}
        />
      </Card>
    </div>
  );
}