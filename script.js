// --- 1. ตั้งค่าเชื่อมต่อ Supabase ---
const SUPABASE_URL = "https://znaduzusrhntkopejfbr.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_w9_2JBY3zX6hMef13QfY8A_xcKdO2RZ";

// ฟังก์ชันเรียกใช้ Supabase Client ป้องกันการโหลด SDK ไม่ทัน
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
const LOW_STOCK_LIMIT = 3;

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

    // 3.1 บันทึกลงตาราง orders ใน Supabase
    const { error: orderErr } = await client
      .from('orders')
      .insert([{ customer_name: name, contact: contact, item_name: item, total: total, note: note, address: address }]);

    if (orderErr) throw orderErr;

    // 3.2 ค้นหาและตัดสต็อกในตาราง stock
    let stockInfo = '';
    const { data: stockData, error: stockErr } = await client.from('stock').select('*');
    if (stockErr) throw stockErr;

    const target = stockData?.find(s => 
      s.product_name.trim() === item || 
      (item !== '' && s.product_name.toLowerCase().includes(item.toLowerCase()))
    );

    if (!target) {
      stockInfo = `⚠️️ ไม่พบสินค้า "${item}" ในตาราง Stock`;
    } else {
      const currentQty = target.quantity;
      if (currentQty <= 0) {
        stockInfo = '🚨 สินค้าหมดสต็อกอยู่แล้ว!';
      } else {
        const remain = currentQty - 1;
        await client.from('stock').update({ quantity: remain }).eq('id', target.id);

        if (remain === 0) stockInfo = '🚨 สินค้าหมดสต็อกแล้ว!';
        else if (remain <= LOW_STOCK_LIMIT) stockInfo = `⚠️ เตือนสต็อกต่ำ! เหลือเพียง ${remain} ชิ้น`;
        else stockInfo = `📊 คงเหลือ ${remain} ชิ้น`;
      }
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
    
    // โหลดหน้ารายการสินค้าใหม่เพื่ออัปเดตจำนวนสต็อกบนหน้าจอ (ถ้าเปิดอยู่ที่ product.html)
    if (typeof loadProductsFromSupabase === 'function') {
      loadProductsFromSupabase();
    }
  } catch (err) {
    console.error('Error:', err);
    alert('เกิดข้อผิดพลาด: ' + err.message);
  }
}
