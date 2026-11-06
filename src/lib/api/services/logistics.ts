import apiClient from "../client";
import { unwrap } from "../envelope";
import type {
  TmsCarrierDTO,
  TmsCarrierPage,
  TmsCarrierQuery,
  TmsFreightQuoteDTO,
  TmsFreightQuoteRequest,
  TmsFreightReconcileRequest,
  TmsFreightReconciliationDTO,
  TmsFreightReconciliationPage,
  TmsFreightReconciliationQuery,
  TmsFreightTemplateDTO,
  TmsTrackingDTO,
  TmsTrackingPage,
  TmsTrackingQuery,
  TmsWaybillDTO,
  TmsWaybillPage,
  TmsWaybillQuery,
} from "../contracts/logistics";

const LOGISTICS_BASE = "/scm-logistics/api/v1";

const get = <T>(url: string, params?: object) =>
  unwrap<T>(apiClient.get(url, { params }));

const post = <T>(url: string, body?: unknown, params?: object) =>
  unwrap<T>(apiClient.post(url, body, params ? { params } : undefined));

const put = <T>(url: string, body?: unknown, params?: object) =>
  unwrap<T>(apiClient.put(url, body, { params }));

const del = <T>(url: string) => unwrap<T>(apiClient.delete(url));

export const logisticsApiService = {
  pageWaybills: (query: TmsWaybillQuery) =>
    get<TmsWaybillPage>(`${LOGISTICS_BASE}/tms-waybill/list`, query),
  getWaybill: (id: string) =>
    get<TmsWaybillDTO>(`${LOGISTICS_BASE}/tms-waybill/${id}`),
  updateWaybillStatus: (id: string, status: number, operator?: string) =>
    put<void>(`${LOGISTICS_BASE}/tms-waybill/${id}/status`, undefined, {
      status,
      operator,
    }),
  cancelWaybill: (id: string, reason?: string, operator?: string) =>
    post<void>(`${LOGISTICS_BASE}/tms-waybill/${id}/cancel`, undefined, {
      reason,
      operator,
    }),

  listTracking: (waybillId: string) =>
    get<TmsTrackingDTO[]>(`${LOGISTICS_BASE}/tms-tracking/waybill/${waybillId}`),

  pageTracking: (query: TmsTrackingQuery) =>
    get<TmsTrackingPage>(`${LOGISTICS_BASE}/tms-tracking/list`, query),
  createTracking: (entity: Partial<TmsTrackingDTO>) =>
    post<TmsTrackingDTO>(`${LOGISTICS_BASE}/tms-tracking`, entity),

  pageCarriers: (query: TmsCarrierQuery) =>
    get<TmsCarrierPage>(`${LOGISTICS_BASE}/tms-carrier/list`, query),
  createCarrier: (entity: Partial<TmsCarrierDTO>) =>
    post<TmsCarrierDTO>(`${LOGISTICS_BASE}/tms-carrier`, entity),
  updateCarrier: (id: string, entity: Partial<TmsCarrierDTO>) =>
    put<TmsCarrierDTO>(`${LOGISTICS_BASE}/tms-carrier/${id}`, entity),
  deleteCarrier: (id: string) =>
    del<void>(`${LOGISTICS_BASE}/tms-carrier/${id}`),
  setCarrierEnabled: (id: string, enabled: boolean) =>
    put<void>(`${LOGISTICS_BASE}/tms-carrier/${id}/enable`, undefined, {
      enabled,
    }),

  // ---- 运费模板 / 试算 / 对账 ----
  // 后端批次 2 已在 `TmsFreightController` 暴露下列接口，但当前仓库
  // `openapi/openapi-scm-logistics.json` 快照尚未收录 tms-freight（待后端上线
  // 后重新抓取快照并由生成客户端替换）。在此之前保留手写 service，禁止另造路径。
  quoteFreight: (request: TmsFreightQuoteRequest) =>
    post<TmsFreightQuoteDTO>(`${LOGISTICS_BASE}/tms-freight/quote`, request),
  reconcileFreight: (request: TmsFreightReconcileRequest) =>
    post<TmsFreightReconciliationDTO>(
      `${LOGISTICS_BASE}/tms-freight/reconciliation`,
      request
    ),
  pageFreightReconciliations: (query: TmsFreightReconciliationQuery) =>
    get<TmsFreightReconciliationPage>(
      `${LOGISTICS_BASE}/tms-freight/reconciliation/list`,
      query
    ),
  listFreightTemplatesByCarrier: (carrierId: string) =>
    get<TmsFreightTemplateDTO[]>(
      `${LOGISTICS_BASE}/tms-freight/template/carrier/${carrierId}`
    ),
};
