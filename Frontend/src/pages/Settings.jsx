import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Settings.css';
import { clearTokens } from '../utils/auth';

function Settings() {
  const navigate = useNavigate();
  const [notification, setNotification] = useState(localStorage.getItem('notification') === 'true');
  const [paymentNotification, setPaymentNotification] = useState(localStorage.getItem('paymentNotification') === 'true');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const handleNotification = (value) => {
    setNotification(value);
    localStorage.setItem('notification', String(value));
  };
  const handlePaymentNotification = (value) => {
    setPaymentNotification(value);
    localStorage.setItem('paymentNotification', String(value));
  };
  const handleLogout = () => {
    clearTokens();
    navigate('/login', { replace: true });
  };
  const closeDeleteModal = () => {
    if (deleting) return;
    setShowDeleteModal(false);
    setDeleteError('');
  };
  useEffect(() => {
    if (!showDeleteModal) return;
    const onKeyDown = (event) => {
      if (event.key === 'Escape' && !deleting) closeDeleteModal();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [showDeleteModal, deleting]);

  const handleDeleteAccount = async () => {
    if (deleting) return;
    setDeleting(true);
    setDeleteError('');
    try {
      const token = sessionStorage.getItem('accessToken');
      if (!token) throw new Error('ไม่พบข้อมูลเข้าสู่ระบบ กรุณาเข้าสู่ระบบใหม่');
      const response = await fetch('/users/me/', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.detail || data.error || `ไม่สามารถลบบัญชีได้ (HTTP ${response.status})`);
      }
      clearTokens();
      localStorage.removeItem('notification');
      localStorage.removeItem('paymentNotification');
      navigate('/login', { replace: true });
    } catch (error) {
      setDeleteError(error.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="settings-page">
      <header className="settings-header">
        <button type="button" className="settings-back" onClick={() => navigate(-1)} aria-label="ย้อนกลับ">‹</button>
        <h1>การตั้งค่า</h1>
      </header>
      <main className="settings-content">
        <section className="settings-section">
          <h3>จัดการบัญชีผู้ใช้</h3>
          <div className="settings-card">
            <button type="button" className="settings-row settings-link" onClick={() => { setDeleteError(''); setShowDeleteModal(true); }}>
              <span>ลบบัญชี</span><span className="settings-arrow">›</span>
            </button>
          </div>
        </section>
        <button type="button" className="logout-button" onClick={handleLogout}>ออกจากระบบ</button>
      </main>
      {showDeleteModal && (
        <div className="settings-modal-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) closeDeleteModal(); }}>
          <div className="settings-delete-dialog" role="alertdialog" aria-modal="true" aria-labelledby="settings-delete-title" aria-describedby="settings-delete-description">
            <button type="button" className="settings-modal-close" onClick={closeDeleteModal} disabled={deleting} aria-label="ปิดหน้าต่าง">×</button>
            <h2 id="settings-delete-title">ยืนยันการลบบัญชี?</h2>
            <p id="settings-delete-description">หากลบบัญชี ข้อมูลทั้งหมดที่เกี่ยวข้องกับบัญชีของคุณจะถูกลบอย่างถาวร และไม่สามารถกู้คืนได้</p>
            {deleteError && <p className="settings-delete-error" role="alert">{deleteError}</p>}
            <div className="settings-modal-actions">
              <button type="button" className="settings-cancel-button" onClick={closeDeleteModal} disabled={deleting}>ยกเลิก</button>
              <button type="button" className="settings-confirm-delete" onClick={handleDeleteAccount} disabled={deleting}>{deleting ? 'กำลังลบ...' : 'ลบบัญชี'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export default Settings;
