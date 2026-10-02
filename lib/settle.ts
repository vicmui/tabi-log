// lib/settle.ts
import { Trip } from "@/store/useTripStore";
import { toHome } from "@/lib/money";

/**
 * 分帳計算。
 *
 * 原本寫在預算頁裡面；回顧頁亦要知道「帳結清了沒有」，所以抽出來共用，
 * 免得兩頁各自計一次、日後改了一邊忘了另一邊。
 */

export interface Transfer {
  from: string;
  to: string;
  amount: number;
}

/** 低於這個數（結算貨幣）當作已平，避免浮點誤差留下 HK$0.01 的「欠款」 */
const EPSILON = 0.5;

/**
 * 每位成員的淨額：正數 = 別人欠他，負數 = 他欠別人。
 * 支出先折算成結算貨幣，再扣減已記錄的還款。
 */
export function computeBalances(trip: Trip): Record<string, number> {
  const balances: Record<string, number> = {};
  (trip.members ?? []).forEach(m => { balances[m.id] = 0; });

  (trip.expenses ?? []).forEach(exp => {
    const paidBy = exp.payerId;
    const inHome = toHome(exp, trip);
    const ratio = exp.amount ? inHome / exp.amount : 1;

    if (exp.customSplit) {
      balances[paidBy] = (balances[paidBy] ?? 0) + inHome;
      Object.entries(exp.customSplit).forEach(([mid, amt]) => {
        balances[mid] = (balances[mid] ?? 0) - amt * ratio;
      });
    } else {
      const n = exp.splitWithIds?.length ?? 0;
      if (n === 0) return;
      const share = inHome / n;
      balances[paidBy] = (balances[paidBy] ?? 0) + inHome;
      exp.splitWithIds.forEach(uid => {
        balances[uid] = (balances[uid] ?? 0) - share;
      });
    }
  });

  // 已還的款項：付款人欠得少了，收款人應收的亦少了
  (trip.settlements ?? []).forEach(s => {
    balances[s.fromId] = (balances[s.fromId] ?? 0) + s.amount;
    balances[s.toId] = (balances[s.toId] ?? 0) - s.amount;
  });

  return balances;
}

/** 以最少筆數清帳：欠最多的先還給應收最多的 */
export function suggestTransfers(balances: Record<string, number>): Transfer[] {
  const debtors = Object.entries(balances)
    .filter(([, v]) => v < -EPSILON)
    .map(([id, v]) => [id, v] as [string, number])
    .sort((a, b) => a[1] - b[1]);
  const creditors = Object.entries(balances)
    .filter(([, v]) => v > EPSILON)
    .map(([id, v]) => [id, v] as [string, number])
    .sort((a, b) => b[1] - a[1]);

  const out: Transfer[] = [];
  let i = 0, j = 0;
  while (i < debtors.length && j < creditors.length) {
    const amount = Math.min(-debtors[i][1], creditors[j][1]);
    // 以兩位小數記錄，否則「標記已付」記下的金額會帶一長串浮點尾數
    out.push({ from: debtors[i][0], to: creditors[j][0], amount: Math.round(amount * 100) / 100 });
    debtors[i][1] += amount;
    creditors[j][1] -= amount;
    if (-debtors[i][1] < EPSILON) i++;
    if (creditors[j][1] < EPSILON) j++;
  }
  return out;
}

/**
 * none        —— 從來沒有人替別人付過錢，根本無帳可結
 * outstanding —— 仍有欠款
 * settled     —— 曾經有欠款，現已全部還清
 */
export function settlementState(trip: Trip): "none" | "outstanding" | "settled" {
  const everOwed = suggestTransfers(computeBalances({ ...trip, settlements: [] })).length > 0;
  if (!everOwed && (trip.settlements ?? []).length === 0) return "none";
  return suggestTransfers(computeBalances(trip)).length > 0 ? "outstanding" : "settled";
}
