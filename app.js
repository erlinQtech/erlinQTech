/* =====================================================================
   ErlinQTech Móvil · app.js
   Motor de sesión adaptativa, persistencia local, diagnóstico y reporte.
   Sin servidor, sin datos personales identificables.
   ===================================================================== */

(function () {
  'use strict';

  var CLAVE = 'erlinqtech_v1';
  var VERSION_APP = '1.0.0';
  var LETRAS = ['A', 'B', 'C', 'D'];
  var COMPONENTES = ['Estadística', 'Geometría', 'Álgebra y cálculo'];
  var COMPETENCIAS = ['Interpretación y representación', 'Formulación y ejecución', 'Argumentación'];

  var banco = null;
  var estado = null;
  var sesion = null;
  var cronoId = null;

  /* ------------------------------------------------------------------
     Utilidades de DOM
     ------------------------------------------------------------------ */
  function $(id) { return document.getElementById(id); }
  function crear(tag, clase, texto) {
    var n = document.createElement(tag);
    if (clase) n.className = clase;
    if (texto !== undefined) n.textContent = texto;
    return n;
  }
  function mostrar(idPantalla, titulo) {
    var pantallas = document.querySelectorAll('.pantalla');
    for (var i = 0; i < pantallas.length; i++) pantallas[i].hidden = true;
    $(idPantalla).hidden = false;
    $('barraTitulo').textContent = titulo || 'ErlinQTech';
    $('btnInicio').hidden = (idPantalla === 'p-bienvenida');
    $('panelAjustes').hidden = true;
    $('btnAjustes').setAttribute('aria-expanded', 'false');
    window.scrollTo(0, 0);
  }

  /* ------------------------------------------------------------------
     Persistencia
     ------------------------------------------------------------------ */
  function estadoPorDefecto() {
    return {
      version: 1,
      ajustes: { escala: '16', tema: 'auto', alias: '' },
      sesion: null,
      historial: []
    };
  }

  function cargarEstado() {
    var bruto = null;
    try { bruto = localStorage.getItem(CLAVE); } catch (e) { bruto = null; }
    if (!bruto) return estadoPorDefecto();
    try {
      var e = JSON.parse(bruto);
      var base = estadoPorDefecto();
      if (!e || typeof e !== 'object') return base;
      base.ajustes = Object.assign(base.ajustes, e.ajustes || {});
      base.sesion = e.sesion || null;
      base.historial = Array.isArray(e.historial) ? e.historial : [];
      base.version = 1;
      return base;
    } catch (err) {
      return estadoPorDefecto();
    }
  }

  function guardarEstado() {
    try { localStorage.setItem(CLAVE, JSON.stringify(estado)); } catch (e) { /* cuota llena */ }
  }

  /* ------------------------------------------------------------------
     Ajustes
     ------------------------------------------------------------------ */
  function aplicarAjustes() {
    document.body.setAttribute('data-escala', estado.ajustes.escala);
    if (estado.ajustes.tema === 'auto') document.documentElement.removeAttribute('data-tema');
    else document.documentElement.setAttribute('data-tema', estado.ajustes.tema);
    $('inpAlias').value = estado.ajustes.alias || '';
    marcarChips('[data-escala]', 'escala', estado.ajustes.escala);
    marcarChips('[data-tema]', 'tema', estado.ajustes.tema);
  }
  function marcarChips(selector, atributo, valor) {
    var chips = $('panelAjustes').querySelectorAll(selector);
    for (var i = 0; i < chips.length; i++) {
      chips[i].setAttribute('aria-pressed', chips[i].getAttribute('data-' + atributo) === valor ? 'true' : 'false');
    }
  }

  /* ------------------------------------------------------------------
     Carga del banco
     ------------------------------------------------------------------ */
  function cargarBanco() {
    return fetch('banco.json', { cache: 'no-cache' })
      .then(function (r) {
        if (!r.ok) throw new Error('el servidor respondió ' + r.status);
        return r.json();
      })
      .then(function (datos) {
        if (!datos || !Array.isArray(datos.items) || datos.items.length === 0) {
          throw new Error('el archivo no contiene un arreglo «items» con preguntas');
        }
        banco = datos;
        return datos;
      });
  }

  /* ------------------------------------------------------------------
     Configuración de la sesión (6 pasos)
     ------------------------------------------------------------------ */
  var pasos = [];
  var pasoActual = 0;
  var config = {};

  function definirPasos() {
    var temas = (banco.temas || []).map(function (t) { return { valor: t.id, texto: t.nombre }; });
    temas.unshift({ valor: 'cualquiera', texto: 'Sin preferencia (variado)' });

    pasos = [
      {
        clave: 'tema',
        pregunta: '¿Qué tema desea trabajar?',
        ayuda: 'Si no está seguro, elija «Sin preferencia» y la aplicación variará los aprendizajes.',
        opciones: temas
      },
      {
        clave: 'componente',
        pregunta: '¿Qué componente quiere practicar?',
        ayuda: 'Son los tres componentes de contenido de la prueba oficial.',
        opciones: [
          { valor: 'Estadística', texto: 'Estadística' },
          { valor: 'Geometría', texto: 'Geometría' },
          { valor: 'Álgebra y cálculo', texto: 'Álgebra y cálculo' },
          { valor: 'mixto', texto: 'Simulacro mixto (los tres)' }
        ]
      },
      {
        clave: 'nivelPercibido',
        pregunta: '¿Cómo percibe su nivel actual?',
        ayuda: 'Es solo un punto de partida. La aplicación lo ajustará según su desempeño.',
        opciones: [
          { valor: 1, texto: 'Bajo — prefiero empezar desde lo básico' },
          { valor: 2, texto: 'Básico — resuelvo lo elemental con seguridad' },
          { valor: 3, texto: 'Alto — manejo problemas con varios pasos' },
          { valor: 4, texto: 'Superior — busco preguntas exigentes' }
        ]
      },
      {
        clave: 'cantidad',
        pregunta: '¿Cuántas preguntas quiere resolver?',
        ayuda: 'Una sesión de 10 preguntas toma entre 20 y 30 minutos.',
        opciones: [
          { valor: 5, texto: '5 preguntas (práctica corta)' },
          { valor: 10, texto: '10 preguntas (recomendada)' },
          { valor: 15, texto: '15 preguntas' },
          { valor: 20, texto: '20 preguntas (sesión larga)' }
        ]
      },
      {
        clave: 'inicio',
        pregunta: '¿Cómo prefiere iniciar?',
        ayuda: 'La pregunta diagnóstica empieza en nivel 2 y ajusta de inmediato según su respuesta.',
        opciones: [
          { valor: 'nivel1', texto: 'Desde el nivel 1, de menor a mayor exigencia' },
          { valor: 'diagnostica', texto: 'Con una pregunta diagnóstica' }
        ]
      },
      {
        clave: 'modalidad',
        pregunta: '¿Qué modalidad desea?',
        ayuda: 'En simulacro se mide el tiempo y la retroalimentación aparece al final.',
        opciones: [
          { valor: 'guiada', texto: 'Práctica guiada — explicación después de cada pregunta' },
          { valor: 'simulacro', texto: 'Simulacro — con cronómetro y revisión final' }
        ]
      }
    ];
  }

  function iniciarConfiguracion() {
    definirPasos();
    config = {};
    pasoActual = 0;
    mostrar('p-config', 'Configurar sesión');
    pintarPaso();
  }

  function pintarPaso() {
    var p = pasos[pasoActual];
    $('configPaso').textContent = 'Paso ' + (pasoActual + 1) + ' de ' + pasos.length;
    var barra = $('configRelleno');
    barra.style.width = Math.round((pasoActual + 1) / pasos.length * 100) + '%';
    barra.parentNode.setAttribute('aria-valuenow', String(pasoActual + 1));
    $('h-config').textContent = p.pregunta;
    $('configAyuda').textContent = p.ayuda || '';
    var caja = $('configOpciones');
    caja.innerHTML = '';
    p.opciones.forEach(function (op) {
      var b = crear('button', 'opcion');
      b.type = 'button';
      var letra = crear('span', 'opcion__letra');
      letra.setAttribute('aria-hidden', 'true');
      letra.textContent = '›';
      var t = crear('span', 'opcion__texto', op.texto);
      b.appendChild(letra); b.appendChild(t);
      b.addEventListener('click', function () {
        config[p.clave] = op.valor;
        if (pasoActual < pasos.length - 1) { pasoActual++; pintarPaso(); }
        else iniciarSesion();
      });
      caja.appendChild(b);
    });
    $('btnConfigAtras').textContent = pasoActual === 0 ? 'Cancelar' : 'Atrás';
  }

  /* ------------------------------------------------------------------
     Selección de ítems
     ------------------------------------------------------------------ */
  function candidatos() {
    var tema = null;
    if (config.tema && config.tema !== 'cualquiera') {
      tema = (banco.temas || []).filter(function (t) { return t.id === config.tema; })[0];
    }
    return banco.items.filter(function (it) {
      if (config.componente !== 'mixto' && it.componente !== config.componente) return false;
      if (tema) {
        var et = it.etiquetas || [];
        var coincide = tema.etiquetas.some(function (e) { return et.indexOf(e) !== -1; });
        if (!coincide) return false;
      }
      return true;
    });
  }

  function siguienteItem() {
    var pool = candidatos().filter(function (it) {
      return sesion.usados.indexOf(it.id) === -1;
    });
    if (pool.length === 0) return null;

    var orden = [sesion.nivel];
    for (var d = 1; d <= 3; d++) {
      if (sesion.nivel - d >= 1) orden.push(sesion.nivel - d);
      if (sesion.nivel + d <= 4) orden.push(sesion.nivel + d);
    }
    for (var i = 0; i < orden.length; i++) {
      var enNivel = pool.filter(function (it) { return it.nivel === orden[i]; });
      if (enNivel.length) {
        var frescos = enNivel.filter(function (it) {
          return sesion.evitar.indexOf(it.id) === -1;
        });
        var base = frescos.length ? frescos : enNivel;
        if (sesion.cambiarContexto && base.length > 1) {
          var otros = base.filter(function (it) { return it.contexto !== sesion.ultimoContexto; });
          if (otros.length) base = otros;
        }
        return base[Math.floor(Math.random() * base.length)];
      }
    }
    return pool[Math.floor(Math.random() * pool.length)];
  }

  /* ------------------------------------------------------------------
     Sesión
     ------------------------------------------------------------------ */
  function iniciarSesion(soloIds) {
    var nivelInicial = config.inicio === 'diagnostica' ? 2 : 1;
    if (config.inicio !== 'diagnostica' && config.nivelPercibido > 1) {
      nivelInicial = Math.max(1, Math.min(4, config.nivelPercibido - 1));
    }
    var previas = estado.historial.length ? (estado.historial[0].ids || []) : [];

    sesion = {
      inicio: new Date().toISOString(),
      config: Object.assign({}, config),
      nivel: nivelInicial,
      indice: 0,
      total: soloIds ? soloIds.length : config.cantidad,
      usados: [],
      evitar: previas,
      respuestas: [],
      rachaAcierto: 0,
      rachaFallo: 0,
      cambiarContexto: false,
      ultimoContexto: null,
      segundos: 0,
      restringirA: soloIds || null,
      itemActual: null,
      elegida: null
    };
    estado.sesion = sesion;
    guardarEstado();
    if (config.modalidad === 'simulacro') arrancarCronometro();
    cargarSiguiente();
  }

  function cargarSiguiente() {
    if (sesion.indice >= sesion.total) { terminarSesion(); return; }
    var it;
    if (sesion.restringirA) {
      var id = sesion.restringirA[sesion.indice];
      it = banco.items.filter(function (x) { return x.id === id; })[0];
    } else {
      it = siguienteItem();
    }
    if (!it) {
      if (sesion.respuestas.length === 0) {
        pantallaError('No hay preguntas disponibles con esa combinación de tema y componente. Elija «Sin preferencia» o un componente distinto.');
        return;
      }
      sesion.total = sesion.respuestas.length;
      terminarSesion();
      return;
    }
    sesion.itemActual = it.id;
    sesion.elegida = null;
    sesion.tItem = Date.now();
    sesion.usados.push(it.id);
    sesion.ultimoContexto = it.contexto;
    guardarEstado();
    pintarItem(it);
  }

  function pintarItem(it) {
    mostrar('p-item', 'Pregunta ' + (sesion.indice + 1));
    $('itemAvance').textContent = 'Pregunta ' + (sesion.indice + 1) + ' de ' + sesion.total;
    $('itemCrono').hidden = (sesion.config.modalidad !== 'simulacro');
    $('fComponente').textContent = it.componente;
    $('fCompetencia').textContent = it.competencia;
    $('fNivel').textContent = String(it.nivel);
    $('fAprendizaje').textContent = it.aprendizaje;
    $('fContexto').textContent = it.contexto;
    $('itemNarrativa').textContent = it.narrativa;
    Graficos.renderizarRecurso(it.recurso, $('itemRecurso'));
    $('itemEnunciado').textContent = it.enunciado;

    var caja = $('itemOpciones');
    caja.innerHTML = '';
    LETRAS.forEach(function (L) {
      var b = crear('button', 'opcion');
      b.type = 'button';
      b.setAttribute('role', 'radio');
      b.setAttribute('aria-checked', 'false');
      b.dataset.letra = L;
      var l = crear('span', 'opcion__letra', L);
      var t = crear('span', 'opcion__texto', it.opciones[L]);
      b.appendChild(l); b.appendChild(t);
      b.addEventListener('click', function () {
        var todas = caja.querySelectorAll('.opcion');
        for (var i = 0; i < todas.length; i++) todas[i].setAttribute('aria-checked', 'false');
        b.setAttribute('aria-checked', 'true');
        sesion.elegida = L;
        $('btnConfirmar').disabled = false;
      });
      caja.appendChild(b);
    });
    $('btnConfirmar').disabled = true;
    var nota = $('itemNotaRacha');
    if (sesion.rachaAcierto >= 1) nota.textContent = 'Lleva ' + sesion.rachaAcierto + ' respuesta(s) correcta(s) seguida(s).';
    else if (sesion.rachaFallo >= 1) nota.textContent = 'Tómese el tiempo necesario para leer el enunciado completo.';
    else nota.textContent = '';
  }

  function confirmar() {
    if (!sesion.elegida) return;
    var it = itemPorId(sesion.itemActual);
    var correcta = (sesion.elegida === it.clave);
    var segundos = Math.round((Date.now() - sesion.tItem) / 1000);

    sesion.respuestas.push({
      id: it.id, componente: it.componente, competencia: it.competencia,
      nivel: it.nivel, contexto: it.contexto,
      elegida: sesion.elegida, clave: it.clave, correcta: correcta, segundos: segundos
    });

    if (correcta) { sesion.rachaAcierto++; sesion.rachaFallo = 0; }
    else { sesion.rachaFallo++; sesion.rachaAcierto = 0; }

    sesion.cambiarContexto = false;
    if (sesion.rachaAcierto >= 2 && sesion.nivel < 4) {
      sesion.nivel++; sesion.rachaAcierto = 0;
    } else if (sesion.rachaFallo >= 2) {
      sesion.cambiarContexto = true; sesion.rachaFallo = 0;
      if (sesion.nivel > 1 && sesion.config.inicio !== 'nivel1') sesion.nivel = sesion.nivel;
    }
    if (sesion.indice === 0 && sesion.config.inicio === 'diagnostica') {
      sesion.nivel = correcta ? 3 : 1;
    }

    sesion.indice++;
    guardarEstado();

    if (sesion.config.modalidad === 'simulacro') { cargarSiguiente(); return; }
    pintarRetroalimentacion(it, sesion.elegida, correcta);
  }

  function pintarRetroalimentacion(it, elegida, correcta) {
    mostrar('p-feedback', 'Retroalimentación');
    var v = $('fbVeredicto');
    v.className = 'veredicto ' + (correcta ? 'veredicto--acierto' : 'veredicto--fallo');
    $('h-feedback').textContent = correcta ? 'Respuesta correcta' : 'Respuesta incorrecta';
    $('fbResumen').textContent = correcta
      ? 'Su razonamiento llegó al resultado esperado. Revise los pasos para afianzar el procedimiento.'
      : 'Usted marcó ' + elegida + '. Revise con calma el procedimiento; el error es parte del aprendizaje.';

    $('fbClave').textContent = 'La respuesta correcta es ' + it.clave + ') ' + it.opciones[it.clave];
    var ol = $('fbPasos'); ol.innerHTML = '';
    it.solucion_pasos.forEach(function (p) { ol.appendChild(crear('li', null, p)); });

    var ul = $('fbDistractores'); ul.innerHTML = '';
    LETRAS.forEach(function (L) {
      if (L === it.clave) return;
      var li = crear('li');
      var b = crear('b', null, L + ')');
      li.appendChild(b);
      li.appendChild(document.createTextNode(' ' + (it.distractores[L] || 'Opción incorrecta.')));
      if (L === elegida) {
        var marca = crear('span', 'opcion__marca', ' ← su respuesta');
        li.appendChild(marca);
      }
      ul.appendChild(li);
    });

    var remedial = $('fbBloqueRemedial');
    remedial.hidden = correcta;
    $('fbRemedial').textContent = it.concepto_remedial || '';

    $('fbNarrativa').textContent = it.narrativa;
    Graficos.renderizarRecurso(it.recurso, $('fbRecurso'));
    $('fbEnunciado').textContent = it.enunciado;

    $('btnSiguiente').textContent = (sesion.indice >= sesion.total)
      ? 'Ver mi diagnóstico' : 'Siguiente pregunta';
  }

  function itemPorId(id) {
    for (var i = 0; i < banco.items.length; i++) if (banco.items[i].id === id) return banco.items[i];
    return null;
  }

  /* ------------------------------------------------------------------
     Cronómetro
     ------------------------------------------------------------------ */
  function arrancarCronometro() {
    pararCronometro();
    cronoId = setInterval(function () {
      sesion.segundos++;
      var m = Math.floor(sesion.segundos / 60), s = sesion.segundos % 60;
      $('itemCrono').textContent = (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
    }, 1000);
  }
  function pararCronometro() { if (cronoId) { clearInterval(cronoId); cronoId = null; } }

  /* ------------------------------------------------------------------
     Diagnóstico
     ------------------------------------------------------------------ */
  function agrupar(respuestas, campo) {
    var mapa = {};
    respuestas.forEach(function (r) {
      var k = r[campo];
      if (!mapa[k]) mapa[k] = { total: 0, aciertos: 0 };
      mapa[k].total++;
      if (r.correcta) mapa[k].aciertos++;
    });
    return mapa;
  }

  function tablaDesempeno(mapa, etiquetaColumna, orden) {
    var claves = orden ? orden.filter(function (c) { return mapa[c]; }) : Object.keys(mapa).sort();
    var env = crear('div', 'tabla-envoltura');
    var t = document.createElement('table');
    t.className = 'datos';
    var thead = document.createElement('thead');
    thead.innerHTML = '<tr><th scope="col">' + etiquetaColumna +
      '</th><th scope="col" class="num">Aciertos</th><th scope="col">Avance</th></tr>';
    t.appendChild(thead);
    var tb = document.createElement('tbody');
    claves.forEach(function (c) {
      var d = mapa[c];
      var pct = Math.round(d.aciertos / d.total * 100);
      var tr = document.createElement('tr');
      var th = document.createElement('th'); th.scope = 'row'; th.textContent = c;
      var td1 = document.createElement('td'); td1.className = 'num';
      td1.textContent = d.aciertos + ' de ' + d.total;
      var td2 = document.createElement('td');
      var med = crear('div', 'medidor');
      var pista = crear('div', 'medidor__pista');
      var val = crear('div', 'medidor__valor');
      val.style.width = pct + '%';
      val.style.background = pct >= 70 ? 'var(--exito)' : (pct >= 40 ? 'var(--g6)' : 'var(--error)');
      pista.appendChild(val);
      med.appendChild(pista);
      med.appendChild(crear('span', null, pct + ' %'));
      td2.appendChild(med);
      tr.appendChild(th); tr.appendChild(td1); tr.appendChild(td2);
      tb.appendChild(tr);
    });
    t.appendChild(tb);
    env.appendChild(t);
    return env;
  }

  function terminarSesion() {
    pararCronometro();
    var r = sesion.respuestas;
    var aciertos = r.filter(function (x) { return x.correcta; }).length;
    var pct = r.length ? Math.round(aciertos / r.length * 100) : 0;
    var porComp = agrupar(r, 'componente');
    var porCompe = agrupar(r, 'competencia');
    var porNivel = agrupar(r, 'nivel');

    var registro = {
      fecha: new Date().toISOString(),
      alias: estado.ajustes.alias || '',
      config: sesion.config,
      total: r.length,
      aciertos: aciertos,
      porcentaje: pct,
      nivelFinal: sesion.nivel,
      segundos: sesion.segundos,
      porComponente: porComp,
      porCompetencia: porCompe,
      porNivel: porNivel,
      ids: r.map(function (x) { return x.id; }),
      respuestas: r
    };
    estado.historial.unshift(registro);
    if (estado.historial.length > 20) estado.historial = estado.historial.slice(0, 20);
    estado.sesion = null;
    guardarEstado();

    mostrar('p-diagnostico', 'Diagnóstico');
    $('dgPorcentaje').textContent = pct + ' %';
    $('dgAciertos').textContent = aciertos + '/' + r.length;
    $('dgNivel').textContent = String(sesion.nivel);

    $('dgComponentes').innerHTML = '';
    $('dgComponentes').appendChild(tablaDesempeno(porComp, 'Componente', COMPONENTES));
    $('dgCompetencias').innerHTML = '';
    $('dgCompetencias').appendChild(tablaDesempeno(porCompe, 'Competencia', COMPETENCIAS));
    $('dgNiveles').innerHTML = '';
    $('dgNiveles').appendChild(tablaDesempeno(porNivel, 'Nivel', ['1', '2', '3', '4']));

    var lectura = redactarLectura(registro);
    $('dgLectura').innerHTML = '';
    lectura.forEach(function (p) { $('dgLectura').appendChild(crear('p', null, p)); });

    var recos = recomendaciones(registro);
    $('dgRecomendaciones').innerHTML = '';
    recos.forEach(function (x) { $('dgRecomendaciones').appendChild(crear('li', null, x)); });

    var estra = estrategias(registro);
    $('dgEstrategias').innerHTML = '';
    estra.forEach(function (x) { $('dgEstrategias').appendChild(crear('li', null, x)); });

    agregarRevision(registro);

    var fallos = r.filter(function (x) { return !x.correcta; });
    $('btnRepetirFallos').hidden = (fallos.length === 0);
    $('btnCompartir').hidden = !(navigator.share);
    estado.ultimoReporte = registro;
  }

  function agregarRevision(registro) {
    var previo = $('dgRevision');
    if (previo) previo.parentNode.removeChild(previo);
    var env = crear('div');
    env.id = 'dgRevision';
    env.appendChild(crear('h3', null, 'Revisión de las preguntas'));
    registro.respuestas.forEach(function (resp, i) {
      var it = itemPorId(resp.id);
      if (!it) return;
      var det = document.createElement('details');
      det.className = 'bloque';
      var sum = document.createElement('summary');
      sum.textContent = (i + 1) + '. ' + (resp.correcta ? '✔ ' : '✘ ') +
        it.componente + ' · nivel ' + it.nivel;
      det.appendChild(sum);
      var cuerpo = crear('div', 'bloque__cuerpo');
      cuerpo.appendChild(crear('p', 'narrativa', it.narrativa));
      var rec = crear('div', 'recurso');
      cuerpo.appendChild(rec);
      cuerpo.appendChild(crear('p', 'enunciado', it.enunciado));
      cuerpo.appendChild(crear('p', 'clave-linea',
        'Respuesta correcta: ' + it.clave + ') ' + it.opciones[it.clave]));
      if (!resp.correcta) {
        cuerpo.appendChild(crear('p', null, 'Usted marcó ' + resp.elegida + ') ' + it.opciones[resp.elegida]));
        cuerpo.appendChild(crear('p', null, it.distractores[resp.elegida] || ''));
      }
      var ol = document.createElement('ol');
      ol.className = 'pasos';
      it.solucion_pasos.forEach(function (p) { ol.appendChild(crear('li', null, p)); });
      cuerpo.appendChild(ol);
      if (!resp.correcta && it.concepto_remedial) {
        cuerpo.appendChild(crear('p', null, 'Concepto por reforzar: ' + it.concepto_remedial));
      }
      det.appendChild(cuerpo);
      det.addEventListener('toggle', function () {
        if (det.open && !rec.hasChildNodes()) Graficos.renderizarRecurso(it.recurso, rec);
      });
      env.appendChild(det);
    });
    var ancla = $('dgRecomendaciones').parentNode;
    ancla.insertBefore(env, $('btnRepetirFallos').parentNode);
  }

  function redactarLectura(reg) {
    var out = [];
    var comp = reg.porComponente;
    var fuertes = [], debiles = [];
    Object.keys(comp).forEach(function (c) {
      var p = comp[c].aciertos / comp[c].total;
      if (comp[c].total >= 2 && p >= 0.7) fuertes.push(c);
      if (comp[c].total >= 2 && p < 0.5) debiles.push(c);
    });
    if (fuertes.length) {
      out.push('En esta sesión mostró un desempeño sólido en ' + listar(fuertes) +
        '. Las tareas de ese componente se resolvieron con el procedimiento adecuado.');
    }
    if (debiles.length) {
      out.push('Las mayores dificultades aparecieron en ' + listar(debiles) +
        '. Conviene volver sobre esos aprendizajes antes de subir el nivel de exigencia.');
    }
    var compe = reg.porCompetencia;
    var peorCompe = null, peorPct = 2;
    Object.keys(compe).forEach(function (c) {
      var p = compe[c].aciertos / compe[c].total;
      if (compe[c].total >= 2 && p < peorPct) { peorPct = p; peorCompe = c; }
    });
    if (peorCompe && peorPct < 0.6) {
      out.push('En la competencia de ' + peorCompe.toLowerCase() + ' acertó ' +
        compe[peorCompe].aciertos + ' de ' + compe[peorCompe].total +
        ' preguntas; es el tipo de tarea que conviene practicar con más frecuencia.');
    }
    var niveles = Object.keys(reg.porNivel).map(Number).sort();
    var alcanzado = niveles.length ? niveles[niveles.length - 1] : 1;
    out.push('Durante la sesión llegó a resolver preguntas de nivel ' + alcanzado +
      ' y terminó ubicado en el nivel ' + reg.nivelFinal +
      '. Este resultado describe su desempeño en estas preguntas, no una medida definitiva de su capacidad.');
    if (reg.segundos > 0) {
      var prom = Math.round(reg.segundos / Math.max(1, reg.total));
      out.push('Empleó en promedio ' + prom + ' segundos por pregunta.');
    }
    return out;
  }

  function listar(a) {
    if (a.length === 1) return a[0];
    return a.slice(0, -1).join(', ') + ' y ' + a[a.length - 1];
  }

  function recomendaciones(reg) {
    var out = [];
    var falladas = reg.respuestas.filter(function (r) { return !r.correcta; });
    var etiquetas = {};
    falladas.forEach(function (r) {
      var it = itemPorId(r.id);
      (it && it.etiquetas ? it.etiquetas : []).forEach(function (e) {
        etiquetas[e] = (etiquetas[e] || 0) + 1;
      });
    });
    var orden = Object.keys(etiquetas).sort(function (a, b) { return etiquetas[b] - etiquetas[a]; });
    orden.slice(0, 4).forEach(function (e) {
      out.push('Repase «' + e + '»: apareció en ' + etiquetas[e] + ' pregunta(s) que no acertó.');
    });
    var comp = reg.porComponente;
    Object.keys(comp).forEach(function (c) {
      if (comp[c].total >= 2 && comp[c].aciertos / comp[c].total < 0.5) {
        out.push('Dedique la próxima sesión al componente de ' + c + ', manteniendo el nivel ' +
          Math.max(1, reg.nivelFinal - 1) + ' hasta lograr dos aciertos seguidos.');
      }
    });
    if (!out.length) {
      out.push('No se detectaron dificultades marcadas. Suba el nivel de exigencia o practique un componente distinto en la próxima sesión.');
    }
    return out;
  }

  function estrategias(reg) {
    var out = [];
    var pct = reg.porcentaje;
    var comp = reg.porComponente;
    var nivelObjetivo = Math.max(1, Math.min(4, reg.nivelFinal));

    if (comp['Estadística'] && comp['Estadística'].aciertos / comp['Estadística'].total < 0.6) {
      out.push('Practique a diario la lectura de un gráfico de contexto familiar en nivel ' +
        nivelObjetivo + ': antes de calcular, escriba en una línea qué representa cada eje.');
    }
    if (comp['Geometría'] && comp['Geometría'].aciertos / comp['Geometría'].total < 0.6) {
      out.push('Dibuje la figura antes de operar y rotule en ella cada dato del enunciado; dedique 15 minutos diarios a tres figuras.');
    }
    if (comp['Álgebra y cálculo'] && comp['Álgebra y cálculo'].aciertos / comp['Álgebra y cálculo'].total < 0.6) {
      out.push('Traduzca el enunciado a una expresión algebraica antes de resolver y verifique el resultado reemplazándolo en la situación original.');
    }
    out.push('Al terminar cada pregunta, diga en voz alta el procedimiento en tres pasos; si no logra enunciarlos, vuelva a la explicación.');
    if (pct >= 70) {
      out.push('Alterne sesiones de 10 preguntas en nivel ' + Math.min(4, nivelObjetivo + 1) +
        ' con sesiones mixtas, para sostener el nivel alcanzado.');
    } else {
      out.push('Trabaje sesiones cortas de 5 preguntas en el mismo nivel hasta superar el 70 % de acierto, antes de aumentar la exigencia.');
    }
    out.push('Registre en un cuaderno los errores que repite: la mayoría de las respuestas incorrectas provienen de dos o tres confusiones concretas.');
    return out;
  }

  /* ------------------------------------------------------------------
     Reporte
     ------------------------------------------------------------------ */
  function textoReporte(reg) {
    var L = [];
    var f = new Date(reg.fecha);
    L.push('REPORTE DE PRÁCTICA · ErlinQTech Móvil v' + VERSION_APP);
    L.push('Banco de preguntas: versión ' + (banco.version_banco || '—'));
    L.push('Fecha: ' + f.toLocaleString('es-CO'));
    if (reg.alias) L.push('Alias: ' + reg.alias);
    L.push('');
    L.push('CONFIGURACIÓN DE LA SESIÓN');
    L.push('  Componente: ' + reg.config.componente);
    L.push('  Tema: ' + reg.config.tema);
    L.push('  Modalidad: ' + reg.config.modalidad);
    L.push('  Inicio: ' + reg.config.inicio);
    L.push('  Preguntas: ' + reg.total);
    L.push('');
    L.push('RESULTADO GLOBAL');
    L.push('  Aciertos: ' + reg.aciertos + ' de ' + reg.total + ' (' + reg.porcentaje + ' %)');
    L.push('  Nivel final: ' + reg.nivelFinal);
    if (reg.segundos) L.push('  Tiempo total: ' + Math.floor(reg.segundos / 60) + ' min ' + (reg.segundos % 60) + ' s');
    L.push('');
    ['porComponente', 'porCompetencia', 'porNivel'].forEach(function (k, i) {
      L.push(['DESEMPEÑO POR COMPONENTE', 'DESEMPEÑO POR COMPETENCIA', 'DESEMPEÑO POR NIVEL'][i]);
      var mapa = reg[k];
      Object.keys(mapa).forEach(function (c) {
        L.push('  ' + c + ': ' + mapa[c].aciertos + '/' + mapa[c].total +
          ' (' + Math.round(mapa[c].aciertos / mapa[c].total * 100) + ' %)');
      });
      L.push('');
    });
    L.push('DETALLE DE RESPUESTAS');
    reg.respuestas.forEach(function (r, i) {
      L.push('  ' + (i + 1) + '. ' + r.id + ' · ' + r.componente + ' · nivel ' + r.nivel +
        ' · marcó ' + r.elegida + ' · clave ' + r.clave + ' · ' +
        (r.correcta ? 'correcta' : 'incorrecta') + ' · ' + r.segundos + ' s');
    });
    L.push('');
    L.push('LECTURA DEL DESEMPEÑO');
    redactarLectura(reg).forEach(function (p) { L.push('  ' + p); });
    L.push('');
    L.push('QUÉ PRACTICAR ENSEGUIDA');
    recomendaciones(reg).forEach(function (p) { L.push('  - ' + p); });
    L.push('');
    L.push('ESTRATEGIAS DE ESTUDIO');
    estrategias(reg).forEach(function (p) { L.push('  - ' + p); });
    L.push('');
    L.push('Este reporte describe el desempeño en las preguntas de práctica resueltas.');
    L.push('No constituye una predicción ni una garantía de resultados en el examen de Estado.');
    return L.join('\n');
  }

  function descargar(nombre, contenido, tipo) {
    var blob = new Blob([contenido], { type: tipo });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = nombre;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
  }

  function marcaFecha(iso) {
    var d = new Date(iso);
    function p(n) { return (n < 10 ? '0' : '') + n; }
    return '' + d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + '_' + p(d.getHours()) + p(d.getMinutes());
  }

  function exportarReporte() {
    var reg = estado.ultimoReporte || estado.historial[0];
    if (!reg) return;
    var sello = marcaFecha(reg.fecha);
    descargar('reporte_erlinqtech_' + sello + '.json',
      JSON.stringify({ app: 'ErlinQTech Móvil', version_app: VERSION_APP,
        version_banco: banco.version_banco || null, reporte: reg }, null, 2),
      'application/json;charset=utf-8');
    descargar('reporte_erlinqtech_' + sello + '.txt',
      textoReporte(reg), 'text/plain;charset=utf-8');
  }

  function compartirReporte() {
    var reg = estado.ultimoReporte || estado.historial[0];
    if (!reg || !navigator.share) return;
    navigator.share({
      title: 'Reporte ErlinQTech',
      text: textoReporte(reg)
    }).catch(function () { /* cancelado */ });
  }

  /* ------------------------------------------------------------------
     Historial
     ------------------------------------------------------------------ */
  function verHistorial() {
    mostrar('p-historial', 'Mi historial');
    var lista = $('histLista');
    lista.innerHTML = '';
    $('histTendencia').innerHTML = '';
    $('histVacio').hidden = estado.historial.length > 0;
    if (!estado.historial.length) return;

    var ult = estado.historial.slice(0, 8).reverse();
    if (ult.length >= 2) {
      Graficos.renderizarRecurso({
        tipo: 'grafico_lineas',
        titulo: 'Porcentaje de acierto en las últimas sesiones',
        eje_x: 'Sesión', eje_y: '% de acierto',
        etiquetas_x: ult.map(function (s, i) { return String(i + 1); }),
        series: [{ nombre: 'Acierto', puntos: ult.map(function (s, i) { return { x: i + 1, y: s.porcentaje }; }) }],
        descripcion_accesible: 'Evolución del porcentaje de acierto en las sesiones recientes'
      }, $('histTendencia'));
    }

    estado.historial.forEach(function (s) {
      var f = crear('div', 'historial__ficha');
      var d = new Date(s.fecha);
      f.appendChild(crear('h3', null, d.toLocaleDateString('es-CO', {
        year: 'numeric', month: 'long', day: 'numeric'
      }) + ' · ' + s.porcentaje + ' %'));
      f.appendChild(crear('p', 'historial__meta',
        s.aciertos + ' de ' + s.total + ' preguntas · ' +
        (s.config.componente === 'mixto' ? 'simulacro mixto' : s.config.componente) +
        ' · nivel final ' + s.nivelFinal +
        (s.config.modalidad === 'simulacro' ? ' · modalidad simulacro' : '')));
      lista.appendChild(f);
    });
  }

  /* ------------------------------------------------------------------
     Validador del banco
     ------------------------------------------------------------------ */
  function validarBanco() {
    mostrar('p-validador', 'Validación');
    var errores = [];
    var ids = {};
    banco.items.forEach(function (it, i) {
      var e = [];
      var ref = it.id || ('ítem en la posición ' + (i + 1));
      if (!it.id) e.push('falta el campo «id»');
      else if (ids[it.id]) e.push('el identificador está repetido');
      else ids[it.id] = true;
      if (COMPONENTES.indexOf(it.componente) === -1) e.push('componente no permitido: «' + it.componente + '»');
      if (COMPETENCIAS.indexOf(it.competencia) === -1) e.push('competencia no permitida: «' + it.competencia + '»');
      if ([1, 2, 3, 4].indexOf(it.nivel) === -1) e.push('nivel fuera del rango 1 a 4');
      if (['Familiar', 'Laboral', 'Comunitario', 'Matemático'].indexOf(it.contexto) === -1) {
        e.push('contexto no permitido: «' + it.contexto + '»');
      }
      if (!it.aprendizaje) e.push('falta el aprendizaje evaluado');
      if (!it.narrativa) e.push('falta el contexto narrativo');
      if (!it.enunciado) e.push('falta el enunciado');
      LETRAS.forEach(function (L) {
        if (!it.opciones || !it.opciones[L]) e.push('falta la opción ' + L);
      });
      if (LETRAS.indexOf(it.clave) === -1) e.push('la clave debe ser A, B, C o D');
      LETRAS.forEach(function (L) {
        if (L !== it.clave && (!it.distractores || !it.distractores[L])) {
          e.push('falta la justificación del distractor ' + L);
        }
      });
      if (!Array.isArray(it.solucion_pasos) || it.solucion_pasos.length < 2) {
        e.push('se requieren al menos dos pasos de solución');
      }
      if (!it.correcta_verificada) e.push('aviso: el ítem no está marcado como verificado');
      var er = Graficos.validarRecurso(it.recurso);
      er.forEach(function (x) { e.push('recurso: ' + x); });
      if (e.length) errores.push({ ref: ref, errores: e });
    });

    var res = $('valResumen');
    res.innerHTML = '';
    var ok = banco.items.length - errores.length;
    res.appendChild(crear('p', null, 'Ítems revisados: ' + banco.items.length));
    var l1 = crear('p');
    l1.innerHTML = '<span class="val-ok">' + ok + ' sin observaciones</span> · ' +
      '<span class="' + (errores.length ? 'val-mal' : 'val-ok') + '">' +
      errores.length + ' con observaciones</span>';
    res.appendChild(l1);

    var cobertura = {};
    banco.items.forEach(function (it) {
      var k = it.componente + ' · nivel ' + it.nivel;
      cobertura[k] = (cobertura[k] || 0) + 1;
    });
    var filas = Object.keys(cobertura).sort().map(function (k) { return [k, cobertura[k]]; });
    res.appendChild(Graficos.tablaHTML('Cobertura por componente y nivel',
      ['Componente y nivel', 'Ítems'], filas));

    var det = $('valDetalle');
    det.innerHTML = '';
    if (!errores.length) {
      det.appendChild(crear('p', null, 'Todos los ítems cumplen la estructura requerida.'));
    } else {
      errores.forEach(function (x) {
        var d = crear('div', 'val-item');
        d.appendChild(crear('strong', null, x.ref));
        var ul = document.createElement('ul');
        x.errores.forEach(function (e) { ul.appendChild(crear('li', null, e)); });
        d.appendChild(ul);
        det.appendChild(d);
      });
    }
  }

  /* ------------------------------------------------------------------
     Errores y arranque
     ------------------------------------------------------------------ */
  function pantallaError(mensaje) {
    $('cargando').hidden = true;
    mostrar('p-error', 'Error');
    $('errMensaje').textContent = mensaje;
  }

  function prepararBienvenida() {
    mostrar('p-bienvenida', 'ErlinQTech');
    var s = estado.sesion;
    if (s && s.respuestas && s.indice < s.total) {
      $('cajaReanudar').hidden = false;
      $('txtReanudar').textContent = 'Tiene una sesión sin terminar: ' +
        s.indice + ' de ' + s.total + ' preguntas resueltas.';
    } else {
      $('cajaReanudar').hidden = true;
      if (s) { estado.sesion = null; guardarEstado(); }
    }
  }

  function reanudar() {
    sesion = estado.sesion;
    config = sesion.config;
    if (config.modalidad === 'simulacro') arrancarCronometro();
    cargarSiguiente();
  }

  function enlazar() {
    $('btnComenzar').addEventListener('click', iniciarConfiguracion);
    $('btnHistorial').addEventListener('click', verHistorial);
    $('btnHistVolver').addEventListener('click', prepararBienvenida);
    $('btnValVolver').addEventListener('click', prepararBienvenida);
    $('btnInicio').addEventListener('click', function () {
      pararCronometro();
      prepararBienvenida();
    });
    $('btnConfigAtras').addEventListener('click', function () {
      if (pasoActual === 0) prepararBienvenida();
      else { pasoActual--; pintarPaso(); }
    });
    $('btnConfirmar').addEventListener('click', confirmar);
    $('btnSiguiente').addEventListener('click', cargarSiguiente);
    $('btnNuevaSesion').addEventListener('click', iniciarConfiguracion);
    $('btnExportar').addEventListener('click', exportarReporte);
    $('btnCompartir').addEventListener('click', compartirReporte);
    $('btnRepetirFallos').addEventListener('click', function () {
      var reg = estado.ultimoReporte || estado.historial[0];
      var ids = reg.respuestas.filter(function (r) { return !r.correcta; })
                              .map(function (r) { return r.id; });
      config = Object.assign({}, reg.config, { modalidad: 'guiada' });
      iniciarSesion(ids);
    });
    $('btnReanudar').addEventListener('click', reanudar);
    $('btnDescartar').addEventListener('click', function () {
      estado.sesion = null; guardarEstado(); prepararBienvenida();
    });
    $('btnRecargar').addEventListener('click', function () { location.reload(); });

    $('btnAjustes').addEventListener('click', function () {
      var p = $('panelAjustes');
      p.hidden = !p.hidden;
      $('btnAjustes').setAttribute('aria-expanded', p.hidden ? 'false' : 'true');
    });
    var panel = $('panelAjustes');
    panel.addEventListener('click', function (ev) {
      var b = ev.target.closest ? ev.target.closest('.chip') : null;
      if (!b) return;
      if (b.dataset.escala) { estado.ajustes.escala = b.dataset.escala; }
      if (b.dataset.tema) { estado.ajustes.tema = b.dataset.tema; }
      guardarEstado(); aplicarAjustes();
    });
    $('inpAlias').addEventListener('change', function () {
      estado.ajustes.alias = this.value.replace(/[^\wÁÉÍÓÚÜÑáéíóúüñ \-.]/g, '').slice(0, 20);
      this.value = estado.ajustes.alias;
      guardarEstado();
    });
    $('btnValidar').addEventListener('click', validarBanco);
    $('btnBorrar').addEventListener('click', function () {
      if (!confirm('¿Desea borrar su historial, su configuración y la sesión en curso en este teléfono?')) return;
      try { localStorage.removeItem(CLAVE); } catch (e) { /* ignorar */ }
      estado = estadoPorDefecto();
      aplicarAjustes();
      prepararBienvenida();
    });
  }

  function arrancar() {
    estado = cargarEstado();
    aplicarAjustes();
    enlazar();
    $('notaVersion').textContent = 'Aplicación versión ' + VERSION_APP + '.';

    cargarBanco().then(function () {
      $('cargando').hidden = true;
      $('notaVersion').textContent = 'Aplicación versión ' + VERSION_APP +
        ' · banco de preguntas versión ' + (banco.version_banco || '—') +
        ' con ' + banco.items.length + ' preguntas.';
      prepararBienvenida();
      if (location.search.indexOf('debug=1') !== -1) validarBanco();
    }).catch(function (e) {
      pantallaError('No se pudo leer el archivo banco.json: ' + e.message);
    });

    if ('serviceWorker' in navigator) {
      window.addEventListener('load', function () {
        navigator.serviceWorker.register('service-worker.js').catch(function () { /* sin caché */ });
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', arrancar);
  } else {
    arrancar();
  }
})();
