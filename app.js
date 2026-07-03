import { createClient } from '@supabase/supabase-js';
import ethers from 'ethers';

// เชื่อมต่อหลังบ้าน Supabase บรรทัดนี้จะดึงคีย์ปลอดภัยจาก Vercel อัตโนมัติ
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

/**
 * ฟังก์ชันที่ 1: ดึงราคากลางจาก CoinMarketCap เพื่อแสดงผลบนหน้าจอเทรดของแอป
 */
async function getCryptoPrice(cryptoSymbol) {
    try {
        const response = await fetch(`https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?symbol=${cryptoSymbol}`, {
            headers: {
                'X-CMC_PRO_API_KEY': process.env.CMC_API_KEY // รหัส 857d8cb8... ของคุณจะถูกเรียกใช้งานที่นี่
            }
        });
        const data = await response.json();
        return data.data[cryptoSymbol].quote.USD.price;
    } catch (error) {
        console.error("ไม่สามารถดึงราคากลางได้:", error);
    }
}

/**
 * ฟังก์ชันที่ 2: คำนวณยอดรวมหน้าโปรไฟล์ตามสูตรธุรกิจของคุณ
 * สูตร: ยอดรวม = ยอดเงินเทรด + ยอดเงินสินทรัพย์
 */
async function calculateProfileBalances(userId, currencyRate = 36.5) {
    // 1. ดึงข้อมูลจากฐานข้อมูลกระเป๋าเงิน
    const { data: wallet, error } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', userId)
        .single();

    if (error) return;

    // 2. ดึงข้อมูลผู้ใช้เพื่อดูค่าเงินที่เลือกไว้ (USD หรือ THB)
    const { data: user } = await supabase.from('users').select('display_currency, user_id_8_digits, account_name').eq('id', userId).single();

    let total = parseFloat(wallet.trading_balance) + parseFloat(wallet.asset_balance);
    let trading = parseFloat(wallet.trading_balance);
    let asset = parseFloat(wallet.asset_balance);

    // ถ้าผู้ใช้เลือกแสดงผลเป็นเงินบาท (THB) ให้แปลงค่าก่อนส่งไปหน้าโปรไฟล์
    if (user.display_currency === 'THB') {
        total *= currencyRate;
        trading *= currencyRate;
        asset *= currencyRate;
    }

    return {
        uid: user.user_id_8_digits, // แสดงไอดี 8 หลักที่สุ่มได้ในโปรไฟล์
        name: user.account_name,
        totalBalance: total.toFixed(2),
        tradingBalance: trading.toFixed(2),
        assetBalance: asset.toFixed(2),
        unit: user.display_currency
    };
}

/**
 * ฟังก์ชันที่ 3: ระบบสั่งสมัครระดับสมาชิกและการล็อกเหรียญห้ามขาย (Membership Level Up & Asset Lock)
 */
async function upgradeMembership(userId, targetLevel) {
    // 1. ดึงยอดเงินพอร์ตสินทรัพย์ปัจจุบันมาเช็คเงื่อนไข
    const { data: wallet } = await supabase.from('wallets').select('asset_balance').eq('user_id', userId).single();
    const assetAmount = parseFloat(wallet.asset_balance);

    let requiredAmount = 0;
    let rewardRate = 1.0; // เลเวล 0 ขุดได้ 1%

    if (targetLevel === 1) { requiredAmount = 1000; rewardRate = 5.0; }
    else if (targetLevel === 2) { requiredAmount = 5000; rewardRate = 7.0; }
    else if (targetLevel === 3) { requiredAmount = 50000; rewardRate = 10.0; }
    else if (targetLevel === 4) { requiredAmount = 750000; rewardRate = 15.0; }

    // ตรวจสอบเงื่อนไขยอดเงินในพอร์ตสินทรัพย์สะสม
    if (assetAmount < requiredAmount) {
        return { success: false, message: `ยอดเงินในพอร์ตสินทรัพย์ไม่พอสำหรับ Level ${targetLevel} ต้องมีขั้นต่ำ $${requiredAmount}` };
    }

    // ผ่านเงื่อนไข: ปรับระดับสมาชิกในระบบ และสั่งล็อกสินทรัพย์ห้ามขายทันที
    await supabase.from('users').update({ membership_level: targetLevel }).eq('id', userId);
    await supabase.from('mining_pools').update({ is_locked: true }).eq('user_id', userId).eq('status', 'ACTIVE');

    return { success: true, message: `ยินดีด้วยคุณได้เป็นสมาชิก Level ${targetLevel} และระบบได้ล็อกเหรียญขุดห้ามขายชั่วคราว` };
}

