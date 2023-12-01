# API Documentation

## Create Match

Create a match by making a POST request to `/api/match/create` with the following JSON data:

- **token** (str): Your assigned token for authorization.
- **roomId** (str): Room ID used to connect to the room.
- **public** (bool): Whether the room will show up in the room list.
- **ft** (int): The amount of wins it takes for the game to complete. Minimum value 1, maximum value 99.
- **maxPlayers** (int): The maximum amount of players.

Each player can only hold 1 match at once.

## Join Match

Connect to `/api/ws` using a websocket connection, and join a match by sending the following through the websocket connection:

- **type** (str): 'join' | 'spectate'
- **payload** (json):
  - **token**(str): Your assigned token for authorization, token is optional if you are a spectator.
  - **roomId**(str): Room ID used to connect to the room.

\
The server will respond with:

- **type** (str): 'room_info'
- **payload** (json):
  - **roomId**(str): Room ID used to connect to the room.
  - **public**(bool): Whether the room will show up in the room list.
  - **ft**(int): The amount of wins it takes for the game to complete. Minimum value 1, maximum value 99.
  - **maxPlayers** (int): The maximum amount of players.
  - **players**(PlayerInfo[]): The list of participating players.

<br />

```ts
type PlayerInfo = {
    botId: string;
    creator: string;
    bot: string;
}
```

The game can also be spectated at `/api/match/{roomId}`

\
When ready, send this to the server:

```ts
{
    type: 'ready';
}
```

## Ingame

A player's boardstate is represented as:

```ts
type Piece = 'I' | 'O' | 'J' | 'L' | 'S' | 'Z' | 'T';

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
```

When the game is about to start, the server will send:

```ts
{
    type: 'game_started';
    payload: {
        startTime: number;
        boardState: BoardState;
    }
}
```

\
A command is represented as:

```ts
type Command = 'move_left' | 'move_right' | 'rotate_left' | 'rotate_right' | 'rotate_180' | 'drop' | 'sonic_drop' | 'hard_drop';
```

\
Actions are sent from a client to a server to perform commands. An action can be sent to the server using:

```ts
{
    type: 'action';
    payload: {
        commands: Command[];
    }
}
```

\
Whenever a player performs an action, the server will send:

```ts
{
    type: 'player_update';
    payload: {
        timestamp: number;
        commands: Command[];
        initialState: BoardState;
        newState: BoardState;
    }
}
```

\
Whenever a player performs an action, the server will send:

```ts
{
    type: 'player_update';
    payload: {
        timestamp: number;
        commands: Command[];
        initialState: BoardState;
        newState: BoardState;
    }
}
```

\
When a round is over, the winner's `botId` is sent using:

```ts
{
    type: 'round_over';
    payload: {
        winner: string;
    }
}
```

\
When the game is over, the winner's `botId` is sent using:

```ts
{
    type: 'game_over';
    payload: {
        winner: string;
    }
}
```

## Reference

### PlayerInfo

```ts
type PlayerInfo = {
    botId: string;
    creator: string;
    bot: string;
}
```

### Piece

```ts
type Piece = 'I' | 'O' | 'J' | 'L' | 'S' | 'Z' | 'T';
```

### BoardState

```ts
type BoardState = {
    board: Piece[][];
    queue: Piece[];
    held: Piece | null;
    current: {
        piece: Piece;
        x: number;
        y: number;
        rotation: 0 | 1 | 2 | 3;
    };
}
```

### Command

```ts
type Command = 'move_left' | 'move_right' | 'rotate_left' | 'rotate_right' | 'rotate_180' | 'drop' | 'sonic_drop' | 'hard_drop';
```
