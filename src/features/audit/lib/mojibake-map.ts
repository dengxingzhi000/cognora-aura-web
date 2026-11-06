/**
 * 审计日志历史乱码的「展示层」映射表。
 *
 * 来源：历史数据在 UTF-8 文本被按 GBK 解码后写入数据库/日志，与
 * `docs/mojibake-report.md` 记录的乱码成因一致。下表中的乱码值由
 * utf8 → gbk 误解码复现生成，仅用于前端展示（不改库、不改接口返回值）；
 * 未命中的字段一律原样展示，禁止猜测性覆盖。
 *
 * 维护约定：
 * - 新增映射必须同时补 `mojibake-map.test.ts` 用例；
 * - 只收录可复现、可验证的乱码串，不收录猜测值；
 * - 映射按乱码串长度倒序匹配，保证短语优先于单词。
 */
export interface MojibakeEntry {
  garbled: string;
  display: string;
}

export const MOJIBAKE_ENTRIES: readonly MojibakeEntry[] = [
  { garbled: "瀵硅处璁板綍", display: "对账记录" },
  { garbled: "鍝佺墝绠＄悊", display: "品牌管理" },
  { garbled: "绉熸埛閰嶇疆", display: "租户配置" },
  { garbled: "璐㈠姟绠＄悊", display: "财务管理" },
  { garbled: "绯荤粺绠＄悊", display: "系统管理" },
  { garbled: "鐢ㄦ埛绠＄悊", display: "用户管理" },
  { garbled: "鏉冮檺绠＄悊", display: "权限管理" },
  { garbled: "鍒犻櫎鍝佺墝", display: "删除品牌" },
  { garbled: "閲嶇疆瀵嗙爜", display: "重置密码" },
  { garbled: "瑙掕壊鎺堟潈", display: "角色授权" },
  { garbled: "鐧诲綍绯荤粺", display: "登录系统" },
  { garbled: "璁㈠崟", display: "订单" },
  { garbled: "鍟嗗搧", display: "商品" },
  { garbled: "搴撳瓨", display: "库存" },
  { garbled: "璐㈠姟", display: "财务" },
  { garbled: "绯荤粺", display: "系统" },
  { garbled: "鐢ㄦ埛", display: "用户" },
  { garbled: "鏉冮檺", display: "权限" },
  { garbled: "閲囪喘", display: "采购" },
  { garbled: "浠撳簱", display: "仓库" },
  { garbled: "鐗╂祦", display: "物流" },
  { garbled: "绉熸埛", display: "租户" },
  { garbled: "娑堟伅", display: "消息" },
  { garbled: "鏂囦欢", display: "文件" },
  { garbled: "鏂囨。", display: "文档" },
  { garbled: "瀹℃壒", display: "审批" },
  { garbled: "閫氱煡", display: "通知" },
  { garbled: "缁撶畻", display: "结算" },
  { garbled: "鍙戠エ", display: "发票" },
  { garbled: "瀵硅处", display: "对账" },
  { garbled: "鍝佺墝", display: "品牌" },
  { garbled: "鍒犻櫎", display: "删除" },
  { garbled: "鐧诲綍", display: "登录" },
  { garbled: "瀵煎嚭", display: "导出" },
  { garbled: "瀵煎叆", display: "导入" },
  { garbled: "瑙掕壊", display: "角色" },
  { garbled: "閮ㄩ棬", display: "部门" },
  { garbled: "鑿滃崟", display: "菜单" },
  { garbled: "閰嶇疆", display: "配置" },
];

const SORTED_ENTRIES = [...MOJIBAKE_ENTRIES].sort(
  (left, right) => right.garbled.length - left.garbled.length,
);

/**
 * 把审计日志文本中的已知乱码片段替换为可读文本。
 * `null`/`undefined`/空串统一显示为 `-`，其余未命中的内容原样返回。
 */
export const mapAuditText = (value?: string | null): string => {
  if (value === null || value === undefined || value === "") return "-";
  return SORTED_ENTRIES.reduce(
    (text, entry) => text.split(entry.garbled).join(entry.display),
    value,
  );
};
