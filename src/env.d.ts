/// <reference types="astro/client" />

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
