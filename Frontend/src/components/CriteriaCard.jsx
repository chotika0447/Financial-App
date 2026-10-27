import { useEffect, useState } from 'react';
import { ChevronRight } from 'lucide-react';

const PLAN_ANSWERS_KEY = 'financialHealthPlanAnswers';

function CriteriaCard({ item, onClick }) {
    const Icon = item.Icon;
    const isPlan = item.id === 'plan';

    const [hasAnswers, setHasAnswers] = useState(false);

    useEffect(() => {
        if (!isPlan) return;

        try {
            const saved = localStorage.getItem(PLAN_ANSWERS_KEY);
            const answers = saved ? JSON.parse(saved) : {};

            setHasAnswers(
                Boolean(answers.q7 && answers.q8)
            );
        } catch {
            setHasAnswers(false);
        }

        // ตรวจสถานะใหม่เมื่อกลับมาที่หน้าเกณฑ์
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                try {
                    const saved = localStorage.getItem(PLAN_ANSWERS_KEY);
                    const answers = saved ? JSON.parse(saved) : {};

                    setHasAnswers(
                        Boolean(answers.q7 && answers.q8)
                    );
                } catch {
                    setHasAnswers(false);
                }
            }
        };

        window.addEventListener('focus', handleVisibilityChange);
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            window.removeEventListener('focus', handleVisibilityChange);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
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

                <span className="fh-category-weight">
                    {isPlan
                        ? hasAnswers
                            ? 'มีข้อมูลแบบประเมินแล้ว'
                            : 'ยังไม่ได้ทำแบบประเมิน'
                        : `น้ำหนักคะแนน ${item.weight}%`}
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