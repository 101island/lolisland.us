/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly PUBLIC_API_BASE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

type Runtime = import("@astrojs/cloudflare").Runtime<
  import("./pages/api/_types").Bindings
>;

declare namespace App {
  interface Locals extends Runtime {}
}

interface DeviceMotionEventStatic {
  requestPermission?: () => Promise<"granted" | "denied">;
}

interface DeviceOrientationEventStatic {
  requestPermission?: () => Promise<"granted" | "denied">;
}

interface Window {
  DeviceMotionEvent?: DeviceMotionEventStatic;
  DeviceOrientationEvent?: DeviceOrientationEventStatic;
  _settingsToggles?: {
    collision?: HTMLInputElement;
    title?: HTMLInputElement;
    marbles?: HTMLInputElement;
    background?: HTMLInputElement;
    mouseInteraction?: HTMLInputElement;
    deviceMotion?: HTMLInputElement;
    deviceOrientation?: HTMLInputElement;
  };
  _settingsListenersAttached?: boolean;
  _centralIslandListenersAttached?: boolean;
  _centralIslandState?: {
    inputs: Record<string, string>;
    currentView: string;
    isLoggedIn: boolean;
  };
}
