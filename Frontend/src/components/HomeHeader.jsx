import { useEffect, useState } from 'react';
import './Header.css';
import { NavLink } from 'react-router-dom';
import profileIcon from '../assets/icons/profile.svg';

function getThaiDate() {
    return new Intl.DateTimeFormat('th-TH', {
        timeZone: 'Asia/Bangkok',
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        calendar: 'buddhist',
    }).format(new Date());
}

function HomeHeader({ user }) {
    const [today, setToday] = useState(getThaiDate);

    useEffect(() => {
        // อัปเดตวันที่เมื่อเปิดหน้า และตรวจสอบวันที่ใหม่เป็นระยะ
        const updateDate = () => setToday(getThaiDate());

        updateDate();

        const intervalId = setInterval(updateDate, 60 * 1000);

        return () => clearInterval(intervalId);
    }, []);

    return (
        <header className="home-header">
            <div className="welcome">
                <div className="home-header-greeting">
                    สวัสดีคุณ <strong>{user?.username || '....'}</strong>
                </div>

                <span className="home-header-date">
                    {today}
                </span>
            </div>

            <div className="header-icons">
                <NavLink
                    to="/profile/"
                    className="profile-button"
                    aria-label="ไปยังหน้าโปรไฟล์"
                >
                    <img
                        className="profile-icon"
                        src={profileIcon}
                        alt=""
                    />
                </NavLink>
            </div>
        </header>
    );
}

export default HomeHeader;