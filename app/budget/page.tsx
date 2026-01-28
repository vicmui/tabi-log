"use client";
import { useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import { useTripStore, ExpenseCategory } from "@/store/useTripStore";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Utensils, Camera, Train, Bed, ShoppingBag, MapPin, FileText } from "lucide-react";
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
  const { trips, activeTripId, addExpense } = useTripStore();
  const trip = activeTripId ? trips.find(t => t.id === activeTripId) : trips[0];

  const [itemName, setItemName] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<ExpenseCategory>("Food");
  const [date, setDate] = useState("");
  const [note, setNote] = useState("");
  const [payer, setPayer] = useState("");

  if (!trip) return null;

  const totalSpent = trip.expenses.reduce((acc, cur) => acc + cur.amount, 0);
  const remaining = trip.budgetTotal - totalSpent;
  const isOverBudget = remaining < 0;

  const catStats = trip.expenses.reduce((acc, cur) => {
      acc[cur.category] = (acc[cur.category] || 0) + cur.amount;
      return acc;
  }, {} as Record<string, number>);

  const chartData = Object.keys(catStats).map(k => ({ name: k, value: catStats[k] }));

  const handleAdd = () => {
    if(!amount || !payer || !itemName) return;
    addExpense(trip.id, {
        id: uuidv4(), amount: Number(amount), category, itemName, note, date: date || new Date().toISOString().split('T')[0],
        payerId: payer, splitWithIds: trip.members.map(m=>m.id)
    });
    setAmount(""); setNote(""); setItemName("");
  };

  return (
    <div className="flex min-h-screen bg-white font-sans text-jp-charcoal">
      <Sidebar />
      <main className="flex-1 ml-0 md:ml-64 p-8 md:p-12 overflow-y-auto h-screen bg-gray-50">
        <header className="mb-10"><h1 className="text-3xl font-serif font-bold tracking-widest uppercase mb-2">預算管理</h1></header>

        <div className="grid grid-cols-3 gap-6 mb-10">
           <div className="bg-jp-charcoal text-white p-6 shadow-lg"><p className="text-[10px] tracking-widest opacity-60 uppercase">總預算</p><h2 className="text-3xl font-serif font-bold">¥{trip.budgetTotal.toLocaleString()}</h2></div>
           <div className="bg-white p-6 shadow-sm border border-gray-100"><p className="text-[10px] tracking-widest text-gray-400 uppercase">已花費</p><h2 className="text-3xl font-serif font-bold text-blue-600">¥{totalSpent.toLocaleString()}</h2></div>
           <div className={isOverBudget ? "bg-red-500 text-white p-6 shadow-sm" : "bg-white p-6 shadow-sm border border-gray-100"}><p className="text-[10px] tracking-widest opacity-60 uppercase">剩餘</p><h2 className="text-3xl font-serif font-bold">¥{remaining.toLocaleString()}</h2></div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
           <div className="bg-white p-8 shadow-sm h-fit">
              <h3 className="font-serif font-bold mb-6">新增支出</h3>
              <div className="space-y-4">
                 <input type="date" value={date} onChange={e=>setDate(e.target.value)} className="w-full border-b p-2 text-sm" />
                 <input type="text" placeholder="項目名稱 (例如：一蘭拉麵)" value={itemName} onChange={e=>setItemName(e.target.value)} className="w-full border-b p-2 text-sm" />
                 <input type="number" placeholder="金額 (¥)" value={amount} onChange={e=>setAmount(e.target.value)} className="w-full border-b p-2 text-xl" />
                 <div className="flex flex-wrap gap-2">{Object.keys(CAT_CONFIG).map(c => (<button key={c} onClick={()=>setCategory(c as any)} className={`px-2 py-1 text-[10px] border ${category===c?'bg-black text-white':'border-gray-200'}`}>{CAT_CONFIG[c as ExpenseCategory].label}</button>))}</div>
                 <div className="flex gap-2">{trip.members.map(m => (<button key={m.id} onClick={()=>setPayer(m.id)} className={`flex-1 border py-2 text-xs ${payer===m.id?'bg-black text-white':'bg-gray-50'}`}>{m.name}</button>))}</div>
                 <input placeholder="備註 (選填)..." value={note} onChange={e=>setNote(e.target.value)} className="w-full border-b p-2 text-sm" />
                 <button className="flex items-center gap-2 text-[10px] text-gray-400 border border-dashed border-gray-300 w-full justify-center py-3 hover:bg-gray-50"><FileText size={14}/> 上傳收據 (模擬)</button>
                 <button onClick={handleAdd} className="w-full bg-jp-charcoal text-white py-3 uppercase text-xs tracking-widest hover:bg-black">確認新增</button>
              </div>
           </div>

           <div className="lg:col-span-2 space-y-8">
              <div className="flex gap-8 items-center h-64 bg-white p-6 border border-gray-100">
                 <div className="w-1/2 h-full"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={chartData} innerRadius={60} outerRadius={80} dataKey="value">{chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={CAT_CONFIG[entry.name as ExpenseCategory]?.color} stroke="none"/>)}</Pie><Tooltip /></PieChart></ResponsiveContainer></div>
                 <div className="w-1/2 space-y-3">{Object.keys(catStats).map(cat => { const percent = Math.round((catStats[cat]/totalSpent)*100); const conf = CAT_CONFIG[cat as ExpenseCategory]; return (<div key={cat}><div className="flex justify-between text-xs mb-1"><span className="flex items-center gap-2"><conf.icon size={12} color={conf.color}/> {conf.label}</span><span>{percent}%</span></div><div className="h-1 bg-gray-100 w-full"><div className="h-full" style={{width: `${percent}%`, backgroundColor: conf.color}}/></div></div>)})}</div>
              </div>
              <div className="space-y-2">{trip.expenses.map(exp => (<div key={exp.id} className="bg-white p-4 flex justify-between items-center border-b border-gray-50"><div className="flex items-center gap-4"><div className="text-xs text-gray-400 font-mono w-20">{exp.date}</div><div><p className="font-bold text-sm">{exp.itemName}</p><p className="text-[10px] text-gray-400">{CAT_CONFIG[exp.category].label} • 付款人: {trip.members.find(m=>m.id===exp.payerId)?.name}</p></div></div><span className="font-serif font-bold">¥{exp.amount.toLocaleString()}</span></div>))}</div>
           </div>
        </div>
      </main>
    </div>
  );
}