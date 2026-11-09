# ErlinQTech Móvil

Aplicación web instalable (PWA) para la práctica adaptativa del componente de
Matemáticas del examen Saber 11°. Funciona por completo **sin conexión** después
de la primera carga, no requiere servidor ni cuenta de usuario y no solicita
datos personales identificables.

- **Versión de la aplicación:** 1.0.0
- **Banco inicial:** 36 ítems verificados (12 por componente, 3 por nivel de desempeño)
- **Peso total del paquete:** aproximadamente 240 KB
- **Institución:** I.E. Las Américas — Florida, Valle del Cauca

---

## 1. Estructura del proyecto

```
erlinqtech/
├── index.html              Pantallas de la aplicación
├── app.css                 Estilos, modo claro y oscuro, accesibilidad
├── graficos.js             Motor de gráficos declarativo (13 tipos de recurso)
├── app.js                  Motor de sesión adaptativa, diagnóstico y reporte
├── banco.json              Banco de preguntas (este es el archivo que usted edita)
├── manifest.webmanifest    Datos de instalación de la PWA
├── service-worker.js       Caché para el funcionamiento sin conexión
└── icons/
    ├── icon-192.png
    └── icon-512.png
```

---

## 2. Publicación en GitHub Pages

1. Cree una cuenta en `github.com` si aún no la tiene.
2. Cree un repositorio nuevo, público, llamado por ejemplo `erlinqtech`.
3. Pulse **Add file → Upload files** y arrastre **todos** los archivos y la
   carpeta `icons` conservando la estructura anterior. Confirme con **Commit changes**.
4. Vaya a **Settings → Pages**. En *Source* elija `Deploy from a branch`,
   rama `main` y carpeta `/ (root)`. Guarde.
5. Espere entre uno y dos minutos. GitHub mostrará la dirección pública, con la
   forma `https://<su-usuario>.github.io/erlinqtech/`.
6. Comparta ese enlace con sus estudiantes.

> La aplicación necesita HTTPS para instalarse y para activar el modo sin
> conexión. GitHub Pages lo proporciona de manera automática.

### Actualizar la aplicación

Cuando modifique `banco.json` o cualquier otro archivo, suba la versión nueva y
**cambie el número en la primera línea de `service-worker.js`**:

```js
var CACHE_VERSION = 'erlinqtech-v2';   // antes: v1
```

Sin ese cambio, los teléfonos que ya instalaron la aplicación seguirán usando la
copia guardada y no verán las preguntas nuevas.

---

## 3. Instalación en el teléfono del estudiante

1. Abrir el enlace en **Chrome** (Android).
2. Tocar el menú de tres puntos → **Instalar aplicación** o **Agregar a la
   pantalla principal**.
3. Abrir la aplicación desde el ícono que aparece en la pantalla de inicio.
4. A partir de ese momento funciona sin datos móviles y sin wifi.

En iPhone, el procedimiento es: abrir en **Safari** → botón Compartir →
**Agregar a la pantalla de inicio**.

---

## 4. Cómo agregar una pregunta nueva

Abra `banco.json` en cualquier editor de texto, copie la plantilla siguiente
dentro del arreglo `items` (separada por una coma de la anterior) y reemplace los
valores. Después, abra la aplicación, entre en **Ajustes → Validar banco de
preguntas** y confirme que no aparecen observaciones.

