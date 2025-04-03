from flask import Flask, request, jsonify
from flask_socketio import SocketIO, emit, join_room, leave_room
from flask_cors import CORS
import json
from datetime import datetime

app = Flask(__name__)
CORS(app)
socketio = SocketIO(app, 
                   cors_allowed_origins="*", 
                   async_mode='gevent',
                   ping_timeout=60,
                   ping_interval=25)

# Store active games in memory
games = {}

class Game:
    def __init__(self, game_id, game_variant, red_player):
        self.id = game_id
        self.created_at = datetime.utcnow().isoformat()
        self.current_player = "red"
        self.winner = None
        self.game_variant = game_variant
        self.board = self.initial_board()
        self.red_player = red_player
        self.black_player = None
        self.status = "waiting"
        self.last_move_at = self.created_at

    def initial_board(self):
        board = [[None for _ in range(8)] for _ in range(8)]
        
        # Place black pieces
        for row in range(3):
            for col in range(8):
                if (row + col) % 2 == 1:
                    board[row][col] = {"color": "black", "isKing": False}
        
        # Place red pieces
        for row in range(5, 8):
            for col in range(8):
                if (row + col) % 2 == 1:
                    board[row][col] = {"color": "red", "isKing": False}
        
        return board

    def to_dict(self):
        return {
            "id": self.id,
            "created_at": self.created_at,
            "current_player": self.current_player,
            "winner": self.winner,
            "game_variant": self.game_variant,
            "board": self.board,
            "red_player": self.red_player,
            "black_player": self.black_player,
            "status": self.status,
            "last_move_at": self.last_move_at
        }

@app.route("/api/games", methods=["GET"])
def get_games():
    available_games = [game.to_dict() for game in games.values() if game.status == "waiting"]
    return jsonify(available_games)

@app.route("/api/games", methods=["POST"])
def create_game():
    data = request.json
    game_id = str(len(games) + 1)  # Simple ID generation
    game = Game(game_id, data["game_variant"], data["red_player"])
    games[game_id] = game
    return jsonify(game.to_dict())

@app.route("/api/games/<game_id>", methods=["GET"])
def get_game(game_id):
    game = games.get(game_id)
    if game:
        return jsonify(game.to_dict())
    return jsonify({"error": "Game not found"}), 404

@socketio.on("connect")
def handle_connect():
    print("Client connected")
    emit("connect_response", {"status": "connected"})

@socketio.on("join_game")
def handle_join(data):
    print(f"Join game request: {data}")
    game_id = data["game_id"]
    player_id = data["player_id"]
    game = games.get(game_id)
    print(f"Player {player_id} with SID is joining game {game_id}")
    if game and game.status == "waiting":
        game.black_player = player_id
        game.status = "in_progress"
        join_room(game_id)
        print(f"Game updated after join: {game.to_dict()}")
        emit("game_updated", game.to_dict(), broadcast=True)

@socketio.on("make_move")
def handle_move(data):
    print(f"Move request: {data}")
    game_id = data["game_id"]
    game = games.get(game_id)
    
    if game and game.status == "in_progress":
        # Update game state
        game.board = data["board"]
        game.current_player = "black" if game.current_player == "red" else "red"
        game.last_move_at = datetime.utcnow().isoformat()
        
        if "winner" in data:
            game.winner = data["winner"]
            game.status = "completed"
        
        print(f"Game updated after move: {game.to_dict()}")
        emit("game_updated", game.to_dict(), broadcast=True)

if __name__ == "__main__":
    socketio.run(app, port=5000, allow_unsafe_werkzeug=True)