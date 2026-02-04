"use client";
import { useState, useMemo } from "react";
import Sidebar from "@/components/layout/Sidebar";
import { useTripStore, ExpenseCategory, Expense } from "@/store/useTripStore";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Utensils, Camera, Train, Bed, ShoppingBag, MapPin, FileText, ArrowRight, Settings2, Edit, Trash2, Upload, Paperclip } from "lucide-react";
import { v4 as uuidv4 } from 'uuid';

const CAT_CONFIG: Record<ExpenseCategory, { label: string; color: string; icon: any }> = {
  Food: { label: "餐飲", color: "#F97316", icon: Utensils },
  Transport: { label: "交通", color: "#22C55E", icon: Train },
  Accommodation: { label: "住宿", color: "#A855F7", icon: Bed },
  Sightseeing: { label: "觀光", color: "#3B82F6", icon: Camera },
  Shopping: { label: "購物", color: "#EC4899", icon: ShoppingBag },
  Other: { label: "其他", color: "#64748B", icon: MapPin },
};

export default function BudgetPage() {
  const { trips, activeTripId, addExpense, updateExpense, deleteExpense, updateBudgetTotal } = useTripStore();
  const trip = activeTripId ? trips.find(t => t.id === activeTripId) : trips[0];

  // 狀態
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [itemName, setItemName] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<ExpenseCategory>("Food");
  const [date, setDate] = useState("");
  const [note, setNote] = useState("");
  const [payer, setPayer] = useState("");
  const [splitWith, setSplitWith] = useState<string[]>([]);
  const [receiptName, setReceiptName] = useState("");
  
  const [isCustomSplit, setIsCustomSplit] = useState(false);
  const [customAmounts, setCustomAmounts] = useState<Record<string, string>>({});

  // 編輯總預算狀態
  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [tempBudget, setTempBudget] = useState("");

  if (!trip) return null;

  const totalSpent = trip.expenses.reduce((acc, cur) => acc + cur.amount, 0);
  const remaining = trip.budgetTotal - totalSpent;
  const isOverBudget = remaining < 0;

  // 載入要編輯的項目
  const handleEditExpense = (exp: Expense) => {
    setEditingExpenseId(exp.id);
    setItemName(exp.itemName);
    setAmount(exp.amount.toString());
    setCategory(exp.category);
    setDate(exp.date);
    setNote(exp.note);
    setPayer(exp.payerId);
    setSplitWith(exp.splitWithIds);
    setReceiptName(exp.receiptUrl || "");
    if(exp.customSplit) {
        setIsCustomSplit(true);
        const ca: Record<string, string> = {};
        Object.entries(exp.customSplit).forEach(([k,v])=> ca[k]=v.toString());
        setCustomAmounts(ca);
    } else {
        setIsCustomSplit(false);
        setCustomAmounts({});
    }
  };

  const handleSave = () => {
    if(!amount || !payer || !itemName || splitWith.length === 0) return;
    
    let finalCustomSplit: Record<string, number> | undefined = undefined;
    if (isCustomSplit) {
       finalCustomSplit = {};
       splitWith.forEach(id => finalCustomSplit![id] = Number(customAmounts[id] || 0));
    }

    const expenseData = {
        amount: Number(amount), category, itemName, note, date: date || new Date().toISOString().split('T')[0],
        payerId: payer, splitWithIds: splitWith, customSplit: finalCustomSplit, receiptUrl: receiptName
    };

    if (editingExpenseId) {
        updateExpense(trip.id, editingExpenseId, expenseData);
        setEditingExpenseId(null);
    } else {
        addExpense(trip.id, { ...expenseData, id: uuidv4() });
    }
    // Reset Form
    setAmount(""); setNote(""); setItemName(""); setIsCustomSplit(false); setCustomAmounts({}); setReceiptName("");
  };

  const handleDelete = (id: string) => {
      if(confirm("確定刪除此支出？")) deleteExpense(trip.id, id);
  };

  // 處理收據上傳 (模擬：只存檔名)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files?.[0]) setReceiptName(e.target.files[0].name);
  };

  // 分攤邏輯
  const distributeEvenly = () => {
     if(!amount || splitWith.length === 0) return;
     const splitAmt = (Number(amount) / splitWith.length).toFixed(0);
     const newMap: Record<string, string> = {};
     splitWith.forEach(id => newMap[id] = splitAmt);
     setCustomAmounts(newMap);
  };

  const debts = useMemo(() => {
      const balances: Record<string, number> = {};
      trip.members.forEach(m => balances[m.id] = 0);
      trip.expenses.forEach(exp => {
          const paidBy = exp.payerId;
          if (exp.customSplit) {
             balances[paidBy] += exp.amount;
             Object.entries(exp.customSplit).forEach(([mid, amt]) => balances[mid] -= amt);
          } else {
             const splitCount = exp.splitWithIds.length;
             if (splitCount === 0) return;
             const splitAmount = exp.amount / splitCount;
             balances[paidBy] += exp.amount;
             exp.splitWithIds.forEach(uid => balances[uid] -= splitAmount);
          }
      });
      const result = [];
      const debtors = Object.entries(balances).filter(([, val]) => val < -0.1).sort((a, b) => a[1] - b[1]);
      const creditors = Object.entries(balances).filter(([, val]) => val > 0.1).sort((a, b) => b[1] - a[1]);
      let i = 0, j = 0;
      while (i < debtors.length && j < creditors.length) {
        const amount = Math.min(Math.abs(debtors[i][1]), creditors[j][1]);
        result.push({ from: debtors[i][0], to: creditors[j][0], amount });
        debtors[i][1] += amount; creditors[j][1] -= amount;
        if (Math.abs(debtors[i][1]) < 0.1) i++;
        if (creditors[j][1] < 0.1) j++;
      }
      return result;
  }, [trip.expenses, trip.members]);

  const catStats = trip.expenses.reduce((acc, cur) => { acc[cur.category] = (acc[cur.category] || 0) + cur.amount; return acc; }, {} as Record<string, number>);
  const chartData = Object.keys(catStats).map(k => ({ name: k, value: catStats[k] }));
  const getMemberName = (id: string) => trip.members.find(m => m.id === id)?.name || "Unknown";

  return (
    <div className="flex min-h-screen bg-white font-sans text-jp-charcoal">
      <Sidebar />
      <main className="flex-1 ml-0 md:ml-64 p-8 md:p-12 overflow-y-auto h-screen bg-gray-50">
        <header className="mb-10"><h1 className="text-3xl font-serif font-bold tracking-widest uppercase mb-2">預算分帳</h1></header>

        {/* 債務結算 */}
        <div className="mb-10">
           <h2 className="text-xs font-bold tracking-[0.2em] text-gray-400 uppercase mb-4">結算建議 (WHO OWES WHOM)</h2>
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {debts.length > 0 ? debts.map((d, idx) => (
                <div key={idx} className="bg-white p-6 border-l-4 border-jp-charcoal shadow-sm flex items-center justify-between">
                   <div className="flex items-center gap-2 text-sm">
                      <span className="font-bold">{getMemberName(d.from)}</span><ArrowRight size={14} className="text-gray-400"/><span className="font-bold">{getMemberName(d.to)}</span>
                   </div>
                   <span className="font-serif text-xl font-bold">¥{Math.round(d.amount).toLocaleString()}</span>
                </div>
              )) : <div className="text-gray-400 text-sm">目前無債務</div>}
           </div>
        </div>

        {/* 統計卡片 */}
        <div className="grid grid-cols-3 gap-6 mb-10">
           <div className="bg-jp-charcoal text-white p-6 shadow-lg relative group cursor-pointer" onClick={() => {setTempBudget(trip.budgetTotal.toString()); setIsEditingBudget(true)}}>
              <p className="text-[10px] tracking-widest opacity-60 uppercase">總預算 <Edit size={10} className="inline ml-1 opacity-50 group-hover:opacity-100"/></p>
              {isEditingBudget ? (
                  <div className="flex items-center gap-2 mt-2">
                      <input autoFocus className="text-black px-2 py-1 w-32 rounded text-lg" type="number" value={tempBudget} onClick={(e)=>e.stopPropagation()} onChange={(e)=>setTempBudget(e.target.value)}/>
                      <button className="bg-white text-black px-2 py-1 text-xs rounded" onClick={(e)=>{ e.stopPropagation(); updateBudgetTotal(trip.id, Number(tempBudget)); setIsEditingBudget(false); }}>OK</button>
                  </div>
              ) : (
                  <h2 className="text-3xl font-serif font-bold">¥{trip.budgetTotal.toLocaleString()}</h2>
              )}
           </div>
           <div className="bg-white p-6 shadow-sm border border-gray-100"><p className="text-[10px] tracking-widest text-gray-400 uppercase">已花費</p><h2 className="text-3xl font-serif font-bold text-blue-600">¥{totalSpent.toLocaleString()}</h2></div>
           <div className={isOverBudget ? "bg-red-500 text-white p-6 shadow-sm" : "bg-white p-6 shadow-sm border border-gray-100"}><p className="text-[10px] tracking-widest opacity-60 uppercase">剩餘</p><h2 className="text-3xl font-serif font-bold">¥{remaining.toLocaleString()}</h2></div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
           {/* 新增/編輯區塊 */}
           <div className="bg-white p-8 shadow-sm h-fit border border-gray-100 sticky top-4">
              <div className="flex justify-between items-center mb-6">
                  <h3 className="font-serif font-bold">{editingExpenseId ? "編輯支出" : "新增支出"}</h3>
                  {editingExpenseId && <button onClick={()=>{setEditingExpenseId(null); setItemName(""); setAmount(""); setReceiptName("")}} className="text-xs text-gray-400 hover:text-black">取消</button>}
              </div>
              
              <div className="space-y-4">
                 <input type="date" value={date} onChange={e=>setDate(e.target.value)} className="w-full border-b p-2 text-sm" />
                 <input type="text" placeholder="項目名稱 (例如：一蘭拉麵)" value={itemName} onChange={e=>setItemName(e.target.value)} className="w-full border-b p-2 text-sm" />
                 <input type="number" placeholder="金額 (¥)" value={amount} onChange={e=>setAmount(e.target.value)} className="w-full border-b p-2 text-xl" />
                 
                 <div><label className="text-[10px] text-gray-400">付款人:</label><div className="flex gap-2 mt-1">{trip.members.map(m => (<button key={m.id} onClick={()=>setPayer(m.id)} className={`flex-1 border py-2 text-xs ${payer===m.id?'bg-black text-white':'bg-gray-50'}`}>{m.name}</button>))}</div></div>
                 
                 <div>
                    <div className="flex justify-between items-center mb-2"><label className="text-[10px] text-gray-400">分攤:</label><button onClick={()=>{ setIsCustomSplit(!isCustomSplit); if(!isCustomSplit) distributeEvenly(); }} className="flex items-center gap-1 text-[10px] bg-gray-100 px-2 py-1 rounded hover:bg-gray-200"><Settings2 size={10}/> {isCustomSplit ? "切換回平均" : "自訂金額"}</button></div>
                    <div className="flex gap-2 flex-wrap mb-2"><button onClick={()=>setSplitWith(trip.members.map(m=>m.id))} className="text-[10px] underline mr-2">全員</button>{trip.members.map(m => (<button key={m.id} onClick={()=>{ setSplitWith(prev => prev.includes(m.id) ? prev.filter(id=>id!==m.id) : [...prev, m.id]) }} className={`px-3 py-1 text-xs border ${splitWith.includes(m.id)?'bg-gray-200 border-gray-400':'bg-white text-gray-300'}`}>{m.name}</button>))}</div>
                    {isCustomSplit && splitWith.length > 0 && (<div className="bg-gray-50 p-3 rounded space-y-2 border border-dashed border-gray-300">{splitWith.map(mid => { const m = trip.members.find(mem=>mem.id===mid); return (<div key={mid} className="flex items-center justify-between"><span className="text-xs">{m?.name}</span><input type="number" className="w-20 border-b bg-transparent text-right text-sm" placeholder="0" value={customAmounts[mid] || ''} onChange={(e) => setCustomAmounts({...customAmounts, [mid]: e.target.value})}/></div>)})}</div>)}
                 </div>

                 <div className="flex flex-wrap gap-2">{Object.keys(CAT_CONFIG).map(c => (<button key={c} onClick={()=>setCategory(c as any)} className={`px-2 py-1 text-[10px] border ${category===c?'bg-black text-white':'border-gray-200'}`}>{CAT_CONFIG[c as ExpenseCategory].label}</button>))}</div>
                 
                 <label className="flex items-center gap-2 text-[10px] text-gray-400 border border-dashed border-gray-300 w-full justify-center py-3 hover:bg-gray-50 cursor-pointer">
                    <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                    <Upload size={14}/> {receiptName ? `已選: ${receiptName}` : "上傳單據/發票"}
                 </label>

                 <button onClick={handleSave} className="w-full bg-jp-charcoal text-white py-3 uppercase text-xs tracking-widest hover:bg-black">{editingExpenseId ? "更新支出" : "確認新增"}</button>
              </div>
           </div>

           {/* 列表與圖表 */}
<div className="lg:col-span-2 space-y-8">
   <div className="flex flex-col md:flex-row gap-8 items-center bg-white p-6 border border-gray-100">
      {/* 🔥 修改這裡：給它明確的高度 h-[250px] 和寬度 */}
      <div className="w-full md:w-1/2 h-[250px]">
         <ResponsiveContainer width="100%" height="100%">
            <PieChart>
               <Pie data={chartData} innerRadius={60} outerRadius={80} dataKey="value">
                  {chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={CAT_CONFIG[entry.name as ExpenseCategory]?.color} stroke="none"/>)}
               </Pie>
               <Tooltip />
            </PieChart>
         </ResponsiveContainer>
      </div>
                 <div className="w-1/2 space-y-3">{Object.keys(catStats).map(cat => { const percent = Math.round((catStats[cat]/totalSpent)*100); const conf = CAT_CONFIG[cat as ExpenseCategory]; return (<div key={cat}><div className="flex justify-between text-xs mb-1"><span className="flex items-center gap-2"><conf.icon size={12} color={conf.color}/> {conf.label}</span><span>{percent}%</span></div><div className="h-1 bg-gray-100 w-full"><div className="h-full" style={{width: `${percent}%`, backgroundColor: conf.color}}/></div></div>)})}</div>
              </div>
              <div className="space-y-2">
                 {trip.expenses.map(exp => (
                    <div key={exp.id} className="bg-white p-4 flex justify-between items-center border-b border-gray-50 hover:bg-gray-50 group">
                       <div className="flex items-center gap-4">
                          <div className="text-xs text-gray-400 font-mono w-20">{exp.date}</div>
                          <div>
                             <p className="font-bold text-sm flex items-center gap-2">
                                {exp.itemName} 
                                {exp.receiptUrl && <Paperclip size={12} className="text-gray-400"/>}
                             </p>
                             <p className="text-[10px] text-gray-400">{CAT_CONFIG[exp.category].label} • Paid by {trip.members.find(m=>m.id===exp.payerId)?.name} {exp.customSplit ? '(自訂)' : ''}</p>
                          </div>
                       </div>
                       <div className="flex items-center gap-4">
                          <span className="font-serif font-bold">¥{exp.amount.toLocaleString()}</span>
                          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                             <button onClick={()=>handleEditExpense(exp)} className="text-gray-400 hover:text-black"><Edit size={14}/></button>
                             <button onClick={()=>handleDelete(exp.id)} className="text-gray-400 hover:text-red-500"><Trash2 size={14}/></button>
                          </div>
                       </div>
                    </div>
                 ))}
              </div>
           </div>
        </div>
      </main>
    </div>
  );
}