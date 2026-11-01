
import {
    ChartNoAxesCombined,
    Wallet,
    HandCoins,
} from 'lucide-react';

const finHealthCriteria = [
    {
        id: 'spend',
        name: 'Spend',
        title: 'ด้านรายรับ-รายจ่าย',
        description:
            'ประเมินสัดส่วนค่าใช้จ่ายเมื่อเทียบกับรายได้ และความสม่ำเสมอในการบันทึกรายรับรายจ่าย',

        indicators: [
            {
                id: 'EIR',
                name: 'Expense-to-Income Ratio (EIR)',
                title: 'อัตราส่วนค่าใช้จ่ายต่อรายได้',
                description:
                    'วัดสัดส่วนค่าใช้จ่ายทั้งหมดเมื่อเทียบกับรายได้สุทธิ เพื่อประเมินภาระค่าใช้จ่ายของผู้ใช้',

                formula:
                    '(ค่าใช้จ่ายทั้งหมด ÷ รายได้สุทธิ) × 100',

                unit: '%',
                direction: 'lower',
            },
            {
                id: 'TRC',
                name: 'Transaction Recording Consistency (TRC)',
                title: 'ความสม่ำเสมอในการบันทึกรายรับ–รายจ่าย',
                description:
                    'วัดจำนวนเดือนที่ผู้ใช้มีการบันทึกรายรับและรายจ่ายอย่างต่อเนื่องในช่วงเวลาที่ประเมิน',

                formula:
                    '(จำนวนเดือนที่มีการบันทึกรายรับและรายจ่าย ÷ จำนวนเดือนที่ใช้ประเมิน) × 100',

                unit: '%',
                direction: 'higher',
            },
        ],

        formula: '(คะแนน EIR + คะแนน TRC) ÷ 2',

        target:
            'ค่าใช้จ่ายที่เหมาะสมเมื่อเทียบกับรายได้ และมีการบันทึกรายรับรายจ่ายอย่างสม่ำเสมอ',

        Icon: ChartNoAxesCombined,
        color: '#3978d4',
        background: '#eaf1ff',
    },

    {
        id: 'save',
        name: 'Save',
        title: 'ด้านการออม',
        description:
            'ประเมินความสม่ำเสมอในการออมเงินของผู้ใช้จากข้อมูลการออมที่บันทึกไว้ในระบบ',

        indicators: [
            {
                id: 'SC',
                name: 'Saving Consistency (SC)',
                title: 'ความสม่ำเสมอในการออม',
                description:
                    'วัดจำนวนเดือนที่ผู้ใช้มีการออมเงินจริงเมื่อเทียบกับจำนวนเดือนที่ใช้ประเมิน โดยนับเฉพาะเดือนที่มีข้อมูลเพียงพอ',

                formula:
                    '(จำนวนเดือนที่มีการออม ÷ จำนวนเดือนที่ใช้ประเมิน) × 100',

                unit: '%',
                direction: 'higher',
            },
        ],

        formula: 'คะแนน SC',

        target:
            'มีการออมเงินอย่างสม่ำเสมอ โดยพิจารณาเฉพาะเดือนที่มีข้อมูลเพียงพอ',

        Icon: Wallet,
        color: '#159b76',
        background: '#e7f7f0',
    },

    {
        id: 'borrow',
        name: 'Borrow',
        title: 'ด้านหนี้สิน/การให้ยืม',
        description:
            'ประเมินภาระการชำระหนี้เมื่อเทียบกับรายได้ และพฤติกรรมการชำระหนี้ตรงตามกำหนด',

        indicators: [
            {
                id: 'DSR',
                name: 'Debt Service Ratio (DSR)',
                title: 'อัตราส่วนภาระหนี้ต่อรายได้',
                description:
                    'วัดสัดส่วนภาระผ่อนชำระหนี้ต่อเดือนเมื่อเทียบกับรายได้สุทธิต่อเดือน',

                formula:
                    '(ยอดชำระหนี้ต่อเดือน ÷ รายได้สุทธิต่อเดือน) × 100',

                unit: '%',
                direction: 'lower',
            },
            {
                id: 'ODP',
                name: 'On-time Debt Payment (ODP)',
                title: 'อัตราการชำระหนี้ตรงเวลา',
                description:
                    'วัดจำนวนงวดที่ผู้ใช้ชำระหนี้ตรงตามกำหนดเมื่อเทียบกับจำนวนงวดที่ถึงกำหนดชำระทั้งหมด',

                formula:
                    '(จำนวนงวดที่ชำระตรงเวลา ÷ จำนวนงวดที่ถึงกำหนดชำระทั้งหมด) × 100',

                unit: '%',
                direction: 'higher',
            },
        ],

        formula: '(คะแนน DSR + คะแนน ODP) ÷ 2',

        target:
            'มีภาระหนี้ที่เหมาะสมกับรายได้ และสามารถชำระหนี้ได้ตรงตามกำหนด',

        Icon: HandCoins,
        color: '#dc7650',
        background: '#fff0e9',
    },
];

// ระดับคะแนนของแต่ละตัวชี้วัด
export const scoreLevels = [
    { score: 100, label: 'ดีมาก' },
    { score: 75, label: 'ดี' },
    { score: 50, label: 'ปานกลาง' },
    { score: 25, label: 'ควรปรับปรุง' },
    { score: 0, label: 'ควรปรับปรุงอย่างมาก' },
];

export default finHealthCriteria;