```json
{
  "id": "EST-N2-004",
  "componente": "Estadística",
  "competencia": "Interpretación y representación",
  "nivel": 2,
  "aprendizaje": "Descripción breve del aprendizaje evaluado.",
  "contexto": "Familiar",
  "narrativa": "Dos a cuatro oraciones que sitúan la situación.",
  "enunciado": "La tarea concreta que debe resolver el estudiante.",
  "recurso": { "tipo": "ninguno" },
  "opciones": { "A": "…", "B": "…", "C": "…", "D": "…" },
  "clave": "B",
  "correcta_verificada": true,
  "solucion_pasos": [
    "Paso 1: qué se identifica y por qué.",
    "Paso 2: la operación o el razonamiento, con el cálculo explícito.",
    "Paso 3: interpretación del resultado en el contexto."
  ],
  "distractores": {
    "A": "Qué error conceptual revela esta opción.",
    "C": "Qué error conceptual revela esta opción.",
    "D": "Qué error conceptual revela esta opción."
  },
  "concepto_remedial": "Explicación breve de refuerzo, de tres a cinco líneas.",
  "etiquetas": ["lectura de gráficos"]
}
```

Reglas que el validador comprueba:

| Campo | Valores permitidos |
|---|---|
| `componente` | `Estadística`, `Geometría`, `Álgebra y cálculo` |
| `competencia` | `Interpretación y representación`, `Formulación y ejecución`, `Argumentación` |
| `nivel` | `1`, `2`, `3`, `4` |
| `contexto` | `Familiar`, `Laboral`, `Comunitario`, `Matemático` |
| `clave` | `A`, `B`, `C` o `D` |
| `etiquetas` | deben existir en la lista `temas` del encabezado del archivo |

Convención sugerida para el `id`: `COMPONENTE-NIVEL-CONSECUTIVO`
(por ejemplo `GEO-N3-004`).

---

## 5. Catálogo de gráficos disponibles

El banco **no contiene código SVG**: describe los datos y la aplicación dibuja el
gráfico en el teléfono. Todos los tipos admiten además los campos opcionales
`titulo`, `descripcion_accesible` (texto para lectores de pantalla) y `nota`.

### 5.1 `tabla`
```json
{ "tipo": "tabla", "columnas": ["Día", "Ventas"], "filas": [["Lunes", 12], ["Martes", 15]] }
```

### 5.2 `grafico_barras`
```json
{ "tipo": "grafico_barras", "orientacion": "vertical", "eje_x": "Día", "eje_y": "Estudiantes",
  "datos": [{ "etiqueta": "Lunes", "valor": 12 }, { "etiqueta": "Martes", "valor": 18 }] }
```
`orientacion` admite `"vertical"` (por defecto) u `"horizontal"`.

### 5.3 `grafico_barras_agrupadas`
```json
{ "tipo": "grafico_barras_agrupadas", "categorias": ["Sede A", "Sede B"],
  "series": [{ "nombre": "2024", "valores": [30, 50] }, { "nombre": "2025", "valores": [36, 58] }] }
```

### 5.4 `grafico_lineas`
```json
{ "tipo": "grafico_lineas", "eje_x": "Minutos", "eje_y": "Litros",
  "series": [{ "nombre": "Volumen", "puntos": [{ "x": 0, "y": 0 }, { "x": 2, "y": 40 }] }] }
```
Campo opcional `etiquetas_x` para rotular con texto en lugar de números.

### 5.5 `grafico_circular`
```json
{ "tipo": "grafico_circular", "mostrar_porcentajes": true,
  "datos": [{ "etiqueta": "Bus", "valor": 45 }, { "etiqueta": "Bicicleta", "valor": 25 }] }
```

### 5.6 `histograma`
```json
{ "tipo": "histograma", "eje_x": "Estatura (cm)",
  "intervalos": [{ "min": 150, "max": 160, "frecuencia": 6 }] }
```

### 5.7 `diagrama_caja`
```json
{ "tipo": "diagrama_caja", "eje": "Puntaje",
  "cajas": [{ "nombre": "Grupo A", "min": 30, "q1": 45, "mediana": 52, "q3": 60, "max": 78 }] }
```

### 5.8 `dispersion`
```json
{ "tipo": "dispersion", "eje_x": "Horas", "eje_y": "Puntaje", "linea_tendencia": true,
  "puntos": [{ "x": 1, "y": 40 }, { "x": 2, "y": 45 }] }
```

