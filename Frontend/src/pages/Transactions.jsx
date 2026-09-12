import { useState } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  X,
  Wallet,
  ArrowUpCircle,
  ArrowDownCircle,
  Briefcase,
  Utensils,
  Car,
  ShoppingBag,
  Zap,
} from 'lucide-react';

// Custom Thai Baht Icon (รองรับ props เหมือน Lucide Icons)
const ThaiBaht = ({ size = 24, className = '', ...props }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <line x1="12" y1="3" x2="12" y2="21" />
    <path d="M8 6h5a3.5 3.5 0 0 1 0 7H8z" />
    <path d="M8 13h5.5a3.5 3.5 0 0 1 0 7H8z" />
  </svg>
);

// 1. แมป Category ID และชื่อหมวดหมู่ตามตาราง categories (ข้อ 5)
const CATEGORIES = [
  { id: 3001, name: 'เงินเดือน', type: 'Income', icon: ThaiBaht }, // 👈 เปลี่ยนเป็น ThaiBaht
  { id: 3002, name: 'งานเสริม', type: 'Income', icon: Briefcase },
  { id: 3003, name: 'อาหารและเครื่องดื่ม', type: 'Expense', icon: Utensils },
  { id: 3004, name: 'การเดินทาง', type: 'Expense', icon: Car },
  { id: 3005, name: 'ช้อปปิ้ง', type: 'Expense', icon: ShoppingBag },
  { id: 3006, name: 'ค่าสาธารณูปโภค', type: 'Expense', icon: Zap },
];

// 2. ข้อมูลเริ่มต้นตามตาราง transactions (ข้อ 4)
const INITIAL_TRANSACTIONS = [
  {
    transaction_id: 4001,
    category_id: 3001,
    amount: 35000,
    transaction_type: 'Income',
    transaction_date: '2026-08-01',
    transaction_time: '08:30:00',
    description: 'เงินเดือนเข้า',
  },
  {
    transaction_id: 4002,
    category_id: 3003,
    amount: 180,
    transaction_type: 'Expense',
    transaction_date: '2026-08-02',
    transaction_time: '12:15:00',
    description: 'ข้าวกลางวัน',
  },
  {
    transaction_id: 4003,
    category_id: 3004,
    amount: 500,
    transaction_type: 'Expense',
    transaction_date: '2026-08-03',
    transaction_time: '07:45:00',
    description: 'เติมน้ำมัน',
  },
  {
    transaction_id: 4004,
    category_id: 3005,
    amount: 1200,
    transaction_type: 'Expense',
    transaction_date: '2026-08-05',
    transaction_time: '19:20:00',
    description: 'ซื้อเสื้อผ้าชุดใหม่',
  },
  {
    transaction_id: 4005,
    category_id: 3006,
    amount: 2300,
    transaction_type: 'Expense',
    transaction_date: '2026-08-08',
    transaction_time: '10:00:00',
    description: 'ค่าไฟประจำเดือน',
  },
];

const INITIAL_FORM = {
  amount: '',
  category_id: '',
  description: '',
  transaction_date: '',
};

