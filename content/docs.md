# API Documentation

## Authorization

Create an authorization token by going to [Dashboard](/dashboard){.link}! -> Create Token.

## Rooms

### Create Room

Create a room online by going to [View Rooms](/rooms){.link} -> Create Room.

Each user can only hold 1 room at a time.

### Spectate Room

Spectate a room online by going to [View Rooms](/rooms){.link} and selecting a room from the list, or following a shared room link.

### Join Room

Connect to `/api/ws` using a websocket connection, and join a room by sending the following through the websocket connection:

<pre class='code'>
{
    type: 'join';
    payload: {
        <span class="comment">// Your generated authorization token</span>
        token: string;
        <span class="comment">// Host provided room key</span>
        roomKey: string;
    }
}
</pre>

\
The server will respond with:

<pre class='code'>
{
    type: 'room_info';
    payload: {
        roomData: <a href="#roomdata" class="type-link">RoomData</a>
    }
}
</pre>

<br />


The game can also be spectated at `/room/{roomId}`.

## WS Messages

### Ingame
When the game starts, the server will send:
<pre class='code'>
{
    type: 'game_started';
}
</pre>

When a round is about to start, the server will send:
<pre class='code'>
{
    type: 'game_started';
    payload: {
        startTime: number;
        boardState: <a href="#boardstate" class="type-link">BoardState</a>;
    }
}
</pre>

\
A command is represented as:

<pre class='code'>
type Command = 'move_left' | 'move_right' | 'rotate_left' |
    'rotate_right' | 'rotate_180' | 'drop' | 'sonic_drop' | 'hard_drop';
</pre>

\
Actions are sent from a client to a server to perform commands. An action can be sent to the server using:

<pre class='code'>
{
    type: 'action';
    payload: {
        commands: Command[];
    }
}
</pre>

\
Whenever a player performs an action, the server will send:

<pre class='code'>
{
    type: 'player_update';
    payload: {
        timestamp: number;
        commands: Command[];
        initialState: BoardState;
        newState: BoardState;
    }
}
</pre>

\
Whenever a player performs an action, the server will send:

<pre class='code'>
{
    type: 'player_update';
    payload: {
        timestamp: number;
        commands: Command[];
        initialState: BoardState;
        newState: BoardState;
    }
}
</pre>

\
When a round is over, the winner's `botId` is sent using:

<pre class='code'>
{
    type: 'round_over';
    payload: {
        winner: string;
    }
}
</pre>

\
When the game is over, the winner's `botId` is sent using:

<pre class='code'>
{
    type: 'game_over';
    payload: {
        winner: string;
    }
}
</pre>

## Types

### PlayerInfo

<pre class='code'>
{
    botId: string;
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
<a href="#piece" class="type-link">Piece</a> | null
</pre>

### BoardState

<pre class='code'>
{
    board: <a href="#piece" class="type-link">Piece</a>[][];
    queue: <a href="#piece" class="type-link">Piece</a>[];
    held: <a href="#piece" class="type-link">Piece</a> | null;
    current: {
        piece: <a href="#piece" class="type-link">Piece</a>;
        x: number;
        y: number;
        rotation: 0 | 1 | 2 | 3;
    };
}
</pre>

### Command

<pre class='code'>
'move_left' | 'move_right' | 'rotate_left' | 'rotate_right' | 'rotate_180' | 'drop' | 'sonic_drop' | 'hard_drop'
</pre>

## Types
### RoomData
<pre class='code'>
{
	id: string;
	host: PlayerInfo;

    private: boolean;
	ft: number;
	ppsCap: number;
	maxPlayers: number;
	
    gameOngoing: boolean;
	roundOngoing: boolean;

	startedAt: number | null;
	endedAt: number | null;
	lastWinner: string | null;
	players: PlayerData[];
	banned: PlayerInfo[];
};
</pre>

### PlayerInfo
<pre class='code'>
type PlayerInfo = {
	userId: string;
	creator: string;
	bot: string;
	avatar: Block[][];
};
</pre>

### BoardState
<pre class='code'>
type BoardState = {
    board: Piece[][];
    queue: Piece[];
    held: Piece | null;
    current: {
        piece: Piece;
        x: number;
        y: number;
        roation: 0 | 1 | 2 | 3;
    };
}
</pre>