### 5.9 `pictograma`
```json
{ "tipo": "pictograma", "simbolo": "■", "equivale_a": 5, "unidad": "kg",
  "datos": [{ "etiqueta": "Papel", "valor": 40 }] }
```

### 5.10 `plano_cartesiano`
```json
{ "tipo": "plano_cartesiano", "rango_x": [-5, 5], "rango_y": [-5, 5], "cuadricula": true,
  "paso_x": 1, "paso_y": 1,
  "funciones": [{ "familia": "cuadratica", "a": 1, "b": -2, "c": -3, "etiqueta": "f" }],
  "puntos": [{ "x": 3, "y": 0, "etiqueta": "R", "destacado": true }],
  "segmentos": [{ "desde": { "x": 0, "y": 0 }, "hasta": { "x": 3, "y": 0 } }] }
```

Familias de función admitidas (no se usa `eval`; se definen por coeficientes):

| `familia` | Coeficientes | Expresión |
|---|---|---|
| `lineal` | `m`, `b` | f(x) = m·x + b |
| `cuadratica` | `a`, `b`, `c` | f(x) = a·x² + b·x + c |
| `cubica` | `a`, `b`, `c`, `d` | f(x) = a·x³ + b·x² + c·x + d |
| `exponencial` | `a`, `base` | f(x) = a·baseˣ |
| `logaritmica` | `a`, `base` | f(x) = a·log_base(x) |
| `racional` | `a`, `b`, `c`, `d` | f(x) = (a·x + b)/(c·x + d) |
| `valor_absoluto` | `a`, `h`, `k` | f(x) = a·\|x − h\| + k |
| `raiz` | `a`, `h`, `k` | f(x) = a·√(x − h) + k |
| `senoidal` | `A`, `B`, `C`, `D` | f(x) = A·sen(B·x + C) + D |
| `tabulada` | `puntos` | curva definida por una lista de puntos |

Las funciones racionales no unen el trazo a través de la asíntota.
El campo `etiqueta_x` indica en qué valor de x se coloca el rótulo de la curva.

### 5.11 `figura_geometrica`
```json
{ "tipo": "figura_geometrica", "forma": "triangulo",
  "vertices": [{ "x": 0, "y": 0, "etiqueta": "A" }, { "x": 5, "y": 0, "etiqueta": "B" },
               { "x": 0, "y": 12, "etiqueta": "C" }],
  "medidas": [{ "entre": ["A", "B"], "valor": "5 m" }],
  "angulos": [{ "en": "A", "valor": "90°", "marcar_recto": true }],
  "diagonales": [["A", "C"]],
  "circulo": { "centro": { "x": 0, "y": 0 }, "radio": 5, "etiqueta_centro": "O" },
  "relleno": true, "abierta": false }
```
Las coordenadas son relativas: la figura se escala sola para ocupar el ancho
disponible. Para una circunferencia sola, omita `vertices` y use solo `circulo`.

### 5.12 `solido_geometrico`
```json
{ "tipo": "solido_geometrico", "solido": "cilindro", "vista": "isometrica",
  "dimensiones": { "radio": "3 m", "altura": "10 m" } }
```
`solido` admite `cubo`, `prisma`, `piramide`, `cilindro`, `cono` y `esfera`.
Las aristas ocultas se dibujan con trazo discontinuo.

### 5.13 `svg_personalizado`
```json
{ "tipo": "svg_personalizado", "ancho": 320, "alto": 200, "contenido": "<g>…</g>" }
```
Último recurso, solo cuando ningún tipo anterior sirva. El contenido se depura
antes de insertarse: se eliminan `script`, `foreignObject` y los atributos `on*`.

Para que el gráfico respete el modo claro y oscuro, use en los estilos las
variables `var(--g1)` a `var(--g6)`, `var(--g-eje)`, `var(--g-grid)` y
`var(--g-texto)` en lugar de colores fijos.

---

## 6. Cómo funciona la lógica adaptativa

