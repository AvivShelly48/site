# hero-scrub.mp4

The film the hero scrubs through: six chapters, one per assembly step, in
installation order — concrete wall, waterproofing, brackets and rails,
insulation, ventilated cavity, porcelain panels. The stills in `keyframes/`
are the six chapter openings, and `kf-a.jpg` doubles as the video poster.

It is committed rather than fetched at build time, so a clone is the whole
site. If it ever goes missing the hero does not break — the film only takes
over once `loadedmetadata` reports a duration, and until then the rendered
WebGL scene is on screen, with the vector diagram under that.

## Re-encoding it

Scrubbing seeks a new frame on nearly every scroll event, so the encode has to
be seekable at that granularity. A two-second GOP is what makes a hero like
this feel stuck; six frames is the whole trick.

    -c:v libx264 -crf 19 -g 6 -keyint_min 6 -sc_threshold 0 \
      -profile:v high -level 4.0 -pix_fmt yuv420p -movflags +faststart

720p is enough — the figure is never full-bleed, and seek cost scales with
frame size. Eighteen seconds at 24 fps keeps the file near 6 MB, which is the
budget worth holding: every visitor pays it before the hero moves.
