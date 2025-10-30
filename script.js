const tombolSapa = document.getElementById('sapaButton');

tombolSapa.addEventListener('click', function() {
  const pesan = document.createElement('p');
  pesan.textContent = 'Halo! Terima kasih sudah berkunjung!';
  document.body.appendChild(pesan);
});
