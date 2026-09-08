import api from '@/services/api';
import type { CoordinateContract } from './placementContractService';

/** One immutable contract per mounted note-loading session, including refreshes. */
export function createCoordinateContractSession() {
  let pending: Promise<CoordinateContract> | undefined;
  return Object.freeze({
    load(): Promise<CoordinateContract> {
      pending ??= api.get<{ coordinate_contract: CoordinateContract }>(
        '/canvas-objects/coordinate-contract',
      ).then(({ data }) => {
        if (data.coordinate_contract !== 'v1' && data.coordinate_contract !== 'v2') {
          throw new Error('Unsupported canvas coordinate contract');
        }
        return data.coordinate_contract;
      });
      return pending;
    },
  });
}

export type CoordinateContractSession = ReturnType<typeof createCoordinateContractSession>;
