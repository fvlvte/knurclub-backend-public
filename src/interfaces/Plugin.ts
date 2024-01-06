export type PluginEventHandler = () => void;

export interface Plugin {
  getName(): string;

  initialize(): Promise<boolean>;
  unload(): Promise<void>;

  getRouterHandler(): Promise<() => void>;
}
