import { useEffect, useState } from 'react';
import './Profile.css'

function Profile() {

  const [user, setUser] = useState(null);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    email: '',
    age: '',
    occupation: '',
    monthly_income: '',
  });
  const accessToken = sessionStorage.getItem('accessToken');

  useEffect(() => {
    if (!accessToken) {
      return;
    }

    fetch('/users/me/',
      {
        method: 'GET',

        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      })
      .then(async response => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.detail || 'โหลดข้อมูลโปรไฟล์ไม่สำเร็จ');
        setUser(data);
        setForm({
          email: data.email ?? '',
          age: data.age ?? '',
          occupation: data.occupation ?? '',
          monthly_income: data.monthly_income ?? '',
        });
      })
      .catch(fetchError => setError(fetchError.message));

  }, [accessToken]);

  const handleSave = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');

    try {
      const response = await fetch('/users/me/', {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: form.email.trim(),
          age: form.age ? Number(form.age) : null,
          occupation: form.occupation.trim(),
          monthly_income: form.monthly_income,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.age?.[0]
          || data.occupation?.[0]
          || data.monthly_income?.[0]
          || data.detail
          || 'บันทึกข้อมูลไม่สำเร็จ'
        );
      }

      setUser(data);
      setForm({
        email: data.email ?? '',
        age: data.age ?? '',
        occupation: data.occupation ?? '',
        monthly_income: data.monthly_income ?? '',
      });
      setEditing(false);
    } catch (saveError) {
      setError(saveError.message || 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setForm({
      email: user.email ?? '',
      age: user.age ?? '',
      occupation: user.occupation ?? '',
      monthly_income: user.monthly_income ?? '',
    });
    setError('');
    setEditing(false);
  };

  if (!user) {
    return <p>{error || (accessToken ? 'กำลังโหลดโปรไฟล์...' : 'กรุณาเข้าสู่ระบบก่อนดูโปรไฟล์')}</p>;
  }

  return (
    <div className="profile-page">

      <h1>Profile</h1>

      {user.profile_img && (
        <img className="profile-avatar" src={user.profile_img} alt="รูปโปรไฟล์ LINE" />
      )}

      <p>UID: {user.uid}</p>
      <p>ชื่อที่แสดงใน LINE: {user.username}</p>
      {error && <p className="profile-error">{error}</p>}

      {editing ? (
        <form className="profile-form" onSubmit={handleSave}>
          <div className="form-group">
            <label htmlFor="profile-email">อีเมล</label>
            <input
              id="profile-email"
              type="email"
              value={form.email}
              onChange={(event) =>
                setForm({
                  ...form,
                  email: event.target.value,
                })
              }
            />
          </div>
          <div className="form-group">
            <label htmlFor="profile-age">อายุ (ปี)</label>
            <input
              id="profile-age"
              type="number"
              min="1"
              step="1"
              value={form.age}
              onChange={(event) => setForm({ ...form, age: event.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="profile-occupation">อาชีพ</label>
            <input
              id="profile-occupation"
              type="text"
              maxLength="100"
              value={form.occupation}
              onChange={(event) => setForm({ ...form, occupation: event.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="profile-income">รายได้ต่อเดือน (บาท)</label>
            <input
              id="profile-income"
              type="number"
              min="0"
              step="0.01"
              value={form.monthly_income}
              onChange={(event) => setForm({ ...form, monthly_income: event.target.value })}
              required
            />
          </div>
          <div className="profile-actions">
            <button className="btn" type="submit" disabled={saving}>
              {saving ? 'กำลังบันทึก...' : 'บันทึก'}
            </button>
            <button className="btn profile-cancel" type="button" onClick={handleCancel} disabled={saving}>
              ยกเลิก
            </button>
          </div>
        </form>
      ) : (
        <>
          <p>อีเมล: {user.email || 'ยังไม่ได้กรอก'}</p>
          <p>อายุ: {user.age ?? 'ยังไม่ได้กรอก'}</p>
          <p>อาชีพ: {user.occupation || 'ยังไม่ได้กรอก'}</p>
          <p>รายได้ต่อเดือน: {user.monthly_income ?? '0.00'} บาท</p>
          <button className="btn" type="button" onClick={() => setEditing(true)}>
            แก้ไขโปรไฟล์
          </button>
        </>
      )}

      {/* <CustomHeader title="โปรไฟล์" color="var(--color-profile)" />

      <div className="profile-card">

      </div> */}

    </div>
  );
}

export default Profile;