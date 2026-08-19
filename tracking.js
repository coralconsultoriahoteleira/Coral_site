/**
 * tracking.js — Coral | captura de sessão + eventos de funil
 * ---------------------------------------------------------------
 * Um único script para todos os hotéis. O que muda por cliente são os
 * atributos da tag, nunca o código:
 *
 *   <script src="/tracking.js"
 *           data-hotel="bugaendrus"
 *           data-endpoint="https://<projeto>.supabase.co/functions/v1/track"
 *           data-token="<token compartilhado>"
 *           data-booking-hosts="hbook.hsystem.com.br"></script>
 *
 * `data-booking-hosts` é opcional e novo — ver seção 3 abaixo.
 *
 * MUDANÇAS DESTA VERSÃO
 * ---------------------
 * 1. visitor_key — identidade que sobrevive ao fechamento do navegador
 * 2. uuid() com queda segura — o fallback anterior podia derrubar tudo
 * 3. propagação da chave para o motor de reservas — sem isso, reserva
 *    de motor nunca liga na sessão que a originou
 */
(function () {
  var scriptTag = document.currentScript;
  if (!scriptTag) {
    console.warn("[coral-tracking] currentScript indisponível — carregue o script sem async/defer.");
    return;
  }

  var hotelSlug = scriptTag.getAttribute("data-hotel");
  var endpoint = scriptTag.getAttribute("data-endpoint");
  var token = scriptTag.getAttribute("data-token");
  var bookingHosts = (scriptTag.getAttribute("data-booking-hosts") || "")
    .split(",")
    .map(function (h) { return h.trim().toLowerCase(); })
    .filter(Boolean);

  if (!hotelSlug || !endpoint) {
    console.warn("[coral-tracking] data-hotel ou data-endpoint ausente — script não iniciado.");
    return;
  }

  var SESSION_KEY = "coral_session_key";
  var VISITOR_KEY = "coral_visitor_key";
  var URL_PARAM = "coral_sk";

  // -------------------------------------------------------------
  // 1. Identificadores
  // -------------------------------------------------------------
  // O fallback anterior chamava crypto.randomUUID() de dentro do catch
  // que existia justamente porque o ambiente é hostil. Onde as duas
  // coisas falham (Safari privado, contexto não-seguro), a exceção
  // subia e o script inteiro morria sem tracking nenhum.
  // Toda saída daqui casa com [A-Za-z0-9_-]{8,64}, que é o formato
  // aceito pela Edge Function.
  function uuid() {
    try {
      if (window.crypto && typeof window.crypto.randomUUID === "function") {
        return window.crypto.randomUUID();
      }
    } catch (e) { /* segue para a próxima tentativa */ }

    try {
      var b = new Uint8Array(16);
      window.crypto.getRandomValues(b);
      var s = "";
      for (var i = 0; i < 16; i++) s += ("0" + b[i].toString(16)).slice(-2);
      return s;
    } catch (e) { /* segue para a próxima tentativa */ }

    return "f" + Date.now().toString(36) + Math.random().toString(36).slice(2, 12);
  }

  function fromStore(store, key) {
    try {
      var existing = store.getItem(key);
      if (existing) return existing;
      var fresh = uuid();
      store.setItem(key, fresh);
      return fresh;
    } catch (e) {
      // Storage bloqueado: gera em memória. A sessão ainda é rastreada;
      // só não sobrevive à navegação. Degrada, não quebra.
      return uuid();
    }
  }

  // Vive na aba. Morre quando ela fecha.
  var sessionKey = fromStore(window.sessionStorage, SESSION_KEY);

  // Atravessa visitas. É o que permite ligar o clique no anúncio de
  // segunda-feira à reserva de quinta — com janela de reserva de 21
  // dias, esse é o caminho típico, não a exceção.
  var visitorKey = fromStore(window.localStorage, VISITOR_KEY);

  // -------------------------------------------------------------
  // 2. Envio
  // -------------------------------------------------------------
  function send(payload) {
    var headers = { "Content-Type": "application/json" };
    if (token) headers["X-Coral-Token"] = token;

    return fetch(endpoint, {
      method: "POST",
      headers: headers,
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(function (err) {
      console.warn("[coral-tracking] falha ao enviar:", err);
    });
  }

  function getParam(params, name) {
    return params.get(name) || undefined;
  }

  var params = new URLSearchParams(window.location.search);

  send({
    slug: hotelSlug,
    session_key: sessionKey,
    visitor_key: visitorKey,
    utm_source: getParam(params, "utm_source"),
    utm_medium: getParam(params, "utm_medium"),
    utm_campaign: getParam(params, "utm_campaign"),
    utm_content: getParam(params, "utm_content"),
    utm_term: getParam(params, "utm_term"),
    gclid: getParam(params, "gclid"),
    gbraid: getParam(params, "gbraid"),
    wbraid: getParam(params, "wbraid"),
    fbclid: getParam(params, "fbclid"),
    landing_page: window.location.href,
  });

  // -------------------------------------------------------------
  // 3. Propagação para o motor de reservas
  // -------------------------------------------------------------
  // sessionStorage não atravessa domínio, e o motor roda num domínio
  // da fornecedora. A ponte é a URL: confirmamos por teste que o
  // parâmetro sobrevive o funil do Hbook até a confirmação, onde a tag
  // do GTM o lê e envia junto com a reserva.
  //
  // A interceptação é no clique, não na carga da página, para pegar
  // também links inseridos depois por outro script.
  //
  // Só age sobre os hosts declarados em data-booking-hosts. Sem esse
  // atributo, nada acontece — sites sem motor de reservas seguem
  // exatamente como antes.
  if (bookingHosts.length) {
    document.addEventListener("click", function (ev) {
      var el = ev.target;
      while (el && el.tagName !== "A") el = el.parentElement;
      if (!el || !el.href) return;

      var alvo;
      try {
        alvo = new URL(el.href, window.location.href);
      } catch (e) {
        return;
      }

      var host = alvo.hostname.toLowerCase();
      var casa = bookingHosts.some(function (h) {
        return host === h || host.endsWith("." + h);
      });
      if (!casa) return;

      // Já decorado — não sobrescreve.
      if (alvo.searchParams.get(URL_PARAM)) return;

      alvo.searchParams.set(URL_PARAM, sessionKey);
      el.href = alvo.toString();
    }, true);
  }

  // -------------------------------------------------------------
  // 4. Eventos de funil
  // -------------------------------------------------------------
  // Restrito ao vocabulário do CHECK constraint de `events`. Tipo fora
  // da lista é ignorado pela Edge Function, sem quebrar a sessão.
  window.coralTrack = function (eventType, metadata) {
    send({
      slug: hotelSlug,
      session_key: sessionKey,
      visitor_key: visitorKey,
      event_type: eventType,
      metadata: metadata || null,
    });
  };

  // Útil para a tag do GTM no motor e para depuração no console.
  window.coralKeys = function () {
    return { session_key: sessionKey, visitor_key: visitorKey };
  };
})();