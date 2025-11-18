// app.js - Pengatur Keuangan Harian (tanpa dependensi eksternal)

// Helper: format angka ke Rupiah sederhana
function formatRupiah(n){
  const num = Number(n) || 0;
  return 'Rp ' + num.toLocaleString('id-ID');
}

// State dan key localStorage
const STORAGE_KEY = 'simple_finance_tx_v1';
let transactions = [];

// Elemen UI
const balanceEl = document.getElementById('balance');
const totalIncomeEl = document.getElementById('total-income');
const totalExpenseEl = document.getElementById('total-expense');
const txTableBody = document.querySelector('#tx-table tbody');
const noDataEl = document.getElementById('no-data');

const form = document.getElementById('tx-form');
const typeInput = document.getElementById('type');
const amountInput = document.getElementById('amount');
const categoryInput = document.getElementById('category');
const noteInput = document.getElementById('note');
const dateInput = document.getElementById('date');
const addBtn = document.getElementById('add-btn');

const filterFrom = document.getElementById('filter-from');
const filterTo = document.getElementById('filter-to');
const applyFilterBtn = document.getElementById('apply-filter');
const clearFilterBtn = document.getElementById('clear-filter');

const exportCsvBtn = document.getElementById('export-csv');
const clearAllBtn = document.getElementById('clear-all');
const clearFormBtn = document.getElementById('clear-form');

// Inisialisasi tanggal default ke hari ini
(function initDate(){
  const today = new Date().toISOString().slice(0,10);
  dateInput.value = today;
})();

// Load dari localStorage
function load(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    transactions = raw ? JSON.parse(raw) : [];
  }catch(e){
    console.error('Gagal membaca storage', e);
    transactions = [];
  }
}

// Simpan ke localStorage
function save(){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
}

function computeTotals(list){
  // hitung total pemasukan dan pengeluaran (integer arithmetic via Number)
  let income = 0;
  let expense = 0;
  for (const t of list){
    const amt = Number(t.amount) || 0;
    if (t.type === 'income') income += amt;
    else expense += amt;
  }
  const balance = income - expense;
  return { income, expense, balance };
}

// Render ringkasan dan tabel
function render(list = transactions){
  // Tampilkan ringkasan
  const totals = computeTotals(list);
  balanceEl.textContent = formatRupiah(totals.balance);
  totalIncomeEl.textContent = formatRupiah(totals.income);
  totalExpenseEl.textContent = formatRupiah(totals.expense);

  // Tabel
  txTableBody.innerHTML = '';
  if (!list || list.length === 0){
    noDataEl.style.display = 'block';
    return;
  } else {
    noDataEl.style.display = 'none';
  }

  // Urut turun berdasarkan tanggal (newest first), jika sama urut berdasarkan id
  const sorted = [...list].sort((a,b)=>{
    if (a.date === b.date) return b.id - a.id;
    return new Date(b.date) - new Date(a.date);
  });

  for (const tx of sorted){
    const tr = document.createElement('tr');

    const tdDate = document.createElement('td');
    tdDate.textContent = tx.date;
    tr.appendChild(tdDate);

    const tdType = document.createElement('td');
    tdType.textContent = tx.type === 'income' ? 'Pemasukan' : 'Pengeluaran';
    tdType.className = tx.type === 'income' ? 'tx-income' : 'tx-expense';
    tr.appendChild(tdType);

    const tdAmt = document.createElement('td');
    tdAmt.textContent = formatRupiah(tx.amount);
    tr.appendChild(tdAmt);

    const tdCat = document.createElement('td');
    tdCat.textContent = tx.category || '-';
    tr.appendChild(tdCat);

    const tdNote = document.createElement('td');
    tdNote.textContent = tx.note || '-';
    tr.appendChild(tdNote);

    const tdAct = document.createElement('td');
    const delBtn = document.createElement('button');
    delBtn.className = 'small-btn danger';
    delBtn.textContent = 'Hapus';
    delBtn.addEventListener('click', ()=> {
      if (confirm('Hapus transaksi ini?')) {
        removeTransaction(tx.id);
      }
    });

    const editBtn = document.createElement('button');
    editBtn.className = 'small-btn';
    editBtn.style.marginRight = '6px';
    editBtn.textContent = 'Edit';
    editBtn.addEventListener('click', ()=> {
      // simple edit: isi form dengan data transaksi, lalu hapus transaksi lama
      typeInput.value = tx.type;
      amountInput.value = tx.amount;
      categoryInput.value = tx.category;
      noteInput.value = tx.note;
      dateInput.value = tx.date;
      // fokuskan amount
      amountInput.focus();
      // hapus item lama supaya on submit akan menambah versi baru (edit)
      removeTransaction(tx.id, false); // simpan setelah delete
      render();
    });

    tdAct.appendChild(editBtn);
    tdAct.appendChild(delBtn);
    tr.appendChild(tdAct);

    txTableBody.appendChild(tr);
  }
}

