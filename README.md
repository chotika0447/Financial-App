คำสั่งโคลนโปรเจคจาก Terminal
=> git clone https://github.com/chotika0447/Financial-App.git
____________________________________________________________________________
# เริ่มรันโปรเจค
ตอนพัฒนา จะเปิด 2 Terminal

Terminal 1:

cd backend
python -m venv .venv (รันเฉพาะตอน clone โปรเจคมาครั้งแรก)
.\.venv\Scripts\Activate.ps1(ทำการ activate .venv ถ้าจะออกให้พิมพ์ deactivate)
pip install -r requirements.txt (ติดตั้งไฟล์ทั้งหมดที่ใช้ในโปรเจคนี้)

ในส่วนของไฟล์.env (สร้างเองได้เลย เอาไว้ที่ Backend/.env)
-ให้ copy ค่าในไฟล์ backend/.env.example มาใส่ .env ของตัวเองแล้วใส่ข้อมูลจริงของ supabase 
-ทดสอบว่า Django เชื่อม Supabase แล้ว:  python manage.py migrate

python manage.py runserver (รันbackend ตอนนี้ยังไม่มีข้อมูลจ่ะอิอิ)
หยุดรันกด ctrl+c
____________________________________________________________________________
Terminal 2: 

cd frontend
npm install(เพื่อสร้างโฟล์เดอร์ node_modules ของตัวเอง)
npm run dev(รันfrontend พอรันเสร็จจะได้ลิงก์ประมาณนี้ http://localhost:5173/ ให้กดดูได้เลย)
หยุดรันกด ctrl+c
____________________________________________________________________________
ในกรณีที่ มีการเพิ่ม package Django ในฝั่ง backend ภายหลัง
เช่น pip install pillow
จะต้อง pip freeze > requirements.txt เพื่อบันทึกไว้ใน requirements
แล้วก็ push ขึ้น git ตามนี้
    git add requirements.txt หรือ git add .
    (สามารถใช้ git status เพื่อดูว่ามีอะไรเปลี่ยนแปลงไปบ้างก่อน commit ได้)
    git commit -m "update requirements"
    git push origin main
จากนั้นเครื่องคนอื่นก็ Pull จาก git เพื่ออัพเดตได้เลย  -> git pull
แล้ว pip install -r requirements.txt จบ

ในส่วนฝั่ง frontend (ข้อมูลในไฟล์ package.json และ package-lock.json จะเปลี่ยน)ก็ให้ทำ push&pull เหมือนกัน แล้วพิมพ์ npm install
____________________________________________________________________________
# เกี่ยวกับ Model
ใช้คำสั่ง python manage.py makemigrations
แล้ว python manage.py migrate
เพื่อสร้างตารางใน Supabase

ในกรณีที่ต้องการเปลี่ยนชื่อ model (ชื่อclassของตารางข้อมูล)
ให้ Rename model <ชื่อเดิม> to <ชื่อใหม่>
แล้วถ้ามีการ reference ชื่อclassเดิมที่อื่นก็ต้องไปแก้ให้ถูกด้วย