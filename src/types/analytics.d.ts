export {};

declare global {
    interface Window {
        gtag?: (command: string, event: string, parameters: Record<string, unknown>) => void;
    }
}
