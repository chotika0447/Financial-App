import CustomHeader from '../components/CustomHeader';
import Navbar from '../components/Navbar';

function Transactions() {
  return (
    <div className="transactions-page">
      <CustomHeader title="รายรับ-รายจ่าย" color="var(--color-transactions)" />
      <Navbar />
      
    </div>
  );
}

export default Transactions;