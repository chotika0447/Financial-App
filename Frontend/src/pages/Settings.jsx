import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Settings.css';

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

        sessionStorage.removeItem('accessToken');

        navigate('/login');
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


                {/* ================= NOTIFICATION ================= */}

                <section className="settings-section">

                    <h3>การแจ้งเตือน</h3>

                    <div className="settings-card">

                        <div className="settings-row">

                            <span>
                                การอนุญาตแจ้งเตือน
                            </span>

                            <button
                                className={`switch ${notification ? 'active' : ''
                                    }`}
                                onClick={() =>
                                    handleNotification(!notification)
                                }
                            >
                                <span></span>
                            </button>

                        </div>


                        <div className="settings-row">

                            <span>
                                การแจ้งเตือนชำระหนี้
                            </span>

                            <button
                                className={`switch ${paymentNotification
                                    ? 'active'
                                    : ''
                                    }`}
                                onClick={() =>
                                    handlePaymentNotification(
                                        !paymentNotification
                                    )
                                }
                            >
                                <span></span>
                            </button>

                        </div>

                    </div>

                </section>


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