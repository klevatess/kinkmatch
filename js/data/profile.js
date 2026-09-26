/* data/profile.js — "About me" fields (structure only; labels live in lang/<lang>.ui.js
   under "profile.<field>" and "profile.<field>.<option>").

   Link encoding stores one byte per field, IN THIS ORDER, so:
   - append new fields at the END only;
   - an option's position = its code: never reorder; to remove one, replace it with null.
   top:true    -> rendered in the role block at the top of the form instead of "About me".
   hidden:true -> field retired: not shown, not stored, dropped from old links; kept only so
                  the byte positions of the fields after it stay the same. */
KC.PROFILE = [
  { id: "role",   type: "single", top: true, opts: ["dom", "sub", null /* was: switch */] },
  { id: "exp",    type: "single", opts: ["novice", "some", "medium", "large", "extensive"] },
  { id: "orient", type: "single", hidden: true, opts: ["straight", "gay", "bi", "bicurious"] },
  { id: "rel",    type: "single", opts: ["mono", "poly", "any"] },
  { id: "attire", type: "multi",  opts: ["denim", "goth", "lace", "latex", "leather"] },
];

/* Older versions stored Russian labels instead of keys. Maps them on load. null = dropped. */
KC.PROFILE_LEGACY = {
  "Доминант / Верх": "dom", "Сабмиссив / Низ": "sub", "Свитч": null,
  "Новичок": "novice", "Немного": "some", "Средний": "medium", "Большой": "large", "Обширный": "extensive",
  "Гетеро": "straight", "Гей / Лесби": "gay", "Би": "bi", "Би-любопытство": "bicurious",
  "Моногамия": "mono", "Полиамория": "poly", "Не важно": "any",
  "Деним": "denim", "Готика": "goth", "Кружево": "lace", "Латекс / резина": "latex", "Кожа": "leather",
};

/* clean a meta object: known fields only, option keys only (legacy labels converted) */
KC.normalizeMeta = function (meta) {
  const out = {}; meta = meta || {};
  const fix = (f, v) => {
    if (f.opts.indexOf(v) >= 0 && v != null) return v;
    const k = KC.PROFILE_LEGACY[v];
    return k && f.opts.indexOf(k) >= 0 ? k : null;
  };
  KC.PROFILE.forEach(f => {
    if (f.hidden) return;
    const v = meta[f.id];
    if (f.type === "multi") {
      const arr = (Array.isArray(v) ? v : []).map(x => fix(f, x)).filter(Boolean);
      const uniq = arr.filter((x, i) => arr.indexOf(x) === i);
      if (uniq.length) out[f.id] = uniq;
    } else { const k = fix(f, v); if (k) out[f.id] = k; }
  });
  return out;
};
