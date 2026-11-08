(() => {
  const schema = [
    { group: '形状与材质', key: 'width', label: '开关宽度', min: 280, max: 620, step: 10, unit: ' px', value: 420 },
    { group: '形状与材质', key: 'radius', label: '滑块圆角', min: 20, max: 65, step: 1, unit: '', value: 43 },
    { group: '形状与材质', key: 'glass', label: '玻璃不透明度', min: .03, max: .4, step: .01, unit: '', value: .15 },
    { group: '形状与材质', key: 'blur', label: '玻璃模糊', min: 0, max: 30, step: 1, unit: ' px', value: 12 },
    { group: '形状与材质', key: 'bevel', label: '玻璃倒角宽度', min: .5, max: 5, step: .1, unit: '', value: 2.2 },
    { group: '弹性响应', key: 'stiffness', label: '弹簧刚度', min: 80, max: 500, step: 10, unit: '', value: 220 },
    { group: '弹性响应', key: 'damping', label: '回弹阻尼', min: 8, max: 45, step: 1, unit: '', value: 20 },
    { group: '弹性响应', key: 'elasticity', label: '边界弹性', min: .05, max: .6, step: .05, unit: '', value: .25 },
    { group: '弹性响应', key: 'deformation', label: '挤压与拉伸', min: 0, max: 2, step: .1, unit: '', value: 1 },
    { group: '弹性响应', key: 'rimLag', label: '高光跟随时间', min: 100, max: 500, step: 10, unit: ' ms', value: 230 },
    { group: '运动与粒子', key: 'spread', label: '粒子散开幅度', min: 0, max: 80, step: 1, unit: '', value: 27 },
    { group: '运动与粒子', key: 'size', label: '像素大小', min: 1, max: 3.3, step: .1, unit: '', value: 2.6 },
    { group: '运动与粒子', key: 'twinkle', label: '粒子闪烁', min: 0, max: 1, step: .05, unit: '', value: .25 },
    { group: '外部光源', key: 'glow', label: '光源亮度', min: 0, max: 2, step: .05, unit: '', value: 1 },
    { group: '外部光源', key: 'arc', label: '日间光源弧长', min: 10, max: 65, step: 1, unit: ' %', value: 34 },
    { group: '外部光源', key: 'nightArc', label: '夜间光源弧长', min: 10, max: 65, step: 1, unit: ' %', value: 29 },
    { group: '外部光源', key: 'lineWidth', label: '光源线宽', min: .5, max: 4, step: .1, unit: '', value: 2.4 },
    { group: '外部光源', key: 'gap', label: '光源与玻璃间距', min: 2, max: 10, step: .5, unit: '', value: 5.5 },
    { group: '外部光源', key: 'bloom', label: '外部泛光范围', min: 2, max: 16, step: .5, unit: '', value: 7 },
    { group: '外部光源', key: 'nightColor', label: '夜间光色', type: 'color', value: '#6980ff' },
    { group: '外部光源', key: 'dayColor', label: '日间光色', type: 'color', value: '#ffc34d' },
    { group: '玻璃受光', key: 'edgeLight', label: '边缘受光强度', min: 0, max: 2, step: .05, unit: '', value: 1.2 },
    { group: '玻璃受光', key: 'innerGlow', label: '内部散射强度', min: 0, max: 1.5, step: .05, unit: '', value: .85 },
    { group: '玻璃受光', key: 'scatter', label: '向内扩散距离', min: 20, max: 110, step: 1, unit: '', value: 82 },
  ];
  const defaults = Object.fromEntries(schema.map(s => [s.key, s.value]));
  const storageKey = 'glass-theme-toggle.parameters.v1';
  const feedback = document.querySelector('#feedback');
  let values = { ...defaults };
  try { values = ToggleMath.sanitize(JSON.parse(localStorage.getItem(storageKey)), schema, defaults); }
  catch { feedback.textContent = '无法读取保存的参数，已使用默认值。'; }
  const listeners = new Set();
  function changed() {
    for (const listener of listeners) listener();
    try { localStorage.setItem(storageKey, JSON.stringify(values)); feedback.textContent = '参数已保存'; }
    catch { feedback.textContent = '无法保存；当前调整仍然有效。'; }
  }
  const form = document.querySelector('#parameters');
  let group;
  for (const spec of schema) {
    if (!group || group.dataset.name !== spec.group) {
      group = document.createElement('fieldset'); group.dataset.name = spec.group;
      const legend = document.createElement('legend'); legend.textContent = spec.group;
      group.append(legend); form.append(group);
    }
    const label = document.createElement('label');
    label.className = spec.type === 'color' ? 'color-label' : 'parameter';
    const title = document.createElement('span'); title.textContent = spec.label;
    const input = document.createElement('input'); input.type = spec.type || 'range'; input.id = spec.key; input.name = spec.key;
    label.append(title);
    let output;
    if (spec.type !== 'color') {
      Object.assign(input, { min: spec.min, max: spec.max, step: spec.step });
      output = document.createElement('output'); output.htmlFor = spec.key;
      output.textContent = values[spec.key] + spec.unit; label.append(output);
    }
    input.value = values[spec.key]; label.append(input); group.append(label);
    input.addEventListener('input', () => {
      values[spec.key] = spec.type === 'color' ? input.value : Number(input.value);
      if (output) output.textContent = input.value + spec.unit;
      changed();
    });
  }
  for (const key of ['stiffness', 'damping']) document.querySelector('#curve-tuning').append(document.getElementById(key).parentElement);
  form.addEventListener('submit', e => e.preventDefault());
  document.querySelector('#reset').addEventListener('click', () => {
    values = { ...defaults };
    for (const spec of schema) {
      const input = document.getElementById(spec.key); input.value = values[spec.key];
      const output = input.parentElement.querySelector('output');
      if (output) output.textContent = values[spec.key] + spec.unit;
    }
    changed(); feedback.textContent = '已恢复默认参数';
  });
  document.querySelector('#export').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify({ version: 4, parameters: values }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = 'glass-toggle-parameters.json'; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000); feedback.textContent = '已导出当前参数';
  });
  window.ToggleSettings = { get values() { return values; }, subscribe: callback => listeners.add(callback) };
})();
