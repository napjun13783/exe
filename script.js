const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzBlg94PMLB_vBFGCDFpB2GCGQBFSJVWtK87vS13tp_ARl3W35MY8VaDgPSV7s2gmXs/exec';
const CSV_URL = 'YOUR_CSV_URL';

document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  
  // ==========================================
  // ส่วนหน้าแสดงสินค้า (Product Page)
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
  // ส่วนหน้าสั่งซื้อ (Order Page)
  // ==========================================
  const orderForm = document.getElementById('orderForm');
  if (orderForm) {
    const itemInput = document.getElementById('items');
    const totalInput = document.getElementById('total');
    if (urlParams.has('item')) itemInput.value = urlParams.get('item');
    if (urlParams.has('price')) totalInput.value = urlParams.get('price');

    orderForm.addEventListener('submit', (e) => {
      e.preventDefault();
      
      // จัดเตรียมข้อมูลและตั้งชื่อหัวข้อเป็นภาษาไทยส่งไปให้ Google Sheet
      const formData = new FormData();
      formData.append('ชื่อลูกค้า', document.getElementById('customerName').value);
      formData.append('ที่อยู่จัดส่งและเบอร์โทร', document.getElementById('contact').value);
      formData.append('รายการสินค้า', itemInput.value);
      formData.append('ยอดรวม (บาท)', totalInput.value);
      formData.append('หมายเหตุ', document.getElementById('note').value);

      // สร้างเอฟเฟกต์เปลี่ยนปุ่มเป็นคำว่า "กำลังส่งข้อมูล..."
      const submitBtn = orderForm.querySelector('button[type="submit"]');
      const originalText = submitBtn.innerText;
      submitBtn.innerText = 'กำลังส่งคำสั่งซื้อ...';
      submitBtn.disabled = true;

      // ส่งข้อมูลไป Google Sheet
      fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        body: formData
      }).then(() => {
        window.location.href = 'thankyou.html'; // ส่งเสร็จเด้งไปหน้าขอบคุณ
      }).catch(err => {
        console.error(err);
        alert('เกิดข้อผิดพลาดในการส่งข้อมูล กรุณาลองใหม่อีกครั้ง');
        submitBtn.innerText = originalText;
        submitBtn.disabled = false;
      });
    });
  }

  // ==========================================
  // ส่วนระบบหลังบ้าน Admin (ถ้ามี)
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