// Tambah transaksi
function addTransaction({ type, amount, category, note, date }){
  // Validasi sederhana
  const amt = Number(amount);
  if (!date || !amount || isNaN(amt) || amt <= 0) {
    alert('Isi tanggal dan jumlah yang valid (lebih dari 0).');
    return false;
  }
  const id = Date.now(); // unik cukup untuk aplikasi lokal
  const tx = { id, type, amount: Math.round(amt), category, note, date };
  transactions.push(tx);
  save();
  render();
  return true;
}

// Hapus transaksi by id
function removeTransaction(id, saveAfter = true){
  transactions = transactions.filter(t => t.id !== id);
  if (saveAfter) save();
  render();
}

// Filter berdasarkan tanggal (in-place, returns filtered array)
function filterByDate(from, to){
  let list = [...transactions];
  if (from) {
    const f = new Date(from);
    list = list.filter(t => new Date(t.date) >= f);
  }
  if (to) {
    const tDate = new Date(to);
    // include to date (set time to end of day)
    tDate.setHours(23,59,59,999);
    list = list.filter(t => new Date(t.date) <= tDate);
  }
  return list;
}

// Eksport CSV sederhana
function exportCSV(list){
  if (!list || list.length === 0) {
    alert('Tidak ada data untuk diekspor.');
    return;
  }
  const headers = ['id','date','type','amount','category','note'];
  const rows = list.map(tx => headers.map(h => {
    const val = tx[h] !== undefined && tx[h] !== null ? String(tx[h]) : '';
    // escape double quotes
    return `"${val.replace(/"/g,'""')}"`;
  }).join(','));

  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  const ts = new Date().toISOString().slice(0,19).replace(/[:T]/g,'-');
  a.download = `transactions-${ts}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// Clear all (with confirm)
function clearAll(){
  if (!confirm('Hapus semua transaksi? Tindakan ini tidak bisa dibatalkan.')) return;
  transactions = [];
  save();
  render();
}

// Setup event listeners
form.addEventListener('submit', (e)=>{
  e.preventDefault();
  const payload = {
    type: typeInput.value,
    amount: amountInput.value,
    category: categoryInput.value.trim(),
    note: noteInput.value.trim(),
    date: dateInput.value
  };
  const ok = addTransaction(payload);
  if (ok) {
    form.reset();
    // kembalikan tanggal ke hari ini
    dateInput.value = new Date().toISOString().slice(0,10);
  }
});

clearFormBtn.addEventListener('click', ()=> {
  form.reset();
  dateInput.value = new Date().toISOString().slice(0,10);
});

applyFilterBtn.addEventListener('click', ()=> {
  const from = filterFrom.value || null;
  const to = filterTo.value || null;
  const filtered = filterByDate(from, to);
  render(filtered);
});

clearFilterBtn.addEventListener('click', ()=> {
  filterFrom.value = '';
  filterTo.value = '';
  render();
});

exportCsvBtn.addEventListener('click', ()=> {
  // gunakan filter jika ada, else semua
  const filtered = (filterFrom.value || filterTo.value) ? filterByDate(filterFrom.value, filterTo.value) : transactions;
  exportCSV(filtered);
});

clearAllBtn.addEventListener('click', clearAll);

// Simple init
(function boot(){
  load();
  render();
})();
