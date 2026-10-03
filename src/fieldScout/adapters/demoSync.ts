import * as Network from 'expo-network';
import { FieldObservation, SyncAdapter } from '../domain';
import { root, writeJson } from './storage';
// Deliberately isolated demo transport. It never claims a human received the record.
export class LocalDemoSync implements SyncAdapter {
  failNext = false;
  async send(item: FieldObservation) {
    const state = await Network.getNetworkStateAsync();
    if (!state.isConnected || state.isInternetReachable === false) throw new Error('Offline: waiting for a connection');
    if (this.failNext) { this.failNext = false; throw new Error('Demonstration: simulated transport failure'); }
    await writeJson(`${root}exports/receipt-${item.id}.json`, { observation: item, receivedAt: new Date().toISOString(), transport: 'local-demo-only' });
    return { receiptId: item.id, reviewAccepted: false };
  }
}
