import './Navbar.css';
import { NavLink } from 'react-router-dom';

import homeIcon from '../assets/icons/home.svg';
import transactionIcon from '../assets/icons/transac.svg';
import savingIcon from '../assets/icons/saving.svg';
import debtIcon from '../assets/icons/debt.svg';
import notificationIcon from '../assets/icons/bell.svg';


function Navbar() {
  return (
    <nav className="nav">

      <NavLink to="/home/" className="nav-item">
        <img className="nav-icon" src={homeIcon} alt="หน้าแรก" />
        <span>หน้าแรก</span>
      </NavLink>

      <NavLink to="/transactions/" className="nav-item">
        <img className="nav-icon" src={transactionIcon} alt="รายรับ-รายจ่าย" />
        <span>รายรับ-รายจ่าย</span>
      </NavLink>

      <NavLink to="/saving/" className="nav-item">
        <img className="nav-icon" src={savingIcon} alt="ออมเงิน" />
        <span>ออมเงิน</span>
      </NavLink>

      <NavLink to="/debts/" className="nav-item">
        <img className="nav-icon" src={debtIcon} alt="หนี้สิน" />
        <span>หนี้สิน</span>
      </NavLink>

      <NavLink to="/notifications/" className="nav-item">
        <img className="nav-icon" src={notificationIcon} alt="แจ้งเตือน" />
        <span>แจ้งเตือน</span>
      </NavLink>


    </nav>
  );
}

export default Navbar;