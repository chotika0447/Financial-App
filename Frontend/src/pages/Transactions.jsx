import { useEffect, useMemo, useState } from 'react';
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
import { apiUrl } from '../api';
import './Transactions.css';


const emptyForm = () => ({
  transaction_type: 'expense',
  amount: '',
  category: '',
  sub_category: '',
  account: '',
  transaction_date: new Date().toISOString().split('T')[0],
  transaction_time: '',
  description: '',
});


function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterDate, setFilterDate] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [form, setForm] = useState(emptyForm);

  // รูปใบเสร็จที่ผู้ใช้เลือกใหม่
  const [receiptFile, setReceiptFile] = useState(null);

  // URL สำหรับ preview รูป
  const [receiptPreview, setReceiptPreview] = useState('');

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

      const response = await fetch(
        apiUrl('/transactions/'),
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
        apiUrl(`/categories/?transaction_type=${type}`),
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


  // ถ้าเลือกวันที่ Summary จะคิดเฉพาะวันนั้น
  const summaryTransactions = useMemo(() => {
    if (!filterDate) {
      return transactions;
    }

    return transactions.filter(
      (transaction) =>
        transaction.transaction_date === filterDate
    );
  }, [transactions, filterDate]);


  const summary = useMemo(() => {
    return summaryTransactions.reduce(
      (result, transaction) => {
        result[transaction.transaction_type] =
          (result[transaction.transaction_type] || 0) +
          Number(transaction.amount || 0);

        return result;
      },
      {
        income: 0,
        expense: 0,
      }
    );
  }, [summaryTransactions]);


  const balance =
    summary.income - summary.expense;


  // กรองตามประเภท + วันที่ + คำค้นหา
  const filtered = useMemo(() => {
    const keyword = search
      .trim()
      .toLowerCase();

    return transactions.filter((transaction) => {
      const typeMatched =
        filterType === 'all' ||
        transaction.transaction_type === filterType;

      const dateMatched =
        !filterDate ||
        transaction.transaction_date === filterDate;

      const text = [
        transaction.description,
        transaction.category_name,
        transaction.sub_category,
        transaction.account,
        transaction.amount,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      const searchMatched =
        !keyword ||
        text.includes(keyword);

      return (
        typeMatched &&
        dateMatched &&
        searchMatched
      );
    });
  }, [
    transactions,
    filterType,
    filterDate,
    search,
  ]);


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

    setForm(emptyForm());
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

    // แสดงรูปเดิมตอนแก้ไข
    setReceiptPreview(
      transaction.receipt || ''
    );

    setForm({
      transaction_type:
        transaction.transaction_type || 'expense',

      amount:
        transaction.amount || '',

      category:
        transaction.category || '',

      sub_category:
        transaction.sub_category || '',

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
    });

    setShowModal(true);
  }


  function closeModal() {
    if (saving) return;

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


  function handleReceiptChange(event) {
    const file = event.target.files?.[0];

    if (!file) return;

    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
    ];

    if (!allowedTypes.includes(file.type)) {
      setError(
        'กรุณาเลือกไฟล์ JPG, PNG หรือ WEBP เท่านั้น'
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
  }


  function removeSelectedReceipt() {
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

    payload.append(
      'transaction_date',
      form.transaction_date
    );

    payload.append(
      'description',
      form.description.trim()
    );

    payload.append(
      'sub_category',
      form.sub_category.trim()
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

      const response = await fetch(
        editingId
          ? apiUrl(`/transactions/${editingId}/`)
          : apiUrl('/transactions/'),
        {
          method:
            editingId
              ? 'PATCH'
              : 'POST',

          // ห้ามกำหนด Content-Type เองสำหรับ FormData
          headers: {
            Authorization:
              `Bearer ${accessToken}`,
          },

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

      setShowModal(false);
      setEditingId(null);

      if (
        receiptPreview &&
        receiptPreview.startsWith('blob:')
      ) {
        URL.revokeObjectURL(receiptPreview);
      }

      setReceiptFile(null);
      setReceiptPreview('');

      setSuccess(
        editingId
          ? 'แก้ไขรายการเรียบร้อยแล้ว'
          : 'เพิ่มรายการเรียบร้อยแล้ว'
      );

      await fetchTransactions();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }


  async function remove(transaction) {
    const label =
      transaction.description ||
      transaction.category_name ||
      'รายการนี้';

    const confirmed =
      window.confirm(
        `ต้องการลบ "${label}" หรือไม่?`
      );

    if (!confirmed) return;

    try {
      const response = await fetch(
        apiUrl(
          `/transactions/${transaction.id}/`
        ),
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
                {filterDate
                  ? 'รายรับวันที่เลือก'
                  : 'รายรับทั้งหมด'}
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
                {filterDate
                  ? 'รายจ่ายวันที่เลือก'
                  : 'รายจ่ายทั้งหมด'}
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
              {filterDate
                ? `ยอดประจำวันที่ ${formatDate(filterDate)}`
                : 'รายรับทั้งหมด - รายจ่ายทั้งหมด'}
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


          <div className="transaction-tabs">

            {[
              ['all', 'ทั้งหมด'],
              ['income', 'รายรับ'],
              ['expense', 'รายจ่าย'],
            ].map(([value, label]) => (

              <button
                type="button"
                key={value}
                className={
                  filterType === value
                    ? 'active'
                    : ''
                }
                onClick={() =>
                  setFilterType(value)
                }
              >
                {label}
              </button>

            ))}

          </div>


          {/* เลือกวันที่ */}
          <div className="transaction-date-filter">

            <div className="transaction-date-filter-title">

              <div className="transaction-date-icon">
                <CalendarDays size={20} />
              </div>

              <div>
                <strong>
                  ดูรายการตามวันที่
                </strong>

                <span>
                  เลือกวันที่ที่ต้องการดูรายรับ-รายจ่าย
                </span>
              </div>

            </div>


            <div className="transaction-date-filter-controls">

              <input
                type="date"
                value={filterDate}
                onChange={(event) =>
                  setFilterDate(event.target.value)
                }
              />

              {filterDate && (
                <button
                  type="button"
                  onClick={() =>
                    setFilterDate('')
                  }
                >
                  ดูทุกวัน
                </button>
              )}

            </div>

          </div>

        </section>


        {/* Transaction List */}
        <section className="transaction-list">

          <div className="transaction-list-title">

            <div>

              <h2>
                {filterDate
                  ? `รายการวันที่ ${formatDate(filterDate)}`
                  : 'รายการล่าสุด'}
              </h2>

              <p>
                {filtered.length} รายการ
              </p>

            </div>

            <button
              type="button"
              className="desktop-add-button"
              onClick={openAdd}
            >
              <Plus size={17} />
              เพิ่มรายการ
            </button>

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

              {filtered.map((transaction) => {

                const income =
                  transaction.transaction_type ===
                  'income';

                const name =
                  transaction.description ||
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
                        `transaction-card-icon ${
                          income
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

                        {transaction.sub_category && (
                          <>
                            <span className="dot">
                              •
                            </span>

                            <span>
                              {transaction.sub_category}
                            </span>
                          </>
                        )}

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


                      {transaction.receipt && (
                        <a
                          className="receipt-view-link"
                          href={transaction.receipt}
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
                      `expense ${
                        form.transaction_type ===
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
                      `income ${
                        form.transaction_type ===
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


              {/* หมวดหมู่ */}
              <div className="form-group full">

                <label htmlFor="category">
                  หมวดหมู่
                </label>

                <select
                  id="category"
                  name="category"
                  value={form.category}
                  onChange={change}
                >

                  <option value="">
                    เลือกหมวดหมู่
                  </option>

                  {categories.map(
                    (category) => (
                      <option
                        value={category.id}
                        key={category.id}
                      >
                        {category.name}
                      </option>
                    )
                  )}

                </select>

              </div>


              {/* หมวดย่อย */}
              <div className="form-group full">

                <label htmlFor="sub_category">
                  หมวดย่อย
                </label>

                <input
                  id="sub_category"
                  name="sub_category"
                  placeholder="เช่น อาหารกลางวัน"
                  value={form.sub_category}
                  onChange={change}
                />

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


              {/* รายละเอียด */}
              <div className="form-group full">

                <label htmlFor="description">
                  รายละเอียด
                </label>

                <input
                  id="description"
                  name="description"
                  placeholder="เช่น ข้าวกลางวัน"
                  value={form.description}
                  onChange={change}
                />

              </div>


              {/* รูปใบเสร็จ */}
              <div className="form-group full receipt-form-group">

                <label htmlFor="receipt">
                  รูปใบเสร็จ / หลักฐาน
                </label>


                {!receiptPreview ? (

                  <label
                    htmlFor="receipt"
                    className="receipt-upload-box"
                  >

                    <Upload size={24} />

                    <strong>
                      เลือกรูปใบเสร็จ
                    </strong>

                    <span>
                      JPG, PNG หรือ WEBP
                      ขนาดไม่เกิน 5 MB
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
                  accept="image/jpeg,image/png,image/webp"
                  onChange={
                    handleReceiptChange
                  }
                  className="receipt-file-input"
                />

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
                  disabled={saving}
                >

                  {saving && (
                    <LoaderCircle
                      className="transaction-spinner"
                      size={16}
                    />
                  )}

                  {saving
                    ? 'กำลังบันทึก...'
                    : editingId
                      ? 'บันทึกการแก้ไข'
                      : 'เพิ่มรายการ'}

                </button>

              </div>

            </form>

          </div>

        </div>

      )}


      <Navbar />

    </div>
  );
}


export default Transactions;