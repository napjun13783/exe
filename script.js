const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwRYTofrqiijrsYg2A-hIBflqWr6Lpkg-v9ejn0RpuzxNztDGyowtHiinOZMD1flxoC/exec';
const CSV_URL = 'YOUR_CSV_URL';

// ==========================================
// ตั้งค่า Telegram
// ==========================================
const TELEGRAM_BOT_TOKEN = 'ใส่โทเคนใหม่ที่ได้จาก BotFather';
const TELEGRAM_CHAT_ID = '-1004384220202';

// กันข้อความของลูกค้าทำ HTML ของ Telegram พัง
function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// ส่งแจ้งเตือนเข้า Telegram (ถ้า error จะไม่ทำให้ออเดอร์พัง)
async function sendTelegramNotification(message) {
  try {
    const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: 'HTML',
      }),
    });
    const data = await res.json();
    if (!data.ok) console.error('Telegram error:', data);
  } catch (error) {
    console.error('Error sending Telegram notification:', error);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);

  // ==========================================
  // ส่วนหน้าแสดงสินค้า
  // ==========================================
  const productList = document.getElementById('product-list');
  if (productList) {
    fetch('products.json').then(res => res.json()).then(products => {
      const moodFilter = urlParams.get('mood') || 'all';
      renderProducts(products, moodFilter);

      const filterBar = document.getElementById('filter-bar');
      if (filterBar) {
        const activeBtn = filterBar.querySelector(`[data-mood="${moodFilter}"]`);
        if (activeBtn) activeBtn.classList.add('active');

        filterBar.addEventListener('click', (e) => {
          if (e.target.tagName === 'BUTTON') {
            filterBar.querySelectorAll('button').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            renderProducts(products, e.target.dataset.mood);
          }
        });
      }
    });
  }

  function renderProducts(products, filter) {
    productList.innerHTML = '';
    const filtered = filter === 'all' ? products : products.filter(p => p.mood === filter);
    filtered.forEach(p => {
      productList.innerHTML += `
        <div class="card">
          <span class="card-tag tag-${p.mood}">${p.mood}</span>
          <img src="${p.image}" alt="${p.name}">
          <h3>${p.name}</h3>
          <p>${p.description}</p>
          <div class="price">฿${p.price}</div>
          <a href="order.html?item=${encodeURIComponent(p.name)}&price=${p.price}" class="btn" style="text-align:center;">สั่งซื้อสินค้า</a>
        </div>
      `;
    });
  }

  // ==========================================
  // ส่วนหน้าสั่งซื้อ + Google Sheet + Telegram
  // ==========================================
  const orderForm = document.getElementById('orderForm');
  if (orderForm) {
    const itemInput = document.getElementById('items');
    const totalInput = document.getElementById('total');
    if (urlParams.has('item')) itemInput.value = urlParams.get('item');
    if (urlParams.has('price')) totalInput.value = urlParams.get('price');

    orderForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const customerName = document.getElementById('customerName')?.value || '-';
      const contact = document.getElementById('contact')?.value || '-';
      const address = document.getElementById('address')?.value || '-';
      const itemList = itemInput?.value || '-';
      const totalPrice = totalInput?.value || '0';
      const note = document.getElementById('note')?.value || '-';

      // ใช้ URLSearchParams แทน FormData เพื่อให้ Google Sheet อ่านออกแน่นอน
      const payload = new URLSearchParams();
      payload.append('ชื่อ-นามสกุล ผู้รับ', customerName);
      payload.append('เบอร์โทรศัพท์ / LINE ID', contact);
      payload.append('ที่อยู่', address);
      payload.append('รายการสินค้า', itemList);
      payload.append('ยอดรวมทั้งสิ้น (บาท)', totalPrice);
      payload.append('ไซส์ที่ต้องการ / หมายเหตุเพิ่มเติม', note);

      const submitBtn = orderForm.querySelector('button[type="submit"]');
      const originalText = submitBtn.innerText;
      submitBtn.innerText = 'กำลังส่งคำสั่งซื้อ...';
      submitBtn.disabled = true;

      const telegramMessage =
        `🛒 <b>มีออเดอร์ใหม่เข้า! (BareFit)</b>\n` +
        `----------------------------------\n` +
        `👤 <b>ผู้รับ:</b> ${esc(customerName)}\n` +
        `📞 <b>ติดต่อ:</b> ${esc(contact)}\n` +
        `📦 <b>สินค้า:</b> ${esc(itemList)}\n` +
        `📍 <b>ที่อยู่:</b> ${esc(address)}\n` +
        `💰 <b>ยอดรวม:</b> ${esc(totalPrice)} บาท\n` +
        `📝 <b>หมายเหตุ:</b> ${esc(note)}\n` +
        `----------------------------------`;

      try {
        // 1. แจ้งเตือน Telegram
        await sendTelegramNotification(telegramMessage);

        // 2. บันทึกลง Google Sheet
        await fetch(APPS_SCRIPT_URL, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: payload.toString()
        });

        // 3. สำเร็จแล้วไปหน้าขอบคุณ
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
    fetch(CSV_URL).then(res => res.text()).then(csv => {
      const rows = csv.split('\n').slice(1);
      rows.reverse().forEach(row => {
        if (!row.trim()) return;
        const cols = row.split(',');
        ordersTableBody.innerHTML += `<tr>${cols.map(c => `<td>${c}</td>`).join('')}</tr>`;
      });
    });
  }
});
