"use client";
import { useState, useMemo } from "react";
import Sidebar from "@/components/layout/Sidebar";
import { useTripStore, ExpenseCategory, Expense } from "@/store/useTripStore";
import { supabase } from "@/lib/supabase";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Utensils, Camera, Train, Bed, ShoppingBag, MapPin, ArrowRight, Settings2, Edit, Trash2, Upload, Paperclip } from "lucide-react";
import { v4 as uuidv4 } from 'uuid';

const CAT_CONFIG: Record<ExpenseCategory, { label: string; color: string; icon: any }> = {
  Food: { label: "餐飲", color: "#F97316", icon: Utensils }, Transport: { label: "交通", color: "#22C55E", icon: Train }, Accommodation: { label: "住宿", color: "#A855F7", icon: Bed }, Sightseeing: { label: "觀光", color: "#3B82F6", icon: Camera }, Shopping: { label: "購物", color: "#EC4899", icon: ShoppingBag }, Other: { label: "其他", color: "#64748B", icon: MapPin },
};

export default function BudgetPage() {
  const { trips, activeTripId, addExpense, updateExpense, deleteExpense, updateBudgetTotal, isSyncing } = useTripStore();
  const trip = activeTripId ? trips.find(t => t.id === activeTripId) : trips[0];

  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [itemName, setItemName] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<ExpenseCategory>("Food");
  const [date, setDate] = useState("");
  const [note, setNote] = useState("");
  const [payer, setPayer] = useState("");
  const [splitWith, setSplitWith] = useState<string[]>([]);
  const [receiptUrl, setReceiptUrl] = useState("");
  
  const [isCustomSplit, setIsCustomSplit] = useState(false);
  const [customAmounts, setCustomAmounts] = useState<Record<string, string>>({});
  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [tempBudget, setTempBudget] = useState("");

  if (!trip) return <div className="p-10 text-center animate-pulse">Loading...</div>;

  const totalSpent = trip.expenses.reduce((acc, cur) => acc + cur.amount, 0);
  const remaining = trip.budgetTotal - totalSpent;

  // 🔥 檔案上傳 Supabase
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !trip) return;

    const filePath = `public/${trip.id}/receipts/${uuidv4()}-${file.name}`;
    const { data, error } = await supabase.storage.from('trip_files').upload(filePath, file);

    if (error) {
        alert("上傳失敗: " + error.message);
    } else {
        const { data: { publicUrl } } = supabase.storage.from('trip_files').getPublicUrl(filePath);
        setReceiptUrl(publicUrl);
        alert("收據上傳成功！");
    }
  };

  const handleSave = () => { /* ... (之前的 handleSave 邏輯不變) ... */ };
  
  // 其他邏輯...
  return (
    <div className="flex min-h-screen bg-white font-sans text-jp-charcoal">
      <Sidebar />
      <main className="flex-1 ml-0 md:ml-64 p-8 md:p-12 overflow-y-auto h-screen bg-gray-50">
        {/* ... */}
        {/* 在新增/編輯區塊，找到上傳按鈕，修改它 */}
        <label className="flex items-center gap-2 text-[10px] text-gray-400 border border-dashed border-gray-300 w-full justify-center py-3 hover:bg-gray-50 cursor-pointer">
          <input type="file" accept="image/*,.pdf" className="hidden" onChange={handleFileUpload} />
          <Upload size={14}/> {receiptUrl ? "已上傳" : "上傳單據/發票"}
        </label>
        {/* ... */}
      </main>
    </div>
  );
}