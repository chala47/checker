"use client";

import { Board, Position, GameVariant, Piece, CaptureMove } from "./types";

export const initialBoard = (): Board => {
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

export const getAvailableJumps = (
  row: number,
  col: number,
  currentBoard: Board,
  gameVariant: GameVariant
): CaptureMove[] => {
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

export const getAvailableMoves = (
  row: number,
  col: number,
  currentBoard: Board,
  gameVariant: GameVariant
): Position[] => {
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

export const makeMove = (
  fromRow: number,
  fromCol: number,
  toRow: number,
  toCol: number,
  currentBoard: Board,
  gameVariant: GameVariant
): Board => {
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

  // King promotion
  if (!newBoard[toRow][toCol].isKing &&
    ((toRow === 0 && movingPiece.color === "red") ||
      (toRow === 7 && movingPiece.color === "black"))) {
    newBoard[toRow][toCol].isKing = true;
  }

  return newBoard;
};