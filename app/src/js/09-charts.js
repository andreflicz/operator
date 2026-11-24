// ============ CHARTS ============
function svgBarChart(values, labels, opts){
  opts = opts || {};
  const w=600,h=140,padL=6,padR=6,padB=20,padT=10;
  const max = Math.max(opts.max||0, Math.max.apply(null, values.concat([1])));
  const n = values.length || 1;
  const gap = (w-padL-padR)/n;
  const barW = gap*0.55;
  let bars='', labelsSvg='';
  values.forEach(function(v,i){
    const barH = ((h-padT-padB) * (v/max)) || 0;
    const x = padL + i*gap + (gap-barW)/2;
    const y = h-padB-barH;
    bars += '<rect x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'" width="'+barW.toFixed(1)+'" height="'+barH.toFixed(1)+'" rx="3" fill="'+(v>0?'#E8A23D':'#1e222d')+'"/>';
    if(i%2===0 || n<=8){
      labelsSvg += '<text x="'+(x+barW/2).toFixed(1)+'" y="'+(h-6)+'" font-size="8" style="fill:var(--text-faint)" text-anchor="middle">'+labels[i]+'</text>';
    }
  });
  return '<svg viewBox="0 0 '+w+' '+h+'" class="chart-svg" preserveAspectRatio="none">'+bars+labelsSvg+'</svg>';
}
function svgLineChart(values, labels){
  const w=600,h=140,pad=16;
  if(values.length===0) return '<div class="empty">Not enough data yet.</div>';
  const max=Math.max.apply(null, values), min=Math.min.apply(null, values);
  const range=(max-min)||1;
  const n=values.length;
  const stepX = n>1 ? (w-pad*2)/(n-1) : 0;
  const pts = values.map(function(v,i){
    const x = pad + i*stepX;
    const y = h-pad - ((v-min)/range)*(h-pad*2);
    return [x,y];
  });
  const path = pts.map(function(p,i){ return (i===0?'M':'L')+p[0].toFixed(1)+','+p[1].toFixed(1); }).join(' ');
  const dots = pts.map(function(p){ return '<circle cx="'+p[0].toFixed(1)+'" cy="'+p[1].toFixed(1)+'" r="2.5" fill="#E8A23D"/>'; }).join('');
  return '<svg viewBox="0 0 '+w+' '+h+'" class="chart-svg" preserveAspectRatio="none"><path d="'+path+'" fill="none" stroke="#E8A23D" stroke-width="2"/>'+dots+'</svg>';
}
function svgRing(pct, size, color, label, sublabel){
  size = size||140;
  pct = clamp(pct,0,100);
  const r = size/2 - 10, c = size/2;
  const circumference = 2*Math.PI*r;
  const dash = circumference * pct/100;
  return '<svg viewBox="0 0 '+size+' '+size+'" width="'+size+'" height="'+size+'">'+
    '<circle cx="'+c+'" cy="'+c+'" r="'+r+'" fill="none" style="stroke:var(--chart-grid)" stroke-width="10"/>'+
    '<circle cx="'+c+'" cy="'+c+'" r="'+r+'" fill="none" stroke="'+color+'" stroke-width="10" stroke-linecap="round" stroke-dasharray="'+dash.toFixed(1)+' '+circumference.toFixed(1)+'" transform="rotate(-90 '+c+' '+c+')"/>'+
    '<text x="'+c+'" y="'+(c-2)+'" text-anchor="middle" font-family="Space Grotesk, sans-serif" font-size="18" font-weight="700" style="fill:var(--text)">'+escapeHtml(label)+'</text>'+
    (sublabel?'<text x="'+c+'" y="'+(c+16)+'" text-anchor="middle" font-size="9" style="fill:var(--text-dim)">'+escapeHtml(sublabel)+'</text>':'')+
  '</svg>';
}

