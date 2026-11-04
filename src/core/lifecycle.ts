/**
 * Ready and visibility bookkeeping shared by every adapter.
 */
export class Lifecycle {
  private ready = false;
  private viewable = false;
  private readonly readyCallbacks: (() => void)[] = [];
  private readonly viewableCallbacks = new Set<(viewable: boolean) => void>();

  get isReady(): boolean {
    return this.ready;
  }

  get isViewable(): boolean {
    return this.viewable;
  }

  markReady(): void {
    if (this.ready) return;
    this.ready = true;
    for (const callback of this.readyCallbacks.splice(0)) callback();
  }

  onReady(callback: () => void): void {
    if (this.ready) callback();
    else this.readyCallbacks.push(callback);
  }

  setViewable(viewable: boolean): void {
    if (this.viewable === viewable) return;
    this.viewable = viewable;
    for (const callback of this.viewableCallbacks) callback(viewable);
  }

  onViewableChange(callback: (viewable: boolean) => void): () => void {
    this.viewableCallbacks.add(callback);
    return () => this.viewableCallbacks.delete(callback);
  }
}
