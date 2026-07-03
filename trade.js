// จำลองการดึงราคากลางสินทรัพย์จากหน้าบ้านผ่าน API Key ที่ฝันไว้ใน Vercel
let currentAsset = "BTC";
let assetPrices = { BTC: 62581.89, ETH: 1757.20, BNB: 572.64 };

// ฟังก์ชันจำลองราคาให้วิ่งขึ้นลงทุกๆ 2 วินาทีเพื่อให้บอร์ดดูเคลื่อนไหวจริง
setInterval(() => {
    let change = (Math.random() - 0.5) * 20; 
    assetPrices[currentAsset] = parseFloat((assetPrices[currentAsset] + change).toFixed(2));
    document.getElementById('current-price').innerText = `$${assetPrices[currentAsset].toLocaleString()}`;
}, 2000);

function changeAsset() {
    currentAsset = document.getElementById('asset-select').value;
    document.getElementById('current-price').innerText = `$${assetPrices[currentAsset].toLocaleString()}`;
}

/**
 * ฟังก์ชันหลัก: การคำนวณออกออเดอร์เทรดและส่งบันทึกไปยัง Supabase
 */
function placeOrder(direction) {
    const margin = parseFloat(document.getElementById('trade-amount').value);
    const leverage = parseInt(document.getElementById('leverage-select').value);
    const stopLoss = parseFloat(document.getElementById('stop-loss').value);
    
    // คำนวณขนาดสัญญารวมตามสูตรธุรกิจ: ขนาดสัญญา = เงินทุน * ตัวคูณ Leverage
    const totalVolume = margin * leverage;
    const entryPrice = assetPrices[currentAsset];

    // คำนวณราคาล้างพอร์ตอัตโนมัติ (Liquidation Price) ป้องกันลูกค้าติดลบเกินทุน
    let liquidationPrice;
    if (direction === 'BUY') {
        liquidationPrice = entryPrice * (1 - (1 / leverage));
    } else {
        liquidationPrice = entryPrice * (1 + (1 / leverage));
    }

    alert(`
    ====== บันทึกคำสั่งซื้อขายสำเร็จ ======
    สินทรัพย์: ${currentAsset}
    ประเภทสัญญา: ${direction} (Leverage ${leverage}x)
    เงินทุนเริ่มต้น: $${margin}
    ขนาดสัญญารวมทั้งหมด: $${totalVolume.toLocaleString()}
    ราคาเข้าซื้อ: $${entryPrice}
    ราคาล้างพอร์ต (Liquidation): $${liquidationPrice.toFixed(2)}
    `);

    // ในระบบจริง โค้ดบรรทัดนี้จะส่งคำสั่งลบยอดเงินออกจากตาราง wallets ในช่อง trading_balance บน Supabase ทันที
    console.log("บันทึกข้อมูลออเดอร์นี้ลงตาราง public.orders เรียบร้อยแล้ว");
}

// โหลดรหัสลูกค้าจำลองแสดงบนหน้าเว็บ
window.onload = () => {
    document.getElementById('user-display-id').innerText = "58492013";
};