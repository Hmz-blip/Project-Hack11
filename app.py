from flask import Flask, render_template, request, jsonify
from flask_socketio import SocketIO, emit, join_room, leave_room
from flask_cors import CORS
import sqlite3
import json
from datetime import datetime
import os

app = Flask(__name__)
app.config['SECRET_KEY'] = 'your-secret-key-change-in-production'
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*")

# Database setup
def init_db():
    conn = sqlite3.connect('jukebox.db')
    c = conn.cursor()
    
    # Songs table
    c.execute('''CREATE TABLE IF NOT EXISTS songs
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  room_id TEXT NOT NULL,
                  title TEXT NOT NULL,
                  artist TEXT NOT NULL,
                  youtube_id TEXT NOT NULL,
                  added_by TEXT NOT NULL,
                  votes INTEGER DEFAULT 0,
                  played BOOLEAN DEFAULT 0,
                  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP)''')
    
    # Rooms table
    c.execute('''CREATE TABLE IF NOT EXISTS rooms
                 (id TEXT PRIMARY KEY,
                  name TEXT NOT NULL,
                  current_song_id INTEGER,
                  created_at DATETIME DEFAULT CURRENT_TIMESTAMP)''')
    
    conn.commit()
    conn.close()

init_db()

# Helper functions
def get_db():
    conn = sqlite3.connect('jukebox.db')
    conn.row_factory = sqlite3.Row
    return conn

def get_room_queue(room_id):
    conn = get_db()
    songs = conn.execute('''
        SELECT * FROM songs 
        WHERE room_id = ? AND played = 0 
        ORDER BY votes DESC, timestamp ASC
    ''', (room_id,)).fetchall()
    conn.close()
    return [dict(song) for song in songs]

def get_current_song(room_id):
    conn = get_db()
    room = conn.execute('SELECT current_song_id FROM rooms WHERE id = ?', (room_id,)).fetchone()
    
    if room and room['current_song_id']:
        song = conn.execute('SELECT * FROM songs WHERE id = ?', (room['current_song_id'],)).fetchone()
        conn.close()
        return dict(song) if song else None
    conn.close()
    return None

# Routes
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/room/<room_id>')
def room(room_id):
    return render_template('room.html', room_id=room_id)

@app.route('/api/create_room', methods=['POST'])
def create_room():
    data = request.json
    room_id = data.get('room_id')
    room_name = data.get('room_name', 'Community Jukebox')
    
    conn = get_db()
    try:
        conn.execute('INSERT INTO rooms (id, name) VALUES (?, ?)', (room_id, room_name))
        conn.commit()
        conn.close()
        return jsonify({'success': True, 'room_id': room_id})
    except sqlite3.IntegrityError:
        conn.close()
        return jsonify({'success': True, 'room_id': room_id, 'message': 'Room already exists'})

@app.route('/api/room/<room_id>/queue')
def get_queue(room_id):
    queue = get_room_queue(room_id)
    current = get_current_song(room_id)
    return jsonify({
        'queue': queue,
        'current_song': current
    })

# SocketIO events
@socketio.on('join')
def on_join(data):
    room_id = data['room']
    username = data.get('username', 'Anonymous')
    join_room(room_id)
    
    # Send current state to new user
    queue = get_room_queue(room_id)
    current = get_current_song(room_id)
    
    emit('queue_update', {
        'queue': queue,
        'current_song': current
    }, room=request.sid)
    
    emit('user_joined', {
        'username': username,
        'message': f'{username} joined the room'
    }, room=room_id, skip_sid=request.sid)

@socketio.on('add_song')
def handle_add_song(data):
    room_id = data['room']
    title = data['title']
    artist = data['artist']
    youtube_id = data['youtube_id']
    username = data.get('username', 'Anonymous')
    
    conn = get_db()
    cursor = conn.execute('''
        INSERT INTO songs (room_id, title, artist, youtube_id, added_by, votes)
        VALUES (?, ?, ?, ?, ?, 0)
    ''', (room_id, title, artist, youtube_id, username))
    song_id = cursor.lastrowid
    conn.commit()
    
    # Get the newly added song
    song = conn.execute('SELECT * FROM songs WHERE id = ?', (song_id,)).fetchone()
    conn.close()
    
    # If no song is playing, auto-play this one
    current = get_current_song(room_id)
    if not current:
        set_current_song(room_id, song_id)
        emit('now_playing', dict(song), room=room_id)
    
    # Broadcast updated queue
    queue = get_room_queue(room_id)
    emit('queue_update', {'queue': queue}, room=room_id)

@socketio.on('vote')
def handle_vote(data):
    room_id = data['room']
    song_id = data['song_id']
    vote_type = data['vote_type']  # 'up' or 'down'
    
    conn = get_db()
    if vote_type == 'up':
        conn.execute('UPDATE songs SET votes = votes + 1 WHERE id = ?', (song_id,))
    else:
        conn.execute('UPDATE songs SET votes = votes - 1 WHERE id = ?', (song_id,))
    conn.commit()
    conn.close()
    
    queue = get_room_queue(room_id)
    emit('queue_update', {'queue': queue}, room=room_id)

@socketio.on('next_song')
def handle_next_song(data):
    room_id = data['room']
    
    # Mark current song as played
    current = get_current_song(room_id)
    if current:
        conn = get_db()
        conn.execute('UPDATE songs SET played = 1 WHERE id = ?', (current['id'],))
        conn.commit()
        conn.close()
    
    # Get next song from queue
    queue = get_room_queue(room_id)
    if queue:
        next_song = queue[0]
        set_current_song(room_id, next_song['id'])
        emit('now_playing', next_song, room=room_id)
        emit('queue_update', {'queue': get_room_queue(room_id)}, room=room_id)
    else:
        set_current_song(room_id, None)
        emit('now_playing', None, room=room_id)
        emit('queue_update', {'queue': []}, room=room_id)

def set_current_song(room_id, song_id):
    conn = get_db()
    conn.execute('UPDATE rooms SET current_song_id = ? WHERE id = ?', (song_id, room_id))
    conn.commit()
    conn.close()

@socketio.on('chat_message')
def handle_chat(data):
    room_id = data['room']
    username = data.get('username', 'Anonymous')
    message = data['message']
    
    emit('chat_message', {
        'username': username,
        'message': message,
        'timestamp': datetime.now().isoformat()
    }, room=room_id)

if __name__ == '__main__':
    socketio.run(app, debug=True, host='0.0.0.0', port=5000)
