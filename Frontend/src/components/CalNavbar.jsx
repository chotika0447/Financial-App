import { NavLink } from 'react-router-dom';
import './CalNavbar.css';

function CalNavbar(){
return (
    <nav className="cal-nav">

      <NavLink to="/saving-plan/" className="cal-nav-item">
        <span>คำนวณการออมเงิน</span>
      </NavLink>

      <NavLink to="/compound-interest/" className="cal-nav-item">
        <span>คำนวณดอกเบี้ยทบต้น</span>
      </NavLink>

      <NavLink to="/retirement/" className="cal-nav-item">
        <span>คำนวณแผนเกษียณ</span>
      </NavLink>

    </nav>
)
}
export default CalNavbar;