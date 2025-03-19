function searchComplaints() {
  const searchInput = document.querySelector('input[name="searchTerm"]');
  const table = document.querySelector('table');
  const tr = table.getElementsByTagName("tr");

  searchInput.addEventListener('input', () => {
    const searchTerm = searchInput.value.toUpperCase();

    for (let i = 1; i < tr.length; i++) {
      let found = false;
      const td = tr[i].getElementsByTagName("td");
      for (let j = 0; j < td.length; j++) {
        const txtValue = td[j].textContent || td[j].innerText;
        if (txtValue.toUpperCase().indexOf(searchTerm) > -1) {
          found = true;
          break;
        }
      }
      tr[i].style.display = found ? "" : "none";
    }
  });
}

searchComplaints();
