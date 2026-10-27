เริ่มโคลนโปรเจคจาก Terminal
git clone https://github.com/chotika0447/Financial-App.git

จากนั้นรันในโฟลเดอร์ที่รวม backend ด้วย
python -m venv .venv (รันเฉพาะตอน clone โปรเจคมาครั้งแรก)
.\.venv\Scripts\Activate.ps1(ทำการ activate .venv ถ้าจะออกให้พิมพ์ deactivate)
____________________________________________________________________________
# เริ่มรันโปรเจค
ตอนพัฒนา จะเปิด 2 Terminal และ frontend

Terminal 1:

cd backend
pip install -r requirements.txt (ติดตั้งไฟล์ทั้งหมดที่ใช้ในโปรเจคนี้ รันแค่ครั้งแรกหลังclone project)

ในส่วนของไฟล์.env (สร้างเองได้เลย เอาไว้ที่ Backend/.env)

รันbackend : python manage.py runserver (หยุดรันกด ctrl+c)

------------------------------------------------------------------
Terminal 2: 

cd frontend
npm install(เพื่อสร้างโฟล์เดอร์ node_modules ของตัวเอง รันแค่ครั้งแรกหลังclone project)

รันfrontend: npm run dev (หยุดรันกด ctrl+c)

__________________________________________________________________________
ในกรณีที่ มีการเพิ่ม package Django ในฝั่ง backend ภายหลัง
เช่น pip install pillow
จะต้องพิมพ์ python -m pip install -r requirements.txt ด้วย
เพื่อบันทึกไว้ใน requirements.txt เวลาclone project จะได้ติดตั้งแพ็กเกจทั้งหมดที่ใช้ของ Backend จากไฟล์นี้
___________________________________________________________________________
# เกี่ยวกับ Model(โครงสร้างตารางDB)

python manage.py showmigrations <ชื่อfolder ของApp backend> - ใช้แสดงประวัติการ migrate ตาราง อันที่เป็น [] คือ makemigrations แล้วแต่ยังไม่ได้ migrate
python manage.py makemigrations - เป็นเหมือนการสร้าง commit ก่อน push ตาราง
python manage.py migrate - คำสั่งสร้างตาราง เป็นเหมือนการ push ขึ้น git แต่อันนี้สร้างที่ supabase 
python manage.py check - ใช้เช็คหลัง migrate ว่าตารางมีปัญหามั้ย

*กรณีที่ต้องการเปลี่ยนชื่อ model (ชื่อclassของตารางข้อมูล): Rename model <ชื่อเดิม> to <ชื่อใหม่>
*คำสั่งล้างข้อมูลทั้งหมดในทุกตาราง python manage.py flush

*โหมดจัดการข้อมูลในDBผ่าน terminal 
cd Backend
python manage.py shell - เข้าสู่โหมดจัดการ
exit() - ออกจากโหมด
---------------------------------------

from <ชื่อโฟล์เดอร์>.models import <ชื่อclass ของ Model ในไฟล์ models.py >
<ชื่อclass ของ Model ในไฟล์ models.py >.objects.all().delete() - คำสั่งลบข้อมูลทั้งหมดในตาราง
<ชื่อclass ของ Model ในไฟล์ models.py >.objects.filter(id=12).delete() - คำสั่งลบข้อมูลเฉพาะแถวที่กำหนด

ตัวอย่าง 
แอพ debts มี2โมเดลในไฟล์เดียวกัน(models.py)คือ Debts และ Payments
เลยต่างกันที่คำหลัง import
from debts.models import Debts -
Debts.objects.all().delete()

from debts.models import Payments
Payments.objects.all().delete()
---------------------------------------
from friends.models import Friends
Friends.objects.all().delete()
Friends.objects.filter(id=12).delete()

___________________________________________________________________________
#คำสั่ง Github
ทุกครั้งที่จะ update:
-git status
-git add .
-git commit -m "update"
กรณีสร้าง branch ใหม่แล้ว push ครั้งแรก
-git push -u origin <branch name> 
แล้วครั้งต่อๆไปใช้ git push เฉยๆ ได้เลย หรือจะใช้ git push origin <branch name> ก็ได้*แบบนี้ชัวร์กว่า

---------------------------------------------------------------------
ดึงข้อมูลล่าสุดทั้งหมดของ git
- git fetch origin 
ดู branch ทั้งหมด
- git branch -a 
ดูว่าตอนนี้อยู่ branch ไหน
- git branch 
สร้างbranch ใหม่
- git switch -c <new_branch_name>
ย้ายbranch
-git switch <branch name>

*อื่นๆ
- git pull origin main ดึงข้อมูลล่าสุดจาก main มารวมกับ ไฟล์ที่ทำอยู่ในเครื่อง **อย่าลืม commit และ fetch origin ก่อน pull
- git merge origin main
___________________________________________________________________________
สร้าง Superuser(Admin) ผ่าน terminal 
ใช้ python manage.py createsuperuser