
import { ChevronRight } from 'lucide-react';

function CriteriaCard({ item, onClick }) {
    const Icon = item.Icon;

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

                <span className="fh-category-weight">
                    น้ำหนักคะแนน {item.weight}%
                </span>
            </span>

            <ChevronRight
                className="fh-category-arrow"
                size={21}
            />
        </button>
    );
}

export default CriteriaCard;
