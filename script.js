const APPS_SCRIPT_URL = 'YOUR_APPS_SCRIPT_URL';
const CSV_URL = 'YOUR_CSV_URL';

document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  
  // Product Page Logic
  const productList = document.getElementById('product-list');
  if (productList) {
    fetch('products.json').then(res => res.json()).then(products => {
      const moodFilter = urlParams.get('mood') || 'all';
      renderProducts(products, moodFilter);

      const filterBar = document.getElementById('filter-bar');
      if (filterBar) {
        filterBar.addEventListener('click', (e) => {
          if (e.target.tagName === 'BUTTON') {
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
        <div class="card mood-${p.mood}">
          <img src="${p.image}" alt="${p.name}">
          <h3>${p.name}</h3>
          <p style="margin-bottom:1rem; font-family:sans-serif;">฿${p.price}</p>
          <a href="order.html?item=${encodeURIComponent(p.name)}&price=${p.price}" class="btn" style="padding:0.5rem 1rem; font-size:0.8rem;">สั่งซื้อ</a>
        </div>
      `;
    });
  }

  // Order Page Logic
  const orderForm = document.getElementById('orderForm');
  if (orderForm) {
    const itemInput = document.getElementById('items');
    const totalInput = document.getElementById('total');
    if (urlParams.has('item')) itemInput.value = urlParams.get('item');
    if (urlParams.has('price')) totalInput.value = urlParams.get('price');

    orderForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const payload = {
        customerName: document.getElementById('customerName').value,
        contact: document.getElementById('contact').value,
        items: itemInput.value,
        total: totalInput.value,
        note: document.getElementById('note').value
      };

      fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify(payload)
      }).then(() => {
        window.location.href = 'thankyou.html';
      }).catch(err => {
        console.error(err);
        alert('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
      });
    });
  }

  // Admin Page Logic
  const ordersTableBody = document.querySelector('#ordersTable tbody');
  if (ordersTableBody) {
    fetch(CSV_URL).then(res => res.text()).then(csv => {
      const rows = csv.split('\n').slice(1); // ข้าม Header
      rows.reverse().forEach(row => {
        if (!row.trim()) return;
        const cols = row.split(','); // สมมติว่าไม่มีลูกน้ำในข้อความ
        ordersTableBody.innerHTML += `<tr>${cols.map(c => `<td>${c}</td>`).join('')}</tr>`;
      });
    });
  }
});
