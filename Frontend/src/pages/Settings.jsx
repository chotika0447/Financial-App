import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Settings.css';
import { clearTokens, getAccessToken } from '../utils/auth';
import { liff } from '../lineAuth';

function Settings() {

    const navigate = useNavigate();
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    const [notification, setNotification] = useState(
        localStorage.getItem('notification') === 'true'
    );

    const [paymentNotification, setPaymentNotification] = useState(
        localStorage.getItem('paymentNotification') === 'true'
    );


    const handleNotification = (value) => {
        setNotification(value);

        localStorage.setItem(
            'notification',
            value
        );
    };


    const handlePaymentNotification = (value) => {
        setPaymentNotification(value);

        localStorage.setItem(
            'paymentNotification',
            value
        );
    };

    
    const handleLogout = async () => {
        if (isLoggingOut) return;

        setIsLoggingOut(true);

        try {
            const accessToken = getAccessToken();

            if (accessToken) {
                const response = await fetch('/users/line-logout/', {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                    },
                });

                if (!response.ok) {
                    throw new Error(
                        `Logout failed: HTTP ${response.status}`
                    );
                }
            }

            // ล้าง JWT Token หลัง Backend บันทึก Logout สำเร็จ
            clearTokens();

            // ออกจากระบบ LINE LIFF
            if (liff.isLoggedIn()) {
                liff.logout();
            }

            navigate('/logged-out', { replace: true });

        } catch (error) {
            console.error('Logout error:', error);
            alert('ไม่สามารถออกจากระบบได้ กรุณาลองอีกครั้ง');
        } finally {
            setIsLoggingOut(false);
        }
    };


    return (
        <div className="settings-page">

            {/* ================= HEADER ================= */}

            <header className="settings-header">

                <button
                    className="settings-back"
                    onClick={() => navigate(-1)}
                >
                    ‹
                </button>

                <h1>การตั้งค่า</h1>

            </header>


            <main className="settings-content">
                {/* ================= ACCOUNT ================= */}

                <section className="settings-section">

                    <h3>จัดการบัญชีผู้ใช้</h3>

                    <div className="settings-card">

                        <button className="settings-row settings-link "
                            onClick={() => {
                                alert('ฟังก์ชันลบบัญชีจะเพิ่มภายหลัง');
                            }}
                        >
                            <span>
                                ลบบัญชี
                            </span>
                            <span className="settings-arrow">
                                ›
                            </span>
                        </button>
                    </div>

                </section>


                {/* ================= LOGOUT ================= */}

                <button
                    className="logout-button"
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                >
                    {isLoggingOut ? 'กำลังออกจากระบบ...' : 'ออกจากระบบ'}
                </button>


            </main>

        </div>
    );
}

export default Settings;