# API Documentation

## Authorization

Create an authorization token by going to [Dashboard](/dashboard){.link}! -> Create Token.

## Rooms

### Create Room

Create a room by going to [View Rooms](/rooms){.link} -> Create Room.

Each user can only hold 1 room at a time.

### Spectate Room

Spectate a room by going to [View Rooms](/rooms){.link} and selecting a room from the list, or following a shared room link.

### Join Room

Connect to `wss://botrisbattle.com/ws?token={token}&roomKey={roomKey}`
using a websocket connection.
- {token} - Generated API Token from the [Dashboard](/dashboard){.link}
- {roomKey} - Provided roomKey from the room host

The server will respond with:

<pre class='code'>
{
    type: 'room_data';
    payload: {
        roomData: <a href="#roomdata" class="type-link">RoomData</a>
    }
}
</pre>

<br />


The game can also be spectated at `/room/{roomId}`.

## WS Messages

### General
When a player joins, the server will send:
<pre class='code'>
{
    type: "player_joined";
    payload: {
        playerData: <a href="#playerdata" class="type-link">PlayerData</a>;
    };
}
</pre>

When a player leaves or gets kicked, the server will send:
<pre class='code'>
{
    type: "player_left";
    payload: {
        sessionId: string;
    };
}
</pre>

When a player gets banned, the server will send:
<pre class='code'>
{
    type: "player_banned";
    payload: {
        playerInfo: <a href="#playerinfo" class="type-link">PlayerInfo</a>
    };
}
</pre>

When a player gets unbanned, the server will send:
<pre class='code'>
{
    type: "player_unbanned";
    payload: {
        playerInfo: <a href="#playerinfo" class="type-link">PlayerInfo</a>
    };
}
</pre>

When the room settings are changed, the server will send:
<pre class='code'>
{
    type: "settings_changed";
    payload: {
        roomData: <a href="#roomdata" class="type-link">RoomData</a>
    };
}
</pre>

When the host is transfered, the server will send:
<pre class='code'>
{
    type: "host_changed";
    payload: {
        hostInfo: PlayerInfo;
    };
}
</pre>

### Ingame

Game Info

<pre class='code'>
{
    boardWidth: 10,
    boardHeight: 20,
    garbageMessiness: 0.05,
    attackTable: {
        'single': 0,
        'double': 1,
        'triple': 2,
        'quad': 4,
        'asd': 4,
        'ass': 2,
        'ast': 6,
        'pc': 10,
        'b2b': 1,
    },
    comboTable: [0, 0, 1, 1, 1, 2, 2, 3, 3, 4],
}
</pre>

When the game starts, the server will send:
<pre class='code'>
{
    type: 'game_started';
}
</pre>

When a round is about to start, the server will send:
<pre class='code'>
{
    type: 'round_started';
    payload: {
        startsAt: number;
        roomData: <a href="#roomdata" class="type-link">RoomData</a>;
    }
}
</pre>

The server will request a move from the player by sending:
<pre class='code'>
{
    type: "request_move";
    payload: {
        gameState: <a href="#gamestate" class="type-link">GameState</a>;
        players: <a href="#playerdata" class="type-link">PlayerData</a>[];
    };
}
</pre>

**If you are unable to make a move within 5 seconds of the request, you will forfeit the round.**
After the server requests a move, you may place a piece. Actions are sent from a client to a server to perform commands, and after every action the player will automatically harddrop.
<br>
**An action can be sent to the server using**:

<pre class='code'>
{
    type: 'action';
    payload: {
        commands: <a href="#command" class="type-link">Command</a>[];
    }
}
</pre>

Whenever a player performs an action, the server will send everyone:

<pre class='code'>
{
    type: 'player_action';
    payload: {
        sessionId: string;
        commands: string[];
        gameState: <a href="#gamestate" class="type-link">GameState</a>;
        events: <a href="#gameevent" class="type-link">GameEvent</a>[];
    }
}
</pre>

