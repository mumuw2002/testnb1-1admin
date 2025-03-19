
    // ตั้งค่าวันที่ปัจจุบันให้กับ input type="date"
    const today = new Date();
    const yyyy = today.getFullYear();
    let mm = today.getMonth() + 1; // เดือนเริ่มที่ 0
    let dd = today.getDate();

    if (mm < 10) mm = '0' + mm;
    if (dd < 10) dd = '0' + dd;

    const minDate = `${yyyy}-${mm}-${dd}`;
    document.getElementById('expirationDate').setAttribute('min', minDate);

    // อัปเดตข้อความตัวอย่างแบบเรียลไทม์
    const titleInput = document.getElementById('title');
    const contentInput = document.getElementById('content');
    const dateInput = document.getElementById('expirationDate');
    const titlePreview = document.querySelector('.title-preview');
    const contentPreview = document.querySelector('.content-preview');
    const datePreview = document.querySelector('.date-preview');

    // ตั้งค่าข้อความตัวอย่างเริ่มต้น
    titlePreview.textContent = 'ตัวอย่างชื่อประกาศ';
    titlePreview.style.color = '#737373'; // สีอ่อนสำหรับข้อความตัวอย่าง
    contentPreview.textContent = 'ตัวอย่างเนื้อหาประกาศ';
    contentPreview.style.color = '#737373'; // สีอ่อนสำหรับข้อความตัวอย่าง

    // ฟังก์ชันแปลงวันที่เป็นรูปแบบภาษาไทย
    function formatDateThai(date) {
      const options = { year: 'numeric', month: 'long', day: 'numeric' };
      return new Date(date).toLocaleDateString('th-TH', options);
    }

    // อัปเดตข้อความตัวอย่างแบบเรียลไทม์
    titleInput.addEventListener('input', () => {
      const titleValue = titleInput.value || 'กรุณากรอกชื่อประกาศ';
      titlePreview.textContent = titleValue;
      titlePreview.style.color = titleInput.value ? '#000' : '#737373';

      // เพิ่มข้อความเต็มลงใน data attribute
      titlePreview.setAttribute('data-full-title', titleValue);
    });

    contentInput.addEventListener('input', () => {
      contentPreview.innerHTML = marked.parse(contentInput.value) || 'กรุณากรอกเนื้อหาประกาศ';
      contentPreview.style.color = contentInput.value ? '#000' : '#737373';
    });

    dateInput.addEventListener('input', () => {
      const selectedDate = dateInput.value;
      if (selectedDate) {
        const startDate = formatDateThai(new Date());
        const endDate = formatDateThai(selectedDate);
        datePreview.textContent = `ระยะวันที่ประกาศ ${startDate} - ${endDate}`;
      } else {
        datePreview.textContent = '';
      }
    });

    function addMarkdown(startTag, endTag, defaultText = "") {
      const textarea = document.getElementById('content');
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selectedText = textarea.value.substring(start, end);

      let newText;
      if (startTag === '• ') { // ตรวจสอบว่าเป็นปุ่ม "รายการ"
        if (selectedText) {
          // แยกข้อความที่เลือกด้วย \n
          newText = selectedText.split('\n').map(line => startTag + line).join('\n');
        } else {
          newText = startTag + defaultText;
        }
        newText += '\n'; // เพิ่ม \n ต่อท้ายเสมอ
      } else if (startTag === "---") {
        newText = "\n\n" + startTag + "\n\n";
      } else if (selectedText) {
        newText = startTag + selectedText + endTag;
      } else {
        newText = startTag + defaultText + endTag;
      }

      textarea.value = textarea.value.substring(0, start) + newText + textarea.value.substring(end);

      // อัปเดต contentPreview (ถ้ามี)
      const contentPreview = document.querySelector('.content-preview');
      if (contentPreview) {
        contentPreview.innerHTML = marked.parse(textarea.value);
      }
    }
