(function () {
  "use strict";

  var retryDelays = [0, 1000, 2000, 4000];
  var client = null;
  var participants = Object.create(null);

  function sleep(milliseconds) {
    return new Promise(function (resolve) {
      window.setTimeout(resolve, milliseconds);
    });
  }

  function apiBaseURL() {
    var env = window.__env || {};
    return String(env.apiUrl || "").replace(/\/$/, "");
  }

  async function post(path, capability) {
    var response = await window.fetch(apiBaseURL() + path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      credentials: "omit",
      referrerPolicy: "no-referrer",
      body: JSON.stringify({ capability: capability }),
    });
    if (!response.ok) throw new Error("renderer API returned " + response.status);
    if (response.status === 204) return null;
    return response.json();
  }

  function initials(name, fallback) {
    var words = String(name || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    if (!words.length) return fallback;
    return words
      .slice(0, 2)
      .map(function (word) {
        return word.charAt(0).toUpperCase();
      })
      .join("");
  }

  function tileFor(role) {
    return document.querySelector('[data-participant="' + role + '"]');
  }

  function avatarSource(avatar) {
    var value = String(avatar || "");
    if (!value) return "";
    return value.indexOf("data:") === 0 ? value : "data:image/jpeg;base64," + value;
  }

  function setIdentity(role, identity) {
    var tile = tileFor(role);
    tile.querySelector("[data-name]").textContent = identity.display_name || role;
    tile.querySelector("[data-initials]").textContent = initials(
      identity.display_name,
      role === "student" ? "S" : "E",
    );
    var avatar = tile.querySelector("[data-avatar]");
    var previous = avatar.querySelector("img");
    if (previous) previous.remove();
    if (identity.avatar) {
      var image = document.createElement("img");
      image.alt = "";
      image.referrerPolicy = "no-referrer";
      image.addEventListener(
        "error",
        function () {
          image.remove();
        },
        { once: true },
      );
      image.src = avatarSource(identity.avatar);
      avatar.prepend(image);
    }
  }

  function setVideo(role, track) {
    var tile = tileFor(role);
    var media = tile.querySelector("[data-media]");
    var placeholder = tile.querySelector("[data-placeholder]");
    media.replaceChildren();
    if (!track) {
      placeholder.hidden = false;
      return;
    }
    placeholder.hidden = true;
    track.play(media, { fit: role === "student" ? "contain" : "cover" });
  }

  function setAudio(role, track) {
    var badge = tileFor(role).querySelector("[data-mic-muted]");
    badge.hidden = Boolean(track);
    if (track) track.play();
  }

  function roleForUID(uid) {
    return participants[String(uid)] || null;
  }

  async function subscribe(user, mediaType) {
    var role = roleForUID(user.uid);
    if (!role) return;
    await client.subscribe(user, mediaType);
    if (mediaType === "video") setVideo(role, user.videoTrack || null);
    if (mediaType === "audio") setAudio(role, user.audioTrack || null);
  }

  function resetParticipant(user, mediaType) {
    var role = roleForUID(user.uid);
    if (!role) return;
    if (!mediaType || mediaType === "video") setVideo(role, null);
    if (!mediaType || mediaType === "audio") setAudio(role, null);
  }

  function configureClient(credentials) {
    participants = Object.create(null);
    participants[String(credentials.student.uid)] = "student";
    participants[String(credentials.expert.uid)] = "expert";
    setIdentity("student", credentials.student);
    setIdentity("expert", credentials.expert);

    client = window.AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
    client.on("user-published", function (user, mediaType) {
      subscribe(user, mediaType).catch(function () {
        resetParticipant(user, mediaType);
      });
    });
    client.on("user-unpublished", resetParticipant);
    client.on("user-left", function (user) {
      resetParticipant(user);
    });
  }

  async function subscribeExistingUsers() {
    var users = client.remoteUsers.slice();
    for (var index = 0; index < users.length; index += 1) {
      var user = users[index];
      if (user.hasVideo) await subscribe(user, "video");
      if (user.hasAudio) await subscribe(user, "audio");
    }
  }

  async function leave() {
    if (!client) return;
    try {
      await client.leave();
    } catch (_) {
      // A failed renderer attempt is retried with a fresh client below.
    }
    client = null;
  }

  async function start() {
    var params = new URLSearchParams(window.location.hash.slice(1));
    var capability = params.get("cap");
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
    if (!capability || !apiBaseURL() || !window.AgoraRTC) return;

    for (var attempt = 0; attempt < retryDelays.length; attempt += 1) {
      if (retryDelays[attempt]) await sleep(retryDelays[attempt]);
      try {
        var credentials = await post("/public/coaching/recording-renderer/exchange", capability);
        configureClient(credentials);
        await client.join(
          credentials.app_id,
          credentials.channel,
          credentials.token,
          credentials.uid,
        );
        await subscribeExistingUsers();
        if (typeof window.navigator.notifyReady !== "function") {
          throw new Error("Agora recorder readiness API is unavailable");
        }
        window.navigator.notifyReady();
        await post("/public/coaching/recording-renderer/ready", capability);
        document.documentElement.dataset.rendererReady = "true";
        return;
      } catch (_) {
        await leave();
      }
    }
  }

  start();
})();
