console.log("STREAM URL:", result.streamUrl);

function setupHls(streamUrl) {
  destroyHls();

  if (Hls.isSupported()) {
    hls = new Hls({
      lowLatencyMode: true,
      capLevelToPlayerSize: true,
      startLevel: -1,
      enableWorker: true,
      backBufferLength: 30
    });

    hls.attachMedia(video);

    hls.on(Hls.Events.MEDIA_ATTACHED, () => {
      hls.loadSource(streamUrl);
    });

    hls.on(Hls.Events.MANIFEST_PARSED, () => {
      setStatus("Stream ready.");
      video.play().catch(() => {});
    });

    hls.on(Hls.Events.ERROR, (_, data) => {
      if (!data?.fatal) return;

      if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
        setStatus("Playback error. Recovering...");
        hls.recoverMediaError();
      } else if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
        setStatus("Network error loading stream.");
      } else {
        setStatus("Stream failed to load.");
      }
    });

    return;
  }

  if (video.canPlayType("application/vnd.apple.mpegurl")) {
    video.src = streamUrl;
    video.addEventListener("loadedmetadata", () => {
      setStatus("Stream ready.");
      video.play().catch(() => {});
    }, { once: true });
    return;
  }

  setStatus("This browser cannot play HLS streams.");
}
