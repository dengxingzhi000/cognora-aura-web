import { financeApiService } from "@/lib/api/services/finance";

import {
  toInvoicePage,
  toSettlement,
  toSettlementPage,
} from "../lib/mappers";
import type { Invoice, Settlement } from "../types";

export interface SettlementPageModel {
  rows: Settlement[];
  total: number;
  page: number;
  size: number;
}

export interface InvoicePageModel {
  rows: Invoice[];
  total: number;
  page: number;
  size: number;
}

export const financeService = {
  listSettlements: async (
    page: number,
    size: number,
    status?: number,
  ): Promise<SettlementPageModel> => {
    const response = await financeApiService.listSettlements(page, size, status);
    return {
      rows: toSettlementPage(response),
      total: response?.total ?? 0,
      page,
      size,
    };
  },

  getSettlement: async (id: string): Promise<Settlement> =>
    toSettlement(await financeApiService.getSettlement(id)),

  listInvoices: async (
    page: number,
    size: number,
  ): Promise<InvoicePageModel> => {
    const [invoices, settlements] = await Promise.all([
      financeApiService.pageInvoices(page, size),
      financeApiService.listSettlements(1, 100).catch(() => null),
    ]);

    const settlementNoById = Object.fromEntries(
      (settlements?.records ?? []).map((settlement) => [
        settlement.id,
        settlement.settlementNo ?? "-",
      ])
    );

    return {
      rows: toInvoicePage(invoices, settlementNoById),
      total: invoices?.total ?? 0,
      page,
      size,
    };
  },
};
