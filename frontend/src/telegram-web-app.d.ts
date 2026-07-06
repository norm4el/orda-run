export {};

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        ready: () => void;
        expand: () => void;
        initData: string;
        initDataUnsafe?: {
          user?: {
            id?: number;
            username?: string;
            first_name?: string;
          };
        };
      };
    };
  }
}
