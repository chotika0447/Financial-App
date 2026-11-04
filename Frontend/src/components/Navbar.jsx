import './Navbar.css';
import { NavLink } from 'react-router-dom';

import homeIcon from '../assets/icons/home.svg';
import transactionIcon from '../assets/icons/transac.svg';
import savingIcon from '../assets/icons/saving.svg';
import debtIcon from '../assets/icons/debt.svg';
import notificationIcon from '../assets/icons/bell.svg';

import { House, NotebookPen, PiggyBank, HandCoins, SquareActivity } from 'lucide-react';

function Navbar() {
  return (
    <nav className="nav">

      <NavLink to="/home/" className="nav-item">
        <House className="nav-icon" aria-hidden="true" />
        <span>หน้าแรก</span>
      </NavLink>

      <NavLink to="/transactions/" className="nav-item">
        <NotebookPen className="nav-icon" aria-hidden="true" />
        <span>รายรับ-รายจ่าย</span>
      </NavLink>

      <NavLink to="/saving/" className="nav-item">
        <PiggyBank className="nav-icon" aria-hidden="true" />
        <span>ออมเงิน</span>
      </NavLink>

      <NavLink to="/debts/" className="nav-item">
        <HandCoins className="nav-icon" aria-hidden="true" />
        <span>หนี้สิน</span>
      </NavLink>

      <NavLink to="/financial-health/" className="nav-item">
        <SquareActivity className="nav-icon" aria-hidden="true" />
        <span>สุขภาพการเงิน</span>
      </NavLink>

    </nav>
  );
}

export default Navbar;