- Dos aciertos consecutivos en un nivel suben el nivel (máximo 4).
- Dos fallos consecutivos conservan el nivel, cambian el contexto del ítem y
  amplían la explicación remedial.
- Si el estudiante eligió iniciar con pregunta diagnóstica, la sesión comienza en
  nivel 2 y se ajusta a nivel 3 o 1 tras la primera respuesta.
- No se repiten ítems dentro de una sesión, y se evitan en lo posible los de la
  sesión inmediatamente anterior.
- Si se agotan los ítems de un nivel, la aplicación usa el nivel más cercano
  disponible y lo informa.

---

## 7. Datos y privacidad

- Todo se guarda en el teléfono (`localStorage`), bajo la clave `erlinqtech_v1`.
- No se solicitan nombre completo, documento, correo ni teléfono. El alias es
  opcional y local, en cumplimiento de la Ley 1581 de 2012.
- No hay servidores, analítica, cookies de terceros ni peticiones de red en
  tiempo de ejecución.
- El botón **Borrar todos mis datos** elimina historial, configuración y sesión
  en curso.
- El reporte se descarga en el dispositivo; el estudiante decide si lo comparte.

---

## 8. Lista de verificación de calidad

- [ ] Tras la primera carga, la aplicación abre con el teléfono en **modo avión**.
- [ ] En la pestaña **Red** del navegador no aparece ninguna petición externa.
- [ ] La auditoría **Lighthouse** en móvil reporta la aplicación como instalable.
- [ ] **Ajustes → Validar banco de preguntas** reporta *0 con observaciones*.
- [ ] Los trece tipos de recurso se ven completos a 320 px de ancho y cada uno
      despliega su tabla con **Ver datos del gráfico**.
- [ ] Ninguna pregunta aparece sin el encabezado de componente, competencia,
      nivel, aprendizaje evaluado y contexto.
- [ ] La clave y la explicación no son visibles hasta confirmar la respuesta.
- [ ] Una sesión interrumpida se reanuda sin pérdida de progreso.
- [ ] El modo oscuro y los tres tamaños de texto se ven correctamente.
- [ ] El reporte se descarga en `.json` y en `.txt`.

---

## 9. Solución de problemas frecuentes

| Síntoma | Causa probable y solución |
|---|---|
| Pantalla «No fue posible cargar las preguntas» | `banco.json` tiene un error de sintaxis. Suele ser una coma sobrante antes de `]` o `}`, o una comilla sin cerrar. Pegue el contenido en un validador de JSON para localizar la línea. |
| Los estudiantes no ven las preguntas nuevas | Falta cambiar `CACHE_VERSION` en `service-worker.js`. También pueden desinstalar y volver a instalar la aplicación. |
| No aparece la opción «Instalar aplicación» | El sitio debe servirse por HTTPS y el archivo `manifest.webmanifest` junto con los iconos deben estar accesibles. Verifique que la carpeta `icons` se subió completa. |
| Un gráfico aparece con el aviso «El gráfico no pudo dibujarse» | Falta un campo obligatorio del recurso. Abra **Validar banco de preguntas**: el validador indica el ítem y el campo. Entretanto, el estudiante puede usar la tabla de datos que se despliega. |
| Abrir `index.html` con doble clic no muestra las preguntas | Los navegadores bloquean la lectura de archivos locales. Publique el proyecto en GitHub Pages o use un servidor local. |

---

## 10. Nota pedagógica

Esta herramienta apoya la preparación y la comprensión conceptual. Los resultados
describen el desempeño en las preguntas resueltas y **no constituyen una
predicción ni una garantía de resultados en el examen de Estado**. Los ítems del
banco inicial son originales y fueron redactados siguiendo la estructura pública
de la prueba (componentes, competencias y niveles de desempeño). Si usted
incorpora ítems liberados por el ICFES, cítelos en formato APA 7.ª edición en el
campo `nota` del recurso o en un documento anexo.
