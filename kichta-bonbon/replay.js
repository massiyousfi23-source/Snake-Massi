// Replay du coup final : on filme le ralenti (image du jeu + son) dans une
// petite vidéo à partager (TikTok, WhatsApp…). Le titre et le logo sont
// dessinés par-dessus. Tout reste sur le téléphone tant que le joueur ne partage pas.
const TYPES = ["video/mp4;codecs=avc1.42E01E,mp4a.40.2", "video/mp4;codecs=avc1,mp4a.40.2", "video/mp4;codecs=avc1", "video/mp4", "video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"];

export function createReplay(source, getAudioStream) {
  const supported = typeof MediaRecorder !== "undefined" && !!HTMLCanvasElement.prototype.captureStream;
  const type = supported ? TYPES.find((t) => MediaRecorder.isTypeSupported(t)) : null;
  const canvas = document.createElement("canvas");
  const g = canvas.getContext("2d");
  let rec = null;
  let chunks = [];
  let title = "";
  let t0 = 0;
  let clip = null;

  function size() {
    // Format vertical 9:16 si le jeu est en portrait, sinon 16:9
    const portrait = source.height >= source.width;
    canvas.width = portrait ? 720 : 1280;
    canvas.height = portrait ? 1280 : 720;
  }

  function outlined(text, x, y, px, fill, stroke = "#7a1a4a") {
    g.font = `900 ${px}px "Baloo 2", "Arial Rounded MT Bold", system-ui, sans-serif`;
    g.textAlign = "center";
    g.lineJoin = "round";
    g.lineWidth = px * 0.2;
    g.strokeStyle = stroke;
    g.strokeText(text, x, y);
    g.fillStyle = fill;
    g.fillText(text, x, y);
  }

  return {
    get supported() {
      return !!type;
    },
    get recording() {
      return !!rec;
    },
    /** La dernière vidéo enregistrée (ou null). */
    get clip() {
      return clip;
    },
    start(text) {
      if (!type || rec) return;
      size();
      title = text;
      chunks = [];
      t0 = performance.now();
      const stream = canvas.captureStream(30);
      const audio = getAudioStream && getAudioStream();
      if (audio) audio.getAudioTracks().forEach((tr) => stream.addTrack(tr));
      try {
        rec = new MediaRecorder(stream, { mimeType: type, videoBitsPerSecond: 4_000_000 });
      } catch {
        rec = null;
        return;
      }
      rec.ondataavailable = (e) => e.data && e.data.size && chunks.push(e.data);
      rec.onstop = () => {
        const mime = type.split(";")[0];
        clip = { blob: new Blob(chunks, { type: mime }), ext: mime.includes("mp4") ? "mp4" : "webm", mime };
        stream.getTracks().forEach((tr) => tr.stop());
      };
      rec.start(250);
    },
    stop() {
      if (!rec) return;
      const r = rec;
      rec = null;
      try {
        r.stop();
      } catch {
        // déjà arrêté
      }
    },
    /** À appeler juste après chaque image du jeu. */
    frame() {
      if (!rec) return;
      const W = canvas.width;
      const H = canvas.height;
      // L'image du jeu, recadrée pour remplir la vidéo
      const s = Math.max(W / source.width, H / source.height);
      const w = source.width * s;
      const h = source.height * s;
      g.drawImage(source, (W - w) / 2, (H - h) / 2, w, h);
      // Bandes de cinéma
      const bar = H * 0.09;
      g.fillStyle = "#000";
      g.fillRect(0, 0, W, bar);
      g.fillRect(0, H - bar, W, bar);
      const t = (performance.now() - t0) / 1000;
      const pop = Math.min(1, t / 0.35);
      g.save();
      g.globalAlpha = pop;
      outlined(title, W / 2, bar + H * 0.075, Math.round(W * 0.07), "#fff");
      g.restore();
      // Logo « KICHTA BONBON » centré en bas
      const px = Math.round(bar * 0.55);
      g.font = `900 ${px}px "Baloo 2", "Arial Rounded MT Bold", system-ui, sans-serif`;
      const w1 = g.measureText("KICHTA ").width;
      const w2 = g.measureText("BONBON").width;
      const left = W / 2 - (w1 + w2) / 2;
      outlined("KICHTA", left + g.measureText("KICHTA").width / 2, H - bar * 0.35, px, "#ffffff");
      outlined("BONBON", left + w1 + w2 / 2, H - bar * 0.35, px, "#ffd23f");
    },
    /** Partage (ou téléchargement si le partage n'est pas possible). */
    async share(text) {
      if (!clip) return false;
      const file = new File([clip.blob], `kichta-coup-final.${clip.ext}`, { type: clip.mime });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: "Kichta Bonbon", text });
          return true;
        } catch (e) {
          if (e && e.name === "AbortError") return false;
        }
      }
      const url = URL.createObjectURL(clip.blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.name;
      document.body.append(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      return true;
    },
  };
}