const formatMoney = (amount) => {
  return new Intl.NumberFormat('th-TH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

const formatDateToThai = (dateString) => {
  if (!dateString) return '-';
  const dateObj = new Date(dateString);
  return dateObj.toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

function Transactions() {
  const [showForm, setShowForm] = useState(false);
  const [transactionType, setTransactionType] = useState('Expense');
  const [transactions, setTransactions] = useState(INITIAL_TRANSACTIONS);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(INITIAL_FORM);

  // คำนวณสรุปยอด
  const incomeTotal = transactions
    .filter((item) => item.transaction_type === 'Income')
    .reduce((sum, item) => sum + item.amount, 0);

  const expenseTotal = transactions
    .filter((item) => item.transaction_type === 'Expense')
    .reduce((sum, item) => sum + item.amount, 0);

  const balance = incomeTotal - expenseTotal;

  // กรอง Category ตาม ประเภทรายการ (Income / Expense)
  const availableCategories = CATEGORIES.filter(
    (cat) => cat.type === transactionType
  );

  const handleOpenForm = (transaction = null) => {
    if (transaction) {
      setEditingId(transaction.transaction_id);
      setTransactionType(transaction.transaction_type);
      setForm({
        amount: transaction.amount,
        category_id: transaction.category_id,
        description: transaction.description || '',
        transaction_date: transaction.transaction_date,
      });
    } else {
      setEditingId(null);
      setTransactionType('Expense');
      setForm(INITIAL_FORM);
    }
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(INITIAL_FORM);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!form.amount || !form.category_id) return;

    const now = new Date();
    const currentDate = form.transaction_date || now.toISOString().split('T')[0];
    const currentTime = now.toTimeString().split(' ')[0];

    if (editingId) {
      setTransactions((prev) =>
        prev.map((item) =>
          item.transaction_id === editingId
            ? {
                ...item,
                transaction_type: transactionType,
                category_id: Number(form.category_id),
                amount: Number(form.amount),
                transaction_date: currentDate,
                description: form.description || '-',
              }
            : item
        )
      );
    } else {
      const newTransaction = {
        transaction_id: Date.now(),
        category_id: Number(form.category_id),
        amount: Number(form.amount),
        transaction_type: transactionType,
        transaction_date: currentDate,
        transaction_time: currentTime,
        description: form.description || '-',
      };
      setTransactions((prev) => [newTransaction, ...prev]);
    }

    handleCloseForm();
  };

  const handleDelete = (id) => {
    if (window.confirm('คุณต้องการลบรายการนี้ใช่หรือไม่?')) {
      setTransactions((prev) => prev.filter((item) => item.transaction_id !== id));
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div>
            <p className="text-sm font-medium text-cyan-600">KaneChō Database Sync</p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">รายรับ - รายจ่าย</h1>
          </div>

          <button
            onClick={() => handleOpenForm()}
            className="flex items-center gap-2 rounded-xl bg-cyan-500 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-cyan-600"
          >
            <Plus size={19} />
            เพิ่มรายการ
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-6xl px-6 py-8">
        {/* Dashboard */}
        <section className="grid gap-5 md:grid-cols-3">
          <div className="rounded-3xl bg-gradient-to-br from-cyan-500 to-cyan-600 p-6 text-white shadow-lg md:col-span-1">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-white/20 p-2">
                <Wallet size={21} />
              </div>
              <p className="text-sm font-medium text-cyan-50">ยอดคงเหลือรวม</p>
            </div>
            <p className="mt-6 text-3xl font-bold">฿{formatMoney(balance)}</p>
            <p className="mt-2 text-sm text-cyan-100">คำนวณจากประวัติการทำรายการ</p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">รายรับทั้งหมด</p>
                <p className="mt-3 text-2xl font-bold text-green-600">+฿{formatMoney(incomeTotal)}</p>
              </div>
              <div className="rounded-2xl bg-green-50 p-3 text-green-600">
                <ArrowUpCircle size={25} />
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">รายจ่ายทั้งหมด</p>
                <p className="mt-3 text-2xl font-bold text-red-500">-฿{formatMoney(expenseTotal)}</p>
              </div>
              <div className="rounded-2xl bg-red-50 p-3 text-red-500">
                <ArrowDownCircle size={25} />
              </div>
            </div>
          </div>
        </section>

        {/* History List */}
        <section className="mt-8 rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
            <div>
              <h2 className="text-lg font-bold text-slate-900">ประวัติรายการ (Transactions)</h2>
              <p className="mt-1 text-sm text-slate-500">ซิงค์โครงสร้างตามตาราง database.pdf</p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">
              {transactions.length} รายการ
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            {transactions.map((item) => {
              const category = CATEGORIES.find((c) => c.id === item.category_id);
              const IconComponent = category?.icon || Wallet;
              const isIncome = item.transaction_type === 'Income';

              return (
                <div
                  key={item.transaction_id}
                  className="group flex items-center gap-4 px-6 py-5 transition hover:bg-slate-50"
                >
                  <div
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
                      isIncome ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'
                    }`}
                  >
                    <IconComponent size={21} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-800">
                      {category?.name || 'ไม่ระบุหมวดหมู่'}
                    </p>
                    <p className="mt-1 truncate text-sm text-slate-500">{item.description}</p>
                    <p className="mt-1 text-xs text-slate-400">
                      {formatDateToThai(item.transaction_date)} • {item.transaction_time || '00:00'}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className={`font-bold ${isIncome ? 'text-green-600' : 'text-red-500'}`}>
                      {isIncome ? '+' : '-'}฿{formatMoney(item.amount)}
                    </p>
                  </div>

                  <div className="flex gap-2 opacity-100 md:opacity-0 md:transition md:group-hover:opacity-100">
                    <button
                      onClick={() => handleOpenForm(item)}
                      className="rounded-lg p-2 text-slate-400 transition hover:bg-cyan-50 hover:text-cyan-600"
                      title="แก้ไข"
                    >
                      <Pencil size={17} />
                    </button>
                    <button
                      onClick={() => handleDelete(item.transaction_id)}
                      className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-500"
                      title="ลบ"
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>

      {/* Modal Form */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  {editingId ? 'แก้ไขรายการ' : 'เพิ่มรายการ'}
                </h2>
                <p className="mt-1 text-sm text-slate-500">บันทึกข้อมูลเข้าตาราง transactions</p>
              </div>
              <button
                onClick={handleCloseForm}
                className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5 p-6">
              {/* Type Switcher */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">ประเภทรายการ</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setTransactionType('Income');
                      setForm({ ...form, category_id: '' });
                    }}
                    className={`rounded-xl border px-4 py-3 text-sm font-semibold transition ${
                      transactionType === 'Income'
                        ? 'border-green-500 bg-green-50 text-green-600'
                        : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    ↑ รายรับ (Income)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTransactionType('Expense');
                      setForm({ ...form, category_id: '' });
                    }}
                    className={`rounded-xl border px-4 py-3 text-sm font-semibold transition ${
                      transactionType === 'Expense'
                        ? 'border-red-500 bg-red-50 text-red-500'
                        : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    ↓ รายจ่าย (Expense)
                  </button>
                </div>
              </div>

              {/* Amount Input */}
              <div>
                <label htmlFor="amount" className="mb-2 block text-sm font-semibold text-slate-700">
                  จำนวนเงิน (amount)
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-medium text-slate-400">฿</span>
                  <input
                    id="amount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    placeholder="0.00"
                    className="w-full rounded-xl border border-slate-200 py-3 pl-9 pr-4 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10"
                    required
                  />
                </div>
              </div>

              {/* Category Select */}
              <div>
                <label htmlFor="category" className="mb-2 block text-sm font-semibold text-slate-700">
                  หมวดหมู่ (category_id)
                </label>
                <select
                  id="category"
                  value={form.category_id}
                  onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10"
                  required
                >
                  <option value="">เลือกหมวดหมู่</option>
                  {availableCategories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name} (ID: {cat.id})
                    </option>
                  ))}
                </select>
              </div>

              {/* Date Input */}
              <div>
                <label htmlFor="date" className="mb-2 block text-sm font-semibold text-slate-700">
                  วันที่ (transaction_date)
                </label>
                <input
                  id="date"
                  type="date"
                  value={form.transaction_date}
                  onChange={(e) => setForm({ ...form, transaction_date: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10"
                />
              </div>

              {/* Description Input */}
              <div>
                <label htmlFor="description" className="mb-2 block text-sm font-semibold text-slate-700">
                  รายละเอียด (description)
                </label>
                <textarea
                  id="description"
                  rows="3"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="รายละเอียดเพิ่มเติม..."
                  className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleCloseForm}
                  className="flex-1 rounded-xl border border-slate-200 px-4 py-3 font-semibold text-slate-600 transition hover:bg-slate-50"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-cyan-500 px-4 py-3 font-semibold text-white transition hover:bg-cyan-600"
                >
                  {editingId ? 'บันทึกการแก้ไข' : 'บันทึกรายการ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Transactions;