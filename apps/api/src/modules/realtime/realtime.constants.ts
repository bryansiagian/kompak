export const boardRoom = (boardId: string): string => `board:${boardId}`;
export const workspaceRoom = (workspaceId: string): string =>
  `workspace:${workspaceId}`;

export interface SocketUser {
  id: string;
  name: string;
}

// Disimpan di socket.data. boards: papan yang sedang diikuti -> kelompok pemiliknya.
export interface SocketData {
  user: SocketUser;
  boards: Record<string, string>;
}