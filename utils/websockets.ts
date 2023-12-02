import type { ClientMessage } from "~/server/utils/messages";

export function sendClientMessage(ws: WebSocket, message: ClientMessage): void {
	ws.send(JSON.stringify(message));
}
