const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzj4Fzm4wlYbfZkEOGG8CSSPJrDf9M1s67zHV1VFVUIHPJnF0hw8KmmNH72onmgJijysg/exec';
const CSV_URL = 'YOUR_CSV_URL';

// ==========================================
// ตั้งค่า Telegram Bot สำหรับแจ้งเตือน
// ==========================================
const TELEGRAM_BOT_TOKEN = 'ใส่โทเคนใหม่ของคุณที่นี่';
const TELEGRAM_CHAT_ID = '-1004384220202';

// กันข้อความของลูกค้าทำ HTML พัง
function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ฟังก์ชันส่งข้อความเข้า Telegram Channel
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
    console.log('Telegram API Response:', data);
  } catch (error) {
    console.error('Error sending Telegram notification:', error);
  }
}

// แปลง CSV (รองรับ , และ ขึ้นบรรทัดใหม่ ที่อยู่ในเครื่องหมายคำพูด)
function parseCSV(text) {
  const rows = [];
  let row = [], field = '', inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') inQuotes = false;
      else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field); field = '';
      rows.push(row); row = [];
    } else field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows;
}

document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);

  // ==========================================
  // 1. ส่วนหน้าแสดงสินค้า (Product List)
  // ==========================================
  const productList = document.getElementById('product-list');

  function renderProducts(products, filter) {
    const filtered = filter === 'all' ? products : products.filter(p => p.mood === filter);
    productList.innerHTML = filtered.map(p => `
      <div class="product-card">
        <span class="mood-tag">${esc(p.mood)}</span>
        <h3>${esc(p.name)}</h3>
        <p>${esc(p.description)}</p>
        <p class="price">฿${esc(p.price)}</p>
        <a href="order.html?item=${encodeURIComponent(p.name)}&price=${encodeURIComponent(p.price)}">สั่งซื้อสินค้า</a>
      </div>
    `).join('');
  }

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

  // ==========================================
  // 2. ส่วนหน้าสั่งซื้อ + ส่ง Google Sheet & Telegram
  // ==========================================
  const orderForm = document.getElementById('orderForm');
  if (orderForm) {
    const itemInput = document.getElementById('items');
    const totalInput = document.getElementById('total');
    if (urlParams.has('item') && itemInput) itemInput.value = urlParams.get('item');
    if (urlParams.has('price') && totalInput) totalInput.value = urlParams.get('price');

    orderForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const customerName = document.getElementById('customerName')?.value || '-';
      const contact = document.getElementById('contact')?.value || '-';
      const itemList = itemInput?.value || '-';
      const addressField = document.getElementById('address');
      const address = addressField ? addressField.value : '-';
      const totalPrice = totalInput?.value || '0';
      const note = document.getElementById('note')?.value || '-';

      // จัดเตรียมข้อมูลส่งเข้า Google Sheet
      const payload = new URLSearchParams();
      payload.append('ชื่อ-นามสกุล ผู้รับ', customerName);
      payload.append('เบอร์โทรศัพท์ / LINE ID', contact);
      payload.append('รายการสินค้า', itemList);
      payload.append('ที่อยู่สำหรับจัดส่ง', address);
      payload.append('ยอดรวมทั้งสิ้น (บาท)', totalPrice);
      payload.append('ไซส์ที่ต้องการ / หมายเหตุเพิ่มเติม', note);

      const submitBtn = orderForm.querySelector('button[type="submit"]');
      const originalText = submitBtn.innerText;
      submitBtn.innerText = 'กำลังส่งคำสั่งซื้อ...';
      submitBtn.disabled = true;

      // จัดข้อความสำหรับแจ้งเตือน Telegram (ใช้ HTML ให้ตรงกับ parse_mode)
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
        // 1. ส่งเข้า Telegram ให้เรียบร้อย
        await sendTelegramNotification(telegramMessage);

        // 2. บันทึกลง Google Sheet
        await fetch(APPS_SCRIPT_URL, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: payload.toString(),
        });

        // 3. ส่งข้อมูลสำเร็จทั้งหมดแล้วจึงเปลี่ยนหน้าไป thankyou.html
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
  // 3. ส่วน Admin แสดงรายการสั่งซื้อ
  // ==========================================
  const ordersTableBody = document.querySelector('#ordersTable tbody');
  if (ordersTableBody) {
    fetch(CSV_URL).then(res => res.text()).then(csv => {
      const rows = parseCSV(csv).slice(1).filter(r => r.join('').trim());
      ordersTableBody.innerHTML = rows.reverse().map(cols => `
        <tr>
          <td>${esc(cols[0])}</td>
          <td>${esc(cols[1])}</td>
          <td>${esc(cols[2])}</td>
          <td>${esc(cols[3])}</td>
          <td>${esc(cols[4])}</td>
          <td>${esc(cols[5])}</td>
          <td>${esc(cols[6])}</td>
        </tr>
      `).join('');
    }).catch(err => console.error('โหลดรายการสั่งซื้อไม่สำเร็จ:', err));
  }
});
