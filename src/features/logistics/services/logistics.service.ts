import { logisticsApiService } from "@/lib/api/services/logistics";

import {
  toFreightQuote,
  toFreightReconciliation,
  toFreightReconciliationPage,
  toFreightTemplate,
  toTrackingEvent,
  toWaybill,
  toWaybillPage,
} from "../lib/mappers";
import type {
  FreightQuote,
  FreightReconciliation,
  FreightTemplate,
  TrackingEvent,
  Waybill,
  WaybillStatus,
} from "../types";

const LIST_PAGE_SIZE = 100;

export interface WaybillListParams {
  page?: number;
  size?: number;
  waybillNo?: string;
  status?: WaybillStatus;
}

export const logisticsService = {
  listWaybills: async (
    params: WaybillListParams = {}
  ): Promise<{ records: Waybill[]; total: number }> =>
    toWaybillPage(
      await logisticsApiService.pageWaybills({
        page: params.page ?? 1,
        size: params.size ?? LIST_PAGE_SIZE,
        waybillNo: params.waybillNo || undefined,
        status: params.status,
      })
    ),

  getWaybill: async (id: string): Promise<Waybill | null> => {
    const dto = await logisticsApiService.getWaybill(id);
    return dto ? toWaybill(dto) : null;
  },

  /** Backend returns insertion order; newest first is what the timeline needs. */
  getTracking: async (waybillId: string): Promise<TrackingEvent[]> => {
    const events = (await logisticsApiService.listTracking(waybillId)).map(
      toTrackingEvent
    );
    return events.sort(
      (left, right) =>
        (right.rawTime ? Date.parse(right.rawTime) : 0) -
        (left.rawTime ? Date.parse(left.rawTime) : 0)
    );
  },

  updateStatus: (id: string, status: WaybillStatus, operator?: string) =>
    logisticsApiService.updateWaybillStatus(id, status, operator),

  cancel: (id: string, reason?: string, operator?: string) =>
    logisticsApiService.cancelWaybill(id, reason, operator),

  /** 手写接口：后端批次 2 已实现，当前 OpenAPI 快照未收录（待后端上线后替换）。 */
  quoteFreight: async (request: {
    carrierId: string;
    regionCode?: string;
    weight: number;
    volume: number;
  }): Promise<FreightQuote> =>
    toFreightQuote(await logisticsApiService.quoteFreight(request)),

  /** 手写接口：待后端上线后由快照生成客户端替换。 */
  reconcile: (request: {
    waybillId: string;
    regionCode?: string;
    billedAmount: number;
    batchNo?: string;
    operator?: string;
  }): Promise<FreightReconciliation> =>
    logisticsApiService.reconcileFreight(request).then(toFreightReconciliation),

  /** 手写接口：待后端上线后由快照生成客户端替换。 */
  listReconciliations: async (params: {
    page?: number;
    size?: number;
    batchNo?: string;
    diffType?: string;
    status?: string;
  }): Promise<{ records: FreightReconciliation[]; total: number }> =>
    toFreightReconciliationPage(
      await logisticsApiService.pageFreightReconciliations({
        page: params.page ?? 1,
        size: params.size ?? 20,
        batchNo: params.batchNo || undefined,
        diffType: params.diffType || undefined,
        status: params.status || undefined,
      })
    ),

  /** 手写接口：待后端上线后由快照生成客户端替换。 */
  listFreightTemplates: async (carrierId: string): Promise<FreightTemplate[]> =>
    (await logisticsApiService.listFreightTemplatesByCarrier(carrierId)).map(
      toFreightTemplate
    ),
};
