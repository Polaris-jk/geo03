// Full-screen photo viewer with previous / next (buttons, arrow keys or a sideways swipe).
// Read-only unless `onDelete` is given (the station editor passes it).

import * as store from './store.js';
import { openOverlay, toast } from './ui.js';
import { icon } from './icons.js';
import { esc } from './util.js';

export async function openGallery(st, startId, { onDelete } = {}) {
  let metas = await store.listPhotos(st);
  if (!metas.length) return;
  let i = Math.max(0, metas.findIndex((p) => p.id === startId));
  let url = null;

  const { el, close } = openOverlay(`<div class="lightbox" role="dialog" aria-label="รูปของ ${esc(st.code)}">
      <div class="lb-stage">
        <img alt="">
        <button type="button" class="lb-nav prev" aria-label="รูปก่อนหน้า">${icon('back')}</button>
        <button type="button" class="lb-nav next" aria-label="รูปถัดไป">${icon('back')}</button>
      </div>
      <div class="lb-bar">
        <span class="lb-title"></span>
        ${onDelete ? `<button type="button" class="btn sm danger" data-del>${icon('trash')}ลบรูป</button>` : ''}
        <button type="button" class="btn sm" data-close>ปิด</button>
      </div>
    </div>`, {
    cls: 'full',
    onClose: () => { if (url) URL.revokeObjectURL(url); document.removeEventListener('keydown', onKey); },
    onClick: async (e, closeIt) => {
      if (e.target.closest('.lb-nav.prev')) return show(i - 1);
      if (e.target.closest('.lb-nav.next')) return show(i + 1);
      if (e.target.closest('[data-del]') && onDelete) {
        if (!confirm('ลบรูปนี้? ย้อนกลับไม่ได้')) return;
        await onDelete(metas[i].id);
        toast('ลบรูปแล้ว');
        metas = await store.listPhotos(st);
        if (!metas.length) return closeIt();
        show(Math.min(i, metas.length - 1));
      }
    },
  });

  const img = el.querySelector('.lb-stage img');
  const title = el.querySelector('.lb-title');
  async function show(n) {
    if (n < 0 || n >= metas.length) return;
    i = n;
    const meta = metas[i];
    const data = await store.getPhotoData(meta.id);
    if (!data) { toast('ไม่พบไฟล์รูปนี้'); return; }
    if (url) URL.revokeObjectURL(url);
    url = URL.createObjectURL(new Blob([data], { type: meta.type }));
    img.src = url;
    img.alt = `${st.code} รูปที่ ${i + 1}`;
    title.textContent = `${st.code} รูปที่ ${i + 1}/${metas.length}`;
    el.querySelector('.lb-nav.prev').hidden = i === 0;
    el.querySelector('.lb-nav.next').hidden = i === metas.length - 1;
  }
  function onKey(e) {
    if (e.key === 'ArrowLeft') show(i - 1);
    if (e.key === 'ArrowRight') show(i + 1);
  }
  document.addEventListener('keydown', onKey);

  // sideways swipe on the photo
  const stage = el.querySelector('.lb-stage');
  let sx = null, sy = null;
  stage.addEventListener('pointerdown', (e) => { sx = e.clientX; sy = e.clientY; });
  stage.addEventListener('pointerup', (e) => {
    if (sx === null) return;
    const dx = e.clientX - sx, dy = e.clientY - sy;
    sx = sy = null;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) show(dx < 0 ? i + 1 : i - 1);
  });

  show(i);
  return close;
}
