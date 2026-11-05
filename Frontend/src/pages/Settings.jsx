import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Settings.css';
import { clearTokens } from '../utils/auth';
import { liff } from '../lineAuth';

function Settings() {

    const navigate = useNavigate();

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

    const handleLogout = () => {
        clearTokens();

        if (liff.isLoggedIn()) {
            liff.logout();
        }

        navigate('/logged-out', { replace: true });
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
                >
                    ออกจากระบบ
                </button>


            </main>

        </div>
    );
}

export default Settings;