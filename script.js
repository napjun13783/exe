// --- 1. ตั้งค่าเชื่อมต่อ Supabase ---
const SUPABASE_URL = "https://znaduzusrhntkopejfbr.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_w9_2JBY3zX6hMef13QfY8A_xcKdO2RZ";

function getSupabaseClient() {
  if (window._supabaseInstance) return window._supabaseInstance;

  if (window.supabase && typeof window.supabase.createClient === 'function') {
    window._supabaseInstance = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    return window._supabaseInstance;
  }

  throw new Error("ไม่พบ Supabase SDK กรุณาเช็กบรรทัด  ในส่วน  ของ HTML");
}

// --- 2. ตั้งค่า Telegram แจ้งเตือน ---
const TELEGRAM_TOKEN = "8885002492:AAGTW9aV89PosCdYSY33Lhf_qZR5HMui1P0";
const TELEGRAM_CHAT_ID = "-1004384220202";

// --- 3. ฟังก์ชันบันทึกออเดอร์ ตัดสต็อก และส่ง Telegram ---
async function handleOrderSubmit(orderData) {
  try {
    const client = getSupabaseClient();

    const name = orderData['ชื่อ-นามสกุล ผู้รับ'] || orderData.name || 'ลูกค้าหน้าร้าน (POS)';
    const contact = orderData['เบอร์โทรศัพท์ / LINE ID'] || orderData.phone || '-';
    const address = orderData['ที่อยู่'] || orderData.address || '-';
    const item = String(orderData['รายการสินค้า'] || orderData.item || '').trim();
    const total = Number(orderData['ยอดรวมทั้งสิ้น (บาท)'] || orderData.total || 0);
    const note = orderData['ไซส์ที่ต้องการ / หมายเหตุเพิ่มเติม'] || orderData.note || '-';

    // 3.1 บันทึกลงตาราง orders
    const { error: orderErr } = await client
      .from('orders')
      .insert([{ customer_name: name, contact: contact, item_name: item, total: total, note: note, address: address }]);

    if (orderErr) throw new Error('บันทึกออเดอร์ไม่สำเร็จ: ' + orderErr.message);

    // 3.2 เรียกใช้ฟังก์ชัน reduce_stock ฝั่ง Database
    const { data: stockResult, error: stockErr } = await client.rpc('reduce_stock', { target_name: item });
    
    let stockInfo = '';
    if (stockErr) {
      stockInfo = `⚠️ ตัดสต็อกไม่สำเร็จ: ${stockErr.message}`;
    } else {
      stockInfo = `📊 สถานะสต็อก: ${stockResult}`;
    }

    // 3.3 ส่งข้อความแจ้งเตือนเข้า Telegram Group
    const msg =
      `🛒 มีออเดอร์ใหม่เข้า! (BareFit)\n` +
      `----------------------------------\n` +
      `👤 ผู้รับ: ${name}\n` +
      `📞 ติดต่อ: ${contact}\n` +
      `📦 สินค้า: ${item}\n` +
      `📍 ที่อยู่: ${address}\n` +
      `💰 ยอดรวม: ${total} บาท\n` +
      `📝 หมายเหตุ: ${note}\n` +
      `----------------------------------\n` +
      `${stockInfo}`;

    await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: msg })
    });

    alert('สั่งซื้อและบันทึกข้อมูลเรียบร้อยแล้ว!');

    if (typeof loadProductsFromSupabase === 'function') {
      loadProductsFromSupabase();
    }
  } catch (err) {
    console.error('Error:', err);
    alert('เกิดข้อผิดพลาด: ' + err.message);
  }
}
