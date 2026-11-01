import { ChevronRight } from 'lucide-react';

function CriteriaCard({ item, onClick }) {
    
    const Icon = item.Icon;
    const [averageScore, setAverageScore] = useState(null);

    return (
        <button
            type="button"
            className="fh-category-card"
            onClick={onClick}
        >
            <span
                className="fh-category-icon"
                style={{
                    '--category-color': item.color,
                    '--category-bg': item.background,
                }}
            >
                <Icon size={23} strokeWidth={1.8} />
            </span>

            <span className="fh-category-content">
                <span className="fh-category-title">
                    {item.title}
                </span>

                <span className="fh-category-description">
                    {item.description}
                </span>

                <span className="fh-category-average">
                    <span>คะแนนเฉลี่ย</span>
                    <strong>
                        {averageScore === null
                            ? '—'
                            : Number(averageScore.toFixed(2))}
                    </strong>
                    <span className="fh-category-average-total">
                        / 100
                    </span>
                </span>
            </span>

            <span className="fh-category-weight">
                น้ำหนัก {item.weight}%
            </span>

            <ChevronRight
                className="fh-category-arrow"
                size={21}
            />
        </button>
    );
}

export default CriteriaCard;