from flask import Flask, request, jsonify, session
from flask_socketio import SocketIO, emit, join_room, leave_room
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager, UserMixin, login_user, logout_user, login_required, current_user
from flask_bcrypt import Bcrypt
from datetime import datetime
import json
import os
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
app.config['SECRET_KEY'] = os.getenv('FLASK_SECRET_KEY', 'your-secret-key')
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL', 'sqlite:///checkers.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Update CORS configuration to allow credentials
CORS(app, 
     supports_credentials=True, 
     origins=["http://localhost:3000"],
     allow_headers=["Content-Type", "Authorization"],
     methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"])

socketio = SocketIO(app, 
                   cors_allowed_origins=["http://localhost:3000"], 
                   async_mode='gevent',
                   ping_timeout=60,
                   ping_interval=25)

db = SQLAlchemy(app)
bcrypt = Bcrypt(app)
login_manager = LoginManager()
login_manager.init_app(app)

class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.String(60), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    # username= db.Column(db.String(255), unique=True)
    # online= db.Column(db.Boolean, default=False)
    def to_dict(self):
        return {
            "id": str(self.id),
            "email": self.email,
            "created_at": self.created_at.isoformat(),
        }
    
class Game(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    current_player = db.Column(db.String(10), default='red')
    winner = db.Column(db.String(10), nullable=True)
    game_variant = db.Column(db.String(20), nullable=False)
    board = db.Column(db.JSON, nullable=False)
    red_player_id = db.Column(db.Integer, db.ForeignKey('user.id'))
    black_player_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    status = db.Column(db.String(20), default='waiting')
    last_move_at = db.Column(db.DateTime, default=datetime.utcnow)
    
        # Establish Relationship
    red_player = db.relationship("User", foreign_keys=[red_player_id])
    black_player = db.relationship("User", foreign_keys=[black_player_id])


    def to_dict(self):
        return {
            "id": str(self.id),
            "created_at": self.created_at.isoformat(),
            "current_player": self.current_player,
            "winner": self.winner,
            "game_variant": self.game_variant,
            "board": self.board,
            "red_player": self.red_player.to_dict() if self.red_player else None,
            "black_player": self.black_player.to_dict() if self.black_player else None,
            "status": self.status,
            "last_move_at": self.last_move_at.isoformat()
        }

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

def initial_board():
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

@app.route("/api/auth/register", methods=["POST"])
def register():
    data = request.json
    if User.query.filter_by(email=data['email']).first():
        return jsonify({"error": "Email already registered"}), 400
    
    hashed_password = bcrypt.generate_password_hash(data['password']).decode('utf-8')
    user = User(email=data['email'], password=hashed_password)
    db.session.add(user)
    db.session.commit()
    return jsonify({"message": "Registration successful"}), 201

@app.route("/api/auth/login", methods=["POST"])
def login():
    data = request.json
    user = User.query.filter_by(email=data['email']).first()
    if user and bcrypt.check_password_hash(user.password, data['password']):
        login_user(user)
        session.permanent = True  # Make the session permanent
        return jsonify({
            "id": str(user.id),
            "email": user.email
        })
    return jsonify({"error": "Invalid credentials"}), 401

@app.route("/api/auth/logout", methods=["POST"])
@login_required
def logout():
    logout_user()
    return jsonify({"message": "Logged out successfully"})

@app.route("/api/auth/user", methods=["GET"])
def get_current_user():
    if current_user.is_authenticated:
        return jsonify({
            "id": str(current_user.id),
            "email": current_user.email
        })
    return jsonify({"error": "Not authenticated"}), 401

@app.route("/api/games", methods=["GET"])
@login_required
def get_games():
    game_variant = request.args.get("game_variant")  # e.g., "normal", "brazilian", etc.

    query = Game.query.filter_by(status="in_progress")

    if game_variant:
        query = query.filter_by(game_variant=game_variant)

    available_games = query.all()

    return jsonify([game.to_dict() for game in available_games])
from sqlalchemy.sql.expression import func

@app.route("/api/games", methods=["POST"])
@login_required
def create_game():
    data = request.json

    # Try to find a random opponent (not the current user)
    opponent = User.query.filter(User.id != current_user.id).order_by(func.random()).first()

    game = Game(
        game_variant=data["game_variant"],
        red_player_id=current_user.id,
        board=initial_board(),
        status="in_progress" if opponent else "waiting",
        black_player_id=opponent.id if opponent else None
    )

    db.session.add(game)
    db.session.commit()

    return jsonify(game.to_dict()), 201

@app.route("/api/invite", methods=["POST"])
@login_required
def invite():
    data = request.json
    invite_email = data.get("invite_email")

    if not invite_email:
        return jsonify({"error": "invite_email is required"}), 400

    opponent = User.query.filter_by(email=invite_email).first()
    if not opponent:
        return jsonify({"error": "User with this email does not exist"}), 404

    if opponent.id == current_user.id:
        return jsonify({"error": "You cannot invite yourself"}), 400

    game = Game(
        game_variant=data["game_variant"],
        red_player_id=current_user.id,
        board=initial_board(),
        status="in_progress",
        black_player_id=opponent.id
    )

    db.session.add(game)
    db.session.commit()

    return jsonify(game.to_dict()), 201
@app.route("/api/games/<game_id>", methods=["GET"])
@login_required
def get_game(game_id):
    game = Game.query.get(game_id)
    if game:
        # Include current user's id in the response
        return jsonify({
            **game.to_dict(),  # Your game data as usual
            "user_id": current_user.id  # Send the current user's id
        })
    else:
        return jsonify({"error": "Game not found"}), 404

@socketio.on("connect")
def handle_connect():
    if not current_user.is_authenticated:
        return False
    print(f"Client connected: {current_user.email}")
    emit("connect_response", {"status": "connected"})

@socketio.on("join_game")
def handle_join(data):
    if not current_user.is_authenticated:
        return
    
    print(f"Join game request from {current_user.email}: {data}")
    game_id = data["game_id"]
    game = Game.query.get(game_id)
    
    if game and game.status == "waiting":
        game.black_player_id = current_user.id
        game.status = "in_progress"
        db.session.commit()
        
        join_room(game_id)
        print(f"Game updated after join: {game.to_dict()}")
        emit("game_updated", game.to_dict(), broadcast=True)

@socketio.on("make_move")
def handle_move(data):
    if not current_user.is_authenticated:
        return
    
    print(f"Move request from {current_user.email}: {data}")
    game_id = data["game_id"]
    game = Game.query.get(game_id)
    
    if game and game.status == "in_progress":
        # Verify it's the player's turn
        if ((game.current_player == "red" and game.red_player_id == current_user.id) or
            (game.current_player == "black" and game.black_player_id == current_user.id)):
            
            game.board = data["board"]
            game.current_player = "black" if game.current_player == "red" else "red"
            game.last_move_at = datetime.utcnow()
            
            winner = data.get("winner")
            if winner:
                game.winner = winner
                game.status = "completed"

            db.session.commit()
            print(f"before: {data}")
            print(f"Game updated after move: {game.to_dict()}")
            emit("game_updated", game.to_dict(), broadcast=True)

with app.app_context():
    db.create_all()

if __name__ == "__main__":
    socketio.run(app, port=5000, allow_unsafe_werkzeug=True)