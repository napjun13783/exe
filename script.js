const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyAOPuDUcZl2yC3LjDSYCrN_nv33IJTzJ537R3yw0TPBit8b2J_ZkPHjrpW8y_m-qDn/exec';
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
