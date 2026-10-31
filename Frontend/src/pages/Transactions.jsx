import { useEffect, useMemo, useState, useRef } from 'react';
import {
  ArrowDownCircle,
  ArrowUpCircle,
  CalendarDays,
  Image as ImageIcon,
  LoaderCircle,
  Pencil,
  Plus,
  Search,
  Trash2,
  Upload,
  X,
} from 'lucide-react';

import CustomHeader from '../components/CustomHeader';
import Navbar from '../components/Navbar';
import './Transactions.css';


const emptyForm = () => ({
  transaction_type: 'expense',
  amount: '',
  item_name: '',
  category: '',
  // receipt: null,
  account: '',
  transaction_date: getTodayString(),
  transaction_time: new Date().toTimeString().slice(0, 5),
  description: '',
});

const getTodayString = () => {
  const today = new Date();

  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');

  // รูปแบบภายในระบบ: YYYY-MM-DD
  return `${year}-${month}-${day}`;
};


function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [showMoreCategories, setShowMoreCategories] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [addingCategory, setAddingCategory] = useState(false);
  const [categorySaving, setCategorySaving] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterDate, setFilterDate] = useState(getTodayString);
  const [period, setPeriod] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [listCategories, setListCategories] = useState([]);
  const [showAll, setShowAll] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const initialFormRef = useRef(null);
  const [editingId, setEditingId] = useState(null);

  const [form, setForm] = useState(emptyForm);

  // รูปใบเสร็จที่ผู้ใช้เลือกใหม่
  const [receiptFile, setReceiptFile] = useState(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrMessage, setOcrMessage] = useState('');

  // URL สำหรับ preview รูป
  const [receiptPreview, setReceiptPreview] = useState('');

  const dateInputRef = useRef(null);

  const accessToken = sessionStorage.getItem('accessToken');


  const formatMoney = (value) =>
    Number(value || 0).toLocaleString('th-TH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });


  const formatDate = (date) => {
    if (!date) return '-';

    return new Date(`${date}T00:00:00`).toLocaleDateString('th-TH', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };


  async function fetchTransactions() {
    if (!accessToken) {
      setError('ไม่พบข้อมูลการเข้าสู่ระบบ');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError('');

      const response = await fetch('/transactions/',
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(
          response.status === 401
            ? 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่'
            : 'ไม่สามารถโหลดรายการรายรับ-รายจ่ายได้'
        );
      }

      const data = await response.json();

      setTransactions(
        Array.isArray(data) ? data : []
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }


  async function fetchCategories(type) {
    if (!accessToken) return;

    try {
      const response = await fetch(
        `/categories/?transaction_type=${type}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('ไม่สามารถโหลดหมวดหมู่ได้');
      }

      const data = await response.json();

      setCategories(
        Array.isArray(data) ? data : []
      );
    } catch (err) {
      setCategories([]);
      setError(err.message);
    }
  }


  useEffect(() => {
    fetchTransactions();
  }, []);

  // ดึงหมวดหมู่สำหรับตัวกรองรายการ โดยแยกจากหมวดหมู่ในฟอร์ม
  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;
    async function loadCategories() {
      try {
        const types = ['income', 'expense'];
        const groups = await Promise.all(types.map(async (type) => {
          const response = await fetch(`/categories/?transaction_type=${type}`, {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          if (!response.ok) throw new Error('โหลดหมวดหมู่สำหรับตัวกรองไม่สำเร็จ');
          const data = await response.json();
          return (Array.isArray(data) ? data : []).map((item) => ({ ...item, transaction_type: type }));
        }));
        if (!cancelled) setListCategories(groups.flat());
      } catch (err) {
        console.error(err);
      }
    }
    loadCategories();
    return () => { cancelled = true; };
  }, [accessToken]);




  // เปิดรายการที่บันทึกแล้วจากลิงก์ใน LINE OA
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('transaction');
    if (!id) return;
    if (!/^\d+$/.test(id)) {
      setError('ลิงก์รายการไม่ถูกต้อง');
      return;
    }
    if (!accessToken) {
      setError('กรุณาเข้าสู่ระบบด้วยบัญชีที่เชื่อมกับ LINE ก่อน');
      return;
    }

    let cancelled = false;
    async function loadTransaction() {
      try {
        const response = await fetch(`/transactions/${id}/`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || 'ไม่สามารถโหลดรายการได้');
        if (!cancelled) openEdit(data);
      } catch (err) {
        if (!cancelled) setError(err.message);
      }
    }
    loadTransaction();
    return () => { cancelled = true; };
  }, [accessToken]);

  useEffect(() => {
    if (showModal) {
      fetchCategories(form.transaction_type);
    }
  }, [showModal, form.transaction_type]);


  useEffect(() => {
    return () => {
      if (
        receiptPreview &&
        receiptPreview.startsWith('blob:')
      ) {
        URL.revokeObjectURL(receiptPreview);
      }
    };
  }, [receiptPreview]);


  const toDate = (value) => new Date(`${value}T12:00:00`);
  const toISODate = (date) => [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');

  const selectedDate = toDate(filterDate);
  const periodRange = useMemo(() => {
    if (period === 'all') return null;
    const start = toDate(filterDate);
    const end = toDate(filterDate);
    if (period === 'week') {
      const mondayOffset = (start.getDay() + 6) % 7;
      start.setDate(start.getDate() - mondayOffset);
      end.setTime(start.getTime());
      end.setDate(start.getDate() + 6);
    } else if (period === 'month') {
      start.setDate(1);
      end.setMonth(start.getMonth() + 1, 0);
    } else if (period === 'year') {
      start.setMonth(0, 1);
      end.setMonth(11, 31);
    }
    return [toISODate(start), toISODate(end)];
  }, [period, filterDate]);

  const matchesPeriod = (transaction) => !periodRange || (
    transaction.transaction_date >= periodRange[0] &&
    transaction.transaction_date <= periodRange[1]
  );

  // ยอดรวมขึ้นกับช่วงเวลาเท่านั้น ไม่ขึ้นกับประเภท/หมวดหมู่/คำค้นหา
  const summaryTransactions = useMemo(
    () => transactions.filter(matchesPeriod),
    [transactions, periodRange]
  );
  const summary = useMemo(() => summaryTransactions.reduce((result, item) => {
    if (item.transaction_type === 'income' || item.transaction_type === 'expense') {
      result[item.transaction_type] += Number(item.amount || 0);
    }
    return result;
  }, { income: 0, expense: 0 }), [summaryTransactions]);
  const balance = summary.income - summary.expense;

  const availableCategories = useMemo(() => listCategories.filter(
    (item) => filterType === 'all' || item.transaction_type === filterType
  ), [listCategories, filterType]);

  const filtered = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return transactions.filter((transaction) => {
      const typeMatched = filterType === 'all' || transaction.transaction_type === filterType;
      const dateMatched = matchesPeriod(transaction);
      const categoryMatched = filterCategory === 'all' || (
        `${transaction.transaction_type}:${transaction.category}` === filterCategory
      );
      const text = [transaction.item_name, transaction.description, transaction.category_name,
        transaction.account, transaction.amount].filter(Boolean).join(' ').toLowerCase();
      return typeMatched && dateMatched && categoryMatched && (!keyword || text.includes(keyword));
    });
  }, [transactions, filterType, filterCategory, periodRange, search]);

  function changePeriod(next) {
    setPeriod(next);
    setShowAll(false);
  }

  function moveDate(direction) {
    const date = toDate(filterDate);
    if (period === 'day') date.setDate(date.getDate() + direction);
    if (period === 'week') date.setDate(date.getDate() + 7 * direction);
    if (period === 'month') date.setMonth(date.getMonth() + direction);
    if (period === 'year') date.setFullYear(date.getFullYear() + direction);
    setFilterDate(toISODate(date));
    setShowAll(false);
  }

  const dateLabel = () => {
    if (period === 'all') return 'ทุกช่วงเวลา';
    if (period === 'day') return selectedDate.toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' });
    if (period === 'week') return `${formatDate(periodRange[0])} – ${formatDate(periodRange[1])}`;
    if (period === 'month') return selectedDate.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' });
    return selectedDate.toLocaleDateString('th-TH', { year: 'numeric' });
  };
  const periodDescription = period === 'all' ? 'ทุกช่วงเวลา' : dateLabel();
  const visibleTransactions = showAll ? filtered : filtered.slice(0, 5);

  function clearReceiptPreview() {
    if (
      receiptPreview &&
      receiptPreview.startsWith('blob:')
    ) {
      URL.revokeObjectURL(receiptPreview);
    }

    setReceiptFile(null);
    setReceiptPreview('');
  }


  function openAdd() {
    setEditingId(null);
    setError('');
    setSuccess('');

    clearReceiptPreview();
    setOcrMessage('');

    const initialForm = emptyForm();
    initialFormRef.current = initialForm;
    setForm(initialForm);
    setShowExitConfirm(false);
    setShowMoreCategories(false);
    setAddingCategory(false);
    setNewCategoryName('');
    setShowModal(true);
  }


  function openEdit(transaction) {
    setEditingId(transaction.id);

    setError('');
    setSuccess('');

    if (
      receiptPreview &&
      receiptPreview.startsWith('blob:')
    ) {
      URL.revokeObjectURL(receiptPreview);
    }

    setReceiptFile(null);
    setOcrMessage('');

    // แสดงรูปเดิมตอนแก้ไข
    setReceiptPreview(
      transaction.receipt_url || ''
    );

    const initialForm = {
      transaction_type:
        transaction.transaction_type || 'expense',

      amount:
        transaction.amount || '',

      item_name:
        transaction.item_name || '',

      category:
        transaction.category || '',

      account:
        transaction.account || '',

      transaction_date:
        transaction.transaction_date ||
        new Date().toISOString().split('T')[0],

      transaction_time:
        transaction.transaction_time
          ? transaction.transaction_time.slice(0, 5)
          : '',

      description:
        transaction.description || '',
    };
    initialFormRef.current = initialForm;
    setForm(initialForm);
    setShowExitConfirm(false);

    setShowMoreCategories(false);
    setAddingCategory(false);
    setNewCategoryName('');
    setShowModal(true);
  }


  function closeModal() {
    if (saving || ocrLoading) return;

    // เตือนเฉพาะเมื่อมีการแก้ไขข้อมูลหรือเลือกรูปใหม่
    const hasChanges =
      JSON.stringify(form) !== JSON.stringify(initialFormRef.current) ||
      receiptFile !== null ||
      newCategoryName.trim() !== '';

    if (hasChanges) {
      setShowExitConfirm(true);
      return;
    }

    discardAndClose();
  }

  function discardAndClose() {
    setShowExitConfirm(false);

    if (
      receiptPreview &&
      receiptPreview.startsWith('blob:')
    ) {
      URL.revokeObjectURL(receiptPreview);
    }

    setReceiptFile(null);
    setReceiptPreview('');

    setShowModal(false);
    setEditingId(null);
    const url = new URL(window.location.href);
    url.searchParams.delete('transaction');
    window.history.replaceState({}, '', url.pathname + url.search + url.hash);
  }


  function change(event) {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  }


  function setType(type) {
    setForm((current) => ({
      ...current,
      transaction_type: type,
      category: '',
    }));
  }


  const visibleCategories = categories;

  async function addCategory() {
    const name = newCategoryName.trim();
    if (!name) { setError('กรุณาระบุชื่อหมวดหมู่'); return; }
    if (name.length > 100) { setError('ชื่อหมวดหมู่ต้องไม่เกิน 100 ตัวอักษร'); return; }
    try {
      setCategorySaving(true);
      setError('');
      const response = await fetch('/categories/', {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, transaction_type: form.transaction_type }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const detail = data.error || data.detail || data.name?.[0] ||
          `เพิ่มหมวดหมู่ไม่สำเร็จ (HTTP ${response.status})`;
        throw new Error(response.status === 405
          ? 'API /categories/ ไม่รองรับ POST (405) กรุณาตรวจสอบ Vercel rewrite และ Backend ที่เชื่อมต่อ'
          : typeof detail === 'string' ? detail : JSON.stringify(detail));
      }
      if (data.id == null) throw new Error('Backend ไม่ส่ง ID ของหมวดหมู่ที่สร้างกลับมา');
      // เพิ่มในหน้าจอทันที โดยไม่ต้องรอ GET รอบใหม่
      const created = { ...data, name: data.name || name, transaction_type: form.transaction_type };
      setCategories((current) => current.some((item) => String(item.id) === String(created.id))
        ? current : [...current, created]);
      setListCategories((current) => current.some((item) =>
        String(item.id) === String(created.id) && item.transaction_type === created.transaction_type)
        ? current : [...current, created]);
      setForm((current) => ({ ...current, category: created.id }));
      setNewCategoryName('');
      setAddingCategory(false);
      setSuccess('เพิ่มหมวดหมู่เรียบร้อยแล้ว');
    } catch (err) { setError(err.message); }
    finally { setCategorySaving(false); }
  }

  // OCR reads a receipt but never saves a transaction automatically.
  async function scanReceipt(file) {
    setOcrLoading(true);
    setOcrMessage('');

    try {
      const token = sessionStorage.getItem('accessToken');
      if (!token) throw new Error('กรุณาเข้าสู่ระบบใหม่');

      const payload = new FormData();
      payload.append('image', file);

      const response = await fetch('/transactions/ocr/', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: payload,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(response.status === 401
          ? 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่'
          : data.error || data.detail ||
            `อ่านใบเสร็จไม่สำเร็จ (HTTP ${response.status})`);
      }

      setForm((current) => {
        const updated = {
          ...current,
          transaction_type: 'expense',
          account: '',
        };

        if (data.amount != null && Number(data.amount) > 0) {
          updated.amount = String(data.amount);
        }
        if (data.transaction_datetime) {
          const [date, time] = data.transaction_datetime.split(' ');
          if (date) updated.transaction_date = date;
          updated.transaction_time = time?.slice(0, 5) || '';
        }
        if (data.memo) {
          updated.description = data.memo;
        }
        return updated;
      });

      setOcrMessage(data.amount_status === 'estimated_from_items'
        ? 'OCR ประมาณยอดจากรายการสินค้า กรุณาตรวจสอบก่อนบันทึก'
        : 'อ่านใบเสร็จแล้ว กรุณาตรวจสอบยอดเงินและวันที่ก่อนบันทึก');
    } catch (err) {
      setOcrMessage(err.message);
    } finally {
      setOcrLoading(false);
    }
  }

  function handleReceiptChange(event) {
    const file = event.target.files?.[0];

    if (!file) return;

    const allowedTypes = [
      'image/jpeg',
      'image/png',
    ];

    if (!allowedTypes.includes(file.type)) {
      setError(
        'กรุณาเลือกไฟล์ JPG หรือ PNG เท่านั้น'
      );

      event.target.value = '';
      return;
    }

    const maxSize =
      5 * 1024 * 1024;

    if (file.size > maxSize) {
      setError(
        'รูปใบเสร็จต้องมีขนาดไม่เกิน 5 MB'
      );

      event.target.value = '';
      return;
    }

    if (
      receiptPreview &&
      receiptPreview.startsWith('blob:')
    ) {
      URL.revokeObjectURL(receiptPreview);
    }

    setError('');
    setReceiptFile(file);

    setReceiptPreview(
      URL.createObjectURL(file)
    );

    scanReceipt(file);
  }


  function removeSelectedReceipt() {
    setOcrMessage('');
    if (
      receiptPreview &&
      receiptPreview.startsWith('blob:')
    ) {
      URL.revokeObjectURL(receiptPreview);
    }

    setReceiptFile(null);
    setReceiptPreview('');
  }


  async function submit(event) {
    event.preventDefault();

    if (!accessToken) {
      setError(
        'ไม่พบข้อมูลการเข้าสู่ระบบ'
      );
      return;
    }

    if (
      !form.amount ||
      Number(form.amount) <= 0
    ) {
      setError(
        'กรุณาระบุจำนวนเงินมากกว่า 0'
      );
      return;
    }

    const payload = new FormData();

    payload.append(
      'transaction_type',
      form.transaction_type
    );

    payload.append(
      'amount',
      form.amount
    );

    payload.append('item_name', form.item_name.trim());

    payload.append(
      'transaction_date',
      form.transaction_date
    );

    payload.append(
      'description',
      form.description.trim()
    );

    payload.append(
      'account',
      form.account.trim()
    );

    if (form.category) {
      payload.append(
        'category',
        form.category
      );
    }

    if (form.transaction_time) {
      payload.append(
        'transaction_time',
        form.transaction_time
      );
    }

    // ส่งรูปเฉพาะเมื่อเลือกรูปใหม่
    if (receiptFile) {
      payload.append(
        'receipt',
        receiptFile
      );
    }

    try {
      setSaving(true);
      setError('');
      setSuccess('');

      const wasEditing = Boolean(editingId);
      const response = await fetch(
        editingId ? `/transactions/${editingId}/` : '/transactions/',
        {
          method: editingId ? 'PATCH' : 'POST',
          headers: { Authorization: `Bearer ${accessToken}` },
          body: payload,
        }
      );

      const data =
        await response
          .json()
          .catch(() => ({}));

      if (!response.ok) {
        const firstError =
          Object.values(data)?.[0];

        let message =
          'ไม่สามารถบันทึกรายการได้';

        if (response.status === 401) {
          message =
            'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่';
        } else if (
          Array.isArray(firstError)
        ) {
          message =
            firstError[0];
        } else if (
          typeof firstError === 'string'
        ) {
          message =
            firstError;
        }

        throw new Error(message);
      }

      const url = new URL(window.location.href);
      url.searchParams.delete('transaction');
      window.history.replaceState({}, '', url.pathname + url.search + url.hash);
      setShowModal(false);
      setShowExitConfirm(false);
      setEditingId(null);

      if (
        receiptPreview &&
        receiptPreview.startsWith('blob:')
      ) {
        URL.revokeObjectURL(receiptPreview);
      }

      setReceiptFile(null);
      setReceiptPreview('');

      setSuccess(wasEditing ? 'แก้ไขรายการเรียบร้อยแล้ว' : 'เพิ่มรายการเรียบร้อยแล้ว');

      await fetchTransactions();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }


  async function remove(transaction) {
    const label =
      transaction.item_name ||
      transaction.category_name ||
      'รายการนี้';

    const confirmed =
      window.confirm(
        `ต้องการลบ "${label}" หรือไม่?`
      );

    if (!confirmed) return;

    try {
      const response = await fetch(
        `/transactions/${transaction.id}/`,
        {
          method: 'DELETE',

          headers: {
            Authorization:
              `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(
          response.status === 401
            ? 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่'
            : 'ไม่สามารถลบรายการได้'
        );
      }

      setTransactions((items) =>
        items.filter(
          (item) =>
            item.id !== transaction.id
        )
      );

      setSuccess(
        'ลบรายการเรียบร้อยแล้ว'
      );
    } catch (err) {
      setError(err.message);
    }
  }


  return (
    <div className="transactions-page">

      <CustomHeader
        title="รายรับ-รายจ่าย"
        color="var(--color-transactions)"
      />

      <main className="transactions-content">

        {/* Summary */}
        <section className="summary-grid">

          <div className="summary-card income">
            <div className="summary-icon">
              <ArrowDownCircle size={23} />
            </div>

            <div>
              <span>
                {period === 'all' ? 'รายรับทั้งหมด' : 'รายรับในช่วงที่เลือก'}
              </span>

              <strong>
                ฿{formatMoney(summary.income)}
              </strong>
            </div>
          </div>


          <div className="summary-card expense">
            <div className="summary-icon">
              <ArrowUpCircle size={23} />
            </div>

            <div>
              <span>
                {period === 'all' ? 'รายจ่ายทั้งหมด' : 'รายจ่ายในช่วงที่เลือก'}
              </span>

              <strong>
                ฿{formatMoney(summary.expense)}
              </strong>
            </div>
          </div>

        </section>


        <section className="balance-card">

          <div>
            <span>คงเหลือสุทธิ</span>

            <p>
              {period === 'all' ? 'รายรับทั้งหมด - รายจ่ายทั้งหมด' : `ยอดช่วง ${periodDescription}`}
            </p>
          </div>

          <strong
            className={
              balance >= 0
                ? 'positive'
                : 'negative'
            }
          >
            ฿{formatMoney(balance)}
          </strong>

        </section>


        {error && (
          <div className="transaction-message error">
            {error}
          </div>
        )}


        {success && (
          <div className="transaction-message success">
            {success}
          </div>
        )}


        {/* Search / Type / Date */}
        <section className="transaction-tools">

          <div className="transaction-search">

            <Search size={18} />

            <input
              placeholder="ค้นหารายการ หมวดหมู่ หรือบัญชี..."
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
            />

          </div>


          <div className="transaction-period-tabs" aria-label="เลือกช่วงเวลา">
            {[
              ['all', 'ทั้งหมด'], ['day', 'รายวัน'], ['week', 'สัปดาห์'],
              ['month', 'เดือน'], ['year', 'ปี'],
            ].map(([value, label]) => (
              <button type="button" key={value}
                className={period === value ? 'active' : ''}
                onClick={() => changePeriod(value)}>{label}</button>
            ))}
          </div>

          {period !== 'all' && (
            <div className="transaction-date-filter">
              <div className="date-navigation">
                <button type="button" className="date-arrow" onClick={() => moveDate(-1)} aria-label="ช่วงเวลาก่อนหน้า">‹</button>
                <div className="date-picker-column">
                  {period === 'day' && filterDate === getTodayString() && <span className="today-badge">วันนี้</span>}
                  <button type="button" className="date-picker-trigger" onClick={() => {
                    if (period === 'year') {
                      const value = window.prompt('ระบุปี พ.ศ. ที่ต้องการดู เช่น 2569', String(selectedDate.getFullYear() + 543));
                      if (value === null) return;
                      const year = Number(value);
                      if (!/^\d{4}$/.test(value.trim()) || year < 2443 || year > 2743) {
                        window.alert('กรุณาระบุปี พ.ศ. 4 หลัก ระหว่าง 2443–2743');
                        return;
                      }
                      setFilterDate(`${year - 543}-01-01`);
                      setShowAll(false);
                    } else if (dateInputRef.current?.showPicker) dateInputRef.current.showPicker();
                    else dateInputRef.current?.click();
                  }} aria-label="เลือกช่วงเวลา">
                    <CalendarDays size={17} /><strong>{dateLabel()}</strong>
                  </button>
                  <input ref={dateInputRef} type={period === 'month' ? 'month' : 'date'}
                    className="date-picker-hidden-input" aria-label="เลือกวันที่ เดือน หรือปี"
                    value={period === 'month' ? filterDate.slice(0, 7) : filterDate}
                    onChange={(event) => {
                      const value = event.target.value;
                      if (!value) return;
                      if (period === 'year') {
                        if (!/^\d{4}$/.test(value)) return;
                        setFilterDate(`${value}-01-01`);
                      } else if (period === 'month') setFilterDate(`${value}-01`);
                      else setFilterDate(value);
                      setShowAll(false);
                    }} tabIndex={-1} />
                </div>
                <button type="button" className="date-arrow" onClick={() => moveDate(1)} aria-label="ช่วงเวลาถัดไป">›</button>
              </div>
            </div>
          )}

          <div className="transaction-tabs">
            {[
              ['all', 'ทุกประเภท'], ['income', 'รายรับ'], ['expense', 'รายจ่าย'],
            ].map(([value, label]) => (
              <button type="button" key={value} className={filterType === value ? 'active' : ''}
                onClick={() => { setFilterType(value); setFilterCategory('all'); setShowAll(false); }}>
                {label}
              </button>
            ))}
          </div>


        </section>


        {/* Transaction List */}
        <section className="transaction-list">

          <div className="transaction-list-title">

            <div>

              <h2>
                {period === 'all' ? 'รายการธุรกรรม' : `รายการช่วง ${periodDescription}`}
              </h2>

              <p>
                {filtered.length} รายการ
              </p>

            </div>

            <div className="transaction-list-buttons">
              <button
                type="button"
                className="see-all-button"
                onClick={() => {
                // แสดงรายการทั้งหมดโดยไม่เปลี่ยนวันที่หรือตัวกรอง
                setShowAll((current) => !current);
                }}
              >
                {showAll ? 'แสดงน้อยลง' : 'แสดงทั้งหมด ›'}
              </button>
              <button
                type="button"
                className="desktop-add-button"
                onClick={openAdd}
              >
                <Plus size={17} />
                เพิ่มรายการ
              </button>
            </div>

          </div>


          {loading ? (

            <div className="transaction-state">

              <LoaderCircle
                className="transaction-spinner"
                size={28}
              />

              <span>
                กำลังโหลดรายการ...
              </span>

            </div>

          ) : filtered.length === 0 ? (

            <div className="transaction-state">

              <strong>
                {filterDate
                  ? 'ไม่พบรายการในวันที่เลือก'
                  : 'ยังไม่มีรายการ'}
              </strong>

              <span>
                {filterDate
                  ? 'ลองเลือกวันอื่น หรือกดดูทุกวัน'
                  : 'เพิ่มรายการใหม่ หรือส่งรายการผ่าน LINE OA'}
              </span>

            </div>

          ) : (

            <div className="transaction-card-list">

              {visibleTransactions.map((transaction) => {

                const income =
                  transaction.transaction_type ===
                  'income';

                const name =
                  transaction.item_name ||
                  transaction.category_name ||
                  (income
                    ? 'รายรับ'
                    : 'รายจ่าย');

                return (
                  <article
                    className="transaction-card"
                    key={transaction.id}
                  >

                    <div
                      className={
                        `transaction-card-icon ${income
                          ? 'income'
                          : 'expense'
                        }`
                      }
                    >
                      {income ? (
                        <ArrowDownCircle
                          size={22}
                        />
                      ) : (
                        <ArrowUpCircle
                          size={22}
                        />
                      )}
                    </div>


                    <div className="transaction-card-info">

                      <div className="transaction-card-name">
                        {name}
                      </div>

                      <div className="transaction-card-detail">

                        <span>
                          {transaction.category_name ||
                            'ไม่ระบุหมวดหมู่'}
                        </span>

                        {transaction.account && (
                          <>
                            <span className="dot">
                              •
                            </span>

                            <span>
                              {transaction.account}
                            </span>
                          </>
                        )}

                      </div>


                      <div className="transaction-card-detail small">

                        <span>
                          {formatDate(
                            transaction.transaction_date
                          )}
                        </span>

                        {transaction.transaction_time && (
                          <>
                            <span className="dot">
                              •
                            </span>

                            <span>
                              {transaction.transaction_time.slice(
                                0,
                                5
                              )}{' '}
                              น.
                            </span>
                          </>
                        )}

                      </div>


                      {transaction.receipt_url && (
                        <a
                          className="receipt-view-link"
                          href={transaction.receipt_url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <ImageIcon size={15} />
                          ดูใบเสร็จ
                        </a>
                      )}

                    </div>


                    <div className="transaction-card-right">

                      <strong
                        className={
                          income
                            ? 'amount-income'
                            : 'amount-expense'
                        }
                      >
                        {income ? '+' : '-'}
                        ฿{formatMoney(
                          transaction.amount
                        )}
                      </strong>


                      <div className="transaction-actions">

                        <button
                          type="button"
                          title="แก้ไข"
                          onClick={() =>
                            openEdit(transaction)
                          }
                        >
                          <Pencil size={16} />
                        </button>

                        <button
                          type="button"
                          className="delete"
                          title="ลบ"
                          onClick={() =>
                            remove(transaction)
                          }
                        >
                          <Trash2 size={16} />
                        </button>

                      </div>

                    </div>

                  </article>
                );
              })}

            </div>

          )}

        </section>

      </main>


      <button
        type="button"
        className="floating-add-button"
        aria-label="เพิ่มรายการ"
        onClick={openAdd}
      >
        <Plus size={25} />
      </button>


      {/* ADD / EDIT MODAL */}
      {showModal && (

        <div
          className="transaction-modal-backdrop"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeModal();
            }
          }}
        >

          <div className="transaction-modal">

            <div className="transaction-modal-header">

              <div>

                <h2>
                  {editingId
                    ? 'แก้ไขรายการ'
                    : 'เพิ่มรายการ'}
                </h2>

                <p>
                  {editingId
                    ? 'แก้ไขข้อมูลรายรับ-รายจ่าย'
                    : 'บันทึกรายรับหรือรายจ่ายของคุณ'}
                </p>

              </div>


              <button
                type="button"
                className="modal-close-button"
                onClick={closeModal}
              >
                <X size={19} />
              </button>

            </div>


            <form
              className="transaction-form"
              onSubmit={submit}
            >

              {/* ประเภท */}
              <div className="form-group full">

                <label>
                  ประเภทรายการ
                </label>

                <div className="type-buttons">

                  <button
                    type="button"
                    className={
                      `expense ${form.transaction_type ===
                        'expense'
                        ? 'active'
                        : ''
                      }`
                    }
                    onClick={() =>
                      setType('expense')
                    }
                  >
                    รายจ่าย
                  </button>


                  <button
                    type="button"
                    className={
                      `income ${form.transaction_type ===
                        'income'
                        ? 'active'
                        : ''
                      }`
                    }
                    onClick={() =>
                      setType('income')
                    }
                  >
                    รายรับ
                  </button>

                </div>

              </div>


              {/* ชื่อรายการแยกจากรายละเอียดที่ใช้จดโน้ต */}
              <div className="form-group full">
                <label htmlFor="item_name">ชื่อรายการ *</label>
                <input
                  id="item_name"
                  name="item_name"
                  type="text"
                  maxLength={200}
                  placeholder="เช่น ชาเขียว"
                  value={form.item_name}
                  onChange={change}
                  required
                />
              </div>

              {/* จำนวนเงิน */}
              <div className="form-group full">

                <label htmlFor="amount">
                  จำนวนเงิน *
                </label>

                <input
                  id="amount"
                  name="amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="0.00"
                  value={form.amount}
                  onChange={change}
                  required
                />

              </div>


              {/* เลือกหมวดหมู่แบบปุ่มข้อความ */}
              <div className="form-group full">
                <div className="category-section-heading">
                  <label>หมวดหมู่</label>
                  <button type="button" className="category-add-link"
                    onClick={() => { setAddingCategory((value) => !value); setError(''); }}>
                    <Plus size={15} /> เพิ่มหมวดหมู่
                  </button>
                </div>
                <div className="category-choice-list">
                  {visibleCategories.map((category) => (
                    <button key={category.id} type="button"
                      aria-pressed={String(form.category) === String(category.id)}
                      className={String(form.category) === String(category.id) ? 'active' : ''}
                      onClick={() => setForm((current) => ({ ...current, category: category.id }))}>
                      {category.name}
                    </button>
                  ))}
                  {categories.length === 0 && <span>ยังไม่มีหมวดหมู่</span>}
                </div>
                {addingCategory && (
                  <div className="category-create-row">
                    <input value={newCategoryName} maxLength={100} placeholder="ชื่อหมวดหมู่ใหม่"
                      onChange={(event) => setNewCategoryName(event.target.value)} />
                    <button type="button" onClick={addCategory} disabled={categorySaving || !newCategoryName.trim()}>
                      {categorySaving ? 'กำลังเพิ่ม...' : 'บันทึก'}
                    </button>
                  </div>
                )}
              </div>

              {/* บัญชี */}
              <div className="form-group full">

                <label htmlFor="account">
                  บัญชี / ช่องทาง
                </label>

                <input
                  id="account"
                  name="account"
                  placeholder="เช่น เงินสด, บัญชีธนาคาร"
                  value={form.account}
                  onChange={change}
                />

              </div>


              {/* วันที่ */}
              <div className="form-group">

                <label htmlFor="transaction_date">
                  วันที่ *
                </label>

                <input
                  id="transaction_date"
                  name="transaction_date"
                  type="date"
                  value={form.transaction_date}
                  onChange={change}
                  required
                />

              </div>


              {/* เวลา */}
              <div className="form-group">

                <label htmlFor="transaction_time">
                  เวลา
                </label>

                <input
                  id="transaction_time"
                  name="transaction_time"
                  type="time"
                  value={form.transaction_time}
                  onChange={change}
                />

              </div>


              {/* รายละเอียด พร้อมตัวนับอักษร */}
              <div className="form-group full">
                <div className="description-label-row">
                  <label htmlFor="description">รายละเอียด</label>
                  <span>{form.description.length}/100</span>
                </div>
                <input id="description" name="description" maxLength={100}
                  placeholder="เช่น ข้าวกลางวัน" value={form.description} onChange={change} />
              </div>

              {/* รูปใบเสร็จ */}
              <div className="form-group full receipt-form-group">

                <label htmlFor="receipt">
                  รูปใบเสร็จ
                </label>


                {!receiptPreview ? (

                  <label
                    htmlFor="receipt"
                    className="receipt-upload-box"
                  >

                    <Upload size={28} strokeWidth={2} className="receipt-upload-icon" />

                    <strong>
                      เลือกรูปใบเสร็จ
                    </strong>

                    <span>
                      JPG หรือ PNG ขนาดไม่เกิน 5 MB
                    </span>

                  </label>

                ) : (

                  <div className="receipt-preview">

                    <img
                      src={receiptPreview}
                      alt="ตัวอย่างใบเสร็จ"
                    />

                    <div className="receipt-preview-actions">

                      <label
                        htmlFor="receipt"
                        className="receipt-change-button"
                      >
                        <Upload size={15} />
                        เปลี่ยนรูป
                      </label>

                      <button
                        type="button"
                        className="receipt-remove-button"
                        onClick={
                          removeSelectedReceipt
                        }
                      >
                        <Trash2 size={15} />
                        ลบรูป
                      </button>

                    </div>

                  </div>

                )}


                <input
                  id="receipt"
                  type="file"
                  accept="image/jpeg,image/png"
                  onChange={
                    handleReceiptChange
                  }
                  className="receipt-file-input"
                  disabled={ocrLoading}
                />

                {ocrLoading && (
                  <p role="status">กำลังอ่านข้อมูลจากใบเสร็จ...</p>
                )}
                {ocrMessage && (
                  <p role="status">{ocrMessage}</p>
                )}

              </div>


              <div className="modal-actions">

                <button
                  type="button"
                  className="cancel-button"
                  onClick={closeModal}
                  disabled={saving}
                >
                  ยกเลิก
                </button>


                <button
                  type="submit"
                  className="save-button"
                  disabled={saving || ocrLoading}
                >

                  {saving && (
                    <LoaderCircle
                      className="transaction-spinner"
                      size={16}
                    />
                  )}

                  {saving ? 'กำลังบันทึก...' : editingId ? 'บันทึกการแก้ไข' : 'เพิ่มรายการ'}

                </button>

              </div>

            </form>

          </div>

        </div>

      )}


      {/* ยืนยันก่อนปิดฟอร์มที่มีข้อมูลยังไม่ได้บันทึก */}
      {showExitConfirm && (
        <div className="transaction-exit-overlay" role="presentation">
          <div
            className="transaction-exit-dialog"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="transaction-exit-title"
            aria-describedby="transaction-exit-description"
          >
            <h3 id="transaction-exit-title">ต้องการออกจากหน้าต่างหรือไม่?</h3>
            <p id="transaction-exit-description">
              หากปิดหน้าต่างนี้ ข้อมูลที่กรอกไว้จะไม่ถูกบันทึก
            </p>
            <div className="transaction-exit-actions">
              <button type="button" onClick={() => setShowExitConfirm(false)}>
                ยกเลิก
              </button>
              <button type="button" className="exit-confirm-button" onClick={discardAndClose}>
                ออกจากหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

      <Navbar />

    </div>
  );
}


export default Transactions;