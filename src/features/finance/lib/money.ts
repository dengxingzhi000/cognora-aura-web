const CURRENCY_FORMATTER = new Intl.NumberFormat("zh-CN", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * 金额展示统一为千分位 + 两位小数。
 *
 * 这里只做展示格式化（最多按两位小数舍入），不做汇率换算、税额重算、
 * 差异金额计算等任何业务计算——这些一律以后端返回值为准。
 */
export const formatMoney = (value?: number | null): string => {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";
  const formatted = CURRENCY_FORMATTER.format(Math.abs(value));
  return value < 0 ? `-¥${formatted}` : `¥${formatted}`;
};

/** 金额输入框回写：不改变原值，仅用于把后端数字渲染成可编辑字符串。 */
export const toAmountInput = (value?: number | null): string =>
  value === null || value === undefined ? "" : String(value);
