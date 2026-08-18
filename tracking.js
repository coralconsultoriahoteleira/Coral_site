/**
 * tracking.js — Coral | captura de sessão + eventos de funil
 *
 * Uso no site do hotel:
 * <script src="https://SEU_PROJETO.supabase.co/storage/v1/.../tracking.js"
 *         data-hotel="slug-do-hotel"
 *         data-endpoint="https://SEU_PROJETO.supabase.co/functions/v1/track"
 *         defer></script>
 *
 * A sessão é criada/garantida automaticamente ao carregar a página.
 *
 * Pra registrar um evento de funil específico (ex: clique no WhatsApp
 * ou no motor de reservas), chame em qualquer lugar do site depois
 * que o script carregar:
 *
 *   window.coralTrack('whatsapp_started');
 *   window.coralTrack('booking_engine_started');
 *
 * Tipos aceitos (têm que bater com o schema — outros são ignorados
 * pela Edge Function): ad_click, landing_page, whatsapp_started,
 * booking_engine_started, booking_confirmed, lead_reserved,
 * lead_lost, followup, reservation_cancelled.
 */
(function () {
  var scriptTag = document.currentScript;
  var hotelSlug = scriptTag.getAttribute("data-hotel");
  var endpoint = scriptTag.getAttribute("data-endpoint");

  if (!hotelSlug || !endpoint) {
    console.warn("[coral-tracking] data-hotel ou data-endpoint ausente — script não iniciado.");
    return;
  }

  var STORAGE_KEY = "coral_session_key";

  function getSessionKey() {
    try {
      var existing = sessionStorage.getItem(STORAGE_KEY);
      if (existing) return existing;
      var fresh = crypto.randomUUID();
      sessionStorage.setItem(STORAGE_KEY, fresh);
      return fresh;
    } catch (e) {
      return crypto.randomUUID();
    }
  }

  var sessionKey = getSessionKey();

  function send(payload) {
    return fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(function (err) {
      console.warn("[coral-tracking] falha ao enviar:", err);
    });
  }

  function getParam(params, name) {
    return params.get(name) || undefined;
  }

  // Chamada automática — garante a sessão, sem event_type
  var params = new URLSearchParams(window.location.search);
  send({
    slug: hotelSlug,
    session_key: sessionKey,
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

  // Disponível globalmente pro site chamar em cliques específicos
  window.coralTrack = function (eventType, metadata) {
    send({
      slug: hotelSlug,
      session_key: sessionKey,
      event_type: eventType,
      metadata: metadata || null,
    });
  };
})();