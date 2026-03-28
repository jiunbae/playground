export type MessageHandler = (message: unknown) => void;

export class MultiplayerModule {
  private handlers: MessageHandler[] = [];
  private connected = false;

  async connect(): Promise<void> {
    // Stub: would connect to WebSocket server when API is available
    this.connected = true;
    console.warn('[PlaygroundSDK] Multiplayer: running in offline stub mode');
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    this.handlers = [];
  }

  async send(message: unknown): Promise<void> {
    if (!this.connected) {
      throw new Error('Not connected. Call connect() first.');
    }
    // Stub: in offline mode, echo back to local handlers
    for (const handler of this.handlers) {
      handler(message);
    }
  }

  onMessage(handler: MessageHandler): () => void {
    this.handlers.push(handler);
    return () => {
      this.handlers = this.handlers.filter(h => h !== handler);
    };
  }
}
