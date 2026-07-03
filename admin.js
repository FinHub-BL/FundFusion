// จำลองการค้นหาข้อมูลในตาราง public.users และ public.wallets บนระบบ Supabase ด้วย ID 8 หลัก
const mockDatabase = {
    "58492013": {
        name: "Somchai FinHub",
        total: 1700.50,
        trading: 500.00,
        asset: 1200.50,
        level: 1
    }
};

/**
 * ฟังก์ชันค้นหาข้อมูลสมาชิกจากรหัสสุ่ม 8 หลัก
 */
function searchUser() {
    const uid = document.getElementById('search-uid').value;
    const profileBox = document.getElementById('admin-user-profile');

    if (mockDatabase[uid]) {
        const user = mockDatabase[uid];
        
        // ส่งข้อมูลขึ้นหน้าจอแก้ไขของแอดมิน
        document.getElementById('res-name').innerText = user.name;
        document.getElementById('res-uid').innerText = uid;
        document.getElementById('edit-total').value = user.total;
        document.getElementById('edit-trading').value = user.trading;
        document.getElementById('edit-asset').value = user.asset;
        document.getElementById('edit-level').value = user.level;

        // เปิดแสดงผลแผงจัดการข้อมูล
        profileBox.style.display = "block";
    } else {
        alert("🚨 ไม่พบข้อมูลผู้ใช้งานรหัสไอดีนี้ในระบบ FundFusion กรุณาตรวจสอบอีกครั้ง");
        profileBox.style.display = "none";
    }
}

/**
 * ฟังก์ชันบันทึกข้อมูลปรับยอดเงินและเลเวลสมาชิกเข้าเซิร์ฟเวอร์หลัก
 */
function saveUserChanges() {
    const uid = document.getElementById('res-uid').innerText;
    
    // ดึงค่าที่แอดมินพิมพ์แก้ไขจากหน้าจอ
    const newTotal = parseFloat(document.getElementById('edit-total').value);
    const newTrading = parseFloat(document.getElementById('edit-trading').value);
    const newAsset = parseFloat(document.getElementById('edit-asset').value);
    const newLevel = parseInt(document.getElementById('edit-level').value);

    // ทำการอัปเดตค่าลงในตารางจำลอง (ของจริงจะยิงคำสั่ง .update() ไปที่ตาราง wallets บน Supabase ทันที)
    mockDatabase[uid].total = newTotal;
    mockDatabase[uid].trading = newTrading;
    mockDatabase[uid].asset = newAsset;
    mockDatabase[uid].level = newLevel;

    alert(`
    ✨ ทำการอัปเดตฐานข้อมูลสำเร็จเรียบร้อย!
    สมาชิกรหัส: ${uid}
    ปรับยอดเงินเทรดเป็น: $${newTrading.toFixed(2)}
    ปรับยอดเงินสินทรัพย์เป็น: $${newAsset.toFixed(2)}
    ระดับสมาชิกใหม่: Level ${newLevel}
    `);
    
    console.log("บันทึกการปรับปรุงข้อมูลโดยแอดมินส่งไปยังหลังบ้านสำเร็จแล้ว");
}