Whenever a player is sent damage, the server will send everyone:

<pre class='code'>
{
    type: 'player_damage_received';
    payload: {
        sessionId: string;
        damage: number;
        gameState: <a href="#gamestate" class="type-link">GameState</a>;
    }
}
</pre>

When a round is over, the winner is sent using:

<pre class='code'>
{
    type: 'round_over';
    payload: {
        winnerSession: string;
        winnerInfo: <a href="#playerinfo" class="type-link">PlayerInfo</a>;
        roomInfo: roomInfo;
    }
}
</pre>

When the game is over, the winner is sent using:

<pre class='code'>
{
    type: 'game_over';
    payload: {
        winnerSession: string;
        winnerInfo: <a href="#playerinfo" class="type-link">PlayerInfo</a>;
        roomData: <a href="#roomdata" class="type-link">RoomData</a>;
    }
}
</pre>

When the game is reset early, the server sends:

<pre class='code'>
{
    type: "game_reset";
    payload: {
        roomData: <a href="#roomdata" class="type-link">RoomData</a>;
    };
}
</pre>

## Types

### RoomData

<pre class='code'>
{
	id: string;
	host: <a href="#playerinfo" class="type-link">PlayerInfo</a>;
	private: boolean;
	ft: number;
	initialPps: number;
	finalPps: number;
	startMargin: number;
	endMargin: number;
	maxPlayers: number;
	gameOngoing: boolean;
	roundOngoing: boolean;
	startedAt: number | null;
	endedAt: number | null;
	lastWinner: string | null;
	players: PlayerData[];
	banned: <a href="#playerinfo" class="type-link">PlayerInfo</a>[];
}
</pre>

### PlayerData

<pre class='code'>
{
	sessionId: string;
	playing: boolean;
	info: <a href="#playerinfo" class="type-link">PlayerInfo</a>;
	wins: number;
	gameState: <a href="#gamestate" class="type-link">GameState</a> | null;
}
</pre>

### PlayerInfo

<pre class='code'>
{
    userId: string;
    creator: string;
    bot: string;
}
</pre>

### Piece

<pre class='code'>
'I' | 'O' | 'J' | 'L' | 'S' | 'Z' | 'T'
</pre>

### Block
<pre class='code'>
<a href="#piece" class="type-link">Piece</a> | 'G' | null
</pre>

### PieceData
<pre class='code'>
{
    piece: <a href="#piece" class="type-link">Piece</a>;
    x: number;
    y: number;
    rotation: 0 | 1 | 2 | 3;
}
</pre>

### GameState
**Sent board data is *upside-down* to prevent line clipping**
<pre class='code'>
{
    board: <a href="#block" class="type-link">Block</a>[][];
    queue: <a href="#piece" class="type-link">Piece</a>[];
    garbageQueued: number;
    held: <a href="#piece" class="type-link">Piece</a> | null;
    current: <a href="#piecedata" class="type-link">PieceData</a>;
    isImmobile: boolean;
    canHold: boolean;
    combo: number;
    b2b: boolean;
    score: number;
    piecesPlaced: number;
    dead: boolean;
}
</pre>

### Command

<pre class='code'>
'move_left' | 'move_right' | 'rotate_cw' | 'rotate_ccw' | 'drop' | 'sonic_drop'
</pre>

### GameEvent
<pre class='code'>
{
    type: 'piece_placed';
    payload: {
        initial: PieceData;
        final: PieceData;
    };
} | {
    type: 'damage_tanked';
    payload: {
        holeIndices: number[];
    };
} | {
    type: 'clear';
    payload: {
        clearName: string;
        allSpin: boolean;
        b2b: boolean;
        combo: number;
        pc: boolean;
        attack: number;
        cancelled: number;
        piece: PieceData;
        clearedLines: {
            height: number;
            blocks: Block[];
        }[];
    };
} | {
    type: 'game_over';
};
</pre>

<br>

## [Engine Source Code](https://github.com/newclarityex/libtris){.link}