# DNA Markers — สื่อประกอบการสอน

> Interactive bilingual (ไทย/EN) web app for teaching DNA markers to undergraduate students at Kasetsart University.

**🔗 Live demo**: *(จะเพิ่ม URL หลัง deploy บน GitHub Pages)*

📚 ครอบคลุมมาร์กเกอร์ **11 ชนิด + 1 stub**: RFLP · RAPD · AFLP · CAPs · dCAPs · Tetra-ARMS · SCAR · SSR · HRM · KASP · MassArray · Sequencing (เร็วๆ นี้)

---

## เกี่ยวกับ

แอปการเรียนรู้แบบ interactive สำหรับวิชา **เครื่องหมายดีเอ็นเอ (DNA Markers)** ระดับปริญญาตรี
ภาควิชาพืชสวน คณะเกษตร กำแพงแสน มหาวิทยาลัยเกษตรศาสตร์

แต่ละหน้ามาร์กเกอร์มีโครงสร้าง 4 ส่วนเหมือนกัน → **หลักการ** → **Simulation** → **Dataset** → **Quiz**
รองรับ 2 ภาษา (ไทย/อังกฤษ) สลับได้ทันทีโดยไม่ต้องโหลดหน้าใหม่

---

## คุณสมบัติ

- 📖 **หน้าปูพื้น (Foundation)** — 7 sections สอนพื้นฐานก่อนเรียน marker:
  ภาพรวม → genome structure → locus & allele → SNP/InDel/SSR → เลือก marker ตาม variation → **ชนิดของ marker (inheritance × technology)** → discovery timeline

- 🧬 **11 มาร์กเกอร์ครบ** พร้อม:
  - ภาพประกอบกลไกในการ์ดหลักการ (Tetra-ARMS · HRM · KASP · MassArray · SSR · SCAR)
  - Per-allele / per-individual visualization (RFLP · CAPs · dCAPs · Tetra-ARMS · SCAR · SSR · MassArray)
  - Sequence-level walkthrough (AFLP · dCAPs · Tetra-ARMS)
  - Live results: gel · melting curve · scatter plot · mass spectrum

- 🌐 **Bilingual ไทย/อังกฤษ** — ทุกข้อความผ่าน i18n system สลับภาษาได้ทันที

- 📊 **2×3 classification matrix** — แสดงตำแหน่งของแต่ละ marker ใน inheritance × technology

- 📝 **Quiz ท้ายบท** — feedback ทันทีพร้อมคำอธิบาย

---

## วิธีรันบนเครื่อง

แอปเป็น static web app — ต้องเสิร์ฟผ่าน HTTP server (เปิด `index.html` ตรงๆ ไม่ได้ เพราะใช้ ES modules + fetch)

```bash
# Python 3 (built-in)
python -m http.server 5174

# หรือ Node.js
npx serve -p 5174

# แล้วเปิด: http://localhost:5174
```

---

## เทคโนโลยีที่ใช้

- **Vanilla HTML/CSS/JavaScript** (ES modules) — ไม่มี build step ไม่ใช้ framework
- **SVG-based visualizations** — DNA strands, gel, melting curves, scatter plots, mass spectra
- ทุกอย่างเป็น static files → host ได้ทุก static hosting (GitHub Pages, Netlify, Cloudflare Pages)

---

## โครงสร้างไฟล์

```
.
├── index.html           # หน้าหลัก marker app (sidebar + router)
├── foundation.html      # หน้าปูพื้นก่อนเรียน
├── css/
│   └── styles.css
├── js/
│   ├── app.js          # hash-based router + home page
│   ├── i18n.js         # bilingual system
│   ├── foundation.js   # all foundation page sections
│   ├── markers/        # 1 file ต่อ 1 marker
│   │   ├── rflp.js
│   │   ├── rapd.js
│   │   └── ...
│   └── components/     # shared visualizations
│       ├── strand.js   # per-allele DNA strand renderer
│       ├── gel.js      # gel electrophoresis simulation
│       └── quiz.js     # quiz engine
├── data/
│   ├── sequences/      # dataset แต่ละ marker (JSON)
│   └── quizzes/        # quiz Q&A แต่ละ marker (JSON)
└── locales/
    ├── en.json         # English translations
    └── th.json         # Thai translations
```

---

## ผู้พัฒนา

**ราตรี บุญเรืองรอด** (Ratri Boonruangrod)
ภาควิชาพืชสวน คณะเกษตร กำแพงแสน
มหาวิทยาลัยเกษตรศาสตร์

---

## ลิขสิทธิ์

[![License: CC BY-NC 4.0](https://img.shields.io/badge/License-CC%20BY--NC%204.0-lightgrey.svg)](LICENSE)

This work is licensed under the [Creative Commons Attribution-NonCommercial 4.0 International License](https://creativecommons.org/licenses/by-nc/4.0/).

อนุญาตให้ใช้งานเพื่อการศึกษา · ห้ามใช้ในเชิงพาณิชย์ · ต้องอ้างอิงผู้แต่ง

หากใช้ในงานของท่าน กรุณาอ้างอิงเป็น:
> Boonruangrod, R. (2026). *DNA Markers — Teaching Materials*. Department of Horticulture, Kasetsart University. [URL]
