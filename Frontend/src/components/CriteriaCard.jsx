import { useEffect, useState } from 'react';
import { ChevronRight } from 'lucide-react';

const PLAN_ANSWERS_KEY = 'financialHealthPlanAnswers';
const PLAN_ANSWERS_EVENT = 'financialHealthPlanAnswersChanged';

function getPlanAnswers() {
    try {
        const saved = localStorage.getItem(PLAN_ANSWERS_KEY);
        return saved ? JSON.parse(saved) : {};
    } catch {
        return {};
    }
}

function getPlanScore(answers) {
    if (!answers.q7 || !answers.q8) {
        return null;
    }

    return (
        (Number(answers.q7) + Number(answers.q8)) / 2
    );
}

function CriteriaCard({ item, onClick }) {
    const Icon = item.Icon;
    const isPlan = item.id === 'plan';

    const [averageScore, setAverageScore] = useState(null);

    useEffect(() => {
        if (!isPlan) return;

        const updateScore = () => {
            const answers = getPlanAnswers();
            setAverageScore(getPlanScore(answers));
        };

        updateScore();

        window.addEventListener(PLAN_ANSWERS_EVENT, updateScore);
        window.addEventListener('focus', updateScore);

        return () => {
            window.removeEventListener(PLAN_ANSWERS_EVENT, updateScore);
            window.removeEventListener('focus', updateScore);
        };
    }, [isPlan]);

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