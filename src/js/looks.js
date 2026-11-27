/* Prusia — looks.js
 * Estilos de revelado.
 *
 * Un estilo no es un filtro de color: es un juego de números del revelado
 * (enfoque, desenfoque, grano, viñeta, emulsión). La miniatura que se ve en la
 * bandeja se calcula de verdad —se revela un recorte de TU foto y se pasa por
 * la química que tengas elegida—, así que lo que eliges es lo que sale.
 */
(function (P) {
  'use strict';

  /* params: sólo lo que el estilo toca. El resto se queda neutro. */
  const LIST = [
    {
      id: 'ninguno', name: 'Sin estilo', tag: 'neutral',
      note: 'La foto entra en la cadena tal cual. Es el punto de partida honesto: si el negativo sale mal, el problema está en otra parte.',
      params: {}
    },
    {
      id: 'botanica', name: 'Botánica', tag: 'detalle',
      note: 'Estructura alta y grano mínimo. Para hoja, flor, tallo: lo que en cianotipo se lee por el borde de la silueta.',
      params: { sharp: 34, structure: 46, clarity: 16, threshold: 4, grain: 6, textura: 5 }
    },
    {
      id: 'retrato', name: 'Retrato azul', tag: 'piel',
      note: 'Poco enfoque y un velo suave: el cianotipo no perdona la piel dura, y el azul ya la endurece de por sí.',
      params: { sharp: 12, threshold: 14, glow: 22, glowWarm: 12, vignette: 16, grain: 5, shadows: 10 }
    },
    {
      id: 'arquitectura', name: 'Arquitectura', tag: 'líneas',
      note: 'Aristas limpias y contraste local alto, sin grano: el dibujo de una fachada se sostiene en las verticales.',
      params: { sharp: 48, structure: 52, clarity: 24, threshold: 3, vignette: 8 }
    },
    {
      id: 'antiguo', name: 'Cianotipo antiguo', tag: 'archivo',
      note: 'Emulsión irregular, grano grueso y esquinas caídas. Lo que hace una copia de 1890 mal lavada, pero a propósito.',
      params: { grain: 30, grainSize: 1.7, textura: 28, texturaTipo: 'pincel', vignette: 26, clarity: 12, sharp: 14, shadows: 12 }
    },
    {
      id: 'platino', name: 'Platino', tag: 'largo',
      note: 'Escala larga y luz difusa, como una copia al platino. La zona media se abre y el azul no se cierra.',
      params: { glow: 28, glowWarm: -8, clarity: 16, sharp: 18, threshold: 10, tonal: -14, vignette: 10 }
    },
    {
      id: 'dosbanos', name: 'Dos baños', tag: 'contraste',
      note: 'Sombras abajo, luces arriba: el efecto de revelar con dos exposiciones y enmascarar. Para un negativo flojo.',
      params: { tonal: 26, shadows: -20, highs: 14, clarity: 22, sharp: 16, threshold: 8 }
    },
    {
      id: 'veladura', name: 'Veladura', tag: 'niebla',
      note: 'Un velo de luz sobre toda la copia, esquinas más claras. El error clásico de revelado, convertido en intención.',
      params: { glow: 34, glowWarm: -6, vignette: -16, grain: 9, sharp: 8 }
    }
  ];

  const byId = {};
  LIST.forEach((l) => { byId[l.id] = l; });

  /** parámetros completos de un estilo a una intensidad dada (0..1) */
  function paramsFor(id, strength) {
    const look = byId[id];
    const base = P.develop.defaults();
    if (!look || id === 'ninguno') return base;
    const s = strength == null ? 1 : Math.max(0, Math.min(1, strength));
    return P.develop.blend(base, Object.assign({}, base, look.params), s);
  }

  /* Miniatura real: recorte de la foto → revelado del estilo → química.
     Reutiliza el mapa de tono del motor para que el color sea el de verdad. */
  function thumb(src, params, eng, size) {
    const c = document.createElement('canvas');
    c.width = size; c.height = size;
    const g = c.getContext('2d', { willReadFrequently: true });
    const iw = src.naturalWidth || src.width, ih = src.naturalHeight || src.height;
    const side = Math.min(iw, ih);
    const sx = (iw - side) / 2, sy = (ih - side) / 2;
    g.imageSmoothingQuality = 'high';
    g.drawImage(src, sx, sy, side, side, 0, 0, size, size);

    const data = g.getImageData(0, 0, size, size);
    P.develop.apply(data.data, size, size, params);
    g.putImageData(data, 0, 0);

    if (!eng) return c;
    const px = data.data;
    const mapY = eng.mapY;
    const LIN = P.render.LIN;
    const out = new Uint32Array(px.buffer, 0, size * size);
    for (let i = 0; i < size * size; i++) {
      const p = i << 2;
      const Y = 0.2126 * LIN[px[p]] + 0.7152 * LIN[px[p + 1]] + 0.0722 * LIN[px[p + 2]];
      const k = ((Math.sqrt(Y > 0 ? Y : 0) * 4095) | 0) * 3;
      out[i] = 0xff000000 | (mapY[k + 2] << 16) | (mapY[k + 1] << 8) | mapY[k];
    }
    g.putImageData(data, 0, 0);
    return c;
  }

  P.looks = { LIST: LIST, byId: byId, paramsFor: paramsFor, thumb: thumb };
})(typeof window !== 'undefined' ? (window.P = window.P || {}) : (module.exports = {}));
