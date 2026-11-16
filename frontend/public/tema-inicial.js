// Aplica o tema salvo antes do React renderizar, pra não piscar a cor padrão.
// Fica num arquivo (e não inline no HTML) pra CSP poder bloquear script inline.
try {
  var t = JSON.parse(localStorage.getItem("pinado-tema") || "null");
  if (t) {
    for (var k in t) {
      if (/^[a-z0-9-]+$/.test(k) && /^#[0-9a-f]{6}$/i.test(t[k])) {
        document.documentElement.style.setProperty("--" + k, t[k]);
      }
    }
  }
} catch (e) {}
