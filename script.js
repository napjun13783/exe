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
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyIW-ydWw3RXqrTwR3GwgFLaxuR0_VuUSSrYneLzw6iqoeBpqNC26DV613jhlsX912d/exec';
const CSV_URL = 'YOUR_CSV_URL'; // ใส่ลิงก์ CSV จริงของคุณ

// กัน HTML/XSS จากข้อมูลลูกค้าและข้อมูลสินค้า
function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// อ่าน CSV ที่มีเครื่องหมายจุลภาคหรือขึ้นบรรทัดใหม่ใน "..." ได้
function parseCSV(text) {
  const rows = [];
  let row = [], cell = '', inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') inQuotes = false;
      else cell += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); cell = '';
      rows.push(row); row = [];
    } else cell += ch;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);

  // ==========================================
  // ส่วนหน้าแสดงสินค้า
  // ==========================================
  const productList = document.getElementById('product-list');

  function renderProducts(products, filter) {
    const filtered = filter === 'all' ? products : products.filter(p => p.mood === filter);
    productList.innerHTML = filtered.map(p => `
      <div class="card">
        <span class="card-tag tag-${esc(p.mood)}">${esc(p.mood)}</span>
        <img src="${esc(p.image)}" alt="${esc(p.name)}">
        <h3>${esc(p.name)}</h3>
        <p>${esc(p.description)}</p>
        <div class="price">฿${esc(p.price)}</div>
        <a href="order.html?item=${encodeURIComponent(p.name)}&price=${encodeURIComponent(p.price)}"
           class="btn" style="text-align:center;">สั่งซื้อสินค้า</a>
      </div>
    `).join('');
  }

  if (productList) {
    fetch('products.json')
      .then(res => {
        if (!res.ok) throw new Error('โหลด products.json ไม่สำเร็จ');
        return res.json();
      })
      .then(products => {
        const moodFilter = urlParams.get('mood') || 'all';
        renderProducts(products, moodFilter);

        const filterBar = document.getElementById('filter-bar');
        if (filterBar) {
          const activeBtn = filterBar.querySelector(`[data-mood="${CSS.escape(moodFilter)}"]`);
          if (activeBtn) activeBtn.classList.add('active');

          filterBar.addEventListener('click', (e) => {
            if (e.target.tagName === 'BUTTON') {
              filterBar.querySelectorAll('button').forEach(b => b.classList.remove('active'));
              e.target.classList.add('active');
              renderProducts(products, e.target.dataset.mood);
            }
          });
        }
      })
      .catch(err => {
        console.error(err);
        productList.innerHTML = '<p>โหลดสินค้าไม่สำเร็จ กรุณารีเฟรชหน้า</p>';
      });
  }

  // ==========================================
  // ส่วนหน้าสั่งซื้อ (ส่งไป Apps Script ที่เดียว)
  // ==========================================
  const orderForm = document.getElementById('orderForm');
  if (orderForm) {
    const itemInput = document.getElementById('items');
    const totalInput = document.getElementById('total');
    if (urlParams.has('item')) itemInput.value = urlParams.get('item');
    if (urlParams.has('price')) totalInput.value = urlParams.get('price');

    orderForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const val = (id) => document.getElementById(id)?.value.trim() || '-';

      const payload = new URLSearchParams();
      payload.append('ชื่อ-นามสกุล ผู้รับ', val('customerName'));
      payload.append('เบอร์โทรศัพท์ / LINE ID', val('contact'));
      payload.append('ที่อยู่', val('address'));
      payload.append('รายการสินค้า', itemInput?.value || '-');
      payload.append('ยอดรวมทั้งสิ้น (บาท)', totalInput?.value || '0');
      payload.append('ไซส์ที่ต้องการ / หมายเหตุเพิ่มเติม', val('note'));

      const submitBtn = orderForm.querySelector('button[type="submit"]');
      const originalText = submitBtn.innerText;
      submitBtn.innerText = 'กำลังส่งคำสั่งซื้อ...';
      submitBtn.disabled = true;

      try {
        // Apps Script จะบันทึกลง Sheet และแจ้ง Telegram ให้เอง
        await fetch(APPS_SCRIPT_URL, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: payload.toString()
        });
        window.location.href = 'thankyou.html';
      } catch (err) {
        console.error(err);
        alert('เกิดข้อผิดพลาดในการส่งข้อมูล กรุณาลองใหม่อีกครั้ง');
        submitBtn.innerText = originalText;
        submitBtn.disabled = false;
      }
    });
  }

  // ==========================================
  // ส่วน Admin
  // ==========================================
  const ordersTableBody = document.querySelector('#ordersTable tbody');
  if (ordersTableBody) {
    fetch(CSV_URL)
      .then(res => {
        if (!res.ok) throw new Error('โหลด CSV ไม่สำเร็จ');
        return res.text();
      })
      .then(csv => {
        const rows = parseCSV(csv).slice(1).filter(r => r.some(c => c.trim()));
        ordersTableBody.innerHTML = rows.reverse()
          .map(cols => `<tr>${cols.map(c => `<td>${esc(c)}</td>`).join('')}</tr>`)
          .join('');
      })
      .catch(err => console.error(err));
  }
});
