import CustomHeader from '../components/CustomHeader';
import Navbar from '../components/Navbar';

function Debts() {
  return (
    <div className="debts-page">
      <CustomHeader title="หนี้สินและการให้ยืม" color="var(--color-debts)" />
      <Navbar />

    </div>
  );
}

export default Debts;