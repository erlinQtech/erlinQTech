/* =====================================================================
   ErlinQTech Móvil · graficos.js
   Motor de gráficos declarativo. El banco de ítems describe DATOS;
   este módulo los convierte en SVG en el dispositivo.
   Sin dependencias externas. Sin eval() ni new Function().
   ===================================================================== */

var Graficos = (function () {
  'use strict';

  var NS = 'http://www.w3.org/2000/svg';
  var PALETA = ['var(--g1)', 'var(--g2)', 'var(--g3)', 'var(--g4)', 'var(--g5)', 'var(--g6)'];
  var secuencia = 0;

  var TIPOS = [
    'tabla', 'grafico_barras', 'grafico_barras_agrupadas', 'grafico_lineas',
    'grafico_circular', 'histograma', 'diagrama_caja', 'dispersion',
    'pictograma', 'plano_cartesiano', 'figura_geometrica',
    'solido_geometrico', 'svg_personalizado'
  ];

  /* ------------------------------------------------------------------
     Utilidades
     ------------------------------------------------------------------ */

  function el(tag, attrs) {
    var n = document.createElementNS(NS, tag);
    if (attrs) {
      for (var k in attrs) {
        if (Object.prototype.hasOwnProperty.call(attrs, k) && attrs[k] !== null && attrs[k] !== undefined) {
          n.setAttribute(k, attrs[k]);
        }
      }
    }
    return n;
  }

  function pintar(nodo, props) {
    for (var k in props) {
      if (Object.prototype.hasOwnProperty.call(props, k)) nodo.style[k] = props[k];
    }
    return nodo;
  }

  function texto(x, y, contenido, opc) {
    opc = opc || {};
    var t = el('text', {
      x: x, y: y,
      'text-anchor': opc.anclaje || 'middle',
      'dominant-baseline': opc.linea || 'auto',
      transform: opc.transform || null
    });
    pintar(t, {
      fill: opc.color || 'var(--g-texto)',
      fontSize: (opc.tamano || 12) + 'px',
      fontWeight: opc.peso || '400',
      fontFamily: 'inherit'
    });
    t.textContent = contenido;
    return t;
  }

  function num(v, decimales) {
    if (typeof v !== 'number' || !isFinite(v)) return String(v);
    var d = (decimales === undefined) ? (Math.abs(v % 1) > 1e-9 ? 2 : 0) : decimales;
    var s = v.toFixed(d);
    var partes = s.split('.');
    partes[0] = partes[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return partes.length > 1 ? partes[0] + ',' + partes[1] : partes[0];
  }

  function pasoBonito(rango, n) {
    if (rango <= 0) return 1;
    var bruto = rango / n;
    var mag = Math.pow(10, Math.floor(Math.log10(bruto)));
    var norma = bruto / mag;
    var p;
    if (norma <= 1) p = 1;
    else if (norma <= 2) p = 2;
    else if (norma <= 2.5) p = 2.5;
    else if (norma <= 5) p = 5;
    else p = 10;
    return p * mag;
  }

  function escala(min, max, n) {
    if (min === max) { max = min + 1; }
    var paso = pasoBonito(max - min, n || 5);
    var inf = Math.floor(min / paso) * paso;
    var sup = Math.ceil(max / paso) * paso;
    var marcas = [];
    for (var v = inf; v <= sup + paso * 1e-6; v += paso) {
      marcas.push(Math.abs(v) < 1e-9 ? 0 : Math.round(v * 1e6) / 1e6);
    }
    return { min: inf, max: sup, paso: paso, marcas: marcas };
  }

  function lienzo(ancho, alto, etiqueta) {
    var svg = el('svg', {
      viewBox: '0 0 ' + ancho + ' ' + alto,
      role: 'img',
      'aria-label': etiqueta || 'Gráfico de la pregunta',
      preserveAspectRatio: 'xMidYMid meet'
    });
    return svg;
  }

  function trama(svg, indice) {
    var id = 'eqt-pat-' + (secuencia++) ;
    var defs = svg.querySelector('defs');
    if (!defs) { defs = el('defs'); svg.insertBefore(defs, svg.firstChild); }
    var p = el('pattern', { id: id, width: 8, height: 8, patternUnits: 'userSpaceOnUse' });
    var base = el('rect', { width: 8, height: 8 });
    pintar(base, { fill: PALETA[indice % PALETA.length] });
    p.appendChild(base);
    var d;
    switch (indice % 6) {
      case 0: d = null; break;
      case 1: d = 'M0 8 L8 0'; break;
      case 2: d = 'M0 0 L8 8'; break;
      case 3: d = 'M0 4 L8 4'; break;
      case 4: d = 'M4 0 L4 8'; break;
      default: d = 'M0 4 L8 4 M4 0 L4 8'; break;
    }
    if (d) {
      var linea = el('path', { d: d, 'stroke-width': 1.6 });
      pintar(linea, { stroke: 'var(--superficie)', opacity: '.65' });
      p.appendChild(linea);
    }
    defs.appendChild(p);
    return 'url(#' + id + ')';
  }

  function relleno(svg, indice, conTrama) {
    return conTrama ? trama(svg, indice) : PALETA[indice % PALETA.length];
  }

  function ejes(svg, m, ancho, alto, esc, etiquetaX, etiquetaY, marcasX) {
    var x0 = m.izq, x1 = ancho - m.der, y0 = m.sup, y1 = alto - m.inf;

    esc.marcas.forEach(function (v) {
      var y = y1 - (v - esc.min) / (esc.max - esc.min) * (y1 - y0);
      var g = el('line', { x1: x0, y1: y, x2: x1, y2: y, 'stroke-width': 1 });
      pintar(g, { stroke: 'var(--g-grid)' });
      svg.appendChild(g);
      svg.appendChild(texto(x0 - 5, y, num(v), { anclaje: 'end', linea: 'middle', tamano: 11, color: 'var(--g-eje)' }));
    });

    var ejeY = el('line', { x1: x0, y1: y0, x2: x0, y2: y1, 'stroke-width': 1.5 });
    var ejeX = el('line', { x1: x0, y1: y1, x2: x1, y2: y1, 'stroke-width': 1.5 });
    pintar(ejeY, { stroke: 'var(--g-eje)' });
    pintar(ejeX, { stroke: 'var(--g-eje)' });
    svg.appendChild(ejeY); svg.appendChild(ejeX);

    if (etiquetaY) {
      var ty = texto(0, 0, etiquetaY, { tamano: 11, peso: '600', color: 'var(--g-eje)' });
      ty.setAttribute('transform', 'translate(11,' + ((y0 + y1) / 2) + ') rotate(-90)');
      svg.appendChild(ty);
    }
    if (etiquetaX) {
      svg.appendChild(texto((x0 + x1) / 2, alto - 4, etiquetaX,
        { tamano: 11, peso: '600', color: 'var(--g-eje)' }));
    }
    if (marcasX) {
      marcasX.forEach(function (mk) {
        var t = el('line', { x1: mk.x, y1: y1, x2: mk.x, y2: y1 + 4, 'stroke-width': 1 });
        pintar(t, { stroke: 'var(--g-eje)' });
        svg.appendChild(t);
      });
    }
    return { x0: x0, x1: x1, y0: y0, y1: y1 };
  }

  function etiquetasX(svg, puntos, y, rotar) {
    puntos.forEach(function (p) {
      if (rotar) {
        var t = texto(0, 0, p.texto, { anclaje: 'end', tamano: 11, color: 'var(--g-eje)' });
        t.setAttribute('transform', 'translate(' + (p.x + 4) + ',' + (y + 12) + ') rotate(-40)');
        svg.appendChild(t);
      } else {
        svg.appendChild(texto(p.x, y + 14, p.texto, { tamano: 11, color: 'var(--g-eje)' }));
      }
    });
  }

  function necesitaRotar(etiquetas, anchoDisponible) {
    var maxLargo = 0;
    etiquetas.forEach(function (e) { maxLargo = Math.max(maxLargo, String(e).length); });
    return (maxLargo * 6.2 * etiquetas.length) > anchoDisponible;
  }

  function leyenda(contenedor, entradas) {
    var box = document.createElement('div');
    box.className = 'grafico__leyenda';
    entradas.forEach(function (e, i) {
      var s = document.createElement('span');
      var m = document.createElement('i');
      m.className = 'grafico__muestra';
      m.style.background = PALETA[i % PALETA.length];
      s.appendChild(m);
      s.appendChild(document.createTextNode(e));
      box.appendChild(s);
    });
    contenedor.appendChild(box);
  }

  /* ------------------------------------------------------------------
     Tablas de datos (visibles y como alternativa accesible)
     ------------------------------------------------------------------ */

  function tablaHTML(titulo, columnas, filas) {
    var env = document.createElement('div');
    env.className = 'tabla-envoltura';
    var t = document.createElement('table');
    t.className = 'datos';
    if (titulo) {
      var cap = document.createElement('caption');
      cap.textContent = titulo;
      t.appendChild(cap);
    }
    var thead = document.createElement('thead');
    var tr = document.createElement('tr');
    columnas.forEach(function (c, i) {
      var th = document.createElement('th');
      th.scope = 'col';
      th.textContent = c;
      if (i > 0) th.className = 'num';
      tr.appendChild(th);
    });
    thead.appendChild(tr);
    t.appendChild(thead);
    var tbody = document.createElement('tbody');
    filas.forEach(function (f) {
      var fila = document.createElement('tr');
      f.forEach(function (celda, i) {
        var c = document.createElement(i === 0 ? 'th' : 'td');
        if (i === 0) c.scope = 'row'; else c.className = 'num';
        c.textContent = (typeof celda === 'number') ? num(celda) : celda;
        fila.appendChild(c);
      });
      tbody.appendChild(fila);
    });
    t.appendChild(tbody);
    env.appendChild(t);
    return env;
  }

  function datosDe(r) {
    switch (r.tipo) {
      case 'grafico_barras':
        return { columnas: [r.eje_x || 'Categoría', r.eje_y || 'Valor'],
                 filas: r.datos.map(function (d) { return [d.etiqueta, d.valor]; }) };
      case 'grafico_barras_agrupadas':
        return { columnas: ['Categoría'].concat(r.series.map(function (s) { return s.nombre; })),
                 filas: r.categorias.map(function (c, i) {
                   return [c].concat(r.series.map(function (s) { return s.valores[i]; }));
                 }) };
      case 'grafico_lineas':
      case 'dispersion':
        var puntos = (r.tipo === 'dispersion') ? [{ nombre: 'Datos', puntos: r.puntos }] : r.series;
        var filas = [];
        puntos.forEach(function (s) {
          s.puntos.forEach(function (p) { filas.push([s.nombre || '—', p.x, p.y]); });
        });
        return { columnas: ['Serie', r.eje_x || 'x', r.eje_y || 'y'], filas: filas };
      case 'grafico_circular':
        var total = r.datos.reduce(function (a, d) { return a + d.valor; }, 0);
        return { columnas: ['Categoría', 'Valor', 'Porcentaje'],
                 filas: r.datos.map(function (d) {
                   return [d.etiqueta, d.valor, num(d.valor / total * 100, 1) + ' %'];
                 }) };
      case 'histograma':
        return { columnas: [r.eje_x || 'Intervalo', 'Frecuencia'],
                 filas: r.intervalos.map(function (i) {
                   return ['[' + num(i.min) + ', ' + num(i.max) + ')', i.frecuencia];
                 }) };
      case 'diagrama_caja':
        return { columnas: ['Grupo', 'Mínimo', 'Q1', 'Mediana', 'Q3', 'Máximo'],
                 filas: r.cajas.map(function (c) {
                   return [c.nombre, c.min, c.q1, c.mediana, c.q3, c.max];
                 }) };
      case 'pictograma':
        return { columnas: ['Categoría', 'Valor'],
                 filas: r.datos.map(function (d) { return [d.etiqueta, d.valor]; }) };
      case 'plano_cartesiano':
        var f = [];
        (r.funciones || []).forEach(function (fn) {
          f.push([fn.etiqueta || fn.familia, descripcionFamilia(fn)]);
        });
        (r.puntos || []).forEach(function (p) {
          f.push([p.etiqueta || 'Punto', '(' + num(p.x) + ', ' + num(p.y) + ')']);
        });
        return { columnas: ['Elemento', 'Descripción'], filas: f };
      case 'figura_geometrica':
        var g = [];
        (r.vertices || []).forEach(function (v) {
          g.push([v.etiqueta || '—', '(' + num(v.x) + ', ' + num(v.y) + ')']);
        });
        (r.medidas || []).forEach(function (m) {
          g.push([m.entre.join('–'), m.valor]);
        });
        (r.angulos || []).forEach(function (a) {
          g.push(['Ángulo en ' + a.en, a.valor]);
        });
        if (r.circulo) g.push(['Circunferencia', 'radio ' + num(r.circulo.radio)]);
        return { columnas: ['Elemento', 'Valor'], filas: g };
      case 'solido_geometrico':
        var s = [];
        for (var k in (r.dimensiones || {})) {
          if (Object.prototype.hasOwnProperty.call(r.dimensiones, k)) s.push([k, r.dimensiones[k]]);
        }
        return { columnas: ['Dimensión', 'Valor'], filas: s };
      default:
        return null;
    }
  }

  function descripcionFamilia(f) {
    switch (f.familia) {
      case 'lineal': return 'f(x) = ' + num(f.m) + 'x + ' + num(f.b);
      case 'cuadratica': return 'f(x) = ' + num(f.a) + 'x² + ' + num(f.b) + 'x + ' + num(f.c);
      case 'cubica': return 'f(x) = ' + num(f.a) + 'x³ + ' + num(f.b) + 'x² + ' + num(f.c) + 'x + ' + num(f.d);
      case 'exponencial': return 'f(x) = ' + num(f.a) + '·' + num(f.base) + 'ˣ';
      case 'logaritmica': return 'f(x) = ' + num(f.a) + '·log' + num(f.base) + '(x)';
      case 'racional': return 'f(x) = (' + num(f.a) + 'x + ' + num(f.b) + ') / (' + num(f.c) + 'x + ' + num(f.d) + ')';
      case 'valor_absoluto': return 'f(x) = ' + num(f.a) + '|x − ' + num(f.h) + '| + ' + num(f.k);
      case 'raiz': return 'f(x) = ' + num(f.a) + '√(x − ' + num(f.h) + ') + ' + num(f.k);
      case 'senoidal': return 'f(x) = ' + num(f.A) + '·sen(' + num(f.B) + 'x + ' + num(f.C) + ') + ' + num(f.D);
      case 'tabulada': return 'curva definida por puntos';
      default: return 'función';
    }
  }

  /* ------------------------------------------------------------------
     Evaluación de familias de funciones (sin eval)
     ------------------------------------------------------------------ */

  function evaluar(f, x) {
    switch (f.familia) {
      case 'lineal': return f.m * x + f.b;
      case 'cuadratica': return f.a * x * x + f.b * x + f.c;
      case 'cubica': return f.a * x * x * x + f.b * x * x + f.c * x + f.d;
      case 'exponencial': return f.a * Math.pow(f.base, x);
      case 'logaritmica': return x > 0 ? f.a * (Math.log(x) / Math.log(f.base)) : NaN;
      case 'racional':
        var den = f.c * x + f.d;
        return Math.abs(den) < 1e-9 ? NaN : (f.a * x + f.b) / den;
      case 'valor_absoluto': return f.a * Math.abs(x - f.h) + f.k;
      case 'raiz': return (x - f.h) >= 0 ? f.a * Math.sqrt(x - f.h) + f.k : NaN;
      case 'senoidal': return f.A * Math.sin(f.B * x + (f.C || 0)) + (f.D || 0);
      default: return NaN;
    }
  }

  /* ------------------------------------------------------------------
     Renderizadores
     ------------------------------------------------------------------ */

  function barras(r, caja) {
    var horizontal = r.orientacion === 'horizontal';
    var datos = r.datos;
    var W = 320, H = horizontal ? Math.max(170, 44 + datos.length * 30) : 230;
    var etiquetas = datos.map(function (d) { return d.etiqueta; });
    var valores = datos.map(function (d) { return d.valor; });
    var maxLargo = Math.max.apply(null, etiquetas.map(function (e) { return String(e).length; }));
    var m = horizontal
      ? { izq: Math.min(110, 14 + maxLargo * 6.4), der: 28, sup: 8, inf: r.eje_x ? 32 : 20 }
      : { izq: 42, der: 10, sup: 18, inf: 46 };
    var esc = escala(Math.min(0, Math.min.apply(null, valores)), Math.max.apply(null, valores), 5);
    var svg = lienzo(W, H, r.descripcion_accesible || r.titulo || 'Gráfico de barras');
    var conTrama = false;

    if (horizontal) {
      var x0 = m.izq, x1 = W - m.der, y0 = m.sup, y1 = H - m.inf;
      esc.marcas.forEach(function (v) {
        var x = x0 + (v - esc.min) / (esc.max - esc.min) * (x1 - x0);
        var g = el('line', { x1: x, y1: y0, x2: x, y2: y1, 'stroke-width': 1 });
        pintar(g, { stroke: 'var(--g-grid)' });
        svg.appendChild(g);
        svg.appendChild(texto(x, y1 + 13, num(v), { tamano: 11, color: 'var(--g-eje)' }));
      });
      var eY = el('line', { x1: x0, y1: y0, x2: x0, y2: y1, 'stroke-width': 1.5 });
      pintar(eY, { stroke: 'var(--g-eje)' }); svg.appendChild(eY);
      var alto = (y1 - y0) / datos.length;
      datos.forEach(function (d, i) {
        var y = y0 + i * alto + alto * 0.18;
        var h = alto * 0.64;
        var w = (d.valor - esc.min) / (esc.max - esc.min) * (x1 - x0);
        var b = el('rect', { x: x0, y: y, width: Math.max(1, w), height: h, rx: 2 });
        pintar(b, { fill: relleno(svg, i, conTrama) });
        svg.appendChild(b);
        svg.appendChild(texto(x0 - 5, y + h / 2, String(d.etiqueta),
          { anclaje: 'end', linea: 'middle', tamano: 11, color: 'var(--g-eje)' }));
        svg.appendChild(texto(x0 + w + 4, y + h / 2, num(d.valor),
          { anclaje: 'start', linea: 'middle', tamano: 11, peso: '700' }));
      });
      if (r.eje_x) svg.appendChild(texto((x0 + x1) / 2, H - 4, r.eje_x,
        { tamano: 11, peso: '600', color: 'var(--g-eje)' }));
    } else {
      var rot = necesitaRotar(etiquetas, W - m.izq - m.der);
      if (rot) m.inf = 58;
      var ej = ejes(svg, m, W, H, esc, null, r.eje_y, null);
      var ancho = (ej.x1 - ej.x0) / datos.length;
      var marcas = [];
      datos.forEach(function (d, i) {
        var cx = ej.x0 + i * ancho + ancho / 2;
        var w = Math.min(38, ancho * 0.62);
        var hBase = ej.y1 - (0 - esc.min) / (esc.max - esc.min) * (ej.y1 - ej.y0);
        var hVal = ej.y1 - (d.valor - esc.min) / (esc.max - esc.min) * (ej.y1 - ej.y0);
        var b = el('rect', {
          x: cx - w / 2, y: Math.min(hBase, hVal),
          width: w, height: Math.max(1, Math.abs(hBase - hVal)), rx: 2
        });
        pintar(b, { fill: relleno(svg, i, conTrama) });
        svg.appendChild(b);
        svg.appendChild(texto(cx, Math.min(hBase, hVal) - 4, num(d.valor),
          { tamano: 11, peso: '700' }));
        marcas.push({ x: cx, texto: String(d.etiqueta) });
      });
      etiquetasX(svg, marcas, ej.y1, rot);
      if (r.eje_x) svg.appendChild(texto((ej.x0 + ej.x1) / 2, H - 3, r.eje_x,
        { tamano: 11, peso: '600', color: 'var(--g-eje)' }));
    }
    caja.appendChild(svg);
  }

  function barrasAgrupadas(r, caja) {
    var W = 320, H = 240;
    var todos = [];
    r.series.forEach(function (s) { todos = todos.concat(s.valores); });
    var esc = escala(Math.min(0, Math.min.apply(null, todos)), Math.max.apply(null, todos), 5);
    var rot = necesitaRotar(r.categorias, W - 52);
    var m = { izq: 42, der: 10, sup: 14, inf: rot ? 58 : 46 };
    var svg = lienzo(W, H, r.descripcion_accesible || r.titulo || 'Gráfico de barras agrupadas');
    var ej = ejes(svg, m, W, H, esc, null, r.eje_y, null);
    var anchoGrupo = (ej.x1 - ej.x0) / r.categorias.length;
    var anchoBarra = Math.min(22, (anchoGrupo * 0.72) / r.series.length);
    var marcas = [];
    r.categorias.forEach(function (c, i) {
      var centro = ej.x0 + i * anchoGrupo + anchoGrupo / 2;
      var inicio = centro - (anchoBarra * r.series.length) / 2;
      r.series.forEach(function (s, j) {
        var v = s.valores[i];
        var hBase = ej.y1 - (0 - esc.min) / (esc.max - esc.min) * (ej.y1 - ej.y0);
        var hVal = ej.y1 - (v - esc.min) / (esc.max - esc.min) * (ej.y1 - ej.y0);
        var b = el('rect', {
          x: inicio + j * anchoBarra, y: Math.min(hBase, hVal),
          width: anchoBarra - 1.5, height: Math.max(1, Math.abs(hBase - hVal)), rx: 1.5
        });
        pintar(b, { fill: relleno(svg, j, true) });
        svg.appendChild(b);
      });
      marcas.push({ x: centro, texto: String(c) });
    });
    etiquetasX(svg, marcas, ej.y1, rot);
    if (r.eje_x) svg.appendChild(texto((ej.x0 + ej.x1) / 2, H - 3, r.eje_x,
      { tamano: 11, peso: '600', color: 'var(--g-eje)' }));
    caja.appendChild(svg);
    leyenda(caja, r.series.map(function (s) { return s.nombre; }));
  }

  function lineas(r, caja) {
    var W = 320, H = 230;
    var xs = [], ys = [];
    r.series.forEach(function (s) {
      s.puntos.forEach(function (p) { xs.push(p.x); ys.push(p.y); });
    });
    var escY = escala(Math.min(0, Math.min.apply(null, ys)), Math.max.apply(null, ys), 5);
    var minX = Math.min.apply(null, xs), maxX = Math.max.apply(null, xs);
    var m = { izq: 42, der: 12, sup: 14, inf: 44 };
    var svg = lienzo(W, H, r.descripcion_accesible || r.titulo || 'Gráfico de líneas');
    var ej = ejes(svg, m, W, H, escY, null, r.eje_y, null);
    var sx = function (x) {
      return minX === maxX ? (ej.x0 + ej.x1) / 2
        : ej.x0 + (x - minX) / (maxX - minX) * (ej.x1 - ej.x0);
    };
    var sy = function (y) { return ej.y1 - (y - escY.min) / (escY.max - escY.min) * (ej.y1 - ej.y0); };

    var etiq = r.etiquetas_x || null;
    var valoresX = [];
    r.series[0].puntos.forEach(function (p, i) {
      valoresX.push({ x: sx(p.x), texto: etiq ? etiq[i] : num(p.x) });
    });
    etiquetasX(svg, valoresX, ej.y1, necesitaRotar(valoresX.map(function (v) { return v.texto; }), ej.x1 - ej.x0));

    r.series.forEach(function (s, j) {
      var d = s.puntos.map(function (p, i) {
        return (i === 0 ? 'M' : 'L') + sx(p.x) + ' ' + sy(p.y);
      }).join(' ');
      var linea = el('path', { d: d, fill: 'none', 'stroke-width': 2.4, 'stroke-linejoin': 'round' });
      pintar(linea, { stroke: PALETA[j % PALETA.length] });
      if (j > 0) linea.setAttribute('stroke-dasharray', j === 1 ? '6 3' : '2 3');
      svg.appendChild(linea);
      s.puntos.forEach(function (p) {
        var c = el('circle', { cx: sx(p.x), cy: sy(p.y), r: 3.2 });
        pintar(c, { fill: PALETA[j % PALETA.length], stroke: 'var(--superficie)' });
        c.setAttribute('stroke-width', '1.2');
        svg.appendChild(c);
      });
    });
    if (r.eje_x) svg.appendChild(texto((ej.x0 + ej.x1) / 2, H - 3, r.eje_x,
      { tamano: 11, peso: '600', color: 'var(--g-eje)' }));
    caja.appendChild(svg);
    if (r.series.length > 1) leyenda(caja, r.series.map(function (s) { return s.nombre; }));
  }

  function circular(r, caja) {
    var W = 320, H = 220;
    var total = r.datos.reduce(function (a, d) { return a + d.valor; }, 0);
    var svg = lienzo(W, H, r.descripcion_accesible || r.titulo || 'Gráfico circular');
    var cx = W / 2, cy = H / 2, rad = 82;
    var ang = -Math.PI / 2;
    r.datos.forEach(function (d, i) {
      var barrido = (d.valor / total) * Math.PI * 2;
      var a1 = ang + barrido;
      var grande = barrido > Math.PI ? 1 : 0;
      var p0x = cx + rad * Math.cos(ang), p0y = cy + rad * Math.sin(ang);
      var p1x = cx + rad * Math.cos(a1), p1y = cy + rad * Math.sin(a1);
      var sector = el('path', {
        d: 'M ' + cx + ' ' + cy + ' L ' + p0x + ' ' + p0y +
           ' A ' + rad + ' ' + rad + ' 0 ' + grande + ' 1 ' + p1x + ' ' + p1y + ' Z',
        'stroke-width': 1.5
      });
      pintar(sector, { fill: relleno(svg, i, true), stroke: 'var(--superficie)' });
      svg.appendChild(sector);

      var medio = ang + barrido / 2;
      var pct = d.valor / total * 100;
      if (pct >= 7) {
        var tx = cx + (rad * 0.62) * Math.cos(medio);
        var ty = cy + (rad * 0.62) * Math.sin(medio);
        var fondo = el('rect', { x: tx - 17, y: ty - 9, width: 34, height: 18, rx: 4 });
        pintar(fondo, { fill: 'var(--superficie)', opacity: '.82' });
        svg.appendChild(fondo);
        svg.appendChild(texto(tx, ty, (r.mostrar_porcentajes === false ? num(d.valor) : num(pct, 0) + '%'),
          { linea: 'middle', tamano: 11, peso: '700' }));
      }
      ang = a1;
    });
    caja.appendChild(svg);
    leyenda(caja, r.datos.map(function (d) { return d.etiqueta; }));
  }

  function histograma(r, caja) {
    var W = 320, H = 235;
    var frec = r.intervalos.map(function (i) { return i.frecuencia; });
    var esc = escala(0, Math.max.apply(null, frec), 5);
    var m = { izq: 42, der: 12, sup: 16, inf: 52 };
    var svg = lienzo(W, H, r.descripcion_accesible || r.titulo || 'Histograma');
    var ej = ejes(svg, m, W, H, esc, null, r.eje_y || 'Frecuencia', null);
    var ancho = (ej.x1 - ej.x0) / r.intervalos.length;
    r.intervalos.forEach(function (iv, i) {
      var y = ej.y1 - (iv.frecuencia - esc.min) / (esc.max - esc.min) * (ej.y1 - ej.y0);
      var b = el('rect', { x: ej.x0 + i * ancho, y: y, width: ancho, height: ej.y1 - y });
      pintar(b, { fill: relleno(svg, 0, false), stroke: 'var(--superficie)' });
      b.setAttribute('stroke-width', '1');
      svg.appendChild(b);
      svg.appendChild(texto(ej.x0 + i * ancho + ancho / 2, y - 4, num(iv.frecuencia),
        { tamano: 11, peso: '700' }));
      var t = texto(0, 0, num(iv.min), { anclaje: 'end', tamano: 10, color: 'var(--g-eje)' });
      t.setAttribute('transform', 'translate(' + (ej.x0 + i * ancho + 3) + ',' + (ej.y1 + 12) + ') rotate(-45)');
      svg.appendChild(t);
    });
    var ult = texto(0, 0, num(r.intervalos[r.intervalos.length - 1].max),
      { anclaje: 'end', tamano: 10, color: 'var(--g-eje)' });
    ult.setAttribute('transform', 'translate(' + (ej.x1 + 3) + ',' + (ej.y1 + 12) + ') rotate(-45)');
    svg.appendChild(ult);
    if (r.eje_x) svg.appendChild(texto((ej.x0 + ej.x1) / 2, H - 3, r.eje_x,
      { tamano: 11, peso: '600', color: 'var(--g-eje)' }));
    caja.appendChild(svg);
  }

  function diagramaCaja(r, caja) {
    var W = 320, H = Math.max(140, 56 + r.cajas.length * 52);
    var todos = [];
    r.cajas.forEach(function (c) { todos.push(c.min, c.max); });
    var esc = escala(Math.min.apply(null, todos), Math.max.apply(null, todos), 5);
    var m = { izq: 62, der: 16, sup: 14, inf: 38 };
    var svg = lienzo(W, H, r.descripcion_accesible || r.titulo || 'Diagrama de caja y bigotes');
    var x0 = m.izq, x1 = W - m.der, y0 = m.sup, y1 = H - m.inf;
    var sx = function (v) { return x0 + (v - esc.min) / (esc.max - esc.min) * (x1 - x0); };

    esc.marcas.forEach(function (v) {
      var g = el('line', { x1: sx(v), y1: y0, x2: sx(v), y2: y1, 'stroke-width': 1 });
      pintar(g, { stroke: 'var(--g-grid)' }); svg.appendChild(g);
      svg.appendChild(texto(sx(v), y1 + 13, num(v), { tamano: 11, color: 'var(--g-eje)' }));
    });
    var ejeX = el('line', { x1: x0, y1: y1, x2: x1, y2: y1, 'stroke-width': 1.5 });
    pintar(ejeX, { stroke: 'var(--g-eje)' }); svg.appendChild(ejeX);

    var alto = (y1 - y0) / r.cajas.length;
    r.cajas.forEach(function (c, i) {
      var cy = y0 + i * alto + alto / 2, h = Math.min(28, alto * 0.5);
      var bigote = el('line', { x1: sx(c.min), y1: cy, x2: sx(c.max), y2: cy, 'stroke-width': 1.6 });
      pintar(bigote, { stroke: 'var(--g-eje)' }); svg.appendChild(bigote);
      [c.min, c.max].forEach(function (v) {
        var t = el('line', { x1: sx(v), y1: cy - h / 2.6, x2: sx(v), y2: cy + h / 2.6, 'stroke-width': 1.6 });
        pintar(t, { stroke: 'var(--g-eje)' }); svg.appendChild(t);
      });
      var rect = el('rect', { x: sx(c.q1), y: cy - h / 2, width: Math.max(2, sx(c.q3) - sx(c.q1)), height: h, rx: 2 });
      pintar(rect, { fill: relleno(svg, i, true), stroke: 'var(--g-eje)' });
      rect.setAttribute('stroke-width', '1.2');
      svg.appendChild(rect);
      var med = el('line', { x1: sx(c.mediana), y1: cy - h / 2, x2: sx(c.mediana), y2: cy + h / 2, 'stroke-width': 2.6 });
      pintar(med, { stroke: 'var(--g-texto)' }); svg.appendChild(med);
      svg.appendChild(texto(x0 - 6, cy, c.nombre,
        { anclaje: 'end', linea: 'middle', tamano: 11, peso: '600', color: 'var(--g-eje)' }));
    });
    if (r.eje) svg.appendChild(texto((x0 + x1) / 2, H - 4, r.eje,
      { tamano: 11, peso: '600', color: 'var(--g-eje)' }));
    caja.appendChild(svg);
  }

  function dispersion(r, caja) {
    var W = 320, H = 235;
    var xs = r.puntos.map(function (p) { return p.x; });
    var ys = r.puntos.map(function (p) { return p.y; });
    var escX = escala(Math.min.apply(null, xs), Math.max.apply(null, xs), 5);
    var escY = escala(Math.min.apply(null, ys), Math.max.apply(null, ys), 5);
    var m = { izq: 44, der: 12, sup: 14, inf: 46 };
    var svg = lienzo(W, H, r.descripcion_accesible || r.titulo || 'Diagrama de dispersión');
    var ej = ejes(svg, m, W, H, escY, null, r.eje_y, null);
    var sx = function (x) { return ej.x0 + (x - escX.min) / (escX.max - escX.min) * (ej.x1 - ej.x0); };
    var sy = function (y) { return ej.y1 - (y - escY.min) / (escY.max - escY.min) * (ej.y1 - ej.y0); };
    escX.marcas.forEach(function (v) {
      svg.appendChild(texto(sx(v), ej.y1 + 14, num(v), { tamano: 11, color: 'var(--g-eje)' }));
      var t = el('line', { x1: sx(v), y1: ej.y1, x2: sx(v), y2: ej.y1 + 4, 'stroke-width': 1 });
      pintar(t, { stroke: 'var(--g-eje)' }); svg.appendChild(t);
    });
    if (r.linea_tendencia) {
      var n = r.puntos.length;
      var sX = xs.reduce(function (a, b) { return a + b; }, 0);
      var sY = ys.reduce(function (a, b) { return a + b; }, 0);
      var sXY = 0, sXX = 0;
      r.puntos.forEach(function (p) { sXY += p.x * p.y; sXX += p.x * p.x; });
      var pend = (n * sXY - sX * sY) / (n * sXX - sX * sX);
      var inter = (sY - pend * sX) / n;
      var d = 'M' + sx(escX.min) + ' ' + sy(pend * escX.min + inter) +
              ' L' + sx(escX.max) + ' ' + sy(pend * escX.max + inter);
      var lt = el('path', { d: d, fill: 'none', 'stroke-width': 2, 'stroke-dasharray': '6 4' });
      pintar(lt, { stroke: PALETA[1] }); svg.appendChild(lt);
    }
    r.puntos.forEach(function (p) {
      var c = el('circle', { cx: sx(p.x), cy: sy(p.y), r: 4 });
      pintar(c, { fill: PALETA[0], stroke: 'var(--superficie)' });
      c.setAttribute('stroke-width', '1.2');
      svg.appendChild(c);
    });
    if (r.eje_x) svg.appendChild(texto((ej.x0 + ej.x1) / 2, H - 3, r.eje_x,
      { tamano: 11, peso: '600', color: 'var(--g-eje)' }));
    caja.appendChild(svg);
  }

  function pictograma(r, caja) {
    var filas = r.datos.length;
    var W = 320, H = 32 + filas * 30;
    var svg = lienzo(W, H, r.descripcion_accesible || r.titulo || 'Pictograma');
    var maxLargo = Math.max.apply(null, r.datos.map(function (d) { return String(d.etiqueta).length; }));
    var x0 = Math.min(110, 12 + maxLargo * 6.4);
    r.datos.forEach(function (d, i) {
      var y = 16 + i * 30;
      svg.appendChild(texto(x0 - 6, y, String(d.etiqueta),
        { anclaje: 'end', linea: 'middle', tamano: 11, peso: '600', color: 'var(--g-eje)' }));
      var enteros = Math.floor(d.valor / r.equivale_a);
      var resto = (d.valor % r.equivale_a) / r.equivale_a;
      var cx = x0 + 8;
      for (var k = 0; k < enteros && k < 14; k++) {
        var s = texto(cx + k * 17, y, r.simbolo || '●', { linea: 'middle', tamano: 15 });
        pintar(s, { fill: PALETA[0] });
        svg.appendChild(s);
      }
      if (resto > 0.01 && enteros < 14) {
        var p = texto(cx + enteros * 17, y, r.simbolo || '●', { linea: 'middle', tamano: 15 });
        pintar(p, { fill: PALETA[0], opacity: '.45' });
        svg.appendChild(p);
      }
    });
    svg.appendChild(texto(W / 2, H - 4,
      (r.simbolo || '●') + ' equivale a ' + num(r.equivale_a) + (r.unidad ? ' ' + r.unidad : ''),
      { tamano: 11, color: 'var(--g-eje)' }));
    caja.appendChild(svg);
  }

  function planoCartesiano(r, caja) {
    var W = 320, H = 260;
    var rx = r.rango_x || [-5, 5], ry = r.rango_y || [-5, 5];
    var m = 24;
    var svg = lienzo(W, H, r.descripcion_accesible || r.titulo || 'Plano cartesiano');
    var sx = function (x) { return m + (x - rx[0]) / (rx[1] - rx[0]) * (W - 2 * m); };
    var sy = function (y) { return (H - m) - (y - ry[0]) / (ry[1] - ry[0]) * (H - 2 * m); };

    var pasoX = r.paso_x || pasoBonito(rx[1] - rx[0], 8);
    var pasoY = r.paso_y || pasoBonito(ry[1] - ry[0], 8);
    function desde(min, paso) { return Math.ceil(min / paso) * paso; }

    if (r.cuadricula !== false) {
      for (var gx = desde(rx[0], pasoX); gx <= rx[1] + 1e-9; gx += pasoX) {
        if (Math.abs(gx) < 1e-9) continue;
        var lv = el('line', { x1: sx(gx), y1: m, x2: sx(gx), y2: H - m, 'stroke-width': 1 });
        pintar(lv, { stroke: 'var(--g-grid)' }); svg.appendChild(lv);
      }
      for (var gy = desde(ry[0], pasoY); gy <= ry[1] + 1e-9; gy += pasoY) {
        if (Math.abs(gy) < 1e-9) continue;
        var lh = el('line', { x1: m, y1: sy(gy), x2: W - m, y2: sy(gy), 'stroke-width': 1 });
        pintar(lh, { stroke: 'var(--g-grid)' }); svg.appendChild(lh);
      }
    }
    var ejeX = el('line', { x1: m, y1: sy(0), x2: W - m, y2: sy(0), 'stroke-width': 1.8 });
    var ejeY = el('line', { x1: sx(0), y1: m, x2: sx(0), y2: H - m, 'stroke-width': 1.8 });
    pintar(ejeX, { stroke: 'var(--g-eje)' }); pintar(ejeY, { stroke: 'var(--g-eje)' });
    svg.appendChild(ejeX); svg.appendChild(ejeY);

    for (var tx = desde(rx[0], pasoX); tx <= rx[1] + 1e-9; tx += pasoX) {
      if (Math.abs(tx) < 1e-9) continue;
      var mk = el('line', { x1: sx(tx), y1: sy(0) - 3, x2: sx(tx), y2: sy(0) + 3, 'stroke-width': 1.4 });
      pintar(mk, { stroke: 'var(--g-eje)' }); svg.appendChild(mk);
      svg.appendChild(texto(sx(tx), sy(0) + 14, num(tx), { tamano: 10, color: 'var(--g-eje)' }));
    }
    for (var ty = desde(ry[0], pasoY); ty <= ry[1] + 1e-9; ty += pasoY) {
      if (Math.abs(ty) < 1e-9) continue;
      var mky = el('line', { x1: sx(0) - 3, y1: sy(ty), x2: sx(0) + 3, y2: sy(ty), 'stroke-width': 1.4 });
      pintar(mky, { stroke: 'var(--g-eje)' }); svg.appendChild(mky);
      svg.appendChild(texto(sx(0) - 7, sy(ty), num(ty),
        { anclaje: 'end', linea: 'middle', tamano: 10, color: 'var(--g-eje)' }));
    }
    svg.appendChild(texto(W - m + 8, sy(0), 'x', { linea: 'middle', tamano: 11, peso: '700', color: 'var(--g-eje)' }));
    svg.appendChild(texto(sx(0), m - 8, 'y', { tamano: 11, peso: '700', color: 'var(--g-eje)' }));

    (r.funciones || []).forEach(function (f, j) {
      var tramos = [], actual = [];
      if (f.familia === 'tabulada') {
        actual = f.puntos.map(function (p) { return sx(p.x) + ' ' + sy(p.y); });
        tramos.push(actual);
      } else {
        var pasos = 220;
        for (var i = 0; i <= pasos; i++) {
          var x = rx[0] + (rx[1] - rx[0]) * i / pasos;
          var y = evaluar(f, x);
          if (!isFinite(y) || y < ry[0] - (ry[1] - ry[0]) || y > ry[1] + (ry[1] - ry[0])) {
            if (actual.length > 1) tramos.push(actual);
            actual = [];
            continue;
          }
          actual.push(sx(x) + ' ' + sy(y));
        }
        if (actual.length > 1) tramos.push(actual);
      }
      tramos.forEach(function (tr) {
        var d = tr.map(function (p, i) { return (i === 0 ? 'M' : 'L') + p; }).join(' ');
        var path = el('path', { d: d, fill: 'none', 'stroke-width': 2.6, 'stroke-linejoin': 'round' });
        pintar(path, { stroke: PALETA[j % PALETA.length] });
        if (j > 0) path.setAttribute('stroke-dasharray', '7 4');
        svg.appendChild(path);
      });
      if (f.etiqueta) {
        var xe = f.etiqueta_x !== undefined ? f.etiqueta_x : rx[1] * 0.55;
        var ye = evaluar(f, xe);
        if (f.familia === 'tabulada' && f.puntos.length) { xe = f.puntos[f.puntos.length - 1].x; ye = f.puntos[f.puntos.length - 1].y; }
        if (isFinite(ye) && ye > ry[0] && ye < ry[1]) {
          var fondo = el('rect', {
            x: sx(xe) - f.etiqueta.length * 3.2 - 3, y: sy(ye) - 20,
            width: f.etiqueta.length * 6.4 + 6, height: 15, rx: 3
          });
          pintar(fondo, { fill: 'var(--superficie)', opacity: '.85' });
          svg.appendChild(fondo);
          var te = texto(sx(xe), sy(ye) - 9, f.etiqueta, { tamano: 11, peso: '700' });
          pintar(te, { fill: PALETA[j % PALETA.length] });
          svg.appendChild(te);
        }
      }
    });

    (r.segmentos || []).forEach(function (s) {
      var l = el('line', {
        x1: sx(s.desde.x), y1: sy(s.desde.y), x2: sx(s.hasta.x), y2: sy(s.hasta.y),
        'stroke-width': 2, 'stroke-dasharray': s.discontinuo ? '5 4' : null
      });
      pintar(l, { stroke: PALETA[2] }); svg.appendChild(l);
    });

    (r.puntos || []).forEach(function (p) {
      var c = el('circle', { cx: sx(p.x), cy: sy(p.y), r: p.destacado ? 5 : 3.6 });
      pintar(c, { fill: p.hueco ? 'var(--superficie)' : PALETA[1], stroke: PALETA[1] });
      c.setAttribute('stroke-width', '2');
      svg.appendChild(c);
      if (p.etiqueta) {
        svg.appendChild(texto(sx(p.x) + 8, sy(p.y) - 6, p.etiqueta,
          { anclaje: 'start', tamano: 11, peso: '700' }));
      }
    });
    caja.appendChild(svg);
  }

  function figuraGeometrica(r, caja) {
    var W = 320, H = 240;
    var vs = r.vertices || [];
    var xs = vs.map(function (v) { return v.x; });
    var ys = vs.map(function (v) { return v.y; });
    if (r.circulo) {
      xs.push(r.circulo.centro.x - r.circulo.radio, r.circulo.centro.x + r.circulo.radio);
      ys.push(r.circulo.centro.y - r.circulo.radio, r.circulo.centro.y + r.circulo.radio);
    }
    var minX = Math.min.apply(null, xs), maxX = Math.max.apply(null, xs);
    var minY = Math.min.apply(null, ys), maxY = Math.max.apply(null, ys);
    if (minX === maxX) { minX -= 1; maxX += 1; }
    if (minY === maxY) { minY -= 1; maxY += 1; }
    var m = 34;
    var k = Math.min((W - 2 * m) / (maxX - minX), (H - 2 * m) / (maxY - minY));
    var offX = (W - (maxX - minX) * k) / 2, offY = (H - (maxY - minY) * k) / 2;
    var sx = function (x) { return offX + (x - minX) * k; };
    var sy = function (y) { return H - offY - (y - minY) * k; };

    var svg = lienzo(W, H, r.descripcion_accesible || r.titulo || 'Figura geométrica');

    if (r.circulo) {
      var c = el('circle', {
        cx: sx(r.circulo.centro.x), cy: sy(r.circulo.centro.y),
        r: r.circulo.radio * k, 'stroke-width': 2.4
      });
      pintar(c, { fill: r.relleno === false ? 'none' : PALETA[0], stroke: PALETA[0], fillOpacity: '.16' });
      svg.appendChild(c);
      var cc = el('circle', { cx: sx(r.circulo.centro.x), cy: sy(r.circulo.centro.y), r: 3 });
      pintar(cc, { fill: PALETA[0] }); svg.appendChild(cc);
      if (r.circulo.etiqueta_centro) {
        svg.appendChild(texto(sx(r.circulo.centro.x) - 10, sy(r.circulo.centro.y) - 6,
          r.circulo.etiqueta_centro, { tamano: 12, peso: '700' }));
      }
      if (r.circulo.radio_etiqueta) {
        var rx0 = sx(r.circulo.centro.x), ry0 = sy(r.circulo.centro.y);
        var rx1 = sx(r.circulo.centro.x + r.circulo.radio);
        var rl = el('line', { x1: rx0, y1: ry0, x2: rx1, y2: ry0, 'stroke-width': 2 });
        pintar(rl, { stroke: 'var(--g-texto)' });
        svg.appendChild(rl);
        var fr = el('rect', {
          x: (rx0 + rx1) / 2 - String(r.circulo.radio_etiqueta).length * 3.3 - 3,
          y: ry0 - 20, width: String(r.circulo.radio_etiqueta).length * 6.6 + 6, height: 17, rx: 4
        });
        pintar(fr, { fill: 'var(--superficie)', opacity: '.9' });
        svg.appendChild(fr);
        svg.appendChild(texto((rx0 + rx1) / 2, ry0 - 11,
          String(r.circulo.radio_etiqueta), { linea: 'middle', tamano: 11, peso: '600' }));
      }
    }

    if (vs.length >= 2) {
      var pts = vs.map(function (v) { return sx(v.x) + ',' + sy(v.y); }).join(' ');
      var forma = (vs.length >= 3 && r.abierta !== true)
        ? el('polygon', { points: pts, 'stroke-width': 2.6, 'stroke-linejoin': 'round' })
        : el('polyline', { points: pts, 'stroke-width': 2.6, fill: 'none' });
      pintar(forma, {
        fill: (vs.length >= 3 && r.relleno !== false) ? PALETA[0] : 'none',
        fillOpacity: '.16',
        stroke: PALETA[0]
      });
      svg.appendChild(forma);

      vs.forEach(function (v) {
        var p = el('circle', { cx: sx(v.x), cy: sy(v.y), r: 3.4 });
        pintar(p, { fill: PALETA[0] }); svg.appendChild(p);
        if (v.etiqueta) {
          var cxm = vs.reduce(function (a, b) { return a + b.x; }, 0) / vs.length;
          var cym = vs.reduce(function (a, b) { return a + b.y; }, 0) / vs.length;
          var dx = (v.x - cxm) >= 0 ? 11 : -11;
          var dy = (v.y - cym) >= 0 ? -10 : 16;
          svg.appendChild(texto(sx(v.x) + dx, sy(v.y) + dy, v.etiqueta,
            { tamano: 13, peso: '700' }));
        }
      });
    }

    (r.diagonales || []).forEach(function (d) {
      var a = buscarVertice(vs, d[0]), b = buscarVertice(vs, d[1]);
      if (!a || !b) return;
      var l = el('line', { x1: sx(a.x), y1: sy(a.y), x2: sx(b.x), y2: sy(b.y), 'stroke-width': 1.8, 'stroke-dasharray': '6 4' });
      pintar(l, { stroke: PALETA[2] }); svg.appendChild(l);
    });

    (r.medidas || []).forEach(function (md) {
      var a = buscarVertice(vs, md.entre[0]), b = buscarVertice(vs, md.entre[1]);
      if (!a || !b) return;
      var mx = (sx(a.x) + sx(b.x)) / 2, my = (sy(a.y) + sy(b.y)) / 2;
      var cxm = vs.reduce(function (s, v) { return s + sx(v.x); }, 0) / vs.length;
      var cym = vs.reduce(function (s, v) { return s + sy(v.y); }, 0) / vs.length;
      var ux = mx - cxm, uy = my - cym;
      var norma = Math.sqrt(ux * ux + uy * uy) || 1;
      var px = mx + (ux / norma) * 14, py = my + (uy / norma) * 14;
      var fondo = el('rect', {
        x: px - String(md.valor).length * 3.3 - 3, y: py - 9,
        width: String(md.valor).length * 6.6 + 6, height: 17, rx: 4
      });
      pintar(fondo, { fill: 'var(--superficie)', opacity: '.9' });
      svg.appendChild(fondo);
      svg.appendChild(texto(px, py, String(md.valor), { linea: 'middle', tamano: 11, peso: '600' }));
    });

    (r.angulos || []).forEach(function (an) {
      var v = buscarVertice(vs, an.en);
      if (!v) return;
      var idx = vs.indexOf(v);
      var prev = vs[(idx - 1 + vs.length) % vs.length];
      var sig = vs[(idx + 1) % vs.length];
      var dir = function (p) {
        var dx = sx(p.x) - sx(v.x), dy = sy(p.y) - sy(v.y);
        var n = Math.sqrt(dx * dx + dy * dy) || 1;
        return [dx / n, dy / n];
      };
      var d1 = dir(prev), d2 = dir(sig);
      if (an.marcar_recto) {
        var t = 13;
        var p1 = [sx(v.x) + d1[0] * t, sy(v.y) + d1[1] * t];
        var p2 = [sx(v.x) + d2[0] * t, sy(v.y) + d2[1] * t];
        var p3 = [p1[0] + d2[0] * t, p1[1] + d2[1] * t];
        var cuad = el('polyline', {
          points: p1[0] + ',' + p1[1] + ' ' + p3[0] + ',' + p3[1] + ' ' + p2[0] + ',' + p2[1],
          fill: 'none', 'stroke-width': 1.8
        });
        pintar(cuad, { stroke: 'var(--g-texto)' }); svg.appendChild(cuad);
      }
      if (an.valor) {
        var bx = sx(v.x) + (d1[0] + d2[0]) * 21;
        var by = sy(v.y) + (d1[1] + d2[1]) * 21;
        svg.appendChild(texto(bx, by, an.valor, { linea: 'middle', tamano: 11, peso: '600' }));
      }
    });

    caja.appendChild(svg);
  }

  function buscarVertice(vs, etiqueta) {
    for (var i = 0; i < vs.length; i++) if (vs[i].etiqueta === etiqueta) return vs[i];
    return null;
  }

  function solidoGeometrico(r, caja) {
    var W = 320, H = 240;
    var svg = lienzo(W, H, r.descripcion_accesible || ('Sólido: ' + r.solido));
    var cx = W / 2, cy = H / 2 + 10;
    var trazo = { 'stroke-width': 2.2, 'stroke-linejoin': 'round' };
    var visible = function (n) { pintar(n, { fill: PALETA[0], fillOpacity: '.18', stroke: PALETA[0] }); return n; };
    var oculto = function (n) {
      pintar(n, { fill: 'none', stroke: PALETA[0], opacity: '.55' });
      n.setAttribute('stroke-dasharray', '5 4'); return n;
    };

    function prisma(ancho, alto, prof) {
      var dx = prof * 0.5, dy = -prof * 0.3;
      var x0 = cx - ancho / 2, y0 = cy + alto / 2;
      var A = [x0, y0], B = [x0 + ancho, y0], C = [x0 + ancho, y0 - alto], D = [x0, y0 - alto];
      var A2 = [A[0] + dx, A[1] + dy], B2 = [B[0] + dx, B[1] + dy],
          C2 = [C[0] + dx, C[1] + dy], D2 = [D[0] + dx, D[1] + dy];
      var frente = el('polygon', Object.assign({ points: [A, B, C, D].map(function (p) { return p.join(','); }).join(' ') }, trazo));
      var sup = el('polygon', Object.assign({ points: [D, C, C2, D2].map(function (p) { return p.join(','); }).join(' ') }, trazo));
      var lado = el('polygon', Object.assign({ points: [B, B2, C2, C].map(function (p) { return p.join(','); }).join(' ') }, trazo));
      svg.appendChild(visible(frente)); svg.appendChild(visible(sup)); svg.appendChild(visible(lado));
      ['M' + A2.join(' ') + ' L' + B2.join(' '), 'M' + A2.join(' ') + ' L' + D2.join(' '),
       'M' + A2.join(' ') + ' L' + A.join(' ')].forEach(function (d) {
        svg.appendChild(oculto(el('path', Object.assign({ d: d }, trazo))));
      });
      return { A: A, B: B, C: C, D: D, C2: C2, D2: D2 };
    }

    function cilindro(radio, alto, cono) {
      var ry = radio * 0.34;
      var yTop = cy - alto / 2, yBot = cy + alto / 2;
      if (cono) {
        var lado = el('path', Object.assign({
          d: 'M ' + (cx - radio) + ' ' + yBot + ' L ' + cx + ' ' + yTop + ' L ' + (cx + radio) + ' ' + yBot
        }, trazo));
        pintar(lado, { fill: PALETA[0], fillOpacity: '.18', stroke: PALETA[0] });
        svg.appendChild(lado);
      } else {
        var cuerpo = el('path', Object.assign({
          d: 'M ' + (cx - radio) + ' ' + yTop + ' L ' + (cx - radio) + ' ' + yBot +
             ' A ' + radio + ' ' + ry + ' 0 0 0 ' + (cx + radio) + ' ' + yBot +
             ' L ' + (cx + radio) + ' ' + yTop
        }, trazo));
        pintar(cuerpo, { fill: PALETA[0], fillOpacity: '.18', stroke: PALETA[0] });
        svg.appendChild(cuerpo);
        var tapa = el('ellipse', Object.assign({ cx: cx, cy: yTop, rx: radio, ry: ry }, trazo));
        svg.appendChild(visible(tapa));
      }
      var base = el('path', Object.assign({
        d: 'M ' + (cx - radio) + ' ' + yBot + ' A ' + radio + ' ' + ry + ' 0 0 0 ' + (cx + radio) + ' ' + yBot
      }, trazo));
      pintar(base, { fill: 'none', stroke: PALETA[0] });
      svg.appendChild(base);
      var baseOculta = el('path', Object.assign({
        d: 'M ' + (cx - radio) + ' ' + yBot + ' A ' + radio + ' ' + ry + ' 0 0 1 ' + (cx + radio) + ' ' + yBot
      }, trazo));
      svg.appendChild(oculto(baseOculta));
      return { yTop: yTop, yBot: yBot, radio: radio, ry: ry };
    }

    var ref = null;
    switch (r.solido) {
      case 'cubo': ref = prisma(110, 110, 70); break;
      case 'prisma': ref = prisma(130, 95, 66); break;
      case 'piramide':
        var ancho = 140, alto = 110;
        var x0 = cx - ancho / 2, y0 = cy + alto / 2, dx = 34, dy = -22;
        var A = [x0, y0], B = [x0 + ancho, y0], Ap = [cx, cy - alto / 2];
        var A2 = [A[0] + dx, A[1] + dy], B2 = [B[0] + dx, B[1] + dy];
        var caraF = el('polygon', Object.assign({ points: [A, B, Ap].map(function (p) { return p.join(','); }).join(' ') }, trazo));
        var caraD = el('polygon', Object.assign({ points: [B, B2, Ap].map(function (p) { return p.join(','); }).join(' ') }, trazo));
        svg.appendChild(visible(caraF)); svg.appendChild(visible(caraD));
        ['M' + A2.join(' ') + ' L' + B2.join(' '), 'M' + A2.join(' ') + ' L' + A.join(' '),
         'M' + A2.join(' ') + ' L' + Ap.join(' ')].forEach(function (d) {
          svg.appendChild(oculto(el('path', Object.assign({ d: d }, trazo))));
        });
        ref = { yTop: Ap[1], yBot: y0, radio: ancho / 2 };
        break;
      case 'cono': ref = cilindro(72, 120, true); break;
      case 'esfera':
        var rr = 74;
        var esf = el('circle', Object.assign({ cx: cx, cy: cy, r: rr }, trazo));
        svg.appendChild(visible(esf));
        var ecu = el('ellipse', Object.assign({ cx: cx, cy: cy, rx: rr, ry: rr * 0.3 }, trazo));
        pintar(ecu, { fill: 'none', stroke: PALETA[0], opacity: '.7' });
        ecu.setAttribute('stroke-dasharray', '5 4');
        svg.appendChild(ecu);
        var rad = el('line', { x1: cx, y1: cy, x2: cx + rr, y2: cy, 'stroke-width': 1.8 });
        pintar(rad, { stroke: 'var(--g-texto)' }); svg.appendChild(rad);
        ref = { radio: rr, yTop: cy - rr, yBot: cy + rr };
        break;
      default: ref = cilindro(70, 120, false); break;
    }

    var dims = r.dimensiones || {};
    var fila = 0;
    for (var clave in dims) {
      if (!Object.prototype.hasOwnProperty.call(dims, clave)) continue;
      svg.appendChild(texto(10, 16 + fila * 16, clave + ': ' + dims[clave],
        { anclaje: 'start', tamano: 12, peso: '600' }));
      fila++;
    }
    caja.appendChild(svg);
  }

  function svgPersonalizado(r, caja) {
    var limpio = String(r.contenido || '')
      .replace(/<\s*script[\s\S]*?<\s*\/\s*script\s*>/gi, '')
      .replace(/<\s*foreignObject[\s\S]*?<\s*\/\s*foreignObject\s*>/gi, '')
      .replace(/\son\w+\s*=\s*(".*?"|'.*?'|[^\s>]+)/gi, '')
      .replace(/javascript:/gi, '');
    var svg = lienzo(r.ancho || 320, r.alto || 220, r.descripcion_accesible || 'Figura de la pregunta');
    svg.innerHTML = limpio;
    caja.appendChild(svg);
  }

  /* ------------------------------------------------------------------
     Validación
     ------------------------------------------------------------------ */

  var REQUERIDOS = {
    tabla: ['columnas', 'filas'],
    grafico_barras: ['datos'],
    grafico_barras_agrupadas: ['categorias', 'series'],
    grafico_lineas: ['series'],
    grafico_circular: ['datos'],
    histograma: ['intervalos'],
    diagrama_caja: ['cajas'],
    dispersion: ['puntos'],
    pictograma: ['datos', 'equivale_a'],
    plano_cartesiano: [],
    figura_geometrica: [],
    solido_geometrico: ['solido'],
    svg_personalizado: ['contenido']
  };

  function validarRecurso(r) {
    var errores = [];
    if (!r || r.tipo === 'ninguno' || r.tipo === undefined) return errores;
    if (TIPOS.indexOf(r.tipo) === -1) {
      errores.push('tipo de recurso desconocido: "' + r.tipo + '"');
      return errores;
    }
    (REQUERIDOS[r.tipo] || []).forEach(function (campo) {
      if (r[campo] === undefined || r[campo] === null) errores.push('falta el campo "' + campo + '"');
    });
    if (r.tipo === 'grafico_barras_agrupadas' && r.series && r.categorias) {
      r.series.forEach(function (s, i) {
        if (!s.valores || s.valores.length !== r.categorias.length) {
          errores.push('la serie ' + (i + 1) + ' no tiene un valor por categoría');
        }
      });
    }
    if (r.tipo === 'diagrama_caja' && r.cajas) {
      r.cajas.forEach(function (c) {
        if (!(c.min <= c.q1 && c.q1 <= c.mediana && c.mediana <= c.q3 && c.q3 <= c.max)) {
          errores.push('la caja "' + c.nombre + '" no cumple min ≤ Q1 ≤ mediana ≤ Q3 ≤ máx');
        }
      });
    }
    if (r.tipo === 'figura_geometrica' && !r.vertices && !r.circulo) {
      errores.push('se requieren "vertices" o "circulo"');
    }
    if (r.tipo === 'plano_cartesiano' && !r.funciones && !r.puntos && !r.segmentos) {
      errores.push('se requiere al menos "funciones", "puntos" o "segmentos"');
    }
    return errores;
  }

  /* ------------------------------------------------------------------
     Punto de entrada
     ------------------------------------------------------------------ */

  function renderizarRecurso(recurso, contenedor) {
    contenedor.innerHTML = '';
    if (!recurso || recurso.tipo === 'ninguno' || !recurso.tipo) return;

    var caja = document.createElement('figure');
    caja.className = 'grafico';
    caja.style.margin = '0';

    if (recurso.titulo) {
      var cap = document.createElement('figcaption');
      cap.className = 'grafico__titulo';
      cap.textContent = recurso.titulo;
      caja.appendChild(cap);
    }

    var errores = validarRecurso(recurso);
    var dibujado = false;

    if (errores.length === 0) {
      try {
        switch (recurso.tipo) {
          case 'tabla':
            caja.appendChild(tablaHTML(null, recurso.columnas, recurso.filas)); break;
          case 'grafico_barras': barras(recurso, caja); break;
          case 'grafico_barras_agrupadas': barrasAgrupadas(recurso, caja); break;
          case 'grafico_lineas': lineas(recurso, caja); break;
          case 'grafico_circular': circular(recurso, caja); break;
          case 'histograma': histograma(recurso, caja); break;
          case 'diagrama_caja': diagramaCaja(recurso, caja); break;
          case 'dispersion': dispersion(recurso, caja); break;
          case 'pictograma': pictograma(recurso, caja); break;
          case 'plano_cartesiano': planoCartesiano(recurso, caja); break;
          case 'figura_geometrica': figuraGeometrica(recurso, caja); break;
          case 'solido_geometrico': solidoGeometrico(recurso, caja); break;
          case 'svg_personalizado': svgPersonalizado(recurso, caja); break;
        }
        dibujado = true;
      } catch (e) {
        errores.push('no fue posible dibujar el gráfico (' + e.message + ')');
      }
    }

    if (!dibujado) {
      var aviso = document.createElement('p');
      aviso.className = 'aviso-recurso';
      aviso.textContent = 'El gráfico no pudo dibujarse. Use la tabla de datos que aparece abajo.';
      caja.appendChild(aviso);
    }

    if (recurso.tipo !== 'tabla') {
      var alt = datosDe(recurso);
      if (alt && alt.filas && alt.filas.length) {
        var det = document.createElement('details');
        det.className = 'datos-alternos';
        if (!dibujado) det.open = true;
        var sum = document.createElement('summary');
        sum.textContent = 'Ver datos del gráfico';
        det.appendChild(sum);
        det.appendChild(tablaHTML(null, alt.columnas, alt.filas));
        caja.appendChild(det);
      }
    }

    if (recurso.nota) {
      var nota = document.createElement('p');
      nota.className = 'nota';
      nota.style.marginBottom = '0';
      nota.textContent = recurso.nota;
      caja.appendChild(nota);
    }

    contenedor.appendChild(caja);
  }

  return {
    renderizarRecurso: renderizarRecurso,
    validarRecurso: validarRecurso,
    tablaHTML: tablaHTML,
    formatear: num,
    TIPOS: TIPOS
  };
})();
