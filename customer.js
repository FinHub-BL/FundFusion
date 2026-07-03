// จำลองสถานะการเชื่อมต่อหลังบ้านและดึงข้อมูลจากตัวแปรใน Vercel
const CONFIG = {
    currency: 'USD',
    rateTHB: 36.50,
    isLocked: true
};

// ข้อมูลจำลองที่ดึงมาจากฐานข้อมูล Supabase หลังจากผ่านระบบสุ่ม ID 8 หลักมาแล้ว
const mockUserData = {
    uid: "58492013", // เลข 8 หลักสุ่มอัตโนมัติจากชุดโค้ด Supabase
    name: "Somchai FinHub",
    trading_balance: 500.00, // กระเป๋าเงินเทรด
    asset_balance: 1200.50,  // กระเป๋าเงินสินทรัพย์
    level: 1
};

// ฟังก์ชันอัปเดตตัวเลขหน้าจอตามสูตร: เงินรวม = เงินเทรด + เงินสินทรัพย์
function updateDashboard() {
    document.getElementById('username').innerText = mockUserData.name;
    document.getElementById('user-id').innerText = mockUserData.uid;
    document.getElementById('member-level').innerText = `Level ${mockUserData.level}`;

    let trading = mockUserData.trading_balance;
    let asset = mockUserData.asset_balance;
    let total = trading + asset; // สูตรคำนวณยอดเงินรวมพอร์ต

    // ตรวจสอบระบบสลับสกุลเงินตามเมนู
    if (CONFIG.currency === 'THB') {
        trading *= CONFIG.rateTHB;
        asset *= CONFIG.rateTHB;
        total *= CONFIG.rateTHB;
        
        document.getElementById('total-bal').innerText = `฿${total.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
        document.getElementById('trading-bal').innerText = `฿${trading.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
        document.getElementById('asset-bal').innerText = `฿${asset.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
    } else {
        document.getElementById('total-bal').innerText = `$${total.toFixed(2)}`;
        document.getElementById('trading-bal').innerText = `$${trading.toFixed(2)}`;
        document.getElementById('asset-bal').innerText = `$${asset.toFixed(2)}`;
    }
}

// ระบบสลับสกุลเงินเมนูสามขีด THB/USD
function toggleCurrency() {
    CONFIG.currency = CONFIG.currency === 'USD' ? 'THB' : 'USD';
    updateDashboard();
}

// ระบบนับเวลาถอยหลังการขุด 24 ชม.
function startMining() {
    let timeLeft = 24 * 60 * 60; // 24 ชั่วโมงในหน่วยวินาที
    const btn = document.getElementById('mining-btn');
    const timerText = document.getElementById('timer-text');
    
    btn.disabled = true;
    btn.style.background = '#7c7c8a';
    btn.innerText = "🚨 ระบบกำลังขุดอัตโนมัติ...";

    const countdown = setInterval(() => {
        timeLeft--;
        let hours = Math.floor(timeLeft / 3600);
        let minutes = Math.floor((timeLeft % 3600) / 60);
        let seconds = timeLeft % 60;

        timerText.innerText = `⏳ เวลาที่เหลือในการขุดรอบนี้: ${hours} ชม. ${minutes} นาที ${seconds} วินาที`;

        if (timeLeft <= 0) {
            clearInterval(countdown);
            timerText.innerText = "สถานะ: ขุดเสร็จสิ้น! ระบบโอนโบนัสเข้าพอร์ตสินทรัพย์แล้ว";
            btn.disabled = false;
            btn.style.background = '#00b37e';
            btn.innerText = "⛏️ กดเริ่มขุดเพื่อรับโบนัสรายวัน";
            
            // เพิ่มเงินรางวัลโบนัสตามเลเวลเข้าพอร์ตสินทรัพย์ (ตัวอย่าง Level 1 ได้โบนัสสะสมเพิ่ม)
            mockUserData.asset_balance += 50.00; 
            updateDashboard();
        }
    }, 1000); // ทำซ้ำทุกๆ 1 วินาทีเพื่อให้นาฬิกาเดินลื่นไหล
}

// สั่งให้หน้าแดชบอร์ดแสดงผลทันทีที่เปิดหน้าเว็บ
window.onload = updateDashboard;