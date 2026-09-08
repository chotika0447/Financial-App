import './Header.css';
function CustomHeader({ title, color }) {
    return (
        <header className="custom-header" style={{ backgroundColor: color }}>
            <h1>{title}</h1>
        </header>
    );
}

export default CustomHeader;