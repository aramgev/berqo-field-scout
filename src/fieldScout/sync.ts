import { ObservationRepository, SyncAdapter } from './domain';
export class ObservationSync {
  private busy = false;
  constructor(private repository: ObservationRepository, private adapter: SyncAdapter) {}
  async run(): Promise<void> {
    if (this.busy) return;
    this.busy = true;
    try {
      for (const item of await this.repository.list()) {
        if (!['queued', 'failed'].includes(item.syncStatus)) continue;
        try {
          const receipt = await this.adapter.send(item);
          await this.repository.save({ ...item, syncStatus: 'synced', syncError: undefined,
            reviewStatus: item.reviewStatus === 'queued_for_review' && receipt.reviewAccepted ? 'submitted' : item.reviewStatus });
        } catch (e) {
          await this.repository.save({ ...item, syncStatus: 'failed', syncError: String(e) });
        }
      }
    } finally { this.busy = false; }
  }
}
