'use client'

import { useState, useMemo } from 'react'
import Sidebar from '@/components/layout/Sidebar'
import TripSwitcher from '@/components/layout/TripSwitcher'
import { useTripStore, ExpenseCategory, Expense } from '@/store/useTripStore'
import { supabase } from '@/lib/supabase'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import {
  Utensils, Camera, Train, Bed, ShoppingBag, MapPin,
  ArrowRight, Settings2, Edit, Trash2, Upload, Paperclip, ArrowRightLeft,
} from 'lucide-react'
import { v4 as uuidv4 } from 'uuid'
import { ConfirmDialog, AlertDialog } from '@/components/ui/Dialog'

const getCurrencySymbol = (c?: string): string => {
  const map: Record<string, string> = {
    JPY: '¥', TWD: 'NT$', HKD: 'HK$', KRW: '₩',
    SGD: 'S$', THB: '฿', EUR: '€', USD: '$',
  }
  return map[c ?? ''] ?? 'HK$'
}

const CAT_CONFIG: Record<ExpenseCategory, { label: string; color: string; icon: any }> = {
  Food:          { label: '餐飲',   color: '#F97316', icon: Utensils },
  Transport:     { label: '交通',   color: '#22C55E', icon: Train },
  Accommodation: { label: '住宿',   color: '#A855F7', icon: Bed },
  Sightseeing:   { label: '景點',   color: '#3B82F6', icon: Camera },
  Shopping:      { label: '購物',   color: '#EC4899', icon: ShoppingBag },
  Other:         { label: '其他',   color: '#64748B', icon: MapPin },
}

// ─── FormContent extracted as a TOP-LEVEL component ──────────────────────────
// CRITICAL: Must NOT be defined inside BudgetPage — doing so causes React to
// remount it on every parent re-render, making the keyboard disappear on mobile.
interface FormContentProps {
  date: string; setDate: (v: string) => void
  itemName: string; setItemName: (v: string) => void
  amount: string; setAmount: (v: string) => void
  currency: string; setCurrency: (v: string) => void
  localCurrency: string
  rate: number
  payer: string; setPayer: (v: string) => void
  splitWith: string[]; setSplitWith: (v: string[]) => void
  isCustomSplit: boolean; setIsCustomSplit: (v: boolean) => void
  customAmounts: Record<string, string>; setCustomAmounts: (v: Record<string, string>) => void
  category: ExpenseCategory; setCategory: (v: ExpenseCategory) => void
  receiptUrl: string
  members: { id: string; name: string; avatar: string }[]
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
  distributeEvenly: () => void
}