/**
 * ฟังก์ชันที่ 4: ลูปนับเวลาถอยหลังการขุด 24 ชั่วโมง และคำนวณโบนัสเมื่อครบกำหนด
 */
async function claimMiningRewards(miningPoolId) {
    const { data: pool } = await supabase.from('mining_pools').select('*').eq('id', miningPoolId).single();
    
    if (pool.status === 'COMPLETED') return;

    const now = new Date();
    const endTime = new Date(pool.end_time);

    // ตรวจสอบว่าเวลาเซิร์ฟเวอร์เดินไปครบ 24 ชั่วโมงหรือยัง
    if (now >= endTime) {
        // สูตรคำนวณโบนัส: เงินขุด * เปอร์เซ็นต์โบนัสของเลเวลสมาชิก
        const reward = parseFloat(pool.staked_amount) * (parseFloat(pool.reward_rate) / 100);
        
        // 1. จ่ายเงินรางวัลบวกเพิ่มเข้าไปในกระเป๋าสินทรัพย์สะสม (Spot Wallet)
        const { data: wallet } = await supabase.from('wallets').select('asset_balance').eq('user_id', pool.user_id).single();
        const newAssetBalance = parseFloat(wallet.asset_balance) + reward;
        
        await supabase.from('wallets').update({ asset_balance: newAssetBalance }).eq('user_id', pool.user_id);
        
        // 2. ปิดรอบการขุดนี้เพื่อให้ปุ่มในหน้าเว็กรีเซ็ตให้กดเริ่มขุดรอบใหม่ได้
        await supabase.from('mining_pools').update({ status: 'COMPLETED' }).eq('id', miningPoolId);

        // 3. ตรวจสอบเงื่อนไขเพื่อปลดล็อกเหรียญอัตโนมัติหากยอดเงินสะสมโตข้ามเกณฑ์เลเวลสมาชิกแล้ว
        const { data: user } = await supabase.from('users').select('membership_level').eq('id', pool.user_id).single();
        let unlockGate = 0;
        if (user.membership_level === 1) unlockGate = 5000;
        else if (user.membership_level === 2) unlockGate = 50000;
        else if (user.membership_level === 3) unlockGate = 750000;
        else if (user.membership_level === 4) unlockGate = 10000000;

        if (newAssetBalance >= unlockGate) {
            await supabase.from('mining_pools').update({ is_locked: false }).eq('user_id', pool.user_id);
        }
        
        return { status: "SUCCESS", rewarded: reward };
    } else {
        // หากยังไม่ครบ 24 ชั่วโมง ส่งเวลานับถอยหลังกลับไปแสดงผลที่หน้าจอเว็บ
        const timeLeftBytes = endTime.getTime() - now.getTime();
        return { status: "MINING_RUNNING", timeLeftMs: timeLeftBytes };
    }
}

/**
 * ฟังก์ชันที่ 5: ตรวจจับสเตทเม้นท์บนบล็อกเชน ERC20 เพื่ออนุมัติเงินฝากเข้าแอปอัตโนมัติ
 */
async function listenToEthereumDeposit() {
    const provider = new ethers.providers.JsonRpcProvider(process.env.INFURA_RPC_URL); // ลิงก์ https://mainnet.infura.io/v3/... ของคุณจะรันที่นี่
    const adminWalletAddress = "0x137be2e29fd59fcc9a344ec8309672f22b5cc778"; // กระเป๋าที่คุณส่งมาเป็นเป้าหมายตรวจสอบ

    // สั่งให้โค้ดคอยเงี่ยหูฟังบล็อกเชนตลอดเวลา มีบล็อกใหม่เกิดให้ส่องทันที
    provider.on("block", async (blockNumber) => {
        const block = await provider.getBlockWithTransactions(blockNumber);
        for (let tx of block.transactions) {
            // หากมีคนโอนเงินมาที่กระเป๋าแอดมิน FundFusion จริง
            if (tx.to && tx.to.toLowerCase() === adminWalletAddress.toLowerCase()) {
                const valueInValue = ethers.utils.formatEther(tx.value);
                
                // ค้นหาว่ากระเป๋าที่โอนมาตรงกับที่ลงทะเบียนในเว็บแอปไหม แล้วอัปเดตยอดเงินใน "กระเป๋าเงินทั้งหมด" ทันที
                console.log(`พบยอดเงินฝากใหม่บนเครือข่าย ERC20 จำนวน ${valueInValue} ETH โอนเข้ากระเป๋าระบบสำเร็จ!`);
            }
        }
    });
}
