import './Header.css';
import { NavLink } from 'react-router-dom';
import profileIcon from '../assets/icons/profile.svg';

function HomeHeader() {
  return (
    <header className="home-header">
      <div className="welcome">
        <div>
          สวัสดี..คุณ <strong>Scarlette</strong>
        </div>

        <span>วันอังคารที่ 21 กรกฎาคม 2569</span>
      </div>

      <div className="header-icons">

        {/* Profile */}
        {/* <button className="profile-button">
          <svg viewBox="0 0 24 24">
            <circle cx="12" cy="8" r="4" />
            <path d="M4 21c0-4 3.5-6 8-6s8 2 8 6" />
          </svg>
        </button> */}

        <NavLink to="/profile/" className="profile-button">
          <circle cx="12" cy="8" r="4" />
          <img className="profile-icon" src={profileIcon} alt="โปรไฟล์" />

        </NavLink>
      </div>
    </header>
  );
}

export default HomeHeader;