function FormContent({
  date, setDate, itemName, setItemName, amount, setAmount,
  currency, setCurrency, localCurrency, rate,
  payer, setPayer, splitWith, setSplitWith,
  isCustomSplit, setIsCustomSplit, customAmounts, setCustomAmounts,
  category, setCategory, receiptUrl, members, onFileUpload, distributeEvenly,
}: FormContentProps) {
  return (
    <div className="space-y-4">
      <input
        type="date"
        value={date}
        onChange={e => setDate(e.target.value)}
        className="w-full border-b p-2 text-sm bg-transparent"
      />

      <input
        type="text"
        placeholder="項目名稱"
        value={itemName}
        onChange={e => setItemName(e.target.value)}
        className="w-full border-b p-2 text-sm bg-transparent"
      />

      {/* Amount + currency toggle */}
      <div>
        <div className="flex items-center border-b">
          <input
            className="w-full p-2 text-xl focus:outline-none bg-transparent"
            type="number"
            inputMode="decimal"
            placeholder="0"
            value={amount}
            onChange={e => setAmount(e.target.value)}
          />
          <button
            type="button"
            onClick={() => setCurrency(currency === localCurrency ? 'HKD' : localCurrency)}
            className="text-xs font-bold px-2 py-1 bg-gray-100 rounded hover:bg-gray-200 flex items-center gap-1 min-w-[50px] justify-center"
          >
            {currency} <ArrowRightLeft size={10} />
          </button>
        </div>
        {currency === 'HKD' && amount && (
          <p className="text-xs text-gray-500 mt-1 text-right">
            {getCurrencySymbol(localCurrency)}{Math.round(Number(amount) / rate).toLocaleString()}
          </p>
        )}
      </div>

      {/* Payer */}
      <div>
        <label className="text-xs text-gray-500 uppercase tracking-widest">付款人</label>
        <div className="flex gap-2 mt-1 flex-wrap">
          {members.map(m => (
            <button
              key={m.id}
              type="button"
              onClick={() => setPayer(m.id)}
              className={`flex-1 border py-2 text-xs min-w-[60px] ${payer === m.id ? 'bg-black text-white' : 'bg-gray-50'}`}
            >
              {m.name}
            </button>
          ))}
        </div>
      </div>

      {/* Split */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <label className="text-xs text-gray-500 uppercase tracking-widest">分攤</label>
          <button
            type="button"
            onClick={() => {
              if (!isCustomSplit) distributeEvenly()
              setIsCustomSplit(!isCustomSplit)
            }}
            className="flex items-center gap-1 text-xs bg-gray-100 px-2 py-1 rounded"
          >
            <Settings2 size={10} /> {isCustomSplit ? '取消自訂' : '自訂'}
          </button>
        </div>
        <div className="flex gap-2 flex-wrap mb-2">
          <button
            type="button"
            onClick={() => setSplitWith(members.map(m => m.id))}
            className="text-xs underline mr-2"
          >
            全選
          </button>
          {members.map(m => (
            <button
              key={m.id}
              type="button"
              onClick={() =>
                setSplitWith(
                  splitWith.includes(m.id)
                    ? splitWith.filter(id => id !== m.id)
                    : [...splitWith, m.id]
                )
              }
              className={`px-3 py-1 text-xs border ${splitWith.includes(m.id) ? 'bg-gray-200' : 'text-gray-400'}`}
            >
              {m.name}
            </button>
          ))}
        </div>
        {isCustomSplit && splitWith.length > 0 && (
          <div className="bg-gray-50 p-3 rounded space-y-2 border border-dashed">
            {splitWith.map(mid => {
              const m = members.find(mem => mem.id === mid)
              return (
                <div key={mid} className="flex justify-between items-center">
                  <span className="text-xs">{m?.name}</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    className="w-20 border-b bg-transparent text-right text-sm focus:outline-none"
                    placeholder="0"
                    value={customAmounts[mid] ?? ''}
                    onChange={e => setCustomAmounts({ ...customAmounts, [mid]: e.target.value })}
                  />
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Category */}
      <div className="flex flex-wrap gap-2">
        {(Object.keys(CAT_CONFIG) as ExpenseCategory[]).map(c => (
          <button
            key={c}
            type="button"
            onClick={() => setCategory(c)}
            className={`px-2 py-1 text-xs border ${category === c ? 'bg-black text-white' : 'border-gray-200'}`}
          >
            {CAT_CONFIG[c].label}
          </button>
        ))}
      </div>

      {/* Receipt upload */}
      <label className="flex items-center gap-2 text-xs text-gray-500 border border-dashed w-full justify-center py-3 cursor-pointer">
        <input type="file" accept="image/*,.pdf" className="hidden" onChange={onFileUpload} />
        <Upload size={14} />
        {receiptUrl ? '✅ 已上傳收據' : '上傳收據 / PDF (max 10MB)'}
      </label>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function BudgetPage() {
  const {
    trips, activeTripId,
    addExpense, updateExpense, deleteExpense, updateBudgetTotal,
  } = useTripStore()

  const trip = trips.find(t => t.id === activeTripId) ?? null

  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null)
  const [itemName, setItemName]     = useState('')
  const [amount, setAmount]         = useState('')
  const [currency, setCurrency]     = useState(trip?.localCurrency ?? 'HKD')
  const [category, setCategory]     = useState<ExpenseCategory>('Food')
  const [date, setDate]             = useState('')
  const [note, setNote]             = useState('')
  const [payer, setPayer]           = useState('')
  const [splitWith, setSplitWith]   = useState<string[]>([])
  const [receiptUrl, setReceiptUrl] = useState('')
  const [isCustomSplit, setIsCustomSplit]   = useState(false)
  const [customAmounts, setCustomAmounts]   = useState<Record<string, string>>({})
  const [isEditingBudget, setIsEditingBudget] = useState(false)
  const [tempBudget, setTempBudget] = useState('')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [deletingExpenseId, setDeletingExpenseId] = useState<string | null>(null)
  const [alertMsg, setAlertMsg]     = useState<string | null>(null)

  if (!trip) {
    return (
      <div className="flex min-h-screen bg-white">
        <Sidebar />
        <main className="flex-1 ml-0 md:ml-64 p-12 text-center text-gray-500 text-xs tracking-widest animate-pulse">
          載入中...
        </main>
      </div>
    )
  }

  const rate        = trip.exchangeRate ?? 0.052
  const totalSpent  = trip.expenses.reduce((acc, cur) => acc + cur.amount, 0)
  const remaining   = trip.budgetTotal - totalSpent
  const isOverBudget = remaining < 0

  const handleAdd = () => {
    const finalDate  = date || new Date().toISOString().split('T')[0]
    const finalPayer = payer || (trip.members.length > 0 ? trip.members[0].id : '')
    const finalSplit = splitWith.length > 0 ? splitWith : trip.members.map(m => m.id)

    if (!amount || !itemName || !finalPayer) { setAlertMsg('請填寫必填欄位'); return }

    let finalAmount = Number(amount)
    if (currency === 'HKD') finalAmount = Math.round(Number(amount) / rate)

    let finalCustomSplit: Record<string, number> | undefined = undefined
    if (isCustomSplit) {
      finalCustomSplit = {}
      finalSplit.forEach(id => { finalCustomSplit![id] = Number(customAmounts[id] ?? 0) })
    }

    const expenseData = {
      amount: finalAmount, category, itemName, note,
      date: finalDate, payerId: finalPayer,
      splitWithIds: finalSplit,
      customSplit: finalCustomSplit,
      receiptUrl,
    }

    if (editingExpenseId) {
      updateExpense(trip.id, editingExpenseId, expenseData)
      setEditingExpenseId(null)
    } else {
      addExpense(trip.id, { ...expenseData, id: uuidv4() })
    }
    setAmount(''); setNote(''); setItemName('')
    setIsCustomSplit(false); setCustomAmounts({}); setReceiptUrl('')
  }

  const handleEditExpense = (exp: Expense) => {
    setEditingExpenseId(exp.id)
    setItemName(exp.itemName)
    setAmount(exp.amount.toString())
    setCategory(exp.category)
    setDate(exp.date)
    setNote(exp.note ?? '')
    setPayer(exp.payerId)
    setSplitWith(exp.splitWithIds)
    setReceiptUrl(exp.receiptUrl ?? '')
    setCurrency(trip?.localCurrency ?? 'HKD')
    if (exp.customSplit) {
      setIsCustomSplit(true)
      const ca: Record<string, string> = {}
      Object.entries(exp.customSplit).forEach(([k, v]) => { ca[k] = v.toString() })
      setCustomAmounts(ca)
    } else {
      setIsCustomSplit(false); setCustomAmounts({})
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !trip) return
    const filePath = `public/${trip.id}/receipts/${uuidv4()}-${file.name}`
    const { error } = await supabase.storage.from('trip_files').upload(filePath, file)
    if (error) { setAlertMsg(error.message); return }
    const { data: { publicUrl } } = supabase.storage.from('trip_files').getPublicUrl(filePath)
    setReceiptUrl(publicUrl)
  }

  const distributeEvenly = () => {
    if (!amount || splitWith.length === 0) return
    const splitAmt = (Number(amount) / splitWith.length).toFixed(0)
    const newMap: Record<string, string> = {}
    splitWith.forEach(id => { newMap[id] = splitAmt })
    setCustomAmounts(newMap)
  }

  const debts = useMemo(() => {
    const balances: Record<string, number> = {}
    trip.members.forEach(m => { balances[m.id] = 0 })
    trip.expenses.forEach(exp => {
      const paidBy = exp.payerId
      if (exp.customSplit) {
        balances[paidBy] = (balances[paidBy] ?? 0) + exp.amount
        Object.entries(exp.customSplit).forEach(([mid, amt]) => {
          balances[mid] = (balances[mid] ?? 0) - amt
        })
      } else {
        const splitCount = exp.splitWithIds.length
        if (splitCount === 0) return
        const splitAmount = exp.amount / splitCount
        balances[paidBy] = (balances[paidBy] ?? 0) + exp.amount
        exp.splitWithIds.forEach(uid => {
          balances[uid] = (balances[uid] ?? 0) - splitAmount
        })
      }
    })
    const result: { from: string; to: string; amount: number }[] = []
    const debtors   = Object.entries(balances).filter(([, val]) => val < -0.1).sort((a, b) => a[1] - b[1])
    const creditors = Object.entries(balances).filter(([, val]) => val > 0.1).sort((a, b) => b[1] - a[1])
    let i = 0, j = 0
    while (i < debtors.length && j < creditors.length) {
      const amount = Math.min(Math.abs(debtors[i][1]), creditors[j][1])
      result.push({ from: debtors[i][0], to: creditors[j][0], amount })
      debtors[i][1]   += amount
      creditors[j][1] -= amount
      if (Math.abs(debtors[i][1])   < 0.1) i++
      if (Math.abs(creditors[j][1]) < 0.1) j++
    }
    return result
  }, [trip.expenses, trip.members])

  const catStats = trip.expenses.reduce((acc, cur) => {
    acc[cur.category] = (acc[cur.category] ?? 0) + cur.amount
    return acc
  }, {} as Record<string, number>)

  const chartData = Object.keys(catStats).map(k => ({ name: k, value: catStats[k] }))
  const getMemberName = (id: string) => trip.members.find(m => m.id === id)?.name ?? 'Unknown'

  // Shared props for FormContent
  const formProps: FormContentProps = {
    date, setDate, itemName, setItemName, amount, setAmount,
    currency, setCurrency,
    localCurrency: trip.localCurrency ?? 'JPY',
    rate,
    payer, setPayer, splitWith, setSplitWith,
    isCustomSplit, setIsCustomSplit, customAmounts, setCustomAmounts,
    category, setCategory, receiptUrl,
    members: trip.members,
    onFileUpload: handleFileUpload,
    distributeEvenly,
  }

  return (
    <div className="flex min-h-screen bg-white font-sans text-jp-charcoal">
      <Sidebar />
      <main className="flex-1 min-w-0 ml-0 md:ml-64 p-5 sm:p-8 md:p-12 overflow-y-auto h-screen bg-gray-50 pb-24">

        {/* Header */}
        <header className="mb-10">
          <h1 className="text-3xl font-serif font-bold tracking-widest uppercase mb-2">預算分帳</h1>
          <div className="flex items-center gap-4"><TripSwitcher /></div>
        </header>

        {/* Settlement */}
        {debts.length > 0 && (
          <div className="mb-10">
            <h2 className="text-xs font-bold tracking-[0.2em] text-gray-500 uppercase mb-4">結算建議</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {debts.map((d, idx) => (
                <div key={idx} className="bg-white p-6 border-l-4 border-jp-charcoal flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-bold">{getMemberName(d.from)}</span>
                    <ArrowRight size={14} className="text-gray-500" />
                    <span className="font-bold">{getMemberName(d.to)}</span>
                  </div>
                  <span className="font-serif text-xl font-bold">
                    {getCurrencySymbol(trip.localCurrency)}{Math.round(d.amount).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-6 mb-10">
          <div
            className="col-span-2 md:col-span-1 bg-jp-charcoal text-white p-6 relative group cursor-pointer"
            onClick={() => { setTempBudget(trip.budgetTotal.toString()); setIsEditingBudget(true) }}
          >
            <p className="text-xs tracking-widest opacity-60 uppercase">
              總預算 <Edit size={10} className="inline ml-1 opacity-50 group-hover:opacity-100" />
            </p>
            {isEditingBudget ? (
              <div className="flex items-center gap-2 mt-2">
                <input
                  autoFocus
                  className="text-black px-2 py-1 w-32 rounded text-lg"
                  type="number"
                  inputMode="numeric"
                  value={tempBudget}
                  onClick={e => e.stopPropagation()}
                  onChange={e => setTempBudget(e.target.value)}
                />
                <button
                  className="bg-white text-black px-2 py-1 text-xs rounded"
                  onClick={e => {
                    e.stopPropagation()
                    updateBudgetTotal(trip.id, Number(tempBudget))
                    setIsEditingBudget(false)
                  }}
                >
                  OK
                </button>
              </div>
            ) : (
              <h2 className="text-3xl font-serif font-bold">
                {getCurrencySymbol(trip.localCurrency)}{trip.budgetTotal.toLocaleString()}
              </h2>
            )}
          </div>

          <div className="bg-white p-6 border border-gray-100">
            <p className="text-xs tracking-widest text-gray-500 uppercase">已花費</p>
            <h2 className="text-3xl font-serif font-bold text-neutral-900">
              {getCurrencySymbol(trip.localCurrency)}{totalSpent.toLocaleString()}
            </h2>
          </div>

          <div className={`p-6 border border-gray-100 ${isOverBudget ? 'bg-red-500 text-white' : 'bg-white'}`}>
            <p className="text-xs tracking-widest opacity-60 uppercase">剩餘</p>
            <h2 className="text-3xl font-serif font-bold">
              {getCurrencySymbol(trip.localCurrency)}{remaining.toLocaleString()}
            </h2>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-10 bg-white p-6 border border-gray-100">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs tracking-[0.2em] text-gray-500 uppercase">預算進度</span>
            <span className="text-xs text-gray-500 font-mono">
              {trip.budgetTotal > 0 ? Math.min(Math.round((totalSpent / trip.budgetTotal) * 100), 100) : 0}%
            </span>
          </div>
          <div className="h-1 bg-gray-100 w-full rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-700" style={{
              width: `${trip.budgetTotal > 0 ? Math.min((totalSpent / trip.budgetTotal) * 100, 100) : 0}%`,
              backgroundColor: trip.budgetTotal > 0
                ? totalSpent / trip.budgetTotal > 0.85 ? '#dc2626'
                  : totalSpent / trip.budgetTotal > 0.6 ? '#d97706'
                  : '#16a34a'
                : '#16a34a',
            }} />
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {!isOverBudget
              ? trip.budgetTotal > 0 && totalSpent / trip.budgetTotal >= 0.85
                ? '🔴 接近預算上限'
                : trip.budgetTotal > 0 && totalSpent / trip.budgetTotal >= 0.6
                  ? '🟡 注意消費步伐'
                  : '💚 預算充裕'
              : '⛔ 已超出預算'}
          </p>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">

          {/* Desktop Sticky Form */}
          <div className="bg-white p-8 border border-gray-100 lg:sticky lg:top-4 lg:h-fit lg:z-10 hidden lg:block">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-serif font-bold">{editingExpenseId ? '編輯支出' : '新增支出'}</h3>
              {editingExpenseId && (
                <button
                  type="button"
                  onClick={() => { setEditingExpenseId(null); setItemName(''); setAmount(''); setReceiptUrl('') }}
                  className="text-xs text-gray-500"
                >
                  取消
                </button>
              )}
            </div>
            <FormContent {...formProps} />
            <button
              type="button"
              onClick={handleAdd}
              className="w-full bg-jp-charcoal text-white py-3 uppercase text-xs tracking-widest hover:bg-black mt-6"
            >
              {editingExpenseId ? '更新' : '新增'}
            </button>
          </div>

          {/* Right: Charts + List */}
          <div className="lg:col-span-2 space-y-8 overflow-hidden">

            {/* Pie Chart */}
            <div className="flex flex-col md:flex-row gap-8 items-center bg-white p-6 border border-gray-100">
              <div className="w-full md:w-1/2 h-[200px] md:h-[250px] relative z-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={chartData} innerRadius={60} outerRadius={80} dataKey="value">
                      {chartData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={CAT_CONFIG[entry.name as ExpenseCategory]?.color}
                          stroke="none"
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="w-full md:w-1/2 space-y-3">
                {Object.keys(catStats).map(cat => {
                  const percent = totalSpent > 0 ? Math.round((catStats[cat] / totalSpent) * 100) : 0
                  const conf = CAT_CONFIG[cat as ExpenseCategory]
                  return (
                    <div key={cat}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="flex items-center gap-2">
                          <conf.icon size={12} color={conf.color} /> {conf.label}
                        </span>
                        <span>{percent}%</span>
                      </div>
                      <div className="h-1 bg-gray-100 w-full">
                        <div className="h-full" style={{ width: `${percent}%`, backgroundColor: conf.color }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Expense List */}
            <div className="space-y-2">
              {trip.expenses.map(exp => (
                <div
                  key={exp.id}
                  className="bg-white p-4 flex justify-between items-center border-b hover:bg-gray-50 group"
                >
                  <div className="flex items-center gap-4">
                    <div className="text-xs text-gray-500 font-mono w-20">{exp.date}</div>
                    <div>
                      <p className="font-bold text-sm flex items-center gap-2">
                        {exp.itemName}
                        {exp.receiptUrl && (
                          <a href={exp.receiptUrl} target="_blank" rel="noreferrer">
                            <Paperclip size={12} />
                          </a>
                        )}
                      </p>
                      <p className="text-xs text-gray-500">
                        {CAT_CONFIG[exp.category].label} · 由 {trip.members.find(m => m.id === exp.payerId)?.name} 付
                        {exp.customSplit ? ' (自訂分攤)' : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-serif">
                      {getCurrencySymbol(trip.localCurrency)}{exp.amount.toLocaleString()}
                    </span>
                    <div className="flex gap-2 opacity-100 lg:opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={() => { handleEditExpense(exp); setIsFormOpen(true) }}
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingExpenseId(exp.id)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Mobile FAB */}
        <button
          type="button"
          onClick={() => {
            setEditingExpenseId(null); setItemName(''); setAmount('')
            setReceiptUrl(''); setIsFormOpen(true)
          }}
          className="fixed bottom-24 right-5 lg:hidden w-14 h-14 bg-[#1a1a1a] text-white rounded-full border border-gray-200 flex items-center justify-center z-40 active:scale-95 transition-transform"
          aria-label="新增支出"
        >
          <span className="text-2xl leading-none">+</span>
        </button>

        {/* Mobile Bottom Sheet */}
        {isFormOpen && (
          <>
            <div
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden"
              onClick={() => { setIsFormOpen(false); setEditingExpenseId(null) }}
            />
            <div className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-white rounded-t-2xl border border-gray-200 max-h-[90dvh] overflow-y-auto">
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 bg-gray-200 rounded-full" />
              </div>
              <div className="p-6 pb-10">
                <div className="flex justify-between items-center mb-5">
                  <h3 className="font-serif font-bold text-lg">{editingExpenseId ? '編輯支出' : '新增支出'}</h3>
                  <button
                    type="button"
                    onClick={() => { setIsFormOpen(false); setEditingExpenseId(null) }}
                    className="text-xs text-gray-500 border border-gray-200 px-3 py-1 rounded-full"
                  >
                    關閉
                  </button>
                </div>
                <FormContent {...formProps} />
                <button
                  type="button"
                  onClick={() => { handleAdd(); setIsFormOpen(false) }}
                  className="w-full bg-[#1a1a1a] text-white py-3.5 uppercase text-xs tracking-widest hover:bg-[#111] rounded-none mt-6"
                >
                  {editingExpenseId ? '更新' : '新增'}
                </button>
              </div>
            </div>
          </>
        )}

      </main>

      <ConfirmDialog
        isOpen={!!deletingExpenseId}
        title="刪除支出"
        message="確定要刪除此支出？"
        confirmLabel="刪除"
        cancelLabel="取消"
        danger
        onConfirm={() => {
          if (deletingExpenseId) deleteExpense(trip.id, deletingExpenseId)
          setDeletingExpenseId(null)
        }}
        onCancel={() => setDeletingExpenseId(null)}
      />
      <AlertDialog
        isOpen={!!alertMsg}
        message={alertMsg ?? ''}
        onClose={() => setAlertMsg(null)}
      />
    </div>
  )
}
