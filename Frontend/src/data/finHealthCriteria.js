import {
    Wallet,
    ChartNoAxesCombined,
    HandCoins,
    ShieldCheck,
} from 'lucide-react';

const finHealthCriteria = [
    {
        id: 'spend',
        title: 'การใช้จ่าย',
        name: 'การใช้จ่าย (Spend)',
        weight: 25,
        description:
            'ประเมินสัดส่วนค่าใช้จ่ายเทียบกับรายได้ และความสามารถในการชำระบิลตรงเวลา',
        indicators: [
            'ตัวชี้วัดที่ 1: สัดส่วนค่าใช้จ่ายต่อรายได้',
            'ตัวชี้วัดที่ 2: ความสามารถในการชำระบิลตรงเวลา',
        ],
        formula: 'คะแนนด้านการใช้จ่าย = (S1 + S2) ÷ 2',
        target:
            'สัดส่วนค่าใช้จ่ายยิ่งเหมาะสม และชำระบิลตรงเวลาได้สม่ำเสมอ ยิ่งได้คะแนนสูง',
        Icon: ChartNoAxesCombined,
        color: '#3978d4',
        background: '#eaf1ff',
    },
    {
        id: 'save',
        title: 'การออม',
        name: 'การออม (Save)',
        weight: 25,
        description:
            'ประเมินเงินสำรองที่พร้อมใช้และความคืบหน้าของการออมตามเป้าหมาย',
        indicators: [
            'ตัวชี้วัดที่ 3: เงินสำรองสภาพคล่อง',
            'ตัวชี้วัดที่ 4: ความคืบหน้าตามเป้าหมายการออม',
        ],
        formula: 'คะแนนด้านการออม = (S3 + S4) ÷ 2',
        target:
            'พิจารณาเงินสำรองที่พร้อมใช้จริง และความคืบหน้าของเงินออมเทียบกับแผน',
        Icon: Wallet,
        color: '#159b76',
        background: '#e7f7f0',
    },
    {
        id: 'borrow',
        title: 'การกู้ยืม',
        name: 'การกู้ยืม (Borrow)',
        weight: 25,
        description:
            'ประเมินภาระหนี้เทียบกับรายได้และประวัติการชำระหนี้',
        indicators: [
            'ตัวชี้วัดที่ 5: สัดส่วนภาระหนี้ต่อรายได้',
            'ตัวชี้วัดที่ 6: ประวัติการชำระหนี้',
        ],
        formula: 'คะแนนด้านการกู้ยืม = (S5 + S6) ÷ 2',
        target:
            'ภาระหนี้ที่เหมาะสมและประวัติการชำระหนี้ที่ดีช่วยสะท้อนความสามารถในการจัดการหนี้',
        Icon: HandCoins,
        color: '#dc7650',
        background: '#fff0e9',
    },

];

export default finHealthCriteria;