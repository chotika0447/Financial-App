import CustomHeader from '../components/CustomHeader';
import Navbar from '../components/Navbar';

function Notifications() {
    return (
        <div className="notifications-page">
            <CustomHeader title="การแจ้งเตือน" color="var(--color-notifications)" />
            <Navbar />

        </div>
    );
}

export default Notifications;