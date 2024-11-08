# API Documentation

## Authorization

Create an authorization token by creating a bot in [Bots](/Bots){.link} -> Create Token.

## Rooms

### Create Room

Create a room by going to [View Rooms](/rooms){.link} -> Create Room.

Each user can only hold 1 room at a time.

### Spectate Room

Spectate a room by going to [View Rooms](/rooms){.link} and selecting a room from the list, or following a shared room link.

### Join Room

Connect to `wss://botrisbattle.com/ws?token={token}&roomKey={roomKey}`
using a websocket connection.
- {token} - Generated API Token from the [Bots](/bots){.link}
- {roomKey} - Provided roomKey from the room host

The server will respond with:

<pre class='code'>
{
    type: "room_data";
    payload: {
        roomData: <a href="#roomdata" class="type-link">RoomData</a>
    }
}
</pre>

If authenticated successfully, the server also responds with:
<pre class='code'>
{
    type: "authenticated";
    payload: {
        sessionId: <a href="#sessionid" class="type-link">SessionId</a>;
    };
}
</pre>

<br />


The game can also be spectated at `/room/{roomId}`.

## WS Messages

### General
If there's any error, the server will send:
<pre class='code'>
{
    type: "error";
    payload: string;
}
</pre>

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
        sessionId: <a href="#sessionid" class="type-link">SessionId</a>;
    };
}
</pre>

When a player gets banned, the server will send:
<pre class='code'>
{
    type: "player_banned";
    payload: {
        botInfo: <a href="#botinfo" class="type-link">BotInfo</a>
    };
}
</pre>

When a player gets unbanned, the server will send:
<pre class='code'>
{
    type: "player_unbanned";
    payload: {
        botInfo: <a href="#botinfo" class="type-link">BotInfo</a>
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

### Ingame

Game Info

<pre class='code'>
{
    boardWidth: 10,
    boardHeight: 20,
    garbageMessiness: 0.05,
    attackTable: {
        "single": 0,
        "double": 1,
        "triple": 2,
        "quad": 4,
        "asd": 4,
        "ass": 2,
        "ast": 6,
        "pc": 10,
        "b2b": 1,
    },
    comboTable: [0, 0, 1, 1, 1, 2, 2, 3, 3, 4],
    multiplier: 1,
}
</pre>

When the game starts, the server will send:
<pre class='code'>
{
    type: "game_started";
}
</pre>

When a round is about to start, the server will send:
<pre class='code'>
{
    type: "round_started";
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
**An action can be sent to the server using** (max 128 commands):

<pre class='code'>
{
    type: "action";
    payload: {
        commands: <a href="#command" class="type-link">Command</a>[];
    }
}
</pre>

Whenever a player performs an action, the server will send everyone:

<pre class='code'>
{
    type: "player_action";
    payload: {
        sessionId: <a href="#sessionid" class="type-link">SessionId</a>;
        commands: <a href="#command" class="type-link">Command</a>[];
        gameState: <a href="#gamestate" class="type-link">GameState</a>;
        prevGameState: <a href="#gamestate" class="type-link">GameState</a>;
        events: <a href="#gameevent" class="type-link">GameEvent</a>[];
    }
}
</pre>

Whenever a player is sent damage, the server will send everyone:

<pre class='code'>
{
    type: "player_damage_received";
    payload: {
        sessionId: <a href="#sessionid" class="type-link">SessionId</a>;
        damage: number;
        gameState: <a href="#gamestate" class="type-link">GameState</a>;
    }
}
</pre>

When a round is over, the winner is sent using:

<pre class='code'>
{
    type: "round_over";
    payload: {
        winnerId: <a href="#sessionid" class="type-link">SessionId</a>;
        winnerInfo: <a href="#botinfo" class="type-link">BotInfo</a>;
        roomData: <a href="#roomdata" class="type-link">RoomData</a>;
    }
}
</pre>

When the game is over, the winner is sent using:

<pre class='code'>
{
    type: "game_over";
    payload: {
        winnerId: <a href="#sessionid" class="type-link">SessionId</a>;
        winnerInfo: <a href="#botinfo" class="type-link">BotInfo</a>;
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

As a player, you can also ping the server for latency using:

<pre class='code'>
{
    type: "ping";
}
</pre>

The server will respond with:

<pre class='code'>
{
    type: "ping";
    payload: {
        timestamp: number;
    };
}
</pre>

## Types

### SessionId
<pre class='code'>
type SessionId = string;
</pre>

### RoomSettings

<pre class='code'>
{
    private: boolean;
    ft: number;
    pps: number;
    initialMultiplier: number;
    finalMultiplier: number;
    startMargin: number;
    endMargin: number;
}
</pre>

### RoomData

<pre class='code'>
{
	id: string;
	host: {
		id: string;
		displayName: string;
	};
    settings: <a href="#roomsettings" class="type-link">RoomSettings</a>;
	gameOngoing: boolean;
	roundOngoing: boolean;
	startedAt: number | null;
	endedAt: number | null;
	lastWinner: <a href="#sessionid" class="type-link">SessionId</a> | null;
	players: <a href="#playerdata" class="type-link">PlayerData</a>[];
	banned: <a href="#botinfo" class="type-link">BotInfo</a>[];
}
</pre>

### PlayerData

<pre class='code'>
{
	sessionId: <a href="#sessionid" class="type-link">SessionId</a>;
	playing: boolean;
	info: <a href="#botinfo" class="type-link">BotInfo</a>;
	wins: number;
	gameState: <a href="#gamestate" class="type-link">GameState</a> | null;
}
</pre>

### BotInfo

<pre class='code'>
{
	id: string;
	name: string;
	avatar: Avatar;
	team: string | null;
	language: string | null;
	eval: string | null;
	movegen: string | null;
	search: string | null;
	developers: { id: string, displayName: string }[];
}
</pre>

### Piece

<pre class='code'>
"I" | "O" | "J" | "L" | "S" | "Z" | "T"
</pre>

### Block
<pre class='code'>
<a href="#piece" class="type-link">Piece</a> | "G" | null
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

### GarbageLine
<pre class='code'>
{
    delay: number;
}
</pre>

### GameState
**Sent board data is *upside-down* to prevent line clipping**
<pre class='code'>
{
    board: <a href="#block" class="type-link">Block</a>[][];
    bag: <a href="#piece" class="type-link">Piece</a>[];
    queue: <a href="#piece" class="type-link">Piece</a>[];
    garbageQueued: <a href="#garbageline" class="type-link">GarbageLine</a>[];
    held: <a href="#piece" class="type-link">Piece</a> | null;
    current: <a href="#piecedata" class="type-link">PieceData</a>;
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
"hold" | "move_left" | "move_right" | "sonic_left" | "sonic_right" | "rotate_cw" | "rotate_ccw" | "drop" | "sonic_drop" | "none"
</pre>

### ClearName

<pre class="code">
"Single" | "Triple" | "Double" | "Quad" | "Perfect Clear" | "All-Spin Single" | "All-Spin Double" | "All-Spin Triple"
</pre>

### GameEvent
<pre class='code'>
{
    type: "piece_placed";
    payload: {
        initial: <a href="#piecedata" class="type-link">PieceData</a>;
        final: <a href="#piecedata" class="type-link">PieceData</a>;
    };
} | {
    type: 'queue_added',
    payload: {
        piece: <a href="#piece" class="type-link">Piece</a>,
    },
} | {
    type: "damage_tanked";
    payload: {
        holeIndices: number[];
    };
} | {
    type: "clear";
    payload: {
        clearName: <a href="#clearname" class="type-link">ClearName</a>;
        allSpin: boolean;
        b2b: boolean;
        combo: number;
        pc: boolean;
        attack: number;
        cancelled: number;
        piece: <a href="#piecedata" class="type-link">PieceData</a>;
        clearedLines: {
            height: number;
            blocks: <a href="#block" class="type-link">Block</a>[];
        }[];
    };
} | {
    type: "game_over";
};
</pre>

<br>

## [Engine Source Code](https://github.com/newclarityex/libtris){.link}