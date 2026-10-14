export {};
declare global {
  interface Window {
    sampleManagerDesktop?: {
      getFolder(): Promise<string | null>;
      getServerInfo(): Promise<{ port: number; token: string; addresses: string[] }>;
      chooseFolder(): Promise<string | null>;
      scanFolder(): Promise<{ folder: string | null; files: Array<{ path: string; name: string; relativePath: string; size: number; modifiedAt: number; extension: string }> }> ;
      readAudio(filePath: string): Promise<Uint8Array>;
    };
  }
}
