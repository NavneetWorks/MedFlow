export type TickCallback = (simTimeMinutes: number) => void;

export class SimulationClock {
  private simTimeMinutes: number = 0;
  private isRunning: boolean = false;
  private speedRatio: number = 1.0; // 1.0 = 1000ms per sim min
  private baseIntervalMs: number = 1000;
  private timer: NodeJS.Timeout | null = null;
  private listeners: TickCallback[] = [];

  constructor(initialTimeMinutes: number = 0) {
    this.simTimeMinutes = initialTimeMinutes;
  }

  public onTick(callback: TickCallback): void {
    this.listeners.push(callback);
  }

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.scheduleNextTick();
  }

  public pause(): void {
    this.isRunning = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  public step(): void {
    this.simTimeMinutes += 1;
    this.notifyListeners();
  }

  public setSpeed(ratio: number): void {
    if (ratio <= 0) return;
    this.speedRatio = ratio;
    if (this.isRunning) {
      this.pause();
      this.start();
    }
  }

  public getTime(): number {
    return this.simTimeMinutes;
  }

  public getIsRunning(): boolean {
    return this.isRunning;
  }

  private scheduleNextTick(): void {
    if (!this.isRunning) return;
    const interval = Math.max(50, Math.round(this.baseIntervalMs / this.speedRatio));
    this.timer = setTimeout(() => {
      this.step();
      this.scheduleNextTick();
    }, interval);
  }

  private notifyListeners(): void {
    for (const listener of this.listeners) {
      try {
        listener(this.simTimeMinutes);
      } catch (err) {
        console.error('[SimulationClock] Listener error:', err);
      }
    }
  }